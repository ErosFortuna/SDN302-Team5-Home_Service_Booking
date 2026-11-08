const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env, normalizeOrigin } = require('./config/env.js');
const routes = require('./routes/index.js');
const { notFound, errorHandler } = require('./middlewares/error.middleware.js');
const { globalRateLimiter } = require('./middlewares/rate-limit.middleware.js');

function parseAllowedOrigins(clientUrl) {
	if (!clientUrl || typeof clientUrl !== 'string') return [];
	return clientUrl
		.split(',')
		.map((origin) => normalizeOrigin(origin))
		.filter(Boolean);
}

let hasWarnedDevWildcard = false;
function checkAndWarnDevWildcard(clientUrl, nodeEnv) {
	if (hasWarnedDevWildcard) return;
	const isDevelopment = nodeEnv === 'development';
	const origins = parseAllowedOrigins(clientUrl);
	if (isDevelopment && origins.includes('*')) {
		hasWarnedDevWildcard = true;
		console.warn(
			'[SECURITY WARNING] CORS wildcard "*" is enabled in development mode. All origins are permitted cross-origin access with credentials.',
		);
	}
}

// Log once at startup if wildcard dev is configured
checkAndWarnDevWildcard(env.clientUrl, env.nodeEnv);

const app = express();

app.set('trust proxy', env.trustProxy);

app.use(helmet());
app.use(
	cors({
		origin: (origin, callback) => {
			const isDevelopment = env.nodeEnv === 'development';
			const configuredClientOrigins = parseAllowedOrigins(env.clientUrl);
			const normalizedOrigin = normalizeOrigin(origin);
			const isConfiguredOrigin = configuredClientOrigins.includes(normalizedOrigin);
			const isLocalDevelopmentOrigin =
				isDevelopment &&
				/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin || '');
			const allowsDevelopmentWildcard =
				isDevelopment && configuredClientOrigins.includes('*');

			if (allowsDevelopmentWildcard) {
				checkAndWarnDevWildcard(env.clientUrl, env.nodeEnv);
			}

			callback(
				null,
				!origin || isConfiguredOrigin || isLocalDevelopmentOrigin || allowsDevelopmentWildcard,
			);
		},
		credentials: true,
	}),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(globalRateLimiter);
app.get('/', (req, res) => res.json({ message: 'Home Service Booking API' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
app.checkAndWarnDevWildcard = checkAndWarnDevWildcard;
app.resetDevWildcardWarned = () => {
	hasWarnedDevWildcard = false;
};

module.exports = app;

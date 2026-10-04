import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

const app = express();
const configuredClientOrigins = env.clientUrl.split(',').map((origin) => origin.trim());

app.use(helmet());
app.use(
	cors({
		origin: (origin, callback) => {
			const isLocalDevelopmentOrigin =
				env.nodeEnv !== 'production' &&
				/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
			const isConfiguredOrigin = configuredClientOrigins.includes(origin);
			const allowsDevelopmentWildcard =
				env.nodeEnv !== 'production' && configuredClientOrigins.includes('*');

			callback(
				null,
				!origin || isConfiguredOrigin || isLocalDevelopmentOrigin || allowsDevelopmentWildcard,
			);
		},
	}),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.get('/', (req, res) => res.json({ message: 'Home Service Booking API' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
export default app;

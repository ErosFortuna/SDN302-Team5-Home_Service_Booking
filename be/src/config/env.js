const dotenv = require('dotenv');
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || '*',
  googleClientIds: (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((clientId) => clientId.trim())
    .filter(Boolean),
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === 'true'
    : Number(process.env.SMTP_PORT || 465) === 465,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
};

if (!env.mongoUri) throw new Error('MONGO_URI is missing');
if (!env.jwtSecret) throw new Error('JWT_SECRET is missing');

module.exports = { env };

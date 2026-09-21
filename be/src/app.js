import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.clientUrl === '*' ? true : env.clientUrl }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.get('/', (req, res) => res.json({ message: 'Home Service Booking API' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
export default app;

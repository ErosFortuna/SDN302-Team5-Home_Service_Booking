const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env.js');
const routes = require('./routes/index.js');
const { notFound, errorHandler } = require('./middlewares/error.middleware.js');

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
module.exports = app;

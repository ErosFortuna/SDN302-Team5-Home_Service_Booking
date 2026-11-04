const mongoose = require('mongoose');
const { env } = require('./env.js');

async function connectDB() {
  await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = { connectDB };

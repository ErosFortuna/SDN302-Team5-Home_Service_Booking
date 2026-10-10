const app = require('./app.js');
const { env } = require('./config/env.js');
const { connectDB } = require('./config/db.js');

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => console.log(`API running at http://localhost:${env.port}`));
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

start();

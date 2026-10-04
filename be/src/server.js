import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

try {
  await connectDB();
  app.listen(env.port, () => console.log(`API running at http://localhost:${env.port}`));
} catch (error) {
  console.error('Startup failed:', error.message);
  process.exit(1);
}

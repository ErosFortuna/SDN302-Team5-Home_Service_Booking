const app = require('./app.js');
const { env } = require('./config/env.js');
const { connectDB } = require('./config/db.js');
const { expirePendingBookings } = require('./modules/bookings/booking.controller.js');

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`API running at http://localhost:${env.port}`);
      // Periodic background worker for expiring unresponded bookings (>12h)
      setInterval(async () => {
        try {
          const expired = await expirePendingBookings();
          if (expired && expired.length > 0) {
            console.log(`[Auto-Expire] Automatically cancelled ${expired.length} unresponded pending booking(s)`);
          }
        } catch (err) {
          console.error('[Auto-Expire Error]:', err.message);
        }
      }, 15 * 60 * 1000).unref();
    });
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

start();

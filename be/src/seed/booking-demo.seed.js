/**
 * Demo data for UC-38 (Update Service Status).
 * Creates one PROVIDER, one CUSTOMER and a CONFIRMED booking assigned to that provider.
 *
 *   npm run seed:booking
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../modules/users/user.model.js";
import Booking from "../modules/bookings/booking.model.js";

const PASSWORD = "Demo123!";
// Fixed ids keep the script idempotent (re-running resets the demo booking).
const DEMO_REQUEST_ID = new mongoose.Types.ObjectId("66f000000000000000000001");
const DEMO_QUOTE_ID = new mongoose.Types.ObjectId("66f000000000000000000002");
const DEMO_SERVICE_ID = new mongoose.Types.ObjectId("66f000000000000000000003");

async function upsertUser({ email, ...fields }, passwordHash) {
  await User.updateOne(
    { email },
    { $setOnInsert: { email, passwordHash, status: "ACTIVE", ...fields } },
    { upsert: true },
  );
  return User.findOne({ email });
}

await connectDB();
const passwordHash = await bcrypt.hash(PASSWORD, 12);

const provider = await upsertUser(
  { email: "provider.demo@homecare.local", fullName: "Thợ Demo Phát Đạt", phone: "0911111111", role: "PROVIDER" },
  passwordHash,
);
const customer = await upsertUser(
  { email: "customer.demo@homecare.local", fullName: "Nguyễn Thị Thanh", phone: "0922222222", role: "CUSTOMER" },
  passwordHash,
);

await Booking.deleteOne({ request: DEMO_REQUEST_ID });

const start = new Date(Date.now() + 60 * 60 * 1000);
const booking = await Booking.create({
  request: DEMO_REQUEST_ID,
  quote: DEMO_QUOTE_ID,
  service: DEMO_SERVICE_ID,
  customer: customer._id,
  provider: provider._id,
  scheduledStartAt: start,
  scheduledEndAt: new Date(start.getTime() + 2 * 60 * 60 * 1000),
  address: { line1: "45 Nguyễn Huệ", ward: "Bến Nghé", district: "Quận 1", city: "TP.HCM" },
  price: 450000,
  status: "CONFIRMED",
});

console.log(`
Demo seed completed (password for both accounts: ${PASSWORD})
  Provider : ${provider.email}
  Customer : ${customer.email}
  Booking  : ${booking._id}  (status CONFIRMED)
`);
process.exit(0);

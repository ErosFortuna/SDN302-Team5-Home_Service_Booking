import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../modules/users/user.model.js';
import Service from '../modules/services/service.model.js';

await connectDB();
const password = await bcrypt.hash('ChangeMe123!', 12);
await User.updateOne({ email: 'admin@homecare.local' }, { $setOnInsert: { name: 'System Admin', email: 'admin@homecare.local', password, role: 'ADMIN' } }, { upsert: true });
const services = [
  { name: 'Air Conditioner Cleaning', slug: 'air-conditioner-cleaning', category: 'AIR_CONDITIONING', pricingMode: 'FIXED', basePrice: 150000 },
  { name: 'Plumbing Repair', slug: 'plumbing-repair', category: 'PLUMBING', pricingMode: 'QUOTE' },
  { name: 'Home Cleaning', slug: 'home-cleaning', category: 'CLEANING', pricingMode: 'FIXED', basePrice: 200000 },
  { name: 'Electrical Repair', slug: 'electrical-repair', category: 'ELECTRICAL', pricingMode: 'QUOTE' }
];
for (const service of services) await Service.updateOne({ slug: service.slug }, { $setOnInsert: service }, { upsert: true });
console.log('Seed completed. Admin: admin@homecare.local / ChangeMe123!');
process.exit(0);

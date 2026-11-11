const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');
const Service = require('../src/modules/services/service.model.js');
const ServiceCategory = require('../src/modules/categories/service-category.model.js');

async function main() {
  await connectDB();
  const services = await Service.find({}).populate('category').lean();
  console.log('Total services in DB:', services.length);
  for (const s of services) {
    console.log(`id: "${s._id}", slug: "${s.slug}", category: "${s.category?.slug || s.category?.name}"`);
  }
  await mongoose.disconnect();
}
main();

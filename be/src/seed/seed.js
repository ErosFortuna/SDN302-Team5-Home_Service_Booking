const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db.js");
const User = require("../modules/users/user.model.js");
const Service = require("../modules/services/service.model.js");
const ServiceCategory = require("../modules/categories/service-category.model.js");

async function seed() {
  await connectDB();
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await User.updateOne(
    { email: "admin@homecare.local" },
    {
      $setOnInsert: {
        fullName: "System Admin",
        email: "admin@homecare.local",
        phone: "0900000000",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    },
    { upsert: true },
  );

const categories = [
  { name: "Cleaning", slug: "cleaning", description: "Home and office cleaning services", sortOrder: 1 },
  { name: "Electrical", slug: "electrical", description: "Electrical repair and installation services", sortOrder: 2 },
  { name: "Plumbing", slug: "plumbing", description: "Plumbing repair and maintenance services", sortOrder: 3 },
  { name: "Appliance", slug: "appliance", description: "Appliance and air conditioning services", sortOrder: 4 },
  { name: "Painting", slug: "painting", description: "Painting and home decoration services", sortOrder: 5 },
];

for (const category of categories) {
  await ServiceCategory.updateOne(
    { slug: category.slug },
    { $setOnInsert: category },
    { upsert: true },
  );
}

const services = [
  {
    name: "Air Conditioner Cleaning",
    slug: "air-conditioner-cleaning",
    category: "appliance",
    pricingType: "FIXED",
    basePrice: 150000,
    estimatedDurationMinutes: 90,
  },
  {
    name: "Plumbing Repair",
    slug: "plumbing-repair",
    category: "plumbing",
    pricingType: "QUOTE_REQUIRED",
    basePrice: 0,
    estimatedDurationMinutes: 120,
  },
  {
    name: "Home Cleaning",
    slug: "home-cleaning",
    category: "cleaning",
    pricingType: "FIXED",
    basePrice: 200000,
    estimatedDurationMinutes: 120,
  },
  {
    name: "Electrical Repair",
    slug: "electrical-repair",
    category: "electrical",
    pricingType: "QUOTE_REQUIRED",
    basePrice: 0,
    estimatedDurationMinutes: 90,
  },
];
for (const { category: categorySlug, ...service } of services) {
  const category = await ServiceCategory.findOne({ slug: categorySlug });
  await Service.updateOne(
    { slug: service.slug },
    { $setOnInsert: { ...service, category: category._id } },
    { upsert: true },
  );
}
console.log("Seed completed. Admin: admin@homecare.local / ChangeMe123!");
process.exit(0);
};

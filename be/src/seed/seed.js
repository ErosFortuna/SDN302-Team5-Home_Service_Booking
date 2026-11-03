const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db.js");
const User = require("../modules/users/user.model.js");
const Service = require("../modules/services/service.model.js");

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

  const services = [
    {
      name: "Air Conditioner Cleaning",
      slug: "air-conditioner-cleaning",
      category: "AIR_CONDITIONING",
      pricingMode: "FIXED",
      basePrice: 150000,
    },
    {
      name: "Plumbing Repair",
      slug: "plumbing-repair",
      category: "PLUMBING",
      pricingMode: "QUOTE",
    },
    {
      name: "Home Cleaning",
      slug: "home-cleaning",
      category: "CLEANING",
      pricingMode: "FIXED",
      basePrice: 200000,
    },
    {
      name: "Electrical Repair",
      slug: "electrical-repair",
      category: "ELECTRICAL",
      pricingMode: "QUOTE",
    },
  ];
  for (const service of services)
    await Service.updateOne(
      { slug: service.slug },
      { $setOnInsert: service },
      { upsert: true },
    );
  console.log("Seed completed. Admin: admin@homecare.local / ChangeMe123!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});

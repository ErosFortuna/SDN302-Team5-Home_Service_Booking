/**
 * scripts/sync-indexes.js
 *
 * Synchronizes MongoDB collection indexes defined in Mongoose schemas.
 *
 * Usage:
 *   node scripts/sync-indexes.js          # Dry-run: inspects defined indexes without modifying DB
 *   node scripts/sync-indexes.js --apply  # Applies index synchronization via Model.syncIndexes()
 */

const { connectDB, disconnectDB } = require('../src/config/db.js');
const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const Service = require('../src/modules/services/service.model.js');
const ServiceCategory = require('../src/modules/categories/service-category.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const Availability = require('../src/modules/availability/availability.model.js');
const Complaint = require('../src/modules/complaints/complaint.model.js');
const Notification = require('../src/modules/notifications/notification.model.js');

const MODELS = [
  { name: 'User', model: User },
  { name: 'ProviderProfile', model: ProviderProfile },
  { name: 'Booking', model: Booking },
  { name: 'ServiceRequest', model: ServiceRequest },
  { name: 'Service', model: Service },
  { name: 'ServiceCategory', model: ServiceCategory },
  { name: 'Review', model: Review },
  { name: 'Availability', model: Availability },
  { name: 'Complaint', model: Complaint },
  { name: 'Notification', model: Notification },
];

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log(`\n======================================================`);
  console.log(`  MongoDB Schema Index Synchronization`);
  console.log(`  Mode: ${isApply ? 'APPLY (Mutating DB)' : 'DRY-RUN (Safe read-only inspection)'}`);
  console.log(`======================================================\n`);

  await connectDB();

  for (const { name, model } of MODELS) {
    console.log(`Model: [${name}]`);
    const schemaIndexes = model.schema.indexes();
    console.log(`  Schema defined indexes: ${schemaIndexes.length}`);
    for (const [fields, opts] of schemaIndexes) {
      console.log(`    - fields: ${JSON.stringify(fields)}${opts ? `, options: ${JSON.stringify(opts)}` : ''}`);
    }

    if (isApply) {
      try {
        const result = await model.syncIndexes();
        console.log(`  -> syncIndexes() result:`, result || 'Up to date');
      } catch (err) {
        console.error(`  -> ERROR syncing indexes for ${name}:`, err.message);
      }
    } else {
      console.log(`  -> [DRY-RUN] Pass --apply to create/sync indexes on DB.`);
    }
    console.log('');
  }

  await disconnectDB();
  console.log('Finished index synchronization inspection.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during sync-indexes:', err);
  process.exit(1);
});


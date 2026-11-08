/**
 * Migration Script: Remove Quotation Marketplace Model & Normalize Data
 *
 * Requirements:
 * 1. services: pricingType === 'QUOTE_REQUIRED' -> 'FROM', ensure basePrice >= 0
 * 2. servicerequests: status === 'QUOTED' -> 'OPEN', ensure declinedProviders: []
 * 3. bookings: unset legacy 'quote' field, ensure valid price
 * 4. quotes collection: drop (only with --apply)
 *
 * Usage:
 *   node be/scripts/migrate-remove-quote.js           # Dry-run mode (default, no changes committed)
 *   node be/scripts/migrate-remove-quote.js --apply   # Apply changes to MongoDB database
 */

// CLI script does not serve HTTP; ensure safe fallback for CLIENT_URL if unset
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');

async function runMigration() {
  const isApply = process.argv.includes('--apply');
  console.log('\n======================================================');
  console.log('[MIGRATION] Remove Quote & Policy Module');
  console.log(`[MODE] ${isApply ? '>>> APPLY (Modifying Database) <<<' : 'DRY RUN (Preview Only, No Changes)'}`);
  console.log('======================================================\n');

  await connectDB();
  const db = mongoose.connection.db;

  // ─── 1. Services Collection ───────────────────────────────────────────────
  console.log('--- Step 1: Services Collection ---');
  const servicesColl = db.collection('services');
  const quoteRequiredServices = await servicesColl.find({
    $or: [
      { pricingType: 'QUOTE_REQUIRED' },
      { pricingType: { $exists: false } },
      { basePrice: { $exists: false } },
      { basePrice: null },
    ],
  }).toArray();
  console.log(`Found ${quoteRequiredServices.length} services needing normalization.`);

  if (quoteRequiredServices.length > 0) {
    quoteRequiredServices.forEach((s) => {
      console.log(`  - [Service ${s.slug || s._id}]: pricingType=${s.pricingType}, basePrice=${s.basePrice}`);
    });

    if (isApply) {
      const typeRes = await servicesColl.updateMany(
        { pricingType: 'QUOTE_REQUIRED' },
        { $set: { pricingType: 'FROM' } }
      );
      console.log(`  -> Updated ${typeRes.modifiedCount} services to pricingType: 'FROM'.`);

      const priceRes = await servicesColl.updateMany(
        { $or: [{ basePrice: { $exists: false } }, { basePrice: null }] },
        { $set: { basePrice: 150000 } }
      );
      console.log(`  -> Set fallback basePrice: 150000 on ${priceRes.modifiedCount} services.`);
    } else {
      console.log(`  -> [DRY RUN] Would update pricingType to 'FROM' and default basePrice if missing.`);
    }
  }

  // ─── 2. ServiceRequests Collection ────────────────────────────────────────
  console.log('\n--- Step 2: ServiceRequests Collection ---');
  const requestsColl = db.collection('servicerequests');
  const quotedRequests = await requestsColl.find({ status: 'QUOTED' }).toArray();
  const missingDeclined = await requestsColl.find({ declinedProviders: { $exists: false } }).toArray();
  console.log(`Found ${quotedRequests.length} requests in status 'QUOTED'.`);
  console.log(`Found ${missingDeclined.length} requests missing 'declinedProviders' field.`);

  if (isApply) {
    if (quotedRequests.length > 0) {
      const qRes = await requestsColl.updateMany(
        { status: 'QUOTED' },
        { $set: { status: 'OPEN' } }
      );
      console.log(`  -> Reverted ${qRes.modifiedCount} requests from 'QUOTED' to 'OPEN'.`);
    }
    if (missingDeclined.length > 0) {
      const dRes = await requestsColl.updateMany(
        { declinedProviders: { $exists: false } },
        { $set: { declinedProviders: [] } }
      );
      console.log(`  -> Initialized 'declinedProviders: []' on ${dRes.modifiedCount} requests.`);
    }
  } else {
    if (quotedRequests.length > 0) {
      console.log(`  -> [DRY RUN] Would revert ${quotedRequests.length} requests to status 'OPEN'.`);
    }
    if (missingDeclined.length > 0) {
      console.log(`  -> [DRY RUN] Would initialize declinedProviders: [] on ${missingDeclined.length} requests.`);
    }
  }

  // ─── 3. Bookings Collection ───────────────────────────────────────────────
  console.log('\n--- Step 3: Bookings Collection ---');
  const bookingsColl = db.collection('bookings');
  const bookingsWithQuote = await bookingsColl.find({ quote: { $exists: true } }).toArray();
  const bookingsMissingPrice = await bookingsColl.find({
    $or: [{ price: { $exists: false } }, { price: null }],
  }).toArray();
  console.log(`Found ${bookingsWithQuote.length} bookings with legacy 'quote' field.`);
  console.log(`Found ${bookingsMissingPrice.length} bookings missing 'price' field.`);

  if (isApply) {
    if (bookingsWithQuote.length > 0) {
      const bRes = await bookingsColl.updateMany(
        { quote: { $exists: true } },
        { $unset: { quote: '' } }
      );
      console.log(`  -> Unset legacy 'quote' field on ${bRes.modifiedCount} bookings.`);
    }
    if (bookingsMissingPrice.length > 0) {
      const pRes = await bookingsColl.updateMany(
        { $or: [{ price: { $exists: false } }, { price: null }] },
        { $set: { price: 200000 } }
      );
      console.log(`  -> Assigned default price: 200000 to ${pRes.modifiedCount} bookings.`);
    }
  } else {
    if (bookingsWithQuote.length > 0) {
      console.log(`  -> [DRY RUN] Would unset legacy 'quote' field on ${bookingsWithQuote.length} bookings.`);
    }
    if (bookingsMissingPrice.length > 0) {
      console.log(`  -> [DRY RUN] Would set fallback price on ${bookingsMissingPrice.length} bookings.`);
    }
  }

  // ─── 4. Quotes Collection ─────────────────────────────────────────────────
  console.log('\n--- Step 4: Quotes Collection ---');
  const collections = await db.listCollections().toArray();
  const hasQuotesColl = collections.some((c) => c.name === 'quotes');
  if (hasQuotesColl) {
    const quotesCount = await db.collection('quotes').countDocuments();
    console.log(`Found legacy collection 'quotes' containing ${quotesCount} documents.`);
    if (isApply) {
      await db.collection('quotes').drop();
      console.log(`  -> Successfully dropped legacy collection 'quotes'.`);
    } else {
      console.log(`  -> [DRY RUN] Collection 'quotes' (${quotesCount} docs) would be dropped with --apply.`);
    }
  } else {
    console.log(`Collection 'quotes' does not exist in the database.`);
  }

  console.log('\n======================================================');
  console.log(`[MIGRATION COMPLETE] Finished in ${isApply ? 'APPLY' : 'DRY-RUN'} mode.`);
  console.log('======================================================\n');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('[MIGRATION ERROR]', err);
  process.exit(1);
});


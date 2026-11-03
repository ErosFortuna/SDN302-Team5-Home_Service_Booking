/**
 * Migration Script: Remove Quote & Refund Artifacts
 *
 * This script audits and normalizes database records following the deprecation
 * of quotation marketplace models and refund processing in the system.
 *
 * Default mode is DRY-RUN. To execute modifications against the database, pass the `--apply` flag.
 *
 * Checks & Actions performed:
 *  1. Complaints with legacy `refundAmount`:
 *     - Proposes / applies `$unset: { refundAmount: "" }`.
 *  2. ServiceRequests with status === 'QUOTED':
 *     - Warning only (alerts administrator that legacy requests need attention).
 *  3. Services with pricingType === 'QUOTE_REQUIRED' / ServiceCategories with pricingMode === 'REQUEST_QUOTE':
 *     - Warning only (alerts administrator of legacy catalog definitions).
 *  4. Bookings with paymentStatus === 'REFUNDED':
 *     - Warning only (alerts administrator of legacy payment records).
 *  5. Legacy `quotes` collection:
 *     - Checks existence and prints recommended drop command (does not drop automatically).
 *
 * Usage:
 *   node be/scripts/migrate-remove-quote-refund.js          # Dry-run audit mode (safe, no changes)
 *   node be/scripts/migrate-remove-quote-refund.js --apply  # Applies $unset on legacy complaint fields
 */

const mongoose = require('mongoose');
const { env } = require('../src/config/env.js');

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log(`\n======================================================`);
  console.log(`MIGRATION AUDIT: Remove Quote & Refund Data Artifacts`);
  console.log(`Mode: ${isApply ? 'APPLY (Modifications ENABLED)' : 'DRY-RUN (Safe Read-Only Audit)'}`);
  console.log(`======================================================\n`);

  try {
    console.log('Connecting to database...');
    await mongoose.connect(env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log(`Connected to database: ${db.databaseName}\n`);

    // ─── 1. Complaints with legacy refundAmount ────────────────────────────────
    console.log('--- 1. Complaints with legacy refundAmount ---');
    const complaintsColl = db.collection('complaints');
    const complaintsWithRefund = await complaintsColl
      .find({ refundAmount: { $exists: true } })
      .toArray();

    console.log(`Found ${complaintsWithRefund.length} complaint(s) containing legacy 'refundAmount' field.`);
    if (complaintsWithRefund.length > 0) {
      if (isApply) {
        const updateRes = await complaintsColl.updateMany(
          { refundAmount: { $exists: true } },
          { $unset: { refundAmount: '' } }
        );
        console.log(`  -> [APPLIED] Unset 'refundAmount' on ${updateRes.modifiedCount} complaint(s).`);
      } else {
        console.log(`  -> [DRY-RUN] Recommendation: Run with --apply to unset 'refundAmount' on ${complaintsWithRefund.length} complaint(s).`);
      }
    } else {
      console.log('  -> All complaints are clean. No legacy refundAmount fields found.');
    }

    // ─── 2. ServiceRequests with status === 'QUOTED' ──────────────────────────
    console.log('\n--- 2. ServiceRequests with status QUOTED ---');
    const requestsColl = db.collection('servicerequests');
    const quotedRequestsCount = await requestsColl.countDocuments({ status: 'QUOTED' });
    if (quotedRequestsCount > 0) {
      console.log(`  -> [WARNING] Found ${quotedRequestsCount} service request(s) with status 'QUOTED'.`);
      console.log(`     These requests should be reviewed manually or reverted to 'OPEN' via admin portal.`);
    } else {
      console.log(`  -> 0 service requests with status 'QUOTED' found.`);
    }

    // ─── 3. Services / Categories Pricing Artifacts ───────────────────────────
    console.log('\n--- 3. Catalog Pricing Artifacts ---');
    const servicesColl = db.collection('services');
    const quoteRequiredServicesCount = await servicesColl.countDocuments({ pricingType: 'QUOTE_REQUIRED' });
    if (quoteRequiredServicesCount > 0) {
      console.log(`  -> [WARNING] Found ${quoteRequiredServicesCount} service(s) with pricingType 'QUOTE_REQUIRED'.`);
      console.log(`     Recommendation: Update to pricingType 'FROM' or 'FIXED' with a valid basePrice.`);
    } else {
      console.log(`  -> 0 services with pricingType 'QUOTE_REQUIRED' found.`);
    }

    const categoriesColl = db.collection('servicecategories');
    const requestQuoteCategoriesCount = await categoriesColl.countDocuments({ pricingMode: 'REQUEST_QUOTE' });
    if (requestQuoteCategoriesCount > 0) {
      console.log(`  -> [WARNING] Found ${requestQuoteCategoriesCount} category/categories with pricingMode 'REQUEST_QUOTE'.`);
      console.log(`     Recommendation: Update pricingMode to 'FIXED'.`);
    } else {
      console.log(`  -> 0 categories with pricingMode 'REQUEST_QUOTE' found.`);
    }

    // ─── 4. Bookings with paymentStatus === 'REFUNDED' ────────────────────────
    console.log('\n--- 4. Bookings with paymentStatus REFUNDED ---');
    const bookingsColl = db.collection('bookings');
    const refundedBookingsCount = await bookingsColl.countDocuments({ paymentStatus: 'REFUNDED' });
    if (refundedBookingsCount > 0) {
      console.log(`  -> [WARNING] Found ${refundedBookingsCount} booking(s) with paymentStatus 'REFUNDED'.`);
      console.log(`     In this system, service payments are cash COD and compensations occur off-platform.`);
    } else {
      console.log(`  -> 0 bookings with paymentStatus 'REFUNDED' found.`);
    }

    // ─── 5. Legacy Quotes Collection ──────────────────────────────────────────
    console.log('\n--- 5. Legacy Quotes Collection ---');
    const collections = await db.listCollections().toArray();
    const hasQuotesColl = collections.some((c) => c.name === 'quotes');
    if (hasQuotesColl) {
      const quotesCount = await db.collection('quotes').countDocuments();
      console.log(`  -> [NOTICE] Legacy collection 'quotes' exists with ${quotesCount} document(s).`);
      console.log(`     To safely drop this collection manually, run in mongo shell:`);
      console.log(`       db.quotes.drop()`);
    } else {
      console.log(`  -> Legacy collection 'quotes' does not exist in the database.`);
    }

    console.log(`\n======================================================`);
    console.log(`Audit completed successfully.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Migration script failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };


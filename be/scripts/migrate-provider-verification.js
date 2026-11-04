/**
 * Migration script: Normalize ProviderProfile.verificationStatus ('APPROVED' -> 'VERIFIED')
 * and audit legacy profiles missing `location` or `city` due to previous dual-schema shadowing.
 *
 * Usage:
 *   Dry-run (default, read-only):
 *     node scripts/migrate-provider-verification.js
 *   Apply changes (idempotent):
 *     node scripts/migrate-provider-verification.js --apply
 */

const mongoose = require('mongoose');
const { env } = require('../src/config/env.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');

async function run() {
  const isApply = process.argv.includes('--apply');
  const modeLabel = isApply ? 'APPLY (WRITE)' : 'DRY-RUN (READ-ONLY)';

  console.log(`[migrate-provider-verification] Starting in ${modeLabel} mode...`);

  await mongoose.connect(env.mongoUri);
  const col = ProviderProfile.collection;

  try {
    // 1. Count profiles with verificationStatus === 'APPROVED'
    const approvedProfilesCount = await col.countDocuments({
      verificationStatus: 'APPROVED',
    });

    // 2. Count verificationLogs entries with status === 'APPROVED'
    const logAgg = await col
      .aggregate([
        { $match: { 'verificationLogs.status': 'APPROVED' } },
        { $unwind: '$verificationLogs' },
        { $match: { 'verificationLogs.status': 'APPROVED' } },
        { $count: 'totalApprovedLogEntries' },
      ])
      .toArray();
    const approvedLogsCount = logAgg[0]?.totalApprovedLogEntries || 0;
    const profilesWithApprovedLogsCount = await col.countDocuments({
      'verificationLogs.status': 'APPROVED',
    });

    // 3. Count profiles missing location (GeoJSON Point coordinates)
    const missingLocationCount = await col.countDocuments({
      $or: [
        { location: { $exists: false } },
        { location: null },
        { 'location.coordinates.0': { $exists: false } },
      ],
    });

    // 4. Count profiles missing city
    const missingCityCount = await col.countDocuments({
      $or: [
        { city: { $exists: false } },
        { city: null },
        { city: '' },
      ],
    });

    console.log('--- Audit Summary ---');
    console.log(`- Profiles with verificationStatus = 'APPROVED': ${approvedProfilesCount}`);
    console.log(
      `- verificationLogs entries with status = 'APPROVED': ${approvedLogsCount} (across ${profilesWithApprovedLogsCount} profiles)`
    );
    console.log(`- Profiles missing location (coordinates): ${missingLocationCount}`);
    console.log(`- Profiles missing city: ${missingCityCount}`);

    if (!isApply) {
      console.log(
        '\n[DRY-RUN] No changes were written. Re-run with --apply to migrate APPROVED -> VERIFIED.'
      );
      return;
    }

    // Apply idempotent updates
    const statusRes = await col.updateMany(
      { verificationStatus: 'APPROVED' },
      { $set: { verificationStatus: 'VERIFIED' } }
    );

    const logsRes = await col.updateMany(
      { 'verificationLogs.status': 'APPROVED' },
      { $set: { 'verificationLogs.$[elem].status': 'VERIFIED' } },
      { arrayFilters: [{ 'elem.status': 'APPROVED' }] }
    );

    console.log('\n--- Migration Applied ---');
    console.log(`- Profiles updated (APPROVED -> VERIFIED): ${statusRes.modifiedCount}`);
    console.log(`- Profiles with verificationLogs updated: ${logsRes.modifiedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[migrate-provider-verification] Failed:', err);
    process.exit(1);
  });
}

module.exports = { run };


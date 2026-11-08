/**
 * scripts/backfill-provider-profile.js
 *
 * Backfills and synchronizes `userStatus` and `fullName` on ProviderProfile documents
 * from their matching User document in MongoDB.
 *
 * Requirements:
 * - Safe by default: dry-run unless --apply is explicitly passed.
 * - Idempotent: re-running produces 0 changes.
 * - Batch processing: processes documents in configurable batches (default 100).
 * - No PII: does not log names, emails, phones, or addresses.
 * - Skips profiles without an associated User document.
 * - Reports statistics: total, needs update, skipped, errors.
 *
 * Usage:
 *   node be/scripts/backfill-provider-profile.js          # Dry-run preview (default)
 *   node be/scripts/backfill-provider-profile.js --apply  # Apply changes to database
 */

// CLI scripts do not serve HTTP; provide safe fallback for CLIENT_URL if unset
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const User = require('../src/modules/users/user.model.js');

/**
 * Backfills userStatus and fullName from User onto ProviderProfile.
 *
 * @param {object} [options]
 * @param {boolean} [options.isApply] - If true, persists updates to DB; otherwise dry-run.
 * @param {number} [options.batchSize] - Batch size for processing (default: 100).
 * @param {import('mongoose').Model} [options.ProviderProfileModel] - ProviderProfile model override (for tests).
 * @param {import('mongoose').Model} [options.UserModel] - User model override (for tests).
 * @param {function} [options.log] - Logging function (default: console.log).
 * @returns {Promise<{ total: number, needsUpdate: number, skipped: number, skippedAlreadyInSync: number, skippedMissingUser: number, applied: number, errors: number }>}
 */
async function backfillProviderProfiles(options = {}) {
  const isApply = options.isApply !== undefined ? Boolean(options.isApply) : process.argv.includes('--apply');
  const batchSize = Number(options.batchSize) > 0 ? Number(options.batchSize) : 100;
  const log = options.log || console.log;

  const ProfileModel = options.ProviderProfileModel || ProviderProfile;
  const UserModel = options.UserModel || User;

  log('\n======================================================');
  log('  Provider Profile Backfill (userStatus & fullName)');
  log(`  Mode: ${isApply ? '>>> APPLY (Modifying Database) <<<' : 'DRY RUN (Preview Only, No Changes)'}`);
  log(`  Batch Size: ${batchSize}`);
  log('======================================================\n');

  const stats = {
    total: 0,
    needsUpdate: 0,
    skipped: 0,
    skippedAlreadyInSync: 0,
    skippedMissingUser: 0,
    applied: 0,
    errors: 0,
  };

  const totalDocuments = await ProfileModel.countDocuments({});
  stats.total = totalDocuments;

  if (totalDocuments === 0) {
    log('No ProviderProfile records found.');
    printSummary(stats, isApply, log);
    return stats;
  }

  log(`Found ${totalDocuments} ProviderProfile document(s) to inspect in batches of ${batchSize}...\n`);

  let lastId = null;
  let batchIndex = 0;

  while (true) {
    batchIndex++;
    const query = lastId ? { _id: { $gt: lastId } } : {};
    let batch;

    try {
      batch = await ProfileModel.find(query)
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();
    } catch (err) {
      stats.errors++;
      log(`[ERROR] Failed to fetch batch #${batchIndex}: ${err.message}`);
      break;
    }

    if (!batch || batch.length === 0) {
      break;
    }

    lastId = batch[batch.length - 1]._id;

    // 1. Gather valid user ObjectIds from the batch
    const userIds = batch
      .map((p) => p.user)
      .filter((uid) => uid && mongoose.isValidObjectId(uid));

    // 2. Fetch all matching users in one query (no PII fetched beyond status and fullName)
    let userMap = new Map();
    if (userIds.length > 0) {
      try {
        const users = await UserModel.find({ _id: { $in: userIds } })
          .select('_id status fullName')
          .lean();
        userMap = new Map(users.map((u) => [u._id.toString(), u]));
      } catch (err) {
        stats.errors += batch.length;
        log(`[ERROR] Failed to fetch users for batch #${batchIndex}: ${err.message}`);
        continue;
      }
    }

    // 3. Compare each profile against its User document
    const batchUpdates = [];

    for (const profile of batch) {
      const userIdStr = profile.user?.toString();
      const user = userIdStr ? userMap.get(userIdStr) : null;

      if (!user) {
        // Skip profiles where user is missing or non-existent
        stats.skipped++;
        stats.skippedMissingUser++;
        continue;
      }

      const targetStatus = user.status || 'INACTIVE';
      const targetFullName = (user.fullName || '').trim();
      const currentStatus = profile.userStatus || 'INACTIVE';
      const currentFullName = (profile.fullName || '').trim();

      const statusChanged = currentStatus !== targetStatus;
      const nameChanged = currentFullName !== targetFullName;

      if (!statusChanged && !nameChanged) {
        // Profile is already synchronized
        stats.skipped++;
        stats.skippedAlreadyInSync++;
        continue;
      }

      stats.needsUpdate++;

      // Log difference without PII (only profile ID and status diff)
      const diffInfo = [];
      if (statusChanged) diffInfo.push(`userStatus: '${currentStatus}' -> '${targetStatus}'`);
      if (nameChanged) diffInfo.push('fullName needs sync');
      log(`  - Profile [${profile._id}]: ${diffInfo.join(', ')}`);

      if (isApply) {
        batchUpdates.push({
          updateOne: {
            filter: { _id: profile._id },
            update: {
              $set: {
                userStatus: targetStatus,
                fullName: targetFullName,
              },
            },
          },
        });
      }
    }

    // 4. Apply batch updates if in --apply mode
    if (isApply && batchUpdates.length > 0) {
      try {
        const bulkRes = await ProfileModel.bulkWrite(batchUpdates, { ordered: false });
        stats.applied += bulkRes.modifiedCount || batchUpdates.length;
      } catch (err) {
        stats.errors += batchUpdates.length;
        log(`[ERROR] bulkWrite failed for batch #${batchIndex}: ${err.message}`);
      }
    }
  }

  printSummary(stats, isApply, log);
  return stats;
}

/**
 * Prints clear statistics without PII.
 */
function printSummary(stats, isApply, log) {
  log('\n======================================================');
  log('  KẾT QUẢ TỔNG HỢP / SUMMARY');
  log('======================================================');
  log(`  - Tổng số profile (Total):         ${stats.total}`);
  log(`  - Cần cập nhật (Needs Update):     ${stats.needsUpdate}`);
  if (isApply) {
    log(`  - Đã cập nhật (Applied):           ${stats.applied}`);
  }
  log(`  - Bỏ qua (Skipped):                ${stats.skipped}`);
  log(`      + Đã đồng bộ sẵn (In sync):    ${stats.skippedAlreadyInSync}`);
  log(`      + Không có User (Missing):      ${stats.skippedMissingUser}`);
  log(`  - Lỗi (Errors):                    ${stats.errors}`);
  log('======================================================');

  if (!isApply) {
    log('\n-> [DRY RUN] No database modifications made.');
    log('-> Run with --apply to persist these updates to the database.\n');
  } else {
    log(`\n-> Successfully updated ${stats.applied} ProviderProfile document(s).\n`);
  }
}

async function main() {
  await connectDB();
  try {
    await backfillProviderProfiles();
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[FATAL ERROR] Backfill script terminated unexpectedly:', err);
    process.exit(1);
  });
}

module.exports = {
  backfillProviderProfiles,
};


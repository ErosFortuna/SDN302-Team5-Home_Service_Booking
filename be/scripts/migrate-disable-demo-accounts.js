/**
 * Migration Script: Disable Demo Accounts
 *
 * Finds every account matching `*.demo@homecare.local` and marks it INACTIVE so
 * it can no longer authenticate. Accounts are never deleted.
 *
 * Usage:
 *   node be/scripts/migrate-disable-demo-accounts.js           # Dry-run (default)
 *   node be/scripts/migrate-disable-demo-accounts.js --apply   # Apply changes
 *
 * Safe by default: without --apply nothing is written to the database.
 */

// CLI script does not serve HTTP; ensure safe fallback for CLIENT_URL if unset
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db.js');

const DEMO_EMAIL_PATTERN = /\.demo@homecare\.local$/i;
const DEMO_EMAIL_QUERY = { email: { $regex: '\\.demo@homecare\\.local$', $options: 'i' } };

async function runMigration() {
  const isApply = process.argv.includes('--apply');

  console.log('\n======================================================');
  console.log('[MIGRATION] Disable Demo Accounts (*.demo@homecare.local)');
  console.log(`[MODE] ${isApply ? '>>> APPLY (Modifying Database) <<<' : 'DRY RUN (Preview Only, No Changes)'}`);
  console.log('======================================================\n');

  await connectDB();
  const db = mongoose.connection.db;
  const usersColl = db.collection('users');

  const demoUsers = await usersColl
    .find(DEMO_EMAIL_QUERY, { projection: { email: 1, role: 1, status: 1 } })
    .toArray();

  console.log(`Found ${demoUsers.length} demo account(s) matching ${DEMO_EMAIL_PATTERN}.`);

  if (demoUsers.length === 0) {
    console.log('Nothing to do.');
  } else {
    demoUsers.forEach((user) => {
      console.log(`  - ${user.email} (role=${user.role || 'unknown'}, status=${user.status || 'unknown'})`);
    });

    const alreadyInactive = demoUsers.filter((user) => user.status === 'INACTIVE').length;
    console.log(`  -> ${alreadyInactive} already INACTIVE, ${demoUsers.length - alreadyInactive} would change.`);

    if (isApply) {
      const result = await usersColl.updateMany(DEMO_EMAIL_QUERY, { $set: { status: 'INACTIVE' } });
      console.log(
        `\n  -> APPLIED: set status=INACTIVE on ${result.modifiedCount} account(s) ` +
          `(${result.matchedCount} matched). No accounts were deleted.`,
      );
    } else {
      console.log('\n  -> [DRY RUN] Would set status=INACTIVE on the accounts listed above.');
      console.log('  -> Re-run with --apply to make the change.');
    }
  }

  console.log('\n======================================================');
  console.log(`[MIGRATION COMPLETE] Finished in ${isApply ? 'APPLY' : 'DRY-RUN'} mode.`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('[MIGRATION ERROR]', err);
  process.exit(1);
});

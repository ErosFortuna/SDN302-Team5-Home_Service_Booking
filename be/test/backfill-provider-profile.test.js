const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { backfillProviderProfiles } = require('../scripts/backfill-provider-profile.js');
const { syncProviderProfileFromUser } = require('../src/modules/users/user.service.js');
const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');

test('Backfill ProviderProfile: full test suite with in-memory MongoDB', async (t) => {
  let mongod = null;
  let conn = null;

  if (t && typeof t.after === 'function') {
    t.after(async () => {
      try {
        if (conn) await conn.close();
      } catch {}
      try {
        if (mongod) await mongod.stop();
      } catch {}
    });
  }

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    conn = await mongoose.createConnection(uri).asPromise();
  } catch (err) {
    if (err.message && /EACCES|permission|ENOTFOUND|Download failed/i.test(err.message)) {
      console.warn('[SKIP] Skipping Backfill ProviderProfile in-memory MongoDB test because network/loopback is restricted in current environment.');
      return;
    }
    throw err;
  }

  const UserMod = conn.model('User', User.schema);
  const ProfileMod = conn.model('ProviderProfile', ProviderProfile.schema);

  try {
    // 1. Setup seed data
    // User 1: ACTIVE, "Nguyen Van An" -> Profile 1: initially INACTIVE, no fullName
    const u1 = await UserMod.create({
      fullName: 'Nguyen Van An',
      email: 'an@test.local',
      passwordHash: 'dummy-hash',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    const p1 = await ProfileMod.create({
      user: u1._id,
      userStatus: 'INACTIVE',
      fullName: '',
      businessName: 'Thợ An',
      city: 'Đà Nẵng',
      serviceAreas: ['Hải Châu'],
      verificationStatus: 'VERIFIED',
    });

    // User 2: BLOCKED, "Tran Van Binh" -> Profile 2: initially ACTIVE, mismatched fullName
    const u2 = await UserMod.create({
      fullName: 'Tran Van Binh',
      email: 'binh@test.local',
      passwordHash: 'dummy-hash',
      role: 'PROVIDER',
      status: 'BLOCKED',
    });
    const p2 = await ProfileMod.create({
      user: u2._id,
      userStatus: 'ACTIVE',
      fullName: 'Old Name',
      businessName: 'Thợ Bình',
      city: 'Đà Nẵng',
      serviceAreas: ['Hải Châu'],
      verificationStatus: 'VERIFIED',
    });

    // User 3: ACTIVE, "Le Thi Cam" -> Profile 3: ALREADY IN SYNC
    const u3 = await UserMod.create({
      fullName: 'Le Thi Cam',
      email: 'cam@test.local',
      passwordHash: 'dummy-hash',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    const p3 = await ProfileMod.create({
      user: u3._id,
      userStatus: 'ACTIVE',
      fullName: 'Le Thi Cam',
      businessName: 'Thợ Cẩm',
      city: 'Đà Nẵng',
      serviceAreas: ['Hải Châu'],
      verificationStatus: 'VERIFIED',
    });

    // Profile 4: Orphan profile with null user (inserted via raw collection to simulate legacy/corrupted data)
    const p4Insert = await ProfileMod.collection.insertOne({
      user: null,
      userStatus: 'INACTIVE',
      fullName: 'Orphan Profile 1',
      businessName: 'Orphan Business',
      verificationStatus: 'REJECTED',
    });
    const p4 = { _id: p4Insert.insertedId };

    // Profile 5: Orphan profile with non-existent user ObjectId
    const nonExistentUserId = new mongoose.Types.ObjectId();
    const p5 = await ProfileMod.create({
      user: nonExistentUserId,
      userStatus: 'INACTIVE',
      fullName: 'Orphan Profile 2',
      businessName: 'Ghost Provider',
      verificationStatus: 'REJECTED',
    });

    // -------------------------------------------------------------------------
    // Test 1: Dry-run by default (isApply: false)
    // -------------------------------------------------------------------------
    const dryLogs = [];
    const dryStats = await backfillProviderProfiles({
      isApply: false,
      batchSize: 2, // Verify small batching logic
      ProviderProfileModel: ProfileMod,
      UserModel: UserMod,
      log: (msg) => dryLogs.push(msg),
    });

    assert.equal(dryStats.total, 5, 'Total inspected profiles should be 5');
    assert.equal(dryStats.needsUpdate, 2, '2 profiles (p1, p2) should need update');
    assert.equal(dryStats.applied, 0, 'No updates should be applied in dry-run mode');
    assert.equal(dryStats.skipped, 3, '3 profiles should be skipped (p3 already in sync, p4 & p5 missing users)');
    assert.equal(dryStats.skippedAlreadyInSync, 1);
    assert.equal(dryStats.skippedMissingUser, 2);
    assert.equal(dryStats.errors, 0);

    // Verify DB was NOT mutated in dry-run
    const p1AfterDry = await ProfileMod.findById(p1._id).lean();
    assert.equal(p1AfterDry.userStatus, 'INACTIVE', 'p1 userStatus must remain unchanged');
    assert.equal(p1AfterDry.fullName, '', 'p1 fullName must remain unchanged');

    const p2AfterDry = await ProfileMod.findById(p2._id).lean();
    assert.equal(p2AfterDry.userStatus, 'ACTIVE', 'p2 userStatus must remain unchanged');
    assert.equal(p2AfterDry.fullName, 'Old Name', 'p2 fullName must remain unchanged');

    // Verify NO PII in dryLogs (no emails, no phone numbers)
    const combinedDryLog = dryLogs.join('\n');
    assert.ok(!combinedDryLog.includes('an@test.local'));
    assert.ok(!combinedDryLog.includes('binh@test.local'));
    assert.ok(!combinedDryLog.includes('cam@test.local'));

    // -------------------------------------------------------------------------
    // Test 2: Apply mode (isApply: true)
    // -------------------------------------------------------------------------
    const applyLogs = [];
    const applyStats = await backfillProviderProfiles({
      isApply: true,
      batchSize: 2,
      ProviderProfileModel: ProfileMod,
      UserModel: UserMod,
      log: (msg) => applyLogs.push(msg),
    });

    assert.equal(applyStats.total, 5);
    assert.equal(applyStats.needsUpdate, 2);
    assert.equal(applyStats.applied, 2, 'Should apply updates to exactly 2 profiles');
    assert.equal(applyStats.skipped, 3);
    assert.equal(applyStats.skippedAlreadyInSync, 1);
    assert.equal(applyStats.skippedMissingUser, 2);
    assert.equal(applyStats.errors, 0);

    // Verify DB mutations were applied accurately
    const p1AfterApply = await ProfileMod.findById(p1._id).lean();
    assert.equal(p1AfterApply.userStatus, 'ACTIVE');
    assert.equal(p1AfterApply.fullName, 'Nguyen Van An');

    const p2AfterApply = await ProfileMod.findById(p2._id).lean();
    assert.equal(p2AfterApply.userStatus, 'BLOCKED');
    assert.equal(p2AfterApply.fullName, 'Tran Van Binh');

    const p3AfterApply = await ProfileMod.findById(p3._id).lean();
    assert.equal(p3AfterApply.userStatus, 'ACTIVE');
    assert.equal(p3AfterApply.fullName, 'Le Thi Cam');

    // Orphan profiles remain untouched
    const p4AfterApply = await ProfileMod.findById(p4._id).lean();
    assert.equal(p4AfterApply.fullName, 'Orphan Profile 1');

    const p5AfterApply = await ProfileMod.findById(p5._id).lean();
    assert.equal(p5AfterApply.fullName, 'Orphan Profile 2');

    // -------------------------------------------------------------------------
    // Test 3: Idempotence (re-running produces 0 updates)
    // -------------------------------------------------------------------------
    const repeatLogs = [];
    const repeatStats = await backfillProviderProfiles({
      isApply: true,
      batchSize: 2,
      ProviderProfileModel: ProfileMod,
      UserModel: UserMod,
      log: (msg) => repeatLogs.push(msg),
    });

    assert.equal(repeatStats.total, 5);
    assert.equal(repeatStats.needsUpdate, 0, 'On second run, needsUpdate must be 0');
    assert.equal(repeatStats.applied, 0, 'On second run, applied must be 0');
    assert.equal(repeatStats.skipped, 5, 'All 5 profiles must be skipped');
    assert.equal(repeatStats.skippedAlreadyInSync, 3, '3 profiles are now already in sync');
    assert.equal(repeatStats.skippedMissingUser, 2, '2 orphan profiles still skipped');
    assert.equal(repeatStats.errors, 0);

    // -------------------------------------------------------------------------
    // Test 4: Helper syncProviderProfileFromUser in user.service.js
    // -------------------------------------------------------------------------
    const tempUser = { status: 'ACTIVE', fullName: 'Custom Name Override' };
    // Temporarily swap mongoose models to test helper
    const origProfileUpdateOne = ProviderProfile.updateOne;
    let helperCapturedUpdate = null;
    ProviderProfile.updateOne = async (filter, update) => {
      helperCapturedUpdate = { filter, update };
      return { modifiedCount: 1 };
    };

    try {
      await syncProviderProfileFromUser('sample-profile-id', tempUser);
      assert.deepEqual(helperCapturedUpdate.filter, { _id: 'sample-profile-id' });
      assert.deepEqual(helperCapturedUpdate.update, {
        $set: { userStatus: 'ACTIVE', fullName: 'Custom Name Override' },
      });
    } finally {
      ProviderProfile.updateOne = origProfileUpdateOne;
    }
  } finally {
    await conn.close();
    await mongod.stop();
  }
});

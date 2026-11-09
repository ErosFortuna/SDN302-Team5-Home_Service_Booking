const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { maskMongoUri, pruneOldBackups } = require('../scripts/backup-mongodb.js');
const { isProductionUri } = require('../scripts/restore-mongodb.js');

test('V-26: maskMongoUri hides passwords in MongoDB URIs', () => {
  const standardUri = 'mongodb://app_user:SuperSecretPassword123@localhost:27017/homeservice';
  const maskedStandard = maskMongoUri(standardUri);
  assert.equal(maskedStandard, 'mongodb://app_user:***@localhost:27017/homeservice');
  assert.ok(!maskedStandard.includes('SuperSecretPassword123'));

  const srvUri = 'mongodb+srv://admin:MyStrongPass99@cluster0.abcde.mongodb.net/production';
  const maskedSrv = maskMongoUri(srvUri);
  assert.equal(maskedSrv, 'mongodb+srv://admin:***@cluster0.abcde.mongodb.net/production');
  assert.ok(!maskedSrv.includes('MyStrongPass99'));
});

test('V-26: isProductionUri detects production databases to prevent accidental restore', () => {
  assert.equal(isProductionUri('mongodb://user:pass@host/homeservice_production'), true);
  assert.equal(isProductionUri('mongodb+srv://user:pass@cluster.prod.mongodb.net/db'), true);
  assert.equal(isProductionUri('mongodb://user:pass@host/homeservice_staging'), false);
  assert.equal(isProductionUri('mongodb://localhost:27017/test_recovery'), false);
});

test('V-26: pruneOldBackups deletes files older than retention policy and preserves recent ones', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsb-backup-test-'));

  try {
    const now = Date.now();
    const oldFile = path.join(tmpDir, 'mongodb-old.gz');
    const recentFile = path.join(tmpDir, 'mongodb-recent.gz');
    const unrelatedFile = path.join(tmpDir, 'readme.txt');

    fs.writeFileSync(oldFile, 'dummy archive');
    fs.writeFileSync(recentFile, 'dummy archive');
    fs.writeFileSync(unrelatedFile, 'keep me');

    // Simulate old file from 10 days ago (older than 7 days retention)
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
    fs.utimesSync(oldFile, tenDaysAgo, tenDaysAgo);

    const pruned = pruneOldBackups(tmpDir, 7);
    assert.equal(pruned, 1, 'Should prune exactly 1 old archive');
    assert.equal(fs.existsSync(oldFile), false, 'Old archive must be deleted');
    assert.equal(fs.existsSync(recentFile), true, 'Recent archive must be kept');
    assert.equal(fs.existsSync(unrelatedFile), true, 'Unrelated files must never be touched');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});


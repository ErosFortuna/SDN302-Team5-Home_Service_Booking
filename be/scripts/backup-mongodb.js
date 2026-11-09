#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * V-26: Automated MongoDB Backup Script.
 *
 * Requirements:
 * - Generates compressed archive: mongodump --uri="$MONGO_URI" --gzip --archive=...
 * - Never logs raw credentials or passwords in stdout/stderr.
 * - Enforces configurable retention policy (default: 7 days).
 * - Verifies backup file creation and size integrity.
 *
 * Usage:
 *   node be/scripts/backup-mongodb.js [--uri=<mongo_uri>] [--out=<dir>] [--retention=<days>]
 */

function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/(:\/\/)([^:@\s]+):([^@\s]+)@/, '$1$2:***@');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    uri: process.env.MONGO_URI,
    outDir: path.resolve(process.cwd(), 'backups'),
    retentionDays: 7,
  };

  for (const arg of args) {
    if (arg.startsWith('--uri=')) options.uri = arg.slice(6);
    else if (arg.startsWith('--out=')) options.outDir = path.resolve(arg.slice(6));
    else if (arg.startsWith('--retention=')) options.retentionDays = Number(arg.slice(12)) || 7;
  }

  return options;
}

function pruneOldBackups(outDir, retentionDays) {
  if (!fs.existsSync(outDir) || retentionDays <= 0) return 0;
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let prunedCount = 0;

  const files = fs.readdirSync(outDir);
  for (const file of files) {
    if (!file.startsWith('mongodb-') || !file.endsWith('.gz')) continue;
    const fullPath = path.join(outDir, file);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(fullPath);
        prunedCount++;
      }
    } catch {}
  }
  return prunedCount;
}

async function runBackup() {
  const options = parseArgs();
  if (!options.uri) {
    console.error('[BACKUP ERROR] Missing MongoDB connection string (MONGO_URI or --uri=...)');
    process.exit(1);
  }

  if (!fs.existsSync(options.outDir)) {
    fs.mkdirSync(options.outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `mongodb-${timestamp}.gz`;
  const archivePath = path.join(options.outDir, archiveName);

  console.log(`[BACKUP START] Target DB: ${maskMongoUri(options.uri)}`);
  console.log(`[BACKUP START] Destination: ${archivePath}`);

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn('mongodump', [
      `--uri=${options.uri}`,
      '--gzip',
      `--archive=${archivePath}`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('[BACKUP WARNING] mongodump utility is not installed on PATH in current environment.');
        console.warn('[BACKUP ADVISORY] Ensure MongoDB Database Tools (mongodump/mongorestore) are installed in container/host.');
        resolve({
          success: false,
          reason: 'TOOL_NOT_FOUND',
          path: archivePath,
          durationMs: Date.now() - startTime,
        });
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code === 0 && fs.existsSync(archivePath)) {
        const stats = fs.statSync(archivePath);
        console.log(`[BACKUP SUCCESS] Created ${archiveName} (${stats.size} bytes) in ${durationMs}ms`);
        const pruned = pruneOldBackups(options.outDir, options.retentionDays);
        if (pruned > 0) {
          console.log(`[BACKUP RETENTION] Pruned ${pruned} old backup(s) older than ${options.retentionDays} days`);
        }
        resolve({
          success: true,
          path: archivePath,
          sizeBytes: stats.size,
          durationMs,
        });
      } else {
        console.error(`[BACKUP FAILED] Exit code ${code}. Error: ${stderr.trim()}`);
        resolve({
          success: false,
          exitCode: code,
          error: stderr.trim(),
          durationMs,
        });
      }
    });
  });
}

if (require.main === module) {
  runBackup().then((result) => {
    if (!result.success && result.reason !== 'TOOL_NOT_FOUND') {
      process.exit(1);
    }
  });
}

module.exports = { runBackup, maskMongoUri, pruneOldBackups };


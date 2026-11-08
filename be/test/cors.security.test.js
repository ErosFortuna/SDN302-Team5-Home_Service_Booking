const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { validateClientUrl, normalizeOrigin, env } = require('../src/config/env.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const app = require('../src/app.js');

test('V-15: validateClientUrl enforces safe CORS origins and rejects wildcards in production', async (t) => {
  await t.test('1. Rejects missing or empty CLIENT_URL in production (NODE_ENV=production)', () => {
    assert.throws(
      () => validateClientUrl(undefined, 'production'),
      /CLIENT_URL is missing in production environment/i,
    );
    assert.throws(
      () => validateClientUrl('', 'production'),
      /CLIENT_URL is missing in production environment/i,
    );
    assert.throws(
      () => validateClientUrl('   ', 'production'),
      /CLIENT_URL is missing in production environment/i,
    );
    assert.throws(
      () => validateClientUrl(null, 'production'),
      /CLIENT_URL is missing in production environment/i,
    );
  });

  await t.test('2. Rejects wildcard "*" in CLIENT_URL in production (NODE_ENV=production)', () => {
    assert.throws(
      () => validateClientUrl('*', 'production'),
      /CLIENT_URL cannot contain wildcard "\*"/i,
    );
    assert.throws(
      () => validateClientUrl('https://myhomecare.com, *', 'production'),
      /CLIENT_URL cannot contain wildcard "\*"/i,
    );
    assert.throws(
      () => validateClientUrl('https://*.myhomecare.com', 'production'),
      /CLIENT_URL cannot contain wildcard "\*"/i,
    );
  });

  await t.test('3. Unset or empty NODE_ENV is treated as production-safe and rejects missing CLIENT_URL / wildcard "*"', () => {
    assert.throws(
      () => validateClientUrl(undefined, undefined),
      /CLIENT_URL is missing in production environment/i,
    );
    assert.throws(
      () => validateClientUrl(undefined, ''),
      /CLIENT_URL is missing in production environment/i,
    );
    assert.throws(
      () => validateClientUrl('*', undefined),
      /CLIENT_URL cannot contain wildcard "\*"/i,
    );
    assert.throws(
      () => validateClientUrl('*', ''),
      /CLIENT_URL cannot contain wildcard "\*"/i,
    );
  });

  await t.test('4. Accepts valid single or multiple origins in production', () => {
    const single = validateClientUrl('https://myhomecare.com', 'production');
    assert.equal(single, 'https://myhomecare.com');

    const multiple = validateClientUrl('https://myhomecare.com, https://admin.myhomecare.com', 'production');
    assert.equal(multiple, 'https://myhomecare.com,https://admin.myhomecare.com');

    const trimmed = validateClientUrl('  https://myhomecare.com  ', 'production');
    assert.equal(trimmed, 'https://myhomecare.com');
  });

  await t.test('5. In development (NODE_ENV=development), missing CLIENT_URL is optional (returns empty string)', () => {
    assert.equal(validateClientUrl(undefined, 'development'), '');
    assert.equal(validateClientUrl('', 'development'), '');
    assert.equal(validateClientUrl('   ', 'development'), '');
  });

  await t.test('6. In development (NODE_ENV=development), wildcard "*" is permitted if explicitly configured', () => {
    assert.equal(validateClientUrl('*', 'development'), '*');
    assert.equal(validateClientUrl('http://localhost:3000', 'development'), 'http://localhost:3000');
  });

  await t.test('7. In test (NODE_ENV=test), missing CLIENT_URL is optional (returns empty string)', () => {
    assert.equal(validateClientUrl(undefined, 'test'), '');
    assert.equal(validateClientUrl('', 'test'), '');
  });

  await t.test('8. Normalizes origins during validation (strips trailing slashes, lowercases scheme+host, strips default ports)', () => {
    const normalized = validateClientUrl('  HTTPS://MyHomeCare.COM:443/ , HTTP://LocalHost:3000/  ', 'production');
    assert.equal(normalized, 'https://myhomecare.com,http://localhost:3000');
  });
});

test('V-15: normalizeOrigin helper cleans URLs, trims slashes, and lowercases scheme+host', () => {
  // Trailing slash removal
  assert.equal(normalizeOrigin('https://example.com/'), 'https://example.com');
  assert.equal(normalizeOrigin('https://example.com///'), 'https://example.com');
  assert.equal(normalizeOrigin('http://localhost:3000/'), 'http://localhost:3000');

  // Scheme and host lowercasing
  assert.equal(normalizeOrigin('HTTPS://EXAMPLE.COM'), 'https://example.com');
  assert.equal(normalizeOrigin('HTTPS://My-App.VN/'), 'https://my-app.vn');
  assert.equal(normalizeOrigin('HTTP://LocalHost:8081/'), 'http://localhost:8081');

  // Default port stripping (:80 for http, :443 for https)
  assert.equal(normalizeOrigin('https://example.com:443/'), 'https://example.com');
  assert.equal(normalizeOrigin('http://example.com:80/'), 'http://example.com');

  // Non-default ports preserved
  assert.equal(normalizeOrigin('https://example.com:8443/'), 'https://example.com:8443');
  assert.equal(normalizeOrigin('http://localhost:3000/'), 'http://localhost:3000');
  assert.equal(normalizeOrigin('http://127.0.0.1:8080/'), 'http://127.0.0.1:8080');

  // Wildcard preserved
  assert.equal(normalizeOrigin('*'), '*');
  assert.equal(normalizeOrigin('  *  '), '*');

  // Empty / invalid input returns empty string
  assert.equal(normalizeOrigin(''), '');
  assert.equal(normalizeOrigin('   '), '');
  assert.equal(normalizeOrigin(null), '');
  assert.equal(normalizeOrigin(undefined), '');
});

test('V-15: Process startup fail-fast when production config is missing CLIENT_URL or has wildcard', () => {
  const envScriptPath = path.resolve(__dirname, '../src/config/env.js');

  // Test 1: Production mode with missing CLIENT_URL
  const resultMissing = spawnSync(
    process.execPath,
    [
      '-e',
      `
      const dotenv = require('dotenv');
      dotenv.config = () => {};
      process.env.NODE_ENV = 'production';
      process.env.MONGO_URI = 'mongodb://localhost/test';
      process.env.JWT_SECRET = 'test_secret_value';
      delete process.env.CLIENT_URL;
      require('${envScriptPath.replace(/\\/g, '\\\\')}');
      `,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, CLIENT_URL: '' },
    },
  );

  assert.notEqual(resultMissing.status, 0, 'Process must exit with non-zero status when CLIENT_URL is missing in production');
  assert.match(
    resultMissing.stderr,
    /CLIENT_URL is missing in production environment/i,
    'Stderr must explain that CLIENT_URL is required in production',
  );

  // Test 2: Production mode with wildcard CLIENT_URL
  const resultWildcard = spawnSync(
    process.execPath,
    [
      '-e',
      `
      const dotenv = require('dotenv');
      dotenv.config = () => {};
      process.env.NODE_ENV = 'production';
      process.env.MONGO_URI = 'mongodb://localhost/test';
      process.env.JWT_SECRET = 'test_secret_value';
      process.env.CLIENT_URL = '*';
      require('${envScriptPath.replace(/\\/g, '\\\\')}');
      `,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, CLIENT_URL: '*' },
    },
  );

  assert.notEqual(resultWildcard.status, 0, 'Process must exit with non-zero status when CLIENT_URL contains wildcard in production');
  assert.match(
    resultWildcard.stderr,
    /CLIENT_URL cannot contain wildcard "\*"/i,
    'Stderr must explain that wildcard "*" is forbidden in production',
  );

  // Test 3: Unset NODE_ENV (production-safe default) with missing CLIENT_URL
  const resultUnsetEnv = spawnSync(
    process.execPath,
    [
      '-e',
      `
      const dotenv = require('dotenv');
      dotenv.config = () => {};
      delete process.env.NODE_ENV;
      process.env.MONGO_URI = 'mongodb://localhost/test';
      process.env.JWT_SECRET = 'test_secret_value';
      delete process.env.CLIENT_URL;
      require('${envScriptPath.replace(/\\/g, '\\\\')}');
      `,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: '', CLIENT_URL: '' },
    },
  );

  assert.notEqual(resultUnsetEnv.status, 0, 'Process must exit with non-zero status when NODE_ENV is unset and CLIENT_URL is missing');
  assert.match(
    resultUnsetEnv.stderr,
    /CLIENT_URL is missing in production environment/i,
    'Stderr must explain that CLIENT_URL is required in production-safe mode',
  );
});

test('V-15: Express app CORS middleware enforcement in development and production modes', async (t) => {
  const originalNodeEnv = env.nodeEnv;
  const originalClientUrl = env.clientUrl;

  t.afterEach(() => {
    env.nodeEnv = originalNodeEnv;
    env.clientUrl = originalClientUrl;
  });

  await t.test('Development mode: allows localhost and 127.0.0.1 on any port, rejects untrusted origins by default', async () => {
    env.nodeEnv = 'development';
    env.clientUrl = '';

    // Localhost port 3000 allowed
    const resLocal3000 = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'http://localhost:3000' },
    });
    assert.equal(resLocal3000.status, 200);
    assert.equal(resLocal3000.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(resLocal3000.headers['access-control-allow-credentials'], 'true');

    // 127.0.0.1 port 8080 allowed
    const resIp8080 = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'http://127.0.0.1:8080' },
    });
    assert.equal(resIp8080.status, 200);
    assert.equal(resIp8080.headers['access-control-allow-origin'], 'http://127.0.0.1:8080');

    // Untrusted external origin rejected when CLIENT_URL is empty
    const resEvil = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://attacker-site.com' },
    });
    assert.equal(resEvil.status, 200);
    assert.equal(resEvil.headers['access-control-allow-origin'], undefined, 'Untrusted origin should NOT get CORS header');

    // Non-browser request without Origin header is allowed
    const resNoOrigin = await dispatch(app, {
      method: 'GET',
      url: '/',
    });
    assert.equal(resNoOrigin.status, 200);
  });

  await t.test('Development mode with explicit CLIENT_URL="*": allows wildcard cross-origin', async () => {
    env.nodeEnv = 'development';
    env.clientUrl = '*';

    const resWildcard = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://attacker-site.com' },
    });
    assert.equal(resWildcard.status, 200);
    assert.equal(resWildcard.headers['access-control-allow-origin'], 'https://attacker-site.com');
  });

  await t.test('Production mode: only configured origins are allowed; localhost and untrusted origins are blocked', async () => {
    env.nodeEnv = 'production';
    env.clientUrl = 'https://myhomecare.com, https://admin.myhomecare.com';

    // Configured production domain 1 allowed
    const resDomain1 = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://myhomecare.com' },
    });
    assert.equal(resDomain1.status, 200);
    assert.equal(resDomain1.headers['access-control-allow-origin'], 'https://myhomecare.com');
    assert.equal(resDomain1.headers['access-control-allow-credentials'], 'true');

    // Configured production domain 2 allowed
    const resDomain2 = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://admin.myhomecare.com' },
    });
    assert.equal(resDomain2.status, 200);
    assert.equal(resDomain2.headers['access-control-allow-origin'], 'https://admin.myhomecare.com');

    // Localhost MUST BE BLOCKED in production
    const resLocal = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'http://localhost:3000' },
    });
    assert.equal(resLocal.headers['access-control-allow-origin'], undefined, 'Localhost must not be allowed in production');

    // 127.0.0.1 MUST BE BLOCKED in production
    const resIp = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'http://127.0.0.1:3000' },
    });
    assert.equal(resIp.headers['access-control-allow-origin'], undefined, '127.0.0.1 must not be allowed in production');

    // Attacker domain MUST BE BLOCKED in production
    const resEvil = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://attacker-site.com' },
    });
    assert.equal(resEvil.headers['access-control-allow-origin'], undefined, 'Untrusted origin must not be allowed in production');

    // Preflight OPTIONS request for configured origin returns 204 with allow headers
    const resPreflightAllowed = await dispatch(app, {
      method: 'OPTIONS',
      url: '/api/auth/me',
      headers: {
        origin: 'https://myhomecare.com',
        'access-control-request-method': 'GET',
      },
    });
    assert.equal(resPreflightAllowed.headers['access-control-allow-origin'], 'https://myhomecare.com');

    // Preflight OPTIONS request for unauthorized origin does not return CORS allow header
    const resPreflightBlocked = await dispatch(app, {
      method: 'OPTIONS',
      url: '/api/auth/me',
      headers: {
        origin: 'https://attacker-site.com',
        'access-control-request-method': 'GET',
      },
    });
    assert.equal(resPreflightBlocked.headers['access-control-allow-origin'], undefined);
  });

  await t.test('Non-development mode (e.g. staging): does not allow dev wildcard or unconfigured localhost', async () => {
    env.nodeEnv = 'staging';
    env.clientUrl = 'https://staging.myhomecare.com';

    // Configured origin allowed
    const resStaging = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://staging.myhomecare.com' },
    });
    assert.equal(resStaging.headers['access-control-allow-origin'], 'https://staging.myhomecare.com');

    // Localhost rejected
    const resLocal = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'http://localhost:3000' },
    });
    assert.equal(resLocal.headers['access-control-allow-origin'], undefined);

    // Attacker rejected
    const resAttacker = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://attacker.com' },
    });
    assert.equal(resAttacker.headers['access-control-allow-origin'], undefined);
  });

  await t.test('Normalized Origin matching: trailing slashes, uppercase schemes/hosts, and default ports match correctly', async () => {
    env.nodeEnv = 'production';
    // Configured with trailing slash, uppercase host, and default port
    env.clientUrl = 'HTTPS://MyHomeCare.COM:443/, http://localhost:8081/';

    // Incoming request without trailing slash and lowercase matches
    const res1 = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'https://myhomecare.com' },
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.headers['access-control-allow-origin'], 'https://myhomecare.com');

    // Incoming request with trailing slash and uppercase scheme matches
    const res2 = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'HTTPS://MYHOMECARE.COM/' },
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.headers['access-control-allow-origin'], 'HTTPS://MYHOMECARE.COM/');

    // Expo web origin on port 8081 matches
    const resExpo = await dispatch(app, {
      method: 'GET',
      url: '/',
      headers: { origin: 'http://localhost:8081' },
    });
    assert.equal(resExpo.status, 200);
    assert.equal(resExpo.headers['access-control-allow-origin'], 'http://localhost:8081');
  });
});

test('V-15: Development wildcard "*" logs a console.warn exactly once', () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));

  try {
    app.resetDevWildcardWarned();

    // First call: should log warning
    app.checkAndWarnDevWildcard('*', 'development');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /CORS wildcard "\*" is enabled in development mode/i);

    // Second call: should NOT log again (once at startup guarantee)
    app.checkAndWarnDevWildcard('*', 'development');
    assert.equal(warnings.length, 1, 'Warning should be logged only once');

    // Calling in production mode with wildcard: should not trigger dev warning
    app.resetDevWildcardWarned();
    app.checkAndWarnDevWildcard('https://myhomecare.com', 'production');
    assert.equal(warnings.length, 1, 'Non-wildcard should not trigger warning');
  } finally {
    console.warn = originalWarn;
    app.resetDevWildcardWarned();
  }
});

test('V-15: Seed and migration CLI scripts load safely even when NODE_ENV and CLIENT_URL are unset', () => {
  const seedScriptPath = path.resolve(__dirname, '../src/seed/seed.js');
  const migrationScriptPath = path.resolve(__dirname, '../scripts/migrate-create-booking-indexes.js');

  // Verify seed entry point does not throw on require when NODE_ENV & CLIENT_URL are unset
  const seedResult = spawnSync(
    process.execPath,
    [
      '-e',
      `
      delete process.env.NODE_ENV;
      delete process.env.CLIENT_URL;
      const seed = require('${seedScriptPath.replace(/\\/g, '\\\\')}');
      console.log('Seed export loaded safely:', typeof seed.seedFullProject);
      `,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: '', CLIENT_URL: '' },
    },
  );
  assert.equal(seedResult.status, 0, `Seed script must load without crashing: ${seedResult.stderr}`);
  assert.match(seedResult.stdout, /Seed export loaded safely: function/);

  // Verify migration script does not fail due to CLIENT_URL when NODE_ENV is unset
  const migrationResult = spawnSync(
    process.execPath,
    [
      '-e',
      `
      delete process.env.NODE_ENV;
      delete process.env.CLIENT_URL;
      // Require the script module (without running main)
      require('${migrationScriptPath.replace(/\\/g, '\\\\')}');
      console.log('Migration script loaded safely');
      `,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: '', CLIENT_URL: '' },
    },
  );
  assert.equal(migrationResult.status, 0, `Migration script must load without crashing: ${migrationResult.stderr}`);
  assert.match(migrationResult.stdout, /Migration script loaded safely/);
});


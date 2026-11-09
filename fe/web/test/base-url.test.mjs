import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeApiBaseUrl,
  buildApiUrl,
  getApiBaseUrl,
} from '../lib/api/base-url.ts';

describe('normalizeApiBaseUrl', () => {
  test('defaults to /api for empty or missing inputs', () => {
    assert.strictEqual(normalizeApiBaseUrl(), '/api');
    assert.strictEqual(normalizeApiBaseUrl(null), '/api');
    assert.strictEqual(normalizeApiBaseUrl(''), '/api');
    assert.strictEqual(normalizeApiBaseUrl('   '), '/api');
    assert.strictEqual(normalizeApiBaseUrl('/'), '/api');
    assert.strictEqual(normalizeApiBaseUrl('///'), '/api');
  });

  test('normalizes relative /api paths and strips trailing slashes', () => {
    assert.strictEqual(normalizeApiBaseUrl('/api'), '/api');
    assert.strictEqual(normalizeApiBaseUrl('/api/'), '/api');
    assert.strictEqual(normalizeApiBaseUrl('/api///'), '/api');
    assert.strictEqual(normalizeApiBaseUrl('api'), '/api');
    assert.strictEqual(normalizeApiBaseUrl('api/'), '/api');
  });

  test('adds /api to absolute URLs without /api, stripping trailing slashes', () => {
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000/'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000///'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('https://api.example.com'), 'https://api.example.com/api');
    assert.strictEqual(normalizeApiBaseUrl('https://api.example.com/'), 'https://api.example.com/api');
  });

  test('preserves existing /api on absolute URLs, stripping trailing slashes', () => {
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000/api'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000/api/'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000/api///'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000//api'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('http://localhost:5000//api/'), 'http://localhost:5000/api');
    assert.strictEqual(normalizeApiBaseUrl('https://api.example.com/api'), 'https://api.example.com/api');
    assert.strictEqual(normalizeApiBaseUrl('https://api.example.com/api/'), 'https://api.example.com/api');
  });
});

describe('buildApiUrl', () => {
  test('builds endpoints with default base (/api) without duplicate slashes', () => {
    assert.strictEqual(buildApiUrl('/service-categories', ''), '/api/service-categories');
    assert.strictEqual(buildApiUrl('service-categories', ''), '/api/service-categories');
    assert.strictEqual(buildApiUrl('//service-categories', ''), '/api/service-categories');
    assert.strictEqual(buildApiUrl('/services', ''), '/api/services');
    assert.strictEqual(buildApiUrl('//services', ''), '/api/services');
    assert.strictEqual(buildApiUrl('/auth/login', ''), '/api/auth/login');
    assert.strictEqual(buildApiUrl('//auth/login', ''), '/api/auth/login');
  });

  test('builds endpoints with absolute base missing /api (fixes http://localhost:5000/service-categories)', () => {
    assert.strictEqual(
      buildApiUrl('/service-categories', 'http://localhost:5000'),
      'http://localhost:5000/api/service-categories',
    );
    assert.strictEqual(
      buildApiUrl('/service-categories', 'http://localhost:5000/'),
      'http://localhost:5000/api/service-categories',
    );
    assert.strictEqual(
      buildApiUrl('service-categories', 'http://localhost:5000'),
      'http://localhost:5000/api/service-categories',
    );
  });

  test('builds endpoints without duplicate slashes (fixes http://localhost:5000//services and //auth/login)', () => {
    assert.strictEqual(
      buildApiUrl('/services', 'http://localhost:5000/'),
      'http://localhost:5000/api/services',
    );
    assert.strictEqual(
      buildApiUrl('//services', 'http://localhost:5000/'),
      'http://localhost:5000/api/services',
    );
    assert.strictEqual(
      buildApiUrl('//auth/login', 'http://localhost:5000/'),
      'http://localhost:5000/api/auth/login',
    );
    assert.strictEqual(
      buildApiUrl('/auth/login', 'http://localhost:5000/api/'),
      'http://localhost:5000/api/auth/login',
    );
    assert.strictEqual(
      buildApiUrl('//auth/login', 'http://localhost:5000/api/'),
      'http://localhost:5000/api/auth/login',
    );
  });
});

describe('getApiBaseUrl', () => {
  const origApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const origApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (origApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = origApiUrl;

    if (origApiBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = origApiBaseUrl;
  });

  test('falls back to /api when env vars are unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    assert.strictEqual(getApiBaseUrl(), '/api');
  });

  test('uses normalized NEXT_PUBLIC_API_URL when set', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000';
    assert.strictEqual(getApiBaseUrl(), 'http://localhost:5000/api');

    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:5000/api/';
    assert.strictEqual(getApiBaseUrl(), 'http://localhost:5000/api');
  });

  test('falls back to NEXT_PUBLIC_API_BASE_URL if NEXT_PUBLIC_API_URL unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:5000/';
    assert.strictEqual(getApiBaseUrl(), 'http://localhost:5000/api');
  });
});

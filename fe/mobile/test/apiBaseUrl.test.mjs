import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveApiBaseUrl,
  isPrivateOrLocalHost,
  isPlaceholderHost,
} from '../src/services/apiBaseUrl.js';

describe('V-20: isPrivateOrLocalHost', () => {
  test('identifies localhost and loopback hostnames', () => {
    assert.strictEqual(isPrivateOrLocalHost('localhost'), true);
    assert.strictEqual(isPrivateOrLocalHost('LOCALHOST'), true);
    assert.strictEqual(isPrivateOrLocalHost('api.localhost'), true);
    assert.strictEqual(isPrivateOrLocalHost('app.local'), true);
    assert.strictEqual(isPrivateOrLocalHost('0.0.0.0'), true);
  });

  test('identifies IPv4 loopback (127.0.0.0/8)', () => {
    assert.strictEqual(isPrivateOrLocalHost('127.0.0.1'), true);
    assert.strictEqual(isPrivateOrLocalHost('127.1.2.3'), true);
  });

  test('identifies Android emulator host and 10.0.0.0/8 private range', () => {
    assert.strictEqual(isPrivateOrLocalHost('10.0.2.2'), true);
    assert.strictEqual(isPrivateOrLocalHost('10.1.1.1'), true);
  });

  test('identifies 172.16.0.0/12 and 192.168.0.0/16 private ranges', () => {
    assert.strictEqual(isPrivateOrLocalHost('172.16.0.1'), true);
    assert.strictEqual(isPrivateOrLocalHost('172.31.255.254'), true);
    assert.strictEqual(isPrivateOrLocalHost('172.32.0.1'), false); // public
    assert.strictEqual(isPrivateOrLocalHost('192.168.1.100'), true);
    assert.strictEqual(isPrivateOrLocalHost('192.169.1.1'), false); // public
  });

  test('identifies IPv6 loopback and link-local/ULA', () => {
    assert.strictEqual(isPrivateOrLocalHost('::1'), true);
    assert.strictEqual(isPrivateOrLocalHost('[::1]'), true);
    assert.strictEqual(isPrivateOrLocalHost('fe80::1'), true);
    assert.strictEqual(isPrivateOrLocalHost('fc00::1'), true);
  });

  test('allows legitimate public hostnames and public IPs', () => {
    assert.strictEqual(isPrivateOrLocalHost('api.homecare.vn'), false);
    assert.strictEqual(isPrivateOrLocalHost('api.production.mybusiness.vn'), false);
    assert.strictEqual(isPrivateOrLocalHost('203.113.130.1'), false);
  });
});

describe('V-20: isPlaceholderHost', () => {
  test('detects example.com and subdomains', () => {
    assert.strictEqual(isPlaceholderHost('example.com'), true);
    assert.strictEqual(isPlaceholderHost('api.example.com'), true);
    assert.strictEqual(isPlaceholderHost('test.sub.example.com'), true);
    assert.strictEqual(isPlaceholderHost('example.org'), true);
    assert.strictEqual(isPlaceholderHost('example.net'), true);
  });

  test('detects yourdomain.com and subdomains', () => {
    assert.strictEqual(isPlaceholderHost('yourdomain.com'), true);
    assert.strictEqual(isPlaceholderHost('api.yourdomain.com'), true);
    assert.strictEqual(isPlaceholderHost('backend.yourdomain.com'), true);
  });

  test('allows actual real-world production hostnames', () => {
    assert.strictEqual(isPlaceholderHost('api.homecare.vn'), false);
    assert.strictEqual(isPlaceholderHost('app.servicebooking.com'), false);
  });
});

describe('V-20: resolveApiBaseUrl', () => {
  describe('Development mode (isDev: true)', () => {
    test('falls back to 10.0.2.2 on Android when apiUrl is missing', () => {
      const url = resolveApiBaseUrl({ isDev: true, platform: 'android' });
      assert.strictEqual(url, 'http://10.0.2.2:5173/api');
    });

    test('falls back to localhost on iOS/web when apiUrl is missing', () => {
      const urlIos = resolveApiBaseUrl({ isDev: true, platform: 'ios' });
      assert.strictEqual(urlIos, 'http://localhost:5173/api');

      const urlWeb = resolveApiBaseUrl({ isDev: true, platform: 'web' });
      assert.strictEqual(urlWeb, 'http://localhost:5173/api');
    });

    test('uses the local Expo dev-server host for iOS devices when apiUrl is missing', () => {
      const url = resolveApiBaseUrl({
        isDev: true,
        platform: 'ios',
        hostUri: '172.20.10.5:8081',
      });
      assert.strictEqual(url, 'http://172.20.10.5:5173/api');
    });

    test('does not use public Expo tunnel hosts as backend hosts', () => {
      const url = resolveApiBaseUrl({
        isDev: true,
        platform: 'ios',
        hostUri: 'example.exp.direct:80',
      });
      assert.strictEqual(url, 'http://localhost:5173/api');
    });

    test('uses configured apiUrl in dev and strips trailing slash', () => {
      const url = resolveApiBaseUrl({
        isDev: true,
        apiUrl: 'http://192.168.1.50:5173/api/',
        platform: 'android',
      });
      assert.strictEqual(url, 'http://192.168.1.50:5173/api');
    });
  });

  describe('Production mode (isDev: false)', () => {
    test('throws if EXPO_PUBLIC_API_URL is missing or empty', () => {
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false }),
        /EXPO_PUBLIC_API_URL là bắt buộc/
      );
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: '   ' }),
        /EXPO_PUBLIC_API_URL là bắt buộc/
      );
    });

    test('throws if EXPO_PUBLIC_API_URL is an invalid URL string', () => {
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'not-a-url' }),
        /không phải là URL hợp lệ/
      );
    });

    test('throws if EXPO_PUBLIC_API_URL protocol is http:', () => {
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'http://api.production.com/api' }),
        /phải sử dụng giao thức HTTPS/
      );
    });

    test('throws if EXPO_PUBLIC_API_URL targets localhost or 127.0.0.1 in production', () => {
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://localhost:5173/api' }),
        /không được sử dụng địa chỉ local\/private/
      );
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://127.0.0.1:5173/api' }),
        /không được sử dụng địa chỉ local\/private/
      );
    });

    test('throws if EXPO_PUBLIC_API_URL targets 10.0.2.2 or private IP in production', () => {
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://10.0.2.2:5173/api' }),
        /không được sử dụng địa chỉ local\/private/
      );
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://192.168.1.10:5173/api' }),
        /không được sử dụng địa chỉ local\/private/
      );
    });

    test('throws if EXPO_PUBLIC_API_URL uses a placeholder hostname', () => {
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://api.yourdomain.com/api' }),
        /hostname placeholder/
      );
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://example.com/api' }),
        /hostname placeholder/
      );
      assert.throws(
        () => resolveApiBaseUrl({ isDev: false, apiUrl: 'https://api.example.com/api' }),
        /hostname placeholder/
      );
    });

    test('returns valid public HTTPS URL in production and strips trailing slash', () => {
      const url = resolveApiBaseUrl({
        isDev: false,
        apiUrl: 'https://api.homecare.vn/api///',
      });
      assert.strictEqual(url, 'https://api.homecare.vn/api');
    });
  });
});

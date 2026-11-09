const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  captureError,
  captureSecurityEvent,
  setMonitoringSink,
  maskEmail,
  maskPhone,
} = require('../src/shared/monitoring.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const app = require('../src/app.js');

test('V-26: monitoring module captures structured errors with sanitized details', () => {
  const records = [];
  setMonitoringSink((record) => records.push(record));

  try {
    const error = new Error('Database connection dropped');
    error.code = 'ECONNREFUSED';

    const result = captureError(error, {
      correlationId: 'test-req-1234',
      eventType: 'DATABASE_ERROR',
      userEmail: 'alice.customer@example.com',
      userPhone: '0901234567',
      password: 'PlainSecretPassword!',
      accessToken: 'jwt.token.string',
      bookingId: 'booking_abc',
    });

    assert.equal(records.length, 1);
    assert.equal(result.severity, 'error');
    assert.equal(result.eventType, 'DATABASE_ERROR');
    assert.equal(result.correlationId, 'test-req-1234');
    assert.equal(result.message, 'Database connection dropped');
    assert.ok(result.timestamp);

    // Verify sensitive secrets are never logged
    assert.equal(result.details.password, undefined);
    assert.equal(result.details.accessToken, undefined);

    // Verify PII masking
    assert.equal(result.details.userEmail, 'a***r@example.com');
    assert.equal(result.details.userPhone, '***4567');
    assert.equal(result.details.bookingId, 'booking_abc');
  } finally {
    setMonitoringSink(null);
  }
});

test('V-26: monitoring captures security events with warn severity', () => {
  const records = [];
  setMonitoringSink((record) => records.push(record));

  try {
    captureSecurityEvent('REFRESH_TOKEN_REUSE_BLOCKED', {
      actorId: 'usr_bad_actor',
      ip: '192.168.1.100',
    });

    assert.equal(records.length, 1);
    assert.equal(records[0].severity, 'warn');
    assert.equal(records[0].eventType, 'REFRESH_TOKEN_REUSE_BLOCKED');
    assert.equal(records[0].details.actorId, 'usr_bad_actor');
    assert.equal(records[0].details.ip, '192.168.1.100');
  } finally {
    setMonitoringSink(null);
  }
});

test('V-26: Express app assigns and returns X-Correlation-ID header', async () => {
  const resDefault = await dispatch(app, { url: '/' });
  assert.equal(resDefault.statusCode, 200);
  assert.ok(resDefault.headers['x-correlation-id'], 'Must generate X-Correlation-ID');

  const customId = 'client-cid-999';
  const resCustom = await dispatch(app, {
    url: '/',
    headers: { 'x-correlation-id': customId },
  });
  assert.equal(resCustom.statusCode, 200);
  assert.equal(resCustom.headers['x-correlation-id'], customId);
});

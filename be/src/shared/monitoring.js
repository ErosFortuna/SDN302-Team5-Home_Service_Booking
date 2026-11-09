const crypto = require('crypto');
const { sanitizeDetails, maskEmail, maskPhone } = require('./audit-logger.js');

/**
 * V-26: Production Monitoring and Error Reporting Module.
 *
 * Requirements:
 * - Structured logging with severity level, event type, correlation ID, timestamp.
 * - Strict PII and secret protection: passwords, tokens, cookies, auth headers,
 *   keys, and credit card numbers are stripped; emails and phone numbers masked.
 * - Pluggable Sentry/APM adapter via SENTRY_DSN environment variable.
 * - Test sink support to facilitate automated regression assertions.
 */

let sentryClient = null;
let customMonitoringSink = null;

function initMonitoring() {
  const dsn = (process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    return { enabled: false, provider: 'none' };
  }

  try {
    // Optional integration: Sentry Node SDK if installed
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      beforeSend(event) {
        // Double-check no auth tokens or cookies escape to Sentry
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-csrf-token'];
        }
        return event;
      },
    });
    sentryClient = Sentry;
    return { enabled: true, provider: 'sentry' };
  } catch {
    // Sentry SDK not installed; graceful fallback
    return { enabled: false, provider: 'missing_sdk' };
  }
}

function setMonitoringSink(sink) {
  customMonitoringSink = typeof sink === 'function' ? sink : null;
}

function captureError(error, context = {}) {
  const correlationId =
    context.correlationId ||
    context.req?.correlationId ||
    context.req?.id ||
    (typeof context.req?.get === 'function' && context.req.get('x-correlation-id')) ||
    null;

  const eventType = context.eventType || 'APPLICATION_ERROR';
  const severity = context.severity || 'error';

  const sanitizedContext = sanitizeDetails({
    ...context,
    req: undefined, // Do not stringify the complex Express request object
  });

  const record = {
    timestamp: new Date().toISOString(),
    severity,
    eventType,
    correlationId: correlationId ? String(correlationId) : null,
    message: error?.message || String(error || 'Unknown error'),
    name: error?.name || 'Error',
    code: error?.code || error?.statusCode || null,
    ...(process.env.NODE_ENV !== 'production' && error?.stack ? { stack: error.stack } : {}),
    details: sanitizedContext,
  };

  if (customMonitoringSink) {
    try {
      customMonitoringSink(record);
    } catch {}
  }

  if (sentryClient) {
    try {
      sentryClient.withScope((scope) => {
        if (correlationId) scope.setTag('correlationId', correlationId);
        scope.setTag('eventType', eventType);
        scope.setLevel(severity === 'warn' ? 'warning' : 'error');
        scope.setContext('details', sanitizedContext);
        sentryClient.captureException(error);
      });
    } catch {}
  }

  try {
    process.stderr.write(JSON.stringify(record) + '\n');
  } catch {}

  return record;
}

function captureSecurityEvent(eventType, context = {}) {
  return captureError(new Error(`Security event: ${eventType}`), {
    ...context,
    eventType,
    severity: context.severity || 'warn',
  });
}

module.exports = {
  initMonitoring,
  captureError,
  captureSecurityEvent,
  setMonitoringSink,
  maskEmail,
  maskPhone,
};


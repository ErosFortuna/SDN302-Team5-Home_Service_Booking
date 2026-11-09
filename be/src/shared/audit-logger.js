/**
 * Security Audit Logger for sensitive system actions (V-26)
 *
 * Requirements:
 * - Structured fields: actorId, role, action, targetType, targetId, ip, result, timestamp
 * - Outputs to stdout as single-line JSON
 * - Does NOT log passwords, tokens, secrets, or full PII
 * - Pluggable sink for testing and future DB collection integration upon approval
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'jwt',
  'creditcard',
  'cvv',
  'cardnumber',
  'otp',
  'verificationcode',
  'passwordresetcode',
  'apikey',
]);

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return undefined;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function maskPhone(phone) {
  if (typeof phone !== 'string' || phone.length < 4) return undefined;
  return `***${phone.slice(-4)}`;
}

function sanitizeDetails(details, depth = 0) {
  if (depth > 10) return '[TRUNCATED]';
  if (Array.isArray(details)) {
    return details.slice(0, 100).map((value) =>
      value && typeof value === 'object' ? sanitizeDetails(value, depth + 1) : value,
    );
  }
  if (!details || typeof details !== 'object') return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(details).slice(0, 100)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      SENSITIVE_KEYS.has(lowerKey) ||
      /(?:otp|onetime(?:password|code|token)|verificationcode)/.test(lowerKey) ||
      lowerKey === 'passwordresetcodehash'
    ) {
      continue;
    }
    if ((lowerKey === 'email' || lowerKey.endsWith('email')) && typeof value === 'string') {
      cleaned[key] = maskEmail(value);
      continue;
    }
    if ((lowerKey === 'phone' || lowerKey.endsWith('phone') || lowerKey.endsWith('phonenumber')) && typeof value === 'string') {
      cleaned[key] = maskPhone(value);
      continue;
    }
    if (value && typeof value === 'object') {
      cleaned[key] = sanitizeDetails(value, depth + 1);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

let customSink = null;

/**
 * Configure an optional custom sink (e.g. for testing or future collection storage)
 * @param {((entry: object) => void)|null} sink
 */
function setAuditLogSink(sink) {
  customSink = typeof sink === 'function' ? sink : null;
}

/**
 * Emits a structured security audit log entry.
 *
 * @param {object} param0
 * @param {string|null} param0.actorId - ID of the user performing the action
 * @param {string|null} param0.role - Role of the actor (ADMIN, STAFF, PROVIDER, SYSTEM)
 * @param {string} param0.action - Action identifier (e.g. PROVIDER_VERIFICATION_APPROVE)
 * @param {string} param0.targetType - Type of the entity (USER, PROVIDER_PROFILE, MEMBERSHIP_PAYMENT)
 * @param {string|null} param0.targetId - ID of the entity targeted
 * @param {string|null} [param0.ip] - IP address of the request
 * @param {'SUCCESS'|'FAILURE'} [param0.result='SUCCESS'] - Outcome of the action
 * @param {object} [param0.details] - Non-sensitive supplementary context
 * @returns {object} The emitted audit record
 */
function logAuditEvent({
  actorId = null,
  role = null,
  action,
  targetType,
  targetId = null,
  ip = null,
  result = 'SUCCESS',
  details = {},
}) {
  if (!action || !targetType) {
    throw new Error('audit logger requires action and targetType');
  }

  const record = {
    timestamp: new Date().toISOString(),
    actorId: actorId ? String(actorId) : null,
    role: role ? String(role) : null,
    action: String(action),
    targetType: String(targetType),
    targetId: targetId ? String(targetId) : null,
    ip: ip ? String(ip) : null,
    result: result === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
    details: sanitizeDetails(details),
  };

  if (customSink) {
    try {
      customSink(record);
    } catch {
      // Sinks must not crash application logic
    }
  }

  try {
    process.stdout.write(JSON.stringify(record) + '\n');
  } catch {
    // Failsafe in non-standard environments
  }

  return record;
}

module.exports = {
  logAuditEvent,
  sanitizeDetails,
  maskEmail,
  maskPhone,
  setAuditLogSink,
};

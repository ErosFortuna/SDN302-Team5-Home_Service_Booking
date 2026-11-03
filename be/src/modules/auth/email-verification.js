const { createHmac, randomInt, timingSafeEqual } = require("node:crypto");

const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

function requiresGoogleEmailCode(user) {
  return !user.googleEmailCodeVerifiedAt;
}

function createEmailVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashEmailVerificationCode(email, code, secret) {
  return createHmac("sha256", secret)
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");
}

function matchesEmailVerificationCode(email, code, secret, expectedHash) {
  if (!expectedHash || !/^\d{6}$/.test(code)) return false;
  const actual = Buffer.from(hashEmailVerificationCode(email, code, secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

module.exports = {
  EMAIL_CODE_TTL_MS,
  EMAIL_CODE_MAX_ATTEMPTS,
  requiresGoogleEmailCode,
  createEmailVerificationCode,
  hashEmailVerificationCode,
  matchesEmailVerificationCode,
};
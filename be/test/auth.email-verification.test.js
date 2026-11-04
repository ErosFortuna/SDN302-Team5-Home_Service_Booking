const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createEmailVerificationCode,
  hashEmailVerificationCode,
  matchesEmailVerificationCode,
  requiresGoogleEmailCode,
} = require("../src/modules/auth/email-verification.js");

test("verification codes are six digits and cryptographically checked", () => {
  const code = createEmailVerificationCode();
  const secret = "test-only-secret";
  const hash = hashEmailVerificationCode("User@example.com", code, secret);

  assert.match(code, /^\d{6}$/);
  assert.equal(matchesEmailVerificationCode("user@example.com", code, secret, hash), true);
  assert.equal(matchesEmailVerificationCode("user@example.com", "000000", secret, hash), code === "000000");
  assert.equal(matchesEmailVerificationCode("user@example.com", code, "wrong-secret", hash), false);
  assert.equal(matchesEmailVerificationCode("user@example.com", "12", secret, hash), false);
});

test("Google accounts require email code confirmation until the code is confirmed", () => {
  assert.equal(requiresGoogleEmailCode({ emailVerified: true }), true);
  assert.equal(requiresGoogleEmailCode({ googleEmailCodeVerifiedAt: new Date() }), false);
});
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;

export function requiresGoogleEmailCode(user) {
  return !user.googleEmailCodeVerifiedAt;
}

export function createEmailVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailVerificationCode(email, code, secret) {
  return createHmac("sha256", secret)
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");
}

export function matchesEmailVerificationCode(email, code, secret, expectedHash) {
  if (!expectedHash || !/^\d{6}$/.test(code)) return false;
  const actual = Buffer.from(hashEmailVerificationCode(email, code, secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
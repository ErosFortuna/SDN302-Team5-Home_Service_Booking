process.env.NODE_ENV = "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const app = require("../src/app.js");
const { env } = require("../src/config/env.js");
const { dispatch } = require("../test-helpers/dispatch.js");
const User = require("../src/modules/users/user.model.js");
const {
  hashPasswordResetCode,
  createPasswordResetCode,
  PASSWORD_RESET_TTL_MS,
  PASSWORD_RESET_PURPOSE,
} = require("../src/modules/auth/email-verification.js");
const {
  createForgotPasswordIpRateLimiter,
  createForgotPasswordEmailRateLimiter,
  createResetPasswordIpRateLimiter,
  createResetPasswordEmailRateLimiter,
} = require("../src/middlewares/rate-limit.middleware.js");
const express = require("express");

test("Password Reset Flow: Security & Integrity Tests", async (t) => {
  const originalFindOne = User.findOne;
  const originalFindById = User.findById;
  const originalCreateTransport = nodemailer.createTransport;
  const originalEnv = {
    smtpHost: env.smtpHost,
    smtpUser: env.smtpUser,
    smtpPassword: env.smtpPassword,
    smtpFrom: env.smtpFrom,
    smtpPort: env.smtpPort,
    smtpSecure: env.smtpSecure,
  };

  let sentEmails = [];

  t.after(() => {
    User.findOne = originalFindOne;
    User.findById = originalFindById;
    nodemailer.createTransport = originalCreateTransport;
    Object.assign(env, originalEnv);
  });

  function setupFakeSMTP() {
    env.smtpHost = "smtp.fake.local";
    env.smtpUser = "fakeuser";
    env.smtpPassword = "fakepassword";
    env.smtpFrom = "noreply@homeservice.local";
    env.smtpPort = 587;
    env.smtpSecure = false;

    sentEmails = [];
    nodemailer.createTransport = () => ({
      sendMail: async (mailOptions) => {
        sentEmails.push(mailOptions);
        return { messageId: "fake-msg-id" };
      },
    });
  }

  function clearSMTP() {
    env.smtpHost = "";
    env.smtpUser = "";
    env.smtpPassword = "";
    env.smtpFrom = "";
  }

  function createMockUser(overrides = {}) {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      fullName: "Test User",
      email: "user@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
      passwordHash: "$2b$12$Z7huT3YJhkWR6.cUCw4ble03.XIfktzoJf7HGhdCYwhakTeYXhXFe",
      passwordResetCodeHash: undefined,
      passwordResetExpiresAt: undefined,
      passwordResetAttempts: 0,
      passwordResetSentAt: undefined,
      googleSubject: undefined,
      async save() {
        if (this.passwordHash && !this.passwordHash.startsWith("$2b$")) {
          this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
        }
        return this;
      },
      ...overrides,
    };
    return user;
  }

  await t.test("1. POST /forgot-password returns 503 for all emails when SMTP is unconfigured", async () => {
    clearSMTP();

    // Test non-existent email
    User.findOne = () => ({
      select: () => Promise.resolve(null),
    });
    const res1 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "doesnotexist@example.com" }),
    });
    assert.equal(res1.statusCode, 503);
    assert.equal(res1.body.success, false);
    assert.equal(res1.body.message, "Email delivery is not configured on the server");

    // Test existing active user email
    const mockUser = createMockUser({ email: "existing@example.com" });
    User.findOne = () => ({
      select: () => Promise.resolve(mockUser),
    });
    const res2 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "existing@example.com" }),
    });
    assert.equal(res2.statusCode, 503);
    assert.equal(res2.body.success, false);
    assert.equal(res2.body.message, "Email delivery is not configured on the server");
  });

  await t.test("2. Anti-Enumeration: generic 200 response identical for non-existent, unverified, normal, and Google accounts", async () => {
    setupFakeSMTP();

    const expectedMessage = "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.";

    // a) Non-existent email
    User.findOne = () => ({ select: () => Promise.resolve(null) });
    const resNone = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@example.com" }),
    });
    assert.equal(resNone.statusCode, 200);
    assert.equal(resNone.body.success, true);
    assert.equal(resNone.body.message, expectedMessage);
    assert.equal(sentEmails.length, 0);

    // b) Unverified or Inactive user
    const unverifiedUser = createMockUser({ emailVerified: false });
    User.findOne = () => ({ select: () => Promise.resolve(unverifiedUser) });
    const resUnverified = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: unverifiedUser.email }),
    });
    assert.equal(resUnverified.statusCode, 200);
    assert.equal(resUnverified.body.success, true);
    assert.equal(resUnverified.body.message, expectedMessage);
    assert.equal(sentEmails.length, 0);

    // c) Normal active user
    const normalUser = createMockUser({ email: "normal@example.com" });
    User.findOne = () => ({ select: () => Promise.resolve(normalUser) });
    const resNormal = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: normalUser.email }),
    });
    assert.equal(resNormal.statusCode, 200);
    assert.equal(resNormal.body.success, true);
    assert.equal(resNormal.body.message, expectedMessage);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, normalUser.email);
    assert.match(sentEmails[0].text, /\d{6}/);
    assert.ok(normalUser.passwordResetCodeHash);
    assert.equal(normalUser.passwordResetAttempts, 0);
    assert.ok(normalUser.passwordResetExpiresAt.getTime() > Date.now());

    // d) Google active user without passwordHash
    sentEmails = [];
    const googleUser = createMockUser({
      email: "googleuser@example.com",
      passwordHash: undefined,
      googleSubject: "google-sub-12345",
    });
    User.findOne = () => ({ select: () => Promise.resolve(googleUser) });
    const resGoogle = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: googleUser.email }),
    });
    assert.equal(resGoogle.statusCode, 200);
    assert.equal(resGoogle.body.success, true);
    assert.equal(resGoogle.body.message, expectedMessage);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, googleUser.email);
    assert.ok(googleUser.passwordResetCodeHash);
  });

  await t.test("3. Cooldown 60s: repeated requests within cooldown return generic 200 but do not send email", async () => {
    setupFakeSMTP();

    const user = createMockUser({
      email: "cooldown@example.com",
      passwordResetSentAt: new Date(Date.now() - 30 * 1000), // 30s ago (within 60s cooldown)
      passwordResetCodeHash: "existing-hash",
    });

    User.findOne = () => ({ select: () => Promise.resolve(user) });

    const res = await dispatch(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(sentEmails.length, 0, "No email should be sent during cooldown");
    assert.equal(user.passwordResetCodeHash, "existing-hash", "Code hash should not be regenerated");
  });

  await t.test("4. POST /reset-password rejects invalid inputs and weak passwords", async () => {
    setupFakeSMTP();

    // a) Non-string types
    const r1 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: 12345, code: 999999, newPassword: true }),
    });
    assert.equal(r1.statusCode, 400);
    assert.equal(r1.body.success, false);

    // b) Weak password (< 10 chars)
    const r2 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", code: "123456", newPassword: "Short9!" }),
    });
    assert.equal(r2.statusCode, 400);
    assert.ok(r2.body.errors.some((e) => e.field === "newPassword" && e.message.includes("at least 10 characters")));

    // c) Weak password (common blacklist)
    const r3 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", code: "123456", newPassword: "password12345" }),
    });
    assert.equal(r3.statusCode, 400);
    assert.ok(r3.body.errors.some((e) => e.field === "newPassword" && e.message.includes("too common")));

    // d) Password > 72 bytes
    const longPassword = "A".repeat(73);
    const r4 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", code: "123456", newPassword: longPassword }),
    });
    assert.equal(r4.statusCode, 400);
    assert.ok(r4.body.errors.some((e) => e.field === "newPassword" && e.message.includes("at most 72 bytes")));
  });

  await t.test("5. POST /reset-password returns generic 400 for non-existent email or expired code", async () => {
    setupFakeSMTP();
    const genericErr = "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn";

    // Non-existent user
    User.findOne = () => ({ select: () => Promise.resolve(null) });
    const r1 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "none@example.com",
        code: "123456",
        newPassword: "ValidNewPass123!",
      }),
    });
    assert.equal(r1.statusCode, 400);
    assert.equal(r1.body.message, genericErr);

    // Expired code
    const expiredUser = createMockUser({
      email: "expired@example.com",
      passwordResetCodeHash: hashPasswordResetCode("expired@example.com", "123456", env.jwtSecret),
      passwordResetExpiresAt: new Date(Date.now() - 5000), // 5 seconds ago
      passwordResetAttempts: 0,
    });
    User.findOne = () => ({ select: () => Promise.resolve(expiredUser) });
    const r2 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: expiredUser.email,
        code: "123456",
        newPassword: "ValidNewPass123!",
      }),
    });
    assert.equal(r2.statusCode, 400);
    assert.equal(r2.body.message, genericErr);
  });

  await t.test("6. POST /reset-password wrong code increments attempts and locks after 5 attempts", async () => {
    setupFakeSMTP();
    const genericErr = "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn";

    const user = createMockUser({
      email: "attempts@example.com",
      passwordResetCodeHash: hashPasswordResetCode("attempts@example.com", "111111", env.jwtSecret),
      passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      passwordResetAttempts: 0,
    });
    User.findOne = () => ({ select: () => Promise.resolve(user) });

    // 1st wrong code
    const r1 = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        code: "000000",
        newPassword: "ValidNewPass123!",
      }),
    });
    assert.equal(r1.statusCode, 400);
    assert.equal(r1.body.message, genericErr);
    assert.equal(user.passwordResetAttempts, 1);

    // Fail 4 more times (total 5)
    for (let i = 2; i <= 5; i++) {
      const res = await dispatch(app, {
        method: "POST",
        url: "/api/auth/reset-password",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          code: "000000",
          newPassword: "ValidNewPass123!",
        }),
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, genericErr);
    }

    // After 5 attempts, code hash must be cleared (invalidated)
    assert.equal(user.passwordResetCodeHash, undefined);
    assert.equal(user.passwordResetExpiresAt, undefined);

    // Even if user now submits the correct code "111111", it must be rejected with 400
    const rCorrectAfterLock = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        code: "111111",
        newPassword: "ValidNewPass123!",
      }),
    });
    assert.equal(rCorrectAfterLock.statusCode, 400);
    assert.equal(rCorrectAfterLock.body.message, genericErr);
  });

  await t.test("7. POST /reset-password success flow: updates password, increments tokenVersion, clears reset fields, sends notification email, keeps Google link, invalidates old token", async () => {
    setupFakeSMTP();

    const initialTokenVersion = 2;
    const user = createMockUser({
      email: "success@example.com",
      tokenVersion: initialTokenVersion,
      googleSubject: "google-account-12345",
      passwordResetCodeHash: hashPasswordResetCode("success@example.com", "654321", env.jwtSecret),
      passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      passwordResetAttempts: 0,
      passwordResetSentAt: new Date(),
    });

    User.findOne = () => ({ select: () => Promise.resolve(user) });

    // Generate token before reset with current tokenVersion
    const oldJwtToken = jwt.sign(
      { sub: user._id.toString(), role: user.role, tokenVersion: initialTokenVersion },
      env.jwtSecret,
      { expiresIn: "1h" },
    );

    // Call reset password
    const res = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        code: "654321",
        newPassword: "BrandNewSecurePassword123!",
      }),
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.message, /thành công/i);

    // Verify user object state mutations
    assert.equal(user.tokenVersion, initialTokenVersion + 1, "tokenVersion must be incremented by 1");
    assert.equal(user.passwordResetCodeHash, undefined, "Code hash must be cleared");
    assert.equal(user.passwordResetExpiresAt, undefined, "ExpiresAt must be cleared");
    assert.equal(user.passwordResetAttempts, 0, "Attempts must be reset to 0");
    assert.equal(user.passwordResetSentAt, undefined, "SentAt must be cleared");
    assert.equal(user.googleSubject, "google-account-12345", "Google link must be preserved");

    // Verify password is hashed with bcrypt cost 12
    assert.ok(user.passwordHash.startsWith("$2b$12$"), "Password must be hashed with bcrypt cost 12");
    const matchesNew = await bcrypt.compare("BrandNewSecurePassword123!", user.passwordHash);
    assert.equal(matchesNew, true, "New password must match the hashed password");

    // Verify confirmation email was sent (without password or code)
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, user.email);
    assert.ok(!sentEmails[0].text.includes("BrandNewSecurePassword123!"), "Email must not contain password");
    assert.ok(!sentEmails[0].text.includes("654321"), "Email must not contain reset code");

    // Reusing the code should fail (one-time use)
    const reuseRes = await dispatch(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        code: "654321",
        newPassword: "AnotherPassword123!",
      }),
    });
    assert.equal(reuseRes.statusCode, 400);

    // Verify old JWT token is now rejected with 401 Unauthorized
    User.findById = () => ({
      select: () => Promise.resolve(user),
    });
    const authCheckRes = await dispatch(app, {
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${oldJwtToken}` },
    });
    assert.equal(authCheckRes.statusCode, 401, "Old token must be rejected with 401 after tokenVersion increment");
  });

  await t.test("8. Rate limiters: IP and Email limiters enforce limits when threshold is exceeded", async () => {
    const testApp = express();
    testApp.use(express.json());

    const forgotIpLimiter = createForgotPasswordIpRateLimiter({
      windowMs: 60 * 1000,
      limit: 2,
      enableInTest: true,
    });
    const forgotEmailLimiter = createForgotPasswordEmailRateLimiter({
      windowMs: 60 * 1000,
      limit: 2,
      enableInTest: true,
    });

    testApp.post(
      "/test-forgot",
      forgotIpLimiter,
      forgotEmailLimiter,
      (req, res) => res.json({ success: true }),
    );

    // 1st request -> 200
    const r1 = await dispatch(testApp, {
      method: "POST",
      url: "/test-forgot",
      remoteAddress: "10.1.1.1",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "rate@test.com" }),
    });
    assert.equal(r1.statusCode, 200);

    // 2nd request -> 200
    const r2 = await dispatch(testApp, {
      method: "POST",
      url: "/test-forgot",
      remoteAddress: "10.1.1.1",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "rate@test.com" }),
    });
    assert.equal(r2.statusCode, 200);

    // 3rd request from same IP and email -> 429
    const r3 = await dispatch(testApp, {
      method: "POST",
      url: "/test-forgot",
      remoteAddress: "10.1.1.1",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "rate@test.com" }),
    });
    assert.equal(r3.statusCode, 429);
    assert.equal(r3.body.success, false);

    // Reset password limiter test
    const resetApp = express();
    resetApp.use(express.json());
    const resetIpLimiter = createResetPasswordIpRateLimiter({
      windowMs: 60 * 1000,
      limit: 2,
      enableInTest: true,
    });
    const resetEmailLimiter = createResetPasswordEmailRateLimiter({
      windowMs: 60 * 1000,
      limit: 2,
      enableInTest: true,
    });

    resetApp.post(
      "/test-reset",
      resetIpLimiter,
      resetEmailLimiter,
      (req, res) => res.json({ success: true }),
    );

    const s1 = await dispatch(resetApp, {
      method: "POST",
      url: "/test-reset",
      remoteAddress: "10.2.2.2",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "resetrate@test.com" }),
    });
    assert.equal(s1.statusCode, 200);

    const s2 = await dispatch(resetApp, {
      method: "POST",
      url: "/test-reset",
      remoteAddress: "10.2.2.2",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "resetrate@test.com" }),
    });
    assert.equal(s2.statusCode, 200);

    const s3 = await dispatch(resetApp, {
      method: "POST",
      url: "/test-reset",
      remoteAddress: "10.2.2.2",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "resetrate@test.com" }),
    });
    assert.equal(s3.statusCode, 429);
  });
});

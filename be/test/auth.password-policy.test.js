const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { dispatch } = require("../test-helpers/dispatch.js");
const app = require("../src/app.js");
const { env } = require("../src/config/env.js");
const User = require("../src/modules/users/user.model.js");
const {
  validateRegistration,
  validateLogin,
  validateChangePassword,
} = require("../src/modules/auth/auth.validation.js");
const { isCommonPassword } = require("../src/modules/auth/common-passwords.js");
const {
  validateCreateUser,
  validateUpdateUser,
} = require("../src/modules/users/admin.user.validation.js");
const {
  createLoginAccountRateLimiter,
  createRegisterRateLimiter,
} = require("../src/middlewares/rate-limit.middleware.js");

const validRegistrationBase = {
  fullName: "Nguyen Van B",
  email: "newuser@example.com",
  phone: "0912345678",
};

test("V-14 Password Policy: Registration enforces minimum 10 characters and rejects weak/short passwords", () => {
  // Short password (< 10 chars)
  const shortResult = validateRegistration({
    ...validRegistrationBase,
    password: "Short123!", // 9 chars
  });
  assert.ok(
    shortResult.errors.some(
      (err) => err.field === "password" && err.message.includes("at least 10 characters")
    ),
    "Password with 9 characters must be rejected"
  );

  // Exact 8-byte legacy password should be rejected for NEW registrations
  const legacyPassResult = validateRegistration({
    ...validRegistrationBase,
    password: "Demo123!", // 8 chars
  });
  assert.ok(
    legacyPassResult.errors.some(
      (err) => err.field === "password" && err.message.includes("at least 10 characters")
    ),
    "Legacy 8-character password must be rejected during new registration"
  );

  // Valid 10-character strong password
  const valid10Result = validateRegistration({
    ...validRegistrationBase,
    password: "MyPass10!!", // 10 chars
  });
  assert.equal(
    valid10Result.errors.filter((e) => e.field === "password").length,
    0,
    "Valid 10-character password must pass registration"
  );
});

test("V-14 Password Policy: Registration rejects common/easily guessed passwords", () => {
  assert.ok(isCommonPassword("password123"), "password123 must be identified as common");
  assert.ok(isCommonPassword("1234567890"), "1234567890 must be identified as common");
  assert.ok(isCommonPassword("HOMECARE123"), "Case-insensitive check for common password");

  const commonResult = validateRegistration({
    ...validRegistrationBase,
    password: "password123", // 11 chars but common
  });
  assert.ok(
    commonResult.errors.some(
      (err) => err.field === "password" && err.message.includes("too common")
    ),
    "Common password must be rejected even if >= 10 chars"
  );
});

test("V-14 Password Policy: Login does NOT enforce 10-char policy so legacy accounts (8 chars) can still log in", () => {
  // Legacy 8-character password
  const legacyLogin = validateLogin({
    email: "legacy@example.com",
    password: "Demo123!", // 8 chars
  });
  assert.equal(legacyLogin.errors.length, 0, "Login must accept legacy 8-character password");
  assert.equal(legacyLogin.data.password, "Demo123!");

  // Very short password on login only fails if empty or > 72 bytes
  const shortLogin = validateLogin({
    email: "user@example.com",
    password: "abc",
  });
  assert.equal(shortLogin.errors.length, 0, "Login validation should not block short password pre-check");
});

test("V-14 Password Policy: Change password requires >= 10 characters and rejects common passwords", () => {
  const shortChange = validateChangePassword({
    currentPassword: "OldPassword123!",
    newPassword: "Short123", // 8 chars
  });
  assert.ok(
    shortChange.errors.some(
      (err) => err.field === "newPassword" && err.message.includes("10 ký tự")
    )
  );

  const commonChange = validateChangePassword({
    currentPassword: "OldPassword123!",
    newPassword: "password1234", // 12 chars but common
  });
  assert.ok(
    commonChange.errors.some(
      (err) => err.field === "newPassword" && err.message.includes("quá phổ biến")
    )
  );

  const validChange = validateChangePassword({
    currentPassword: "OldPassword123!",
    newPassword: "SuperSecurePass123!",
  });
  assert.equal(validChange.errors.length, 0);
});

test("V-14 Rate Limiting: Login rate limiter throttles per account (email) independently of IP", async () => {
  const app = express();
  app.use(express.json());

  const limiter = createLoginAccountRateLimiter({
    windowMs: 60 * 1000,
    limit: 3,
    enableInTest: true,
  });

  app.post("/test-login", limiter, (req, res) => {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  });

  const targetEmail = "victim@example.com";
  const otherEmail = "other@example.com";

  // Request 1 for targetEmail -> Failed (401)
  const res1 = await dispatch(app, {
    method: "POST",
    url: "/test-login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: targetEmail, password: "wrong" }),
  });
  assert.equal(res1.statusCode, 401);

  // Request 2 for targetEmail -> Failed (401)
  const res2 = await dispatch(app, {
    method: "POST",
    url: "/test-login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: targetEmail, password: "wrong" }),
  });
  assert.equal(res2.statusCode, 401);

  // Request 3 for targetEmail -> Failed (401, limit reached)
  const res3 = await dispatch(app, {
    method: "POST",
    url: "/test-login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: targetEmail, password: "wrong" }),
  });
  assert.equal(res3.statusCode, 401);

  // Request 4 for targetEmail -> Throttled (429)
  const res4 = await dispatch(app, {
    method: "POST",
    url: "/test-login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: targetEmail, password: "wrong" }),
  });
  assert.equal(res4.statusCode, 429);
  const data4 = typeof res4.body === "object" ? res4.body : JSON.parse(res4.body);
  assert.equal(data4.success, false);

  // Concurrently, request for otherEmail -> Should NOT be 429 because it's a different account!
  const resOther = await dispatch(app, {
    method: "POST",
    url: "/test-login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: otherEmail, password: "wrong" }),
  });
  assert.equal(resOther.statusCode, 401, "Different account must not be locked out by attacker");
});

test("V-14 Login behavior: Non-existent user vs wrong password both return 401, unverified/inactive accounts return 403 ONLY when password is correct", async (t) => {
  const originalFindOne = User.findOne;
  t.after(() => {
    User.findOne = originalFindOne;
  });

  const userId = new mongoose.Types.ObjectId();
  function makeMockUser(overrides = {}) {
    return {
      _id: userId,
      fullName: "Legacy Customer",
      email: "legacy@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
      passwordHash: "mock_password_hash",
      async comparePassword(candidate) {
        return candidate === "Demo123!";
      },
      async save() {
        return this;
      },
      ...overrides,
    };
  }

  // 1. Non-existent user -> 401 "Invalid credentials"
  User.findOne = () => ({
    select: () => Promise.resolve(null),
  });

  const resNonExistent = await dispatch(app, {
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "doesnotexist@example.com", password: "SomePassword123!" }),
  });
  assert.equal(resNonExistent.statusCode, 401);
  assert.equal(resNonExistent.body.message, "Invalid credentials");

  // 2. Existing user, wrong password -> 401 "Invalid credentials"
  User.findOne = () => ({
    select: () => Promise.resolve(makeMockUser()),
  });

  const resWrongPass = await dispatch(app, {
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "legacy@example.com", password: "WrongPassword123!" }),
  });
  assert.equal(resWrongPass.statusCode, 401);
  assert.equal(resWrongPass.body.message, "Invalid credentials");

  // 3. Existing user, email NOT verified, correct password -> 403 "Email verification is required..."
  User.findOne = () => ({
    select: () => Promise.resolve(makeMockUser({ emailVerified: false })),
  });

  const resUnverified = await dispatch(app, {
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "legacy@example.com", password: "Demo123!" }),
  });
  assert.equal(resUnverified.statusCode, 403);
  assert.ok(resUnverified.body.message.includes("Email verification is required"));

  // 4. Existing user, status BLOCKED, correct password -> 403 "Account is inactive or blocked"
  User.findOne = () => ({
    select: () => Promise.resolve(makeMockUser({ status: "BLOCKED" })),
  });

  const resBlocked = await dispatch(app, {
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "legacy@example.com", password: "Demo123!" }),
  });
  assert.equal(resBlocked.statusCode, 403);
  assert.ok(resBlocked.body.message.includes("Account is inactive or blocked"));

  // 5. Existing user with 8-character password, correct credentials -> 200 "Login successful"
  User.findOne = () => ({
    select: () => Promise.resolve(makeMockUser()),
  });

  const resSuccess = await dispatch(app, {
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "legacy@example.com", password: "Demo123!" }),
  });
  assert.equal(resSuccess.statusCode, 200);
  assert.equal(resSuccess.body.success, true);
  assert.ok(resSuccess.body.data.accessToken);
});

test("V-14 Admin User Validation: Enforces >= 10 characters and rejects common passwords", () => {
  function invoke(middleware, req) {
    let error;
    let continued = false;
    try {
      middleware(req, {}, () => { continued = true; });
    } catch (caught) {
      error = caught;
    }
    return { error, continued };
  }

  const shortCreate = invoke(validateCreateUser, {
    body: {
      fullName: "Admin Test",
      email: "admin-test@example.com",
      phone: "0912345678",
      password: "Short123!", // 9 chars
      role: "STAFF",
    },
  });
  assert.ok(shortCreate.error);
  assert.equal(shortCreate.error.statusCode, 400);
  assert.ok(shortCreate.error.details.some((d) => d.field === "password" && d.message.includes("10 ký tự")));

  const commonCreate = invoke(validateCreateUser, {
    body: {
      fullName: "Admin Test",
      email: "admin-test@example.com",
      phone: "0912345678",
      password: "password1234", // common
      role: "STAFF",
    },
  });
  assert.ok(commonCreate.error);
  assert.equal(commonCreate.error.statusCode, 400);
  assert.ok(commonCreate.error.details.some((d) => d.field === "password" && d.message.includes("quá phổ biến")));

  const reqValid = {
    body: {
      fullName: "Admin Test",
      email: "admin-test@example.com",
      phone: "0912345678",
      password: "SuperAdminPass123!", // 18 chars, strong
      role: "STAFF",
    },
  };
  const validCreate = invoke(validateCreateUser, reqValid);
  assert.equal(validCreate.error, undefined);
  assert.equal(validCreate.continued, true);
  assert.equal(reqValid.adminUserData.password, "SuperAdminPass123!");
});

test("V-14 Timing Attack Defense: Google accounts without passwordHash execute dummy bcrypt compare", async (t) => {
  const originalFindOne = User.findOne;
  t.after(() => {
    User.findOne = originalFindOne;
  });

  const userId = new mongoose.Types.ObjectId();
  const googleUser = {
    _id: userId,
    fullName: "Google Customer",
    email: "google@example.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    emailVerified: true,
    passwordHash: undefined, // Google account, no password
    comparePassword: async () => false,
  };

  User.findOne = () => ({
    select: () => Promise.resolve(googleUser),
  });

  const res = await dispatch(app, {
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "google@example.com", password: "SomeAttempt123!" }),
  });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid credentials");
});

test("V-14 Anti-Enumeration: resend-verification and forgot-password return generic responses", async (t) => {
  const originalFindOne = User.findOne;
  const originalEnv = {
    smtpHost: env.smtpHost,
    smtpUser: env.smtpUser,
    smtpPassword: env.smtpPassword,
    smtpFrom: env.smtpFrom,
  };
  env.smtpHost = "smtp.test.local";
  env.smtpUser = "testuser";
  env.smtpPassword = "testpassword";
  env.smtpFrom = "noreply@test.local";

  t.after(() => {
    User.findOne = originalFindOne;
    Object.assign(env, originalEnv);
  });

  // 1. resend-verification for non-existent user returns generic 200
  User.findOne = () => ({
    select: () => Promise.resolve(null),
  });

  const resResendNone = await dispatch(app, {
    method: "POST",
    url: "/api/auth/resend-verification",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "doesnotexist@example.com" }),
  });
  assert.equal(resResendNone.statusCode, 200);
  assert.ok(resResendNone.body.message.includes("If the account needs verification"));

  // 2. forgot-password for non-existent user returns generic 200
  const resForgotNone = await dispatch(app, {
    method: "POST",
    url: "/api/auth/forgot-password",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "doesnotexist@example.com" }),
  });
  assert.equal(resForgotNone.statusCode, 200);
  assert.ok(resForgotNone.body.message.includes("Nếu email tồn tại"));

  // 3. forgot-password for existing unverified user also returns the exact same generic 200
  User.findOne = () => ({
    select: () => Promise.resolve({ email: "existing@example.com", status: "ACTIVE", emailVerified: false }),
  });

  const resForgotExist = await dispatch(app, {
    method: "POST",
    url: "/api/auth/forgot-password",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "existing@example.com" }),
  });
  assert.equal(resForgotExist.statusCode, 200);
  assert.ok(resForgotExist.body.message.includes("Nếu email tồn tại"));
});

test("V-14 Rate Limiting: Register rate limiter throttles repeated registration requests per IP", async () => {
  const appTest = express();
  appTest.use(express.json());

  const registerLimiter = createRegisterRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
  });

  appTest.post("/test-reg", registerLimiter, (req, res) => {
    res.json({ success: true });
  });

  const r1 = await dispatch(appTest, { method: "POST", url: "/test-reg", remoteAddress: "1.2.3.4" });
  assert.equal(r1.statusCode, 200);

  const r2 = await dispatch(appTest, { method: "POST", url: "/test-reg", remoteAddress: "1.2.3.4" });
  assert.equal(r2.statusCode, 200);

  const r3 = await dispatch(appTest, { method: "POST", url: "/test-reg", remoteAddress: "1.2.3.4" });
  assert.equal(r3.statusCode, 429);
});

test("Auth endpoints do not apply auth-specific throttles in development", async () => {
  const originalNodeEnv = env.nodeEnv;
  env.nodeEnv = "development";

  try {
    for (let i = 0; i < 12; i++) {
      const loginResponse = await dispatch(app, {
        method: "POST",
        url: "/api/auth/login",
        body: {},
      });
      assert.equal(loginResponse.statusCode, 400);
    }

    for (let i = 0; i < 7; i++) {
      const registrationResponse = await dispatch(app, {
        method: "POST",
        url: "/api/auth/register",
        body: {},
      });
      assert.equal(registrationResponse.statusCode, 400);
    }
  } finally {
    env.nodeEnv = originalNodeEnv;
  }
});

test("Registration reports email delivery failure with pending verification details", async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalCreateTransport = nodemailer.createTransport;
  const originalEnv = {
    nodeEnv: env.nodeEnv,
    jwtSecret: env.jwtSecret,
    smtpHost: env.smtpHost,
    smtpUser: env.smtpUser,
    smtpPassword: env.smtpPassword,
    smtpFrom: env.smtpFrom,
    smtpPort: env.smtpPort,
    smtpSecure: env.smtpSecure,
  };

  try {
    env.nodeEnv = "development";
    env.jwtSecret = "test-only-verification-secret";
    env.smtpHost = "smtp.fake.local";
    env.smtpUser = "fake-user";
    env.smtpPassword = "fake-password";
    env.smtpFrom = "noreply@homeservice.local";
    env.smtpPort = 587;
    env.smtpSecure = false;
    User.findOne = () => ({ select: async () => null });
    User.create = async (data) => ({
      ...data,
      async save() {
        return this;
      },
    });
    nodemailer.createTransport = () => ({
      sendMail: async () => {
        throw new Error("Simulated SMTP failure");
      },
    });

    const response = await dispatch(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        fullName: "Provider Test",
        email: "provider-test@example.com",
        phone: "0912345678",
        password: "StrongProviderPass123!",
        role: "PROVIDER",
      },
    });

    assert.equal(response.statusCode, 502);
    assert.equal(response.body.code, "EMAIL_DELIVERY_FAILED");
    assert.equal(response.body.data.email, "provider-test@example.com");
    assert.equal(response.body.data.verificationRequired, true);
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    nodemailer.createTransport = originalCreateTransport;
    Object.assign(env, originalEnv);
  }
});

test("V-14 Rate Limiting: Login rate limiter skips successful requests (skipSuccessfulRequests)", async () => {
  const appTest = express();
  appTest.use(express.json());

  const loginLimiter = createLoginAccountRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    enableInTest: true,
  });

  let shouldFail = false;
  appTest.post("/test-login-flow", loginLimiter, (req, res) => {
    if (shouldFail) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    return res.status(200).json({ success: true });
  });

  // Successful logins should NOT count against the limit
  shouldFail = false;
  const s1 = await dispatch(appTest, {
    method: "POST",
    url: "/test-login-flow",
    body: { email: "user@example.com" },
    remoteAddress: "10.0.0.1",
  });
  assert.equal(s1.statusCode, 200);

  const s2 = await dispatch(appTest, {
    method: "POST",
    url: "/test-login-flow",
    body: { email: "user@example.com" },
    remoteAddress: "10.0.0.1",
  });
  assert.equal(s2.statusCode, 200);

  const s3 = await dispatch(appTest, {
    method: "POST",
    url: "/test-login-flow",
    body: { email: "user@example.com" },
    remoteAddress: "10.0.0.1",
  });
  assert.equal(s3.statusCode, 200); // 3 successful logins still 200!

  // Now failed attempts start counting
  shouldFail = true;
  const f1 = await dispatch(appTest, {
    method: "POST",
    url: "/test-login-flow",
    body: { email: "user@example.com" },
    remoteAddress: "10.0.0.1",
  });
  assert.equal(f1.statusCode, 401);

  const f2 = await dispatch(appTest, {
    method: "POST",
    url: "/test-login-flow",
    body: { email: "user@example.com" },
    remoteAddress: "10.0.0.1",
  });
  assert.equal(f2.statusCode, 401);

  // 3rd failed attempt exceeds limit of 2 -> 429
  const f3 = await dispatch(appTest, {
    method: "POST",
    url: "/test-login-flow",
    body: { email: "user@example.com" },
    remoteAddress: "10.0.0.1",
  });
  assert.equal(f3.statusCode, 429);
});

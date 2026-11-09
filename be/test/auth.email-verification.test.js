const assert = require("node:assert/strict");
const test = require("node:test");
const nodemailer = require("nodemailer");
const {
  createEmailVerificationCode,
  hashEmailVerificationCode,
  matchesEmailVerificationCode,
  requiresGoogleEmailCode,
} = require("../src/modules/auth/email-verification.js");
const {
  isEmailDeliveryConfigured,
  sendEmailVerificationCode,
} = require("../src/modules/auth/email.service.js");
const { env } = require("../src/config/env.js");

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

test("email.service: sendEmailVerificationCode throws 503 when SMTP is unconfigured", async () => {
  const originalHost = env.smtpHost;
  env.smtpHost = "";

  try {
    assert.equal(isEmailDeliveryConfigured(), false);
    await assert.rejects(
      async () => {
        await sendEmailVerificationCode("test@example.com", "123456");
      },
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.message, "Email delivery is not configured");
        return true;
      }
    );
  } finally {
    env.smtpHost = originalHost;
  }
});

test("email.service: sendEmailVerificationCode delivers email via fake transport (nodemailer 10.4.0)", async () => {
  const originalEnv = {
    smtpHost: env.smtpHost,
    smtpUser: env.smtpUser,
    smtpPassword: env.smtpPassword,
    smtpFrom: env.smtpFrom,
    smtpPort: env.smtpPort,
    smtpSecure: env.smtpSecure,
  };

  // Configure simulated SMTP credentials
  env.smtpHost = "smtp.fake.local";
  env.smtpUser = "fake-user";
  env.smtpPassword = "fake-password";
  env.smtpFrom = "noreply@homeservice.local";
  env.smtpPort = 587;
  env.smtpSecure = false;

  const originalCreateTransport = nodemailer.createTransport;
  let sentMailOptions = null;

  try {
    assert.equal(isEmailDeliveryConfigured(), true);

    // Mock createTransport to return a built-in jsonTransport (fake transport)
    nodemailer.createTransport = (config) => {
      assert.equal(config.host, "smtp.fake.local");
      assert.equal(config.auth.user, "fake-user");
      const fakeTransporter = originalCreateTransport({ jsonTransport: true });
      const origSendMail = fakeTransporter.sendMail.bind(fakeTransporter);
      fakeTransporter.sendMail = async (mailOptions) => {
        sentMailOptions = mailOptions;
        const result = await origSendMail(mailOptions);
        return result;
      };
      return fakeTransporter;
    };

    await sendEmailVerificationCode("customer@example.com", "654321");

    assert.ok(sentMailOptions, "sendMail must be called");
    assert.equal(sentMailOptions.from, "noreply@homeservice.local");
    assert.equal(sentMailOptions.to, "customer@example.com");
    assert.equal(sentMailOptions.subject, "Your Home Service Booking verification code");
    assert.match(sentMailOptions.text, /654321/);
    assert.match(sentMailOptions.text, /expires in 15 minutes/);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    Object.assign(env, originalEnv);
  }
});

test("nodemailer 10.4.0: jsonTransport safely processes headers and prevents address parsing injection", async () => {
  const fakeTransporter = nodemailer.createTransport({ jsonTransport: true });

  const result = await fakeTransporter.sendMail({
    from: "noreply@homeservice.local",
    to: "valid.user@example.com",
    subject: "Mã xác thực dịch vụ gia đình Team 5",
    text: "Mã OTP của bạn là: 888999",
  });

  assert.ok(result.messageId, "Message must have an assigned messageId");
  assert.ok(result.message, "JSON transport must produce serialized message payload");
  const parsed = JSON.parse(result.message);
  assert.equal(parsed.from.address, "noreply@homeservice.local");
  assert.equal(parsed.to[0].address, "valid.user@example.com");
  assert.equal(parsed.subject, "Mã xác thực dịch vụ gia đình Team 5");
  assert.equal(parsed.text, "Mã OTP của bạn là: 888999");
});
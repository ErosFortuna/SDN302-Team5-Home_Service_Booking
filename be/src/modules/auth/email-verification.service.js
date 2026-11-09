const {
  createEmailVerificationCode,
  EMAIL_CODE_TTL_MS,
  hashEmailVerificationCode,
} = require('./email-verification.js');
const { env } = require('../../config/env.js');
const { sendEmailVerificationCode } = require('./email.service.js');

async function issueEmailVerificationCode(user) {
  const code = createEmailVerificationCode();
  user.emailVerificationCodeHash = hashEmailVerificationCode(user.email, code, env.jwtSecret);
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS);
  user.emailVerificationAttempts = 0;
  await user.save();
  await sendEmailVerificationCode(user.email, code);
}

module.exports = { issueEmailVerificationCode };

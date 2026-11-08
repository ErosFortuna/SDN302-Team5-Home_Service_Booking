const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../users/user.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const { setUserStatus, syncProviderFullName } = require("../users/user.service.js");
const { env } = require("../../config/env.js");
const { protect } = require("../../middlewares/auth.middleware.js");
const {
  createLoginAccountRateLimiter,
  createRegisterRateLimiter,
  forgotPasswordIpRateLimiter,
  forgotPasswordEmailRateLimiter,
  resetPasswordIpRateLimiter,
  resetPasswordEmailRateLimiter,
} = require("../../middlewares/rate-limit.middleware.js");
const {
  validateEmailAddress,
  validateEmailVerification,
  validateGoogleAuth,
  validateLogin,
  validateRegistration,
  validateChangePassword,
  validateResetPassword,
} = require("./auth.validation.js");
const {
  createEmailVerificationCode,
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_TTL_MS,
  hashEmailVerificationCode,
  matchesEmailVerificationCode,
  requiresGoogleEmailCode,
  createPasswordResetCode,
  hashPasswordResetCode,
  matchesPasswordResetCode,
  PASSWORD_RESET_TTL_MS,
} = require("./email-verification.js");
const {
  isEmailDeliveryConfigured,
  sendEmailVerificationCode,
  sendPasswordResetCode,
  sendPasswordResetConfirmation,
} = require("./email.service.js");
const { logAuditEvent } = require("../../shared/audit-logger.js");

const router = Router();
const googleClient = new OAuth2Client();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});
const registerRateLimit = createRegisterRateLimiter();
const loginAccountRateLimit = createLoginAccountRateLimiter();
// Precomputed cost-12 dummy hash to equalize bcrypt execution time and prevent timing attacks
const DUMMY_PASSWORD_HASH = "$2b$12$Z7huT3YJhkWR6.cUCw4ble03.XIfktzoJf7HGhdCYwhakTeYXhXFe";
const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: EMAIL_CODE_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again later.",
  },
});
const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    },
  );

const serializeUser = (user) => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  address: user.address || "",
  avatarUrl: user.avatarUrl || "",
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerified,
  tokenVersion: user.tokenVersion ?? 0,
});

const sendValidationErrors = (res, errors) =>
  res
    .status(400)
    .json({ success: false, message: "Validation failed", errors });

async function issueEmailVerificationCode(user) {
  const code = createEmailVerificationCode();
  user.emailVerificationCodeHash = hashEmailVerificationCode(
    user.email,
    code,
    env.jwtSecret,
  );
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS);
  user.emailVerificationAttempts = 0;
  await user.save();
  await sendEmailVerificationCode(user.email, code);
}

function clearEmailVerificationCode(user) {
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.emailVerificationAttempts = 0;
}

router.post("/register", registerRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateRegistration(req.body);
    if (errors.length) return sendValidationErrors(res, errors);
    if (!isEmailDeliveryConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Email verification is not configured on the server",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { phone: data.phone }],
    }).select("email phone");
    if (existingUser) {
      const field = existingUser.email === data.email ? "email" : "phone";
      const message =
        field === "email" ? "Email already exists" : "Phone already exists";
      return res.status(409).json({
        success: false,
        message,
        errors: [{ field, message }],
      });
    }

    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
      role: data.role,
      passwordHash: data.password,
      ...(data.address?.trim() ? { address: data.address.trim() } : {}),
      status: "INACTIVE",
      emailVerified: false,
    });
    await issueEmailVerificationCode(user);

    res.status(202).json({
      success: true,
      message:
        "Registration received. Verify your email to activate the account.",
      data: { email: user.email, verificationRequired: true },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/verify-email", verificationRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateEmailVerification(req.body);
    if (errors.length) return sendValidationErrors(res, errors);

    const user = await User.findOne({ email: data.email }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts +googleSubject",
    );
    if (!user || user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Verification code is invalid or expired",
      });
    }
    if (user.status === "BLOCKED") {
      return res
        .status(403)
        .json({ success: false, message: "Account is blocked" });
    }
    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code is invalid or expired. Request a new code.",
      });
    }
    if (user.emailVerificationAttempts >= EMAIL_CODE_MAX_ATTEMPTS) {
      clearEmailVerificationCode(user);
      await user.save();
      return res.status(429).json({
        success: false,
        message: "Too many incorrect codes. Request a new code.",
      });
    }

    const codeMatches = matchesEmailVerificationCode(
      user.email,
      data.code,
      env.jwtSecret,
      user.emailVerificationCodeHash,
    );
    if (!codeMatches) {
      user.emailVerificationAttempts += 1;
      const attemptsExceeded =
        user.emailVerificationAttempts >= EMAIL_CODE_MAX_ATTEMPTS;
      if (attemptsExceeded) clearEmailVerificationCode(user);
      await user.save();
      return res.status(attemptsExceeded ? 429 : 400).json({
        success: false,
        message: attemptsExceeded
          ? "Too many incorrect codes. Request a new code."
          : "Verification code is invalid",
      });
    }

    user.emailVerified = true;
    if (user.status === "INACTIVE") user.status = "ACTIVE";
    if (user.googleSubject) user.googleEmailCodeVerifiedAt = new Date();
    user.lastLoginAt = new Date();
    clearEmailVerificationCode(user);
    await user.save();
    if (user.role === "PROVIDER") {
      try {
        await ProviderProfile.updateOne({ user: user._id }, { userStatus: user.status, fullName: user.fullName });
      } catch {
        // Safe fallback in test environments
      }
    }
    return res.json({
      success: true,
      message: "Email verified successfully",
      data: { user: serializeUser(user), accessToken: signToken(user) },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/resend-verification", authRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateEmailAddress(req.body);
    if (errors.length) return sendValidationErrors(res, errors);
    if (!isEmailDeliveryConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Email verification is not configured on the server",
      });
    }

    const user = await User.findOne({ email: data.email }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts",
    );
    if (user && !user.emailVerified && user.status !== "BLOCKED") {
      await issueEmailVerificationCode(user);
    } else {
      // Equalize timing with dummy crypto hash when user doesn't exist or is already verified
      hashEmailVerificationCode(data.email, "000000", env.jwtSecret);
    }
    return res.json({
      success: true,
      message: "If the account needs verification, a new code has been sent",
      data: {},
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/forgot-password",
  forgotPasswordIpRateLimiter,
  forgotPasswordEmailRateLimiter,
  async (req, res, next) => {
    try {
      const { data, errors } = validateEmailAddress(req.body);
      if (errors.length) return sendValidationErrors(res, errors);

      if (!isEmailDeliveryConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Email delivery is not configured on the server",
        });
      }

      const genericResponse = {
        success: true,
        message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
        data: {},
      };

      const user = await User.findOne({ email: data.email }).select(
        "+passwordHash +passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts +passwordResetSentAt",
      );

      const now = Date.now();
      if (user && user.status === "ACTIVE" && user.emailVerified) {
        if (
          user.passwordResetSentAt &&
          now - user.passwordResetSentAt.getTime() < 60 * 1000
        ) {
          hashPasswordResetCode(data.email, "000000", env.jwtSecret);
          return res.json(genericResponse);
        }

        const code = createPasswordResetCode();
        user.passwordResetCodeHash = hashPasswordResetCode(
          user.email,
          code,
          env.jwtSecret,
        );
        user.passwordResetExpiresAt = new Date(now + PASSWORD_RESET_TTL_MS);
        user.passwordResetAttempts = 0;
        user.passwordResetSentAt = new Date(now);
        await user.save();
        await sendPasswordResetCode(user.email, code);
      } else {
        hashPasswordResetCode(data.email, "000000", env.jwtSecret);
      }

      return res.json(genericResponse);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/reset-password",
  resetPasswordIpRateLimiter,
  resetPasswordEmailRateLimiter,
  async (req, res, next) => {
    try {
      const { data, errors } = validateResetPassword(req.body);
      if (errors.length) return sendValidationErrors(res, errors);

      const genericError = {
        success: false,
        message: "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
      };

      const user = await User.findOne({ email: data.email }).select(
        "+passwordHash +passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts +passwordResetSentAt +googleSubject +tokenVersion",
      );

      const now = Date.now();
      if (
        !user ||
        user.status !== "ACTIVE" ||
        !user.emailVerified ||
        !user.passwordResetCodeHash ||
        !user.passwordResetExpiresAt ||
        user.passwordResetExpiresAt.getTime() <= now ||
        (user.passwordResetAttempts || 0) >= 5
      ) {
        matchesPasswordResetCode(
          data.email,
          data.code,
          env.jwtSecret,
          "00".repeat(32),
        );
        return res.status(400).json(genericError);
      }

      const isValidCode = matchesPasswordResetCode(
        user.email,
        data.code,
        env.jwtSecret,
        user.passwordResetCodeHash,
      );

      if (!isValidCode) {
        user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
        if (user.passwordResetAttempts >= 5) {
          user.passwordResetCodeHash = undefined;
          user.passwordResetExpiresAt = undefined;
          user.passwordResetAttempts = 0;
          user.passwordResetSentAt = undefined;
        }
        await user.save();
        return res.status(400).json(genericError);
      }

      user.passwordHash = data.newPassword;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.passwordResetCodeHash = undefined;
      user.passwordResetExpiresAt = undefined;
      user.passwordResetAttempts = 0;
      user.passwordResetSentAt = undefined;
      await user.save();

      logAuditEvent({
        actorId: user._id,
        role: user.role,
        action: "PASSWORD_RESET",
        targetType: "USER",
        targetId: user._id,
        ip: req.ip || null,
        result: "SUCCESS",
        details: {
          email: user.email,
        },
      });

      if (isEmailDeliveryConfigured()) {
        try {
          await sendPasswordResetConfirmation(user.email);
        } catch (err) {
          console.error(
            "[Email Error]: Failed to send password reset confirmation:",
            err.message,
          );
        }
      }

      return res.json({
        success: true,
        message:
          "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
        data: {},
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post("/google", authRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateGoogleAuth(req.body);
    if (errors.length) return sendValidationErrors(res, errors);
    if (!env.googleClientIds.length) {
      return res.status(503).json({
        success: false,
        message: "Google sign-in is not configured on the server",
      });
    }

    let googleProfile;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: data.idToken,
        audience: env.googleClientIds,
      });
      googleProfile = ticket.getPayload();
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Google identity token" });
    }

    if (
      !googleProfile?.sub ||
      !googleProfile.email ||
      googleProfile.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        message: "A Google account with a verified email is required",
      });
    }

    const email = googleProfile.email.trim().toLowerCase();
    let user = await User.findOne({ googleSubject: googleProfile.sub }).select(
      "+googleSubject +emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts +googleEmailCodeVerifiedAt",
    );
    if (!user) {
      user = await User.findOne({ email }).select(
        "+googleSubject +emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts +googleEmailCodeVerifiedAt",
      );
    }

    if (user) {
      if (!["CUSTOMER", "PROVIDER"].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "This account cannot use Google sign-in",
        });
      }
      if (user.googleSubject && user.googleSubject !== googleProfile.sub) {
        return res.status(409).json({
          success: false,
          message: "Google account is already linked elsewhere",
        });
      }
      if (user.status === "BLOCKED") {
        return res
          .status(403)
          .json({ success: false, message: "Account is blocked" });
      }
      if (user.status === "INACTIVE" && user.emailVerified) {
        return res
          .status(403)
          .json({ success: false, message: "Account is inactive" });
      }
      if (requiresGoogleEmailCode(user)) {
        if (!isEmailDeliveryConfigured()) {
          return res.status(503).json({
            success: false,
            message: "Email verification is not configured on the server",
          });
        }
        user.googleSubject = googleProfile.sub;
        user.emailVerified = false;
        user.status = "INACTIVE";
        if (!user.phone && data.phone) user.phone = data.phone;
        await issueEmailVerificationCode(user);
        return res.status(202).json({
          success: true,
          message:
            "Google account created. Verify your email to activate the account.",
          data: { email: user.email, verificationRequired: true },
        });
      }

      if (!user.emailVerified || user.status !== "ACTIVE") {
        return res
          .status(403)
          .json({ success: false, message: "Email verification is required" });
      }
      if (!user.googleSubject) user.googleSubject = googleProfile.sub;
      if (!user.phone && data.phone) user.phone = data.phone;
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      if (!isEmailDeliveryConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Email verification is not configured on the server",
        });
      }
      user = await User.create({
        fullName: googleProfile.name?.trim() || email.split("@")[0],
        email,
        ...(data.phone ? { phone: data.phone } : {}),
        role: data.role,
        status: "INACTIVE",
        emailVerified: false,
        googleSubject: googleProfile.sub,
      });
      await issueEmailVerificationCode(user);
      return res.status(202).json({
        success: true,
        message:
          "Google account created. Verify your email to activate the account.",
        data: { email: user.email, verificationRequired: true },
      });
    }

    return res.json({
      success: true,
      message: "Google sign-in successful",
      data: { user: serializeUser(user), accessToken: signToken(user) },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", authRateLimit, loginAccountRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateLogin(req.body);
    if (errors.length) return sendValidationErrors(res, errors);

    const user = await User.findOne({ email: data.email }).select(
      "+passwordHash",
    );

    const hasPasswordHash = Boolean(user && user.passwordHash);
    const isPasswordValid = hasPasswordHash
      ? await user.comparePassword(data.password)
      : await bcrypt.compare(data.password, DUMMY_PASSWORD_HASH).then(() => false);

    if (!user || !isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email verification is required before signing in",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive or blocked",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();
    res.json({
      success: true,
      message: "Login successful",
      data: { user: serializeUser(user), accessToken: signToken(user) },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", protect, (req, res) =>
  res.json({ success: true, data: serializeUser(req.user) }),
);

router.patch("/me", protect, async (req, res, next) => {
  try {
    const { fullName, phone, address, avatarUrl } = req.body;
    const user = req.user;
    if (fullName && typeof fullName === "string" && fullName.trim().length >= 2 && fullName.trim().length <= 120) {
      user.fullName = fullName.trim();
    }
    if (phone !== undefined && typeof phone === "string" && phone.trim()) {
      user.phone = phone.trim();
    }
    if (address !== undefined) {
      user.address = typeof address === "string" ? address.trim().slice(0, 500) : "";
    }
    if (avatarUrl !== undefined) {
      user.avatarUrl = typeof avatarUrl === "string" ? avatarUrl.trim().slice(0, 2048) : "";
    }
    await user.save();
    if (user.role === "PROVIDER" && fullName) {
      await syncProviderFullName(user._id, user.fullName);
    }
    res.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      data: serializeUser(user),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", protect, async (req, res, next) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { tokenVersion: 1 } },
      { new: true },
    );
    if (updated && req.user) {
      req.user.tokenVersion = updated.tokenVersion;
    }
    res.json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/change-password", protect, async (req, res, next) => {
  try {
    const { data, errors } = validateChangePassword(req.body);
    if (errors.length) return sendValidationErrors(res, errors);

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user || !(await user.comparePassword(data.currentPassword))) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác",
        errors: [{ field: "currentPassword", message: "Mật khẩu hiện tại không chính xác" }],
      });
    }

    user.passwordHash = data.newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

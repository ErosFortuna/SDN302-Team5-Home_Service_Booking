const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../users/user.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const { setUserStatus, syncProviderFullName } = require("../users/user.service.js");
const { env } = require("../../config/env.js");
const { protect, optionalProtect } = require("../../middlewares/auth.middleware.js");
const {
  createLoginAccountRateLimiter,
  changePasswordRateLimiter,
  refreshRateLimiter,
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
  EMAIL_CODE_MAX_ATTEMPTS,
  hashEmailVerificationCode,
  matchesEmailVerificationCode,
  requiresGoogleEmailCode,
  createPasswordResetCode,
  hashPasswordResetCode,
  matchesPasswordResetCode,
  PASSWORD_RESET_TTL_MS,
} = require("./email-verification.js");
const { issueEmailVerificationCode } = require("./email-verification.service.js");
const {
  isEmailDeliveryConfigured,
  sendPasswordResetCode,
  sendPasswordResetConfirmation,
} = require("./email.service.js");
const { logAuditEvent } = require("../../shared/audit-logger.js");
const { isVietnamesePhone } = require("../../shared/validators.js");
const { resolveStoreOptions } = require("../../middlewares/rate-limit-store.js");
const {
  signAccessToken,
  createSessionForUser,
  rotateRefreshToken,
  revokeAllUserSessions,
  revokeSessionByRawToken,
  findSessionByRawToken,
} = require("./token.service.js");
const {
  setRefreshCookie,
  setCsrfCookie,
  clearAuthCookies,
  validateCsrfRequest,
  isWebClient,
  getRefreshTokenFromRequest,
} = require("./auth.cookies.js");

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
  ...resolveStoreOptions('auth-generic', {}),
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
  ...resolveStoreOptions('auth-verification', {}),
});
/**
 * Creates a refresh-token session and builds the auth response. Web clients get
 * the refresh token only in an HttpOnly cookie; native clients receive it in the
 * JSON body for storage in OS secure storage.
 */
async function buildAuthResponse(req, res, user, message) {
  const { token, session } = await createSessionForUser(user, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  setRefreshCookie(res, token);
  setCsrfCookie(res);
  const data = { user: serializeUser(user), accessToken: signAccessToken(user, session) };
  if (!isWebClient(req)) data.refreshToken = token;
  return { success: true, message, data };
}

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
    return res.json(await buildAuthResponse(req, res, user, "Email verified successfully"));
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
      await revokeAllUserSessions(user._id, "PASSWORD_RESET");

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

    return res.json(await buildAuthResponse(req, res, user, "Google sign-in successful"));
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
      logAuditEvent({
        actorId: user?._id || null, role: user?.role || null, action: "LOGIN",
        targetType: "USER", targetId: user?._id || null, ip: req.ip || null,
        result: "FAILURE", details: { email: data.email },
      });
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      logAuditEvent({ actorId: user._id, role: user.role, action: "LOGIN", targetType: "USER", targetId: user._id, ip: req.ip || null, result: "FAILURE", details: { reason: "EMAIL_UNVERIFIED" } });
      return res.status(403).json({
        success: false,
        message: "Email verification is required before signing in",
      });
    }

    if (user.status !== "ACTIVE") {
      logAuditEvent({ actorId: user._id, role: user.role, action: "LOGIN", targetType: "USER", targetId: user._id, ip: req.ip || null, result: "FAILURE", details: { reason: "ACCOUNT_INACTIVE" } });
      return res.status(403).json({
        success: false,
        message: "Account is inactive or blocked",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();
    logAuditEvent({ actorId: user._id, role: user.role, action: "LOGIN", targetType: "USER", targetId: user._id, ip: req.ip || null, result: "SUCCESS" });
    res.json(await buildAuthResponse(req, res, user, "Login successful"));
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", refreshRateLimiter, async (req, res, next) => {
  try {
    const { bodyToken, cookieToken, token, usedCookie } = getRefreshTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        code: "REFRESH_TOKEN_MISSING",
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      });
    }

    if (usedCookie) {
      const csrf = validateCsrfRequest(req);
      if (!csrf.ok) {
        logAuditEvent({
          actorId: null,
          role: null,
          action: "CSRF_REJECTED",
          targetType: "ENDPOINT",
          targetId: "/api/auth/refresh",
          ip: req.ip || null,
          result: "FAILURE",
          details: { reason: csrf.reason },
        });
        return res.status(403).json({
          success: false,
          code: csrf.reason,
          message: "Yêu cầu không hợp lệ.",
        });
      }
    }

    const result = await rotateRefreshToken(token, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (result.status === "ok") {
      setRefreshCookie(res, result.token);
      setCsrfCookie(res);
      const data = {
        user: serializeUser(result.user),
        accessToken: signAccessToken(result.user, result.session),
      };
      if (!isWebClient(req) && !cookieToken) data.refreshToken = result.token;
      return res.json({ success: true, message: "Token refreshed", data });
    }

    if (result.status === "retry") {
      res.set("Retry-After", "1");
      return res.status(409).json({
        success: false,
        code: "REFRESH_RETRY",
        message: "Phiên đang được làm mới. Vui lòng thử lại.",
      });
    }

    clearAuthCookies(res);
    if (result.status === "reuse") {
      logAuditEvent({
        actorId: null,
        role: null,
        action: "REFRESH_TOKEN_REUSE_BLOCKED",
        targetType: "ENDPOINT",
        targetId: "/api/auth/refresh",
        ip: req.ip || null,
        result: "FAILURE",
      });
    }
    return res.status(401).json({
      success: false,
      code: "REFRESH_INVALID",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
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
    const { fullName, phone, address, avatarUrl, currentPassword } = req.body;
    const user = req.user;
    const normalizedPhone = typeof phone === "string" ? phone.trim() : phone;
    if (phone !== undefined && typeof phone !== "string") {
      return sendValidationErrors(res, [{ field: "phone", message: "Số điện thoại phải là chuỗi" }]);
    }
    const phoneChanged = normalizedPhone !== undefined && normalizedPhone !== (user.phone || "");
    if (phoneChanged) {
      if (typeof currentPassword !== "string" || !currentPassword) {
        return sendValidationErrors(res, [{ field: "currentPassword", message: "Mật khẩu hiện tại là bắt buộc khi đổi số điện thoại" }]);
      }
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu hiện tại không chính xác",
          errors: [{ field: "currentPassword", message: "Mật khẩu hiện tại không chính xác" }],
        });
      }
      if (!isVietnamesePhone(normalizedPhone)) {
        return sendValidationErrors(res, [{ field: "phone", message: "Số điện thoại Việt Nam không hợp lệ" }]);
      }
      const existingPhone = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } }).select("_id").lean();
      if (existingPhone) {
        return res.status(409).json({ success: false, message: "Số điện thoại đã được sử dụng" });
      }
    }
    if (fullName && typeof fullName === "string" && fullName.trim().length >= 2 && fullName.trim().length <= 120) {
      user.fullName = fullName.trim();
    }
    if (phoneChanged) {
      user.phone = normalizedPhone;
    }
    if (address !== undefined) {
      user.address = typeof address === "string" ? address.trim().slice(0, 500) : "";
    }
    if (avatarUrl !== undefined) {
      user.avatarUrl = typeof avatarUrl === "string" ? avatarUrl.trim().slice(0, 2048) : "";
    }
    try {
      await user.save();
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.phone) {
        return res.status(409).json({ success: false, message: "Số điện thoại đã được sử dụng" });
      }
      throw error;
    }
    if (user.role === "PROVIDER" && fullName) {
      await syncProviderFullName(user._id, user.fullName);
    }
    if (phoneChanged) {
      logAuditEvent({ actorId: user._id, role: user.role, action: "USER_PHONE_CHANGE", targetType: "USER", targetId: user._id, ip: req.ip || null, result: "SUCCESS" });
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

router.post("/logout", optionalProtect, async (req, res, next) => {
  try {
    const { token, usedCookie } = getRefreshTokenFromRequest(req);
    if (usedCookie) {
      const csrf = validateCsrfRequest(req);
      if (!csrf.ok) {
        logAuditEvent({
          actorId: null,
          role: null,
          action: "CSRF_REJECTED",
          targetType: "ENDPOINT",
          targetId: "/api/auth/logout",
          ip: req.ip || null,
          result: "FAILURE",
          details: { reason: csrf.reason },
        });
        return res.status(403).json({
          success: false,
          code: csrf.reason,
          message: "Yêu cầu không hợp lệ.",
        });
      }
    }

    let actor = req.user || null;
    if (!actor && token) {
      const session = await findSessionByRawToken(token);
      if (session) actor = { _id: session.user, role: null };
    }

    if (actor) {
      const updated = await User.findByIdAndUpdate(
        actor._id,
        { $inc: { tokenVersion: 1 } },
        { new: true },
      );
      if (updated && req.user) {
        req.user.tokenVersion = updated.tokenVersion;
      }
      await revokeAllUserSessions(actor._id, "LOGOUT");
    }

    clearAuthCookies(res);
    logAuditEvent({
      actorId: actor?._id || null,
      role: actor?.role || null,
      action: "LOGOUT",
      targetType: actor ? "USER" : "ENDPOINT",
      targetId: actor?._id || null,
      ip: req.ip || null,
      result: "SUCCESS",
    });
    return res.json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/change-password", protect, (req, res, next) => {
  const result = validateChangePassword(req.body);
  if (result.errors.length) return sendValidationErrors(res, result.errors);
  req.changePasswordData = result.data;
  return next();
}, changePasswordRateLimiter, async (req, res, next) => {
  try {
    const data = req.changePasswordData;

    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user || !(await user.comparePassword(data.currentPassword))) {
      logAuditEvent({ actorId: req.user._id, role: req.user.role, action: "PASSWORD_CHANGE", targetType: "USER", targetId: req.user._id, ip: req.ip || null, result: "FAILURE" });
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác",
        errors: [{ field: "currentPassword", message: "Mật khẩu hiện tại không chính xác" }],
      });
    }

    user.passwordHash = data.newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllUserSessions(user._id, "PASSWORD_CHANGED");
    logAuditEvent({ actorId: user._id, role: user.role, action: "PASSWORD_CHANGE", targetType: "USER", targetId: user._id, ip: req.ip || null, result: "SUCCESS" });

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

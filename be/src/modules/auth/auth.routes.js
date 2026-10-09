import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../users/user.model.js";
import { env } from "../../config/env.js";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  validateEmailAddress,
  validateEmailVerification,
  validateGoogleAuth,
  validateLogin,
  validateRegistration,
} from "./auth.validation.js";
import {
  createEmailVerificationCode,
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_TTL_MS,
  hashEmailVerificationCode,
  matchesEmailVerificationCode,
  requiresGoogleEmailCode,
} from "./email-verification.js";
import { isEmailDeliveryConfigured, sendEmailVerificationCode } from "./email.service.js";

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
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const serializeUser = (user) => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  emailVerified: user.emailVerified,
});

const sendValidationErrors = (res, errors) =>
  res.status(400).json({ success: false, message: "Validation failed", errors });

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

router.post("/register", authRateLimit, async (req, res, next) => {
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
      const message = field === "email" ? "Email already exists" : "Phone already exists";
      return res.status(409).json({
        success: false,
        message,
        errors: [{ field, message }],
      });
    }

    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: data.password,
      status: "INACTIVE",
      emailVerified: false,
    });
    await issueEmailVerificationCode(user);

    res.status(202).json({
      success: true,
      message: "Registration received. Verify your email to activate the account.",
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
      return res.status(403).json({ success: false, message: "Account is blocked" });
    }
    if (!user.emailVerificationCodeHash ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() <= Date.now()) {
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
      const attemptsExceeded = user.emailVerificationAttempts >= EMAIL_CODE_MAX_ATTEMPTS;
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
      return res.status(401).json({ success: false, message: "Invalid Google identity token" });
    }

    if (!googleProfile?.sub || !googleProfile.email || googleProfile.email_verified !== true) {
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
        return res.status(403).json({ success: false, message: "This account cannot use Google sign-in" });
      }
      if (user.googleSubject && user.googleSubject !== googleProfile.sub) {
        return res.status(409).json({ success: false, message: "Google account is already linked elsewhere" });
      }
      if (user.status === "BLOCKED") {
        return res.status(403).json({ success: false, message: "Account is blocked" });
      }
      if (user.status === "INACTIVE" && user.emailVerified) {
        return res.status(403).json({ success: false, message: "Account is inactive" });
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
          message: "Google account created. Verify your email to activate the account.",
          data: { email: user.email, verificationRequired: true },
        });
      }

      if (!user.emailVerified || user.status !== "ACTIVE") {
        return res.status(403).json({ success: false, message: "Email verification is required" });
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
        message: "Google account created. Verify your email to activate the account.",
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

router.post("/login", authRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateLogin(req.body);
    if (errors.length) return sendValidationErrors(res, errors);

    const user = await User.findOne({ email: data.email }).select("+passwordHash");

    if (!user || !(await user.comparePassword(data.password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
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
export default router;

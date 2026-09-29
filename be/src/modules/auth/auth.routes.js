import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import User from "../users/user.model.js";
import { env } from "../../config/env.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { validateLogin, validateRegistration } from "./auth.validation.js";

const router = Router();
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
});

const sendValidationErrors = (res, errors) =>
  res.status(400).json({ success: false, message: "Validation failed", errors });

router.post("/register", authRateLimit, async (req, res, next) => {
  try {
    const { data, errors } = validateRegistration(req.body);
    if (errors.length) return sendValidationErrors(res, errors);

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
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
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

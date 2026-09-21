import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../users/user.model.js";
import { env } from "../../config/env.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();
const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

router.post("/register", async (req, res, next) => {
  try {
    const fullName = req.body.fullName || req.body.name;
    const { email, password, phone, role } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "fullName, email and password are required" });
    }

    if (role && !["CUSTOMER", "PROVIDER"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Invalid public registration role" });
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already exists" });

    const user = await User.create({
      fullName,
      email,
      phone,
      role: role || "CUSTOMER",
      passwordHash: await bcrypt.hash(password, 12),
    });

    res.status(201).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token: signToken(user),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !(await user.comparePassword(password || "")))
      return res.status(401).json({ message: "Invalid credentials" });

    if (user.status !== "ACTIVE")
      return res.status(403).json({ message: "Account is not active" });

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token: signToken(user),
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", protect, (req, res) => res.json({ user: req.user }));
export default router;

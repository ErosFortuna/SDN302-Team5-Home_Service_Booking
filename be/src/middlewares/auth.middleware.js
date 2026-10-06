import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../modules/users/user.model.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ message: "Missing Bearer token" });
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || user.status !== "ACTIVE")
      return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

/** Builds [protect, role-check] with a role-specific 403 message. */
const requireRole = (role, message) => [
  protect,
  (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ success: false, message });
    next();
  },
];

/** Authenticated ADMIN only. Usage: `router.use(verifyAdmin)` or `router.get(path, verifyAdmin, handler)`. */
export const verifyAdmin = requireRole("ADMIN", "Chỉ quản trị viên (ADMIN) mới được thực hiện thao tác này");

/** Authenticated PROVIDER only (verification status is NOT checked — see `isApprovedProvider`). */
export const verifyProvider = requireRole("PROVIDER", "Chỉ tài khoản thợ (PROVIDER) mới được thực hiện thao tác này");

const jwt = require("jsonwebtoken");
const { env } = require("../config/env.js");
const User = require("../modules/users/user.model.js");

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice("Bearer ".length), env.jwtSecret);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };
}

<<<<<<< HEAD
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
=======
module.exports = { protect, authorize };
>>>>>>> development

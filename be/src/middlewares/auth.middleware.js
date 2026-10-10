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

module.exports = { protect, authorize };

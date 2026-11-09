const User = require("../modules/users/user.model.js");
const { verifyAccessToken } = require("../modules/auth/token.service.js");

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const payloadTokenVersion = payload.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (payloadTokenVersion !== userTokenVersion) {
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

async function optionalProtect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    return next();
  }

  try {
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || user.status !== "ACTIVE") {
      return next();
    }
    const payloadTokenVersion = payload.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (payloadTokenVersion !== userTokenVersion) {
      return next();
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { protect, authorize, optionalProtect };

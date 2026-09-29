import { env } from "../config/env.js";

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  if (env.nodeEnv !== "production") console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "resource";
    const message = `${field} already exists`;
    return res.status(409).json({
      success: false,
      message: "Duplicate value",
      errors: [{ field, message }],
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    return res.status(400).json({ success: false, message: "Validation failed", errors });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid request value",
      errors: [{ field: err.path, message: "Value is invalid" }],
    });
  }

  const status = err.statusCode || 500;
  const message = status >= 500 && env.nodeEnv === "production"
    ? "Internal server error"
    : err.message || "Internal server error";
  return res.status(status).json({ success: false, message });
}

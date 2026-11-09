const { env } = require("../config/env.js");
const { captureError } = require("../shared/monitoring.js");

function sanitizeUrlForLogging(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl, "http://localhost");
    const sensitiveParamPattern = /^(token|access_token|refresh_token|id_token|auth|authorization|password|pwd|pass|secret|client_secret|key|apikey|api_key|code|otp|signature|sig|credential)$/i;

    parsed.searchParams.forEach((value, key) => {
      if (sensitiveParamPattern.test(key)) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    });

    const decodedSearch = parsed.search ? decodeURIComponent(parsed.search) : "";
    return `${parsed.pathname}${decodedSearch}`;
  } catch {
    return rawUrl.split("?")[0];
  }
}

function notFound(req, res) {
  const method = req.method || "GET";
  const urlToLog = sanitizeUrlForLogging(req.originalUrl || req.url || "");
  console.warn(`[Route Not Found] ${method} ${urlToLog}`);

  res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

function errorHandler(err, req, res, next) {
  const currentNodeEnv = (process.env.NODE_ENV || env.nodeEnv || "").trim();
  const isDevelopment = currentNodeEnv === "development";
  const isProduction = currentNodeEnv === "production";

  if (isDevelopment) console.error(err);

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
    const errors = Object.values(err.errors || {}).map((error) => ({
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
  if (status >= 500) {
    captureError(err, { req, eventType: 'APPLICATION_ERROR', severity: 'error' });
  }

  const message = status >= 500 && isProduction
    ? "Internal server error"
    : err.message || "Internal server error";

  const responseBody = {
    success: false,
    message,
    ...(req.correlationId ? { correlationId: req.correlationId } : {}),
    ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
  };

  return res.status(status).json(responseBody);
}

module.exports = { notFound, errorHandler, sanitizeUrlForLogging };


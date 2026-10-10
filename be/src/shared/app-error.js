/**
 * Operational error carrying an HTTP status code (+ optional details for the client).
 * Compatible with the global `errorHandler` (uses `statusCode`).
 */
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }
}

/**
 * Router-level error handler: renders AppError as `{ success, message, details }`
 * and forwards everything else to the global `errorHandler`.
 * Usage (at the end of a module router): `router.use(handleAppError)`.
 */
function handleAppError(err, req, res, next) {
  if (!(err instanceof AppError)) return next(err);
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(err.details !== undefined && { details: err.details }),
  });
}

module.exports = { AppError, handleAppError };

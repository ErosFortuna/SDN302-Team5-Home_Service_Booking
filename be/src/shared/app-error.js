/**
 * Operational error carrying an HTTP status code.
 * Thrown anywhere in the request pipeline and rendered by `errorHandler`.
 */
export class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }
}

const { isVietnamesePhone } = require("../../shared/validators.js");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTRATION_FIELDS = new Set([
  "fullName",
  "email",
  "phone",
  "password",
  "role",
]);
const LOGIN_FIELDS = new Set(["email", "password"]);
const VERIFICATION_FIELDS = new Set(["email", "code"]);
const EMAIL_FIELDS = new Set(["email"]);
const GOOGLE_FIELDS = new Set(["idToken", "role", "phone"]);
const PUBLIC_ROLES = new Set(["CUSTOMER", "PROVIDER"]);

function validateAllowedFields(input, allowedFields, errors) {
  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      errors.push({ field, message: "Field is not allowed" });
    }
  }
}

function normalizeCredentials(input, errors) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!email) errors.push({ field: "email", message: "Email is required" });
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Email is invalid" });
  }

  if (!password) errors.push({ field: "password", message: "Password is required" });
  else if (Buffer.byteLength(password, "utf8") > 72) {
    errors.push({ field: "password", message: "Password must be at most 72 bytes" });
  }

  return { email, password };
}

function validateRegistration(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, REGISTRATION_FIELDS, errors);

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const { email, password } = normalizeCredentials(body, errors);
  const role = body.role === undefined ? "CUSTOMER" : body.role;

  if (fullName.length < 2 || fullName.length > 120) {
    errors.push({ field: "fullName", message: "Full name must be 2 to 120 characters" });
  }
  if (!phone) errors.push({ field: "phone", message: "Phone is required" });
  else if (!isVietnamesePhone(phone)) {
    errors.push({ field: "phone", message: "Phone number is invalid" });
  }
  if (password && Buffer.byteLength(password, "utf8") < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 bytes" });
  }
  if (!PUBLIC_ROLES.has(role)) {
    errors.push({ field: "role", message: "Role must be CUSTOMER or PROVIDER" });
  }

  return {
    data: { fullName, email, phone, password, role },
    errors,
  };
}

function validateLogin(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, LOGIN_FIELDS, errors);
  return { data: normalizeCredentials(body, errors), errors };
}

function validateEmailVerification(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, VERIFICATION_FIELDS, errors);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Email is invalid" });
  }
  if (!/^\d{6}$/.test(code)) {
    errors.push({ field: "code", message: "Code must contain six digits" });
  }

  return { data: { email, code }, errors };
}

function validateEmailAddress(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, EMAIL_FIELDS, errors);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Email is invalid" });
  }

  return { data: { email }, errors };
}

function validateGoogleAuth(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, GOOGLE_FIELDS, errors);
  const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
  const role = body.role === undefined ? "CUSTOMER" : body.role;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;

  if (!idToken || idToken.length > 8192) {
    errors.push({ field: "idToken", message: "Google ID token is required" });
  }
  if (!PUBLIC_ROLES.has(role)) {
    errors.push({ field: "role", message: "Role must be CUSTOMER or PROVIDER" });
  }
  if (phone && !isVietnamesePhone(phone)) {
    errors.push({ field: "phone", message: "Phone number is invalid" });
  }

  return { data: { idToken, role, phone }, errors };
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateEmailVerification,
  validateEmailAddress,
  validateGoogleAuth,
};
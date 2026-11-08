const { isVietnamesePhone } = require("../../shared/validators.js");
const { isCommonPassword } = require("./common-passwords.js");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTRATION_FIELDS = new Set([
  "fullName",
  "email",
  "phone",
  "password",
  "role",
  "address",
]);
const LOGIN_FIELDS = new Set(["email", "password"]);
const VERIFICATION_FIELDS = new Set(["email", "code"]);
const EMAIL_FIELDS = new Set(["email"]);
const CHANGE_PASSWORD_FIELDS = new Set(["currentPassword", "newPassword"]);
const RESET_PASSWORD_FIELDS = new Set(["email", "code", "newPassword"]);
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
  if (password) {
    const charCount = [...password].length;
    if (charCount < 10) {
      errors.push({ field: "password", message: "Password must be at least 10 characters" });
    } else if (isCommonPassword(password)) {
      errors.push({ field: "password", message: "Password is too common and easily guessed" });
    }
  }
  if (!PUBLIC_ROLES.has(role)) {
    errors.push({ field: "role", message: "Role must be CUSTOMER or PROVIDER" });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (body.address !== undefined && typeof body.address !== "string") {
    errors.push({ field: "address", message: "Address must be a string" });
  } else if (address.length > 500) {
    errors.push({ field: "address", message: "Address must be at most 500 characters" });
  }

  return {
    data: { fullName, email, phone, password, role, ...(address ? { address } : {}) },
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

function validateChangePassword(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, CHANGE_PASSWORD_FIELDS, errors);

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    errors.push({ field: "currentPassword", message: "Mật khẩu hiện tại là bắt buộc" });
  }
  if (!newPassword) {
    errors.push({ field: "newPassword", message: "Mật khẩu mới là bắt buộc" });
  } else {
    const charCount = [...newPassword].length;
    const byteLength = Buffer.byteLength(newPassword, "utf8");
    if (charCount < 10) {
      errors.push({ field: "newPassword", message: "Mật khẩu mới phải có ít nhất 10 ký tự" });
    } else if (byteLength > 72) {
      errors.push({ field: "newPassword", message: "Mật khẩu mới tối đa 72 byte" });
    } else if (isCommonPassword(newPassword)) {
      errors.push({ field: "newPassword", message: "Mật khẩu mới quá phổ biến và dễ đoán" });
    }
  }

  return { data: { currentPassword, newPassword }, errors };
}

function validateResetPassword(input) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = [];
  validateAllowedFields(body, RESET_PASSWORD_FIELDS, errors);

  const emailRaw = body.email;
  const codeRaw = body.code;
  const newPasswordRaw = body.newPassword;

  if (typeof emailRaw !== "string" || !emailRaw.trim() || emailRaw.trim().length > 254 || !EMAIL_PATTERN.test(emailRaw.trim().toLowerCase())) {
    errors.push({ field: "email", message: "Email is invalid" });
  }

  if (typeof codeRaw !== "string" || !/^\d{6}$/.test(codeRaw.trim())) {
    errors.push({ field: "code", message: "Code must contain six digits" });
  }

  if (typeof newPasswordRaw !== "string" || !newPasswordRaw) {
    errors.push({ field: "newPassword", message: "Password is required" });
  } else {
    const charCount = [...newPasswordRaw].length;
    const byteLength = Buffer.byteLength(newPasswordRaw, "utf8");
    if (charCount < 10) {
      errors.push({ field: "newPassword", message: "Password must be at least 10 characters" });
    } else if (byteLength > 72) {
      errors.push({ field: "newPassword", message: "Password must be at most 72 bytes" });
    } else if (isCommonPassword(newPasswordRaw)) {
      errors.push({ field: "newPassword", message: "Password is too common and easily guessed" });
    }
  }

  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const code = typeof codeRaw === "string" ? codeRaw.trim() : "";
  const newPassword = typeof newPasswordRaw === "string" ? newPasswordRaw : "";

  return { data: { email, code, newPassword }, errors };
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateEmailVerification,
  validateEmailAddress,
  validateGoogleAuth,
  validateChangePassword,
  validateResetPassword,
};
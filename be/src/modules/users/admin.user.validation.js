const { AppError } = require("../../shared/app-error.js");
const { isVietnamesePhone, isObjectId } = require("../../shared/validators.js");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["CUSTOMER", "PROVIDER", "STAFF", "ADMIN"];
const STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"];
const CREATE_FIELDS = new Set([
  "fullName",
  "email",
  "phone",
  "password",
  "role",
  "status",
  "emailVerified",
]);
const UPDATE_FIELDS = new Set([...CREATE_FIELDS]);

function fail(errors) {
  throw new AppError(400, "Dữ liệu không hợp lệ", errors);
}

function parseUserFields(body, { requireAll }) {
  const errors = [];
  const data = {};
  const allowedFields = requireAll ? CREATE_FIELDS : UPDATE_FIELDS;
  const unknown = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknown.length) errors.push({ field: unknown.join(", "), message: "Trường không được phép cập nhật" });

  if (body.fullName !== undefined || requireAll) {
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
    if (fullName.length < 2 || fullName.length > 120) errors.push({ field: "fullName", message: "Họ tên phải từ 2–120 ký tự" });
    else data.fullName = fullName;
  }
  if (body.email !== undefined || requireAll) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.push({ field: "email", message: "Email không hợp lệ" });
    else data.email = email;
  }
  if (body.phone !== undefined || requireAll) {
    const phone = body.phone == null ? "" : typeof body.phone === "string" ? body.phone.trim() : null;
    if (phone === null) errors.push({ field: "phone", message: "Số điện thoại phải là chuỗi" });
    else if (phone && !isVietnamesePhone(phone)) errors.push({ field: "phone", message: "Số điện thoại Việt Nam không hợp lệ" });
    else data.phone = phone;
  }
  if (body.password !== undefined || requireAll) {
    const password = typeof body.password === "string" ? body.password : "";
    const bytes = Buffer.byteLength(password, "utf8");
    if ((requireAll && bytes < 8) || (password && bytes < 8)) {
      errors.push({ field: "password", message: "Mật khẩu phải có ít nhất 8 byte" });
    } else if (bytes > 72) {
      errors.push({ field: "password", message: "Mật khẩu tối đa 72 byte" });
    } else if (password) {
      data.password = password;
    }
  }
  if (body.role !== undefined || requireAll) {
    if (!ROLES.includes(body.role)) errors.push({ field: "role", message: `role phải là: ${ROLES.join(", ")}` });
    else data.role = body.role;
  }
  if (body.status !== undefined || requireAll) {
    const status = body.status === undefined ? "ACTIVE" : body.status;
    if (!STATUSES.includes(status)) errors.push({ field: "status", message: `status phải là: ${STATUSES.join(", ")}` });
    else data.status = status;
  }
  if (body.emailVerified !== undefined || requireAll) {
    const emailVerified = body.emailVerified === undefined ? true : body.emailVerified;
    if (typeof emailVerified !== "boolean") errors.push({ field: "emailVerified", message: "emailVerified phải là true/false" });
    else data.emailVerified = emailVerified;
  }

  return { data, errors };
}

function validateCreateUser(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) fail([{ field: "body", message: "Body phải là JSON object" }]);
  const { data, errors } = parseUserFields(body, { requireAll: true });
  if (errors.length) fail(errors);
  req.adminUserData = data;
  next();
}

function validateUpdateUser(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) fail([{ field: "body", message: "Body phải là JSON object" }]);
  const { data, errors } = parseUserFields(body, { requireAll: false });
  if (errors.length) fail(errors);
  if (!Object.keys(data).length) fail([{ field: "body", message: "Không có trường nào để cập nhật" }]);
  req.adminUserData = data;
  next();
}

function validateUserQuery(req, res, next) {
  const { search = "", role = "all", status = "all", page = "1", limit = "10", sortBy = "createdAt", sortOrder = "desc" } = req.query;
  const errors = [];
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const sortFields = ["createdAt", "fullName", "email", "role", "status"];

  if (typeof search !== "string" || search.length > 100) errors.push({ field: "search", message: "search tối đa 100 ký tự" });
  if (role !== "all" && !ROLES.includes(role)) errors.push({ field: "role", message: "role không hợp lệ" });
  if (status !== "all" && !STATUSES.includes(status)) errors.push({ field: "status", message: "status không hợp lệ" });
  if (!Number.isInteger(pageNumber) || pageNumber < 1) errors.push({ field: "page", message: "page phải là số nguyên ≥ 1" });
  if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) errors.push({ field: "limit", message: "limit phải từ 1–100" });
  if (!sortFields.includes(sortBy)) errors.push({ field: "sortBy", message: `sortBy phải là: ${sortFields.join(", ")}` });
  if (!["asc", "desc"].includes(sortOrder)) errors.push({ field: "sortOrder", message: "sortOrder phải là asc hoặc desc" });
  if (errors.length) fail(errors);

  req.adminUserQuery = {
    search: search.trim(),
    role,
    status,
    page: pageNumber,
    limit: limitNumber,
    sortBy,
    sortOrder,
  };
  next();
}

function validateUserId(req, res, next) {
  if (!isObjectId(req.params.id)) throw new AppError(400, "Mã người dùng không hợp lệ");
  next();
}

module.exports = { validateCreateUser, validateUpdateUser, validateUserQuery, validateUserId };

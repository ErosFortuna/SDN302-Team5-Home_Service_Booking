const assert = require("node:assert/strict");
const test = require("node:test");
const {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateUserQuery,
} = require("../src/modules/users/admin.user.validation.js");

const validCreate = {
  fullName: "Nguyen Van A",
  email: "Admin.Created@Example.com",
  phone: "0912345678",
  password: "StrongPassword123!",
  role: "CUSTOMER",
};

function invoke(middleware, req) {
  let error;
  let continued = false;
  try {
    middleware(req, {}, () => { continued = true; });
  } catch (caught) {
    error = caught;
  }
  return { error, continued };
}

test("admin user create validates and normalizes user fields", () => {
  const req = { body: validCreate };
  const result = invoke(validateCreateUser, req);

  assert.equal(result.error, undefined);
  assert.equal(result.continued, true);
  assert.equal(req.adminUserData.email, "admin.created@example.com");
  assert.equal(req.adminUserData.status, "ACTIVE");
  assert.equal(req.adminUserData.emailVerified, true);
});

test("admin user create rejects invalid fields and mass assignment", () => {
  const result = invoke(validateCreateUser, {
    body: { ...validCreate, phone: "123", role: "ROOT", passwordHash: "injected" },
  });

  assert.equal(result.continued, false);
  assert.equal(result.error.statusCode, 400);
  assert.ok(result.error.details.some(({ field }) => field === "phone"));
  assert.ok(result.error.details.some(({ field }) => field === "role"));
  assert.ok(result.error.details.some(({ field }) => field.includes("passwordHash")));
});

test("admin user create requires a password with acceptable length", () => {
  const result = invoke(validateCreateUser, {
    body: { ...validCreate, password: "short" },
  });

  assert.equal(result.error.statusCode, 400);
  assert.ok(result.error.details.some(({ field }) => field === "password"));
});

test("admin user update accepts only whitelisted fields", () => {
  const req = { body: { fullName: "Updated Name", status: "BLOCKED" } };
  const result = invoke(validateUpdateUser, req);

  assert.equal(result.error, undefined);
  assert.deepEqual(req.adminUserData, { fullName: "Updated Name", status: "BLOCKED" });
});

test("admin user update rejects empty and protected-field payloads", () => {
  const empty = invoke(validateUpdateUser, { body: {} });
  const protectedField = invoke(validateUpdateUser, { body: { role: "ADMIN", passwordHash: "injected" } });

  assert.equal(empty.error.statusCode, 400);
  assert.equal(protectedField.error.statusCode, 400);
});

test("admin user list validates pagination, filters and sorting", () => {
  const req = { query: { search: " Lan ", role: "PROVIDER", status: "ACTIVE", page: "2", limit: "20", sortBy: "email", sortOrder: "asc" } };
  const result = invoke(validateUserQuery, req);

  assert.equal(result.error, undefined);
  assert.deepEqual(req.adminUserQuery, {
    search: "Lan",
    role: "PROVIDER",
    status: "ACTIVE",
    page: 2,
    limit: 20,
    sortBy: "email",
    sortOrder: "asc",
  });

  const invalid = invoke(validateUserQuery, { query: { role: "ROOT", limit: "1000", sortBy: "passwordHash" } });
  assert.equal(invalid.error.statusCode, 400);
});

test("admin user id validation requires a MongoDB ObjectId", () => {
  assert.equal(invoke(validateUserId, { params: { id: "507f1f77bcf86cd799439011" } }).continued, true);
  assert.equal(invoke(validateUserId, { params: { id: "not-an-id" } }).error.statusCode, 400);
});

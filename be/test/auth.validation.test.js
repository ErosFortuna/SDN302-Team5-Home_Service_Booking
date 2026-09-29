import assert from "node:assert/strict";
import test from "node:test";
import { validateLogin, validateRegistration } from "../src/modules/auth/auth.validation.js";

const validRegistration = {
  fullName: "Nguyen Van A",
  email: "Customer@Example.com",
  phone: "0912345678",
  password: "StrongPassword123!",
};

test("registration defaults to CUSTOMER and normalizes email and phone", () => {
  const result = validateRegistration(validRegistration);

  assert.deepEqual(result.errors, []);
  assert.equal(result.data.role, "CUSTOMER");
  assert.equal(result.data.email, "customer@example.com");
  assert.equal(result.data.phone, "0912345678");
});

test("registration permits PROVIDER but rejects privileged roles", () => {
  assert.equal(validateRegistration({ ...validRegistration, role: "PROVIDER" }).errors.length, 0);
  assert.ok(validateRegistration({ ...validRegistration, role: "ADMIN" }).errors.some(({ field }) => field === "role"));
  assert.ok(validateRegistration({ ...validRegistration, role: "STAFF" }).errors.some(({ field }) => field === "role"));
});

test("registration rejects invalid required fields and unknown protected fields", () => {
  const result = validateRegistration({
    ...validRegistration,
    phone: "123",
    status: "ACTIVE",
    passwordHash: "injected",
  });

  assert.ok(result.errors.some(({ field }) => field === "phone"));
  assert.ok(result.errors.some(({ field }) => field === "status"));
  assert.ok(result.errors.some(({ field }) => field === "passwordHash"));
});

test("login normalizes email and rejects malformed credentials or extra fields", () => {
  const valid = validateLogin({ email: "USER@EXAMPLE.COM", password: "StrongPassword123!" });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.data.email, "user@example.com");

  const invalid = validateLogin({ email: "not-an-email", password: "short", role: "ADMIN" });
  assert.ok(invalid.errors.some(({ field }) => field === "email"));
  assert.ok(invalid.errors.some(({ field }) => field === "role"));
});
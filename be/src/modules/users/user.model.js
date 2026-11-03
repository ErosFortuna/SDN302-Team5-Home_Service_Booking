const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { baseOptions } = require("../../shared/schema-options.js");
const { isVietnamesePhone } = require("../../shared/validators.js");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => value == null || isVietnamesePhone(value),
        message: "Invalid Vietnamese phone number",
      },
    },
    passwordHash: {
      type: String,
      required() {
        return !this.googleSubject;
      },
      select: false,
    },
    googleSubject: { type: String, unique: true, sparse: true, select: false },
    googleEmailCodeVerifiedAt: { type: Date, select: false },
    emailVerified: { type: Boolean, default: true, index: true },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    role: {
      type: String,
      enum: ["CUSTOMER", "PROVIDER", "STAFF", "ADMIN"],
      default: "CUSTOMER",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
      index: true,
    },
    avatarUrl: { type: String, trim: true, maxlength: 2048 },
    lastLoginAt: Date,
    blockedAt: Date,
    blockedReason: { type: String, trim: true, maxlength: 500 },
  },
  baseOptions,
);

userSchema.pre("save", async function hashPassword() {
  if (this.isModified("passwordHash")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
});

userSchema.methods.comparePassword = function comparePassword(password) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: "string", $gt: "" } },
  },
);

module.exports = mongoose.model("User", userSchema);

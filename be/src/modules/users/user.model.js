import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { baseOptions } from "../../shared/schema-options.js";
import { isVietnamesePhone } from "../../shared/validators.js";

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
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: isVietnamesePhone,
        message: "Invalid Vietnamese phone number",
      },
    },
    passwordHash: { type: String, required: true, select: false },
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

userSchema.pre("save", async function save(next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.model("User", userSchema);

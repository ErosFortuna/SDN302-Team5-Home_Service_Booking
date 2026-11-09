const User = require("./user.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const { setUserStatus, syncProviderFullName } = require("./user.service.js");
const ServiceRequest = require("../requests/request.model.js");

const Booking = require("../bookings/booking.model.js");
const Availability = require("../availability/availability.model.js");
const Review = require("../reviews/review.model.js");
const Complaint = require("../complaints/complaint.model.js");
const { AppError } = require("../../shared/app-error.js");
const { escapeRegex } = require("../../shared/regex.js");
const { logAuditEvent } = require("../../shared/audit-logger.js");
const { issueEmailVerificationCode } = require("../auth/email-verification.service.js");
const { isEmailDeliveryConfigured } = require("../auth/email.service.js");
const { revokeAllUserSessions } = require("../auth/token.service.js");

const isDuplicateKey = (error) => error?.code === 11000;

function toUserDTO(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    tokenVersion: user.tokenVersion ?? 0,
    avatarUrl: user.avatarUrl || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
  };
}

async function getUserStats() {
  const [stats] = await User.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ["$status", "INACTIVE"] }, 1, 0] } },
        blocked: { $sum: { $cond: [{ $eq: ["$status", "BLOCKED"] }, 1, 0] } },
        customers: { $sum: { $cond: [{ $eq: ["$role", "CUSTOMER"] }, 1, 0] } },
        providers: { $sum: { $cond: [{ $eq: ["$role", "PROVIDER"] }, 1, 0] } },
        staff: { $sum: { $cond: [{ $eq: ["$role", "STAFF"] }, 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ["$role", "ADMIN"] }, 1, 0] } },
      },
    },
  ]);
  return stats
    ? (({ _id, ...result }) => result)(stats)
    : { total: 0, active: 0, inactive: 0, blocked: 0, customers: 0, providers: 0, staff: 0, admins: 0 };
}

async function assertUniqueFields(data, excludeId) {
  const conditions = [];
  if (data.email) conditions.push({ email: data.email });
  if (data.phone) conditions.push({ phone: data.phone });
  if (!conditions.length) return;

  const existing = await User.findOne({
    $or: conditions,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).select("email phone").lean();
  if (!existing) return;

  const field = existing.email === data.email ? "email" : "phone";
  const message = field === "email" ? "Email đã được sử dụng" : "Số điện thoại đã được sử dụng";
  throw new AppError(409, message, [{ field, message }]);
}

async function assertActiveAdminRemains(user, update) {
  const nextRole = update.role ?? user.role;
  const nextStatus = update.status ?? user.status;
  if (user.role !== "ADMIN" || user.status !== "ACTIVE" || (nextRole === "ADMIN" && nextStatus === "ACTIVE")) return;
  const activeAdmins = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
  if (activeAdmins <= 1) throw new AppError(409, "Không thể vô hiệu hóa hoặc thay đổi vai trò của quản trị viên hoạt động cuối cùng");
}

async function getAllUsers(req, res) {
  const { search, role, status, page, limit, sortBy, sortOrder } = req.adminUserQuery;
  const filter = {};
  if (role !== "all") filter.role = role;
  if (status !== "all") filter.status = status;
  if (search) {
    const expression = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ fullName: expression }, { email: expression }, { phone: expression }];
  }

  const [users, total, stats] = await Promise.all([
    User.find(filter)
      .select("fullName email phone role status emailVerified tokenVersion avatarUrl createdAt updatedAt lastLoginAt")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    getUserStats(),
  ]);
  res.json({
    success: true,
    data: users.map(toUserDTO),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), stats },
  });
}

async function getUserById(req, res) {
  const user = await User.findById(req.params.id)
    .select("fullName email phone role status emailVerified tokenVersion avatarUrl createdAt updatedAt lastLoginAt")
    .lean();
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");
  res.json({ success: true, data: toUserDTO(user) });
}

async function createUser(req, res) {
  const { password, ...inputData } = req.adminUserData;
  const data = {
    ...inputData,
    ...(typeof inputData.email === "string" ? { email: inputData.email.trim().toLowerCase() } : {}),
  };
  await assertUniqueFields(data);
  try {
    const user = await User.create({
      ...data,
      ...(data.status === "BLOCKED" ? { blockedAt: new Date() } : {}),
      passwordHash: password,
    });
    if (user.role === "PROVIDER") {
      try {
        await ProviderProfile.updateOne(
          { user: user._id },
          { $set: { userStatus: user.status, fullName: user.fullName } }
        );
      } catch {}
    }
    res.status(201).json({
      success: true,
      message: "Đã tạo tài khoản người dùng",
      data: toUserDTO(user),
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AppError(409, "Email hoặc số điện thoại đã được sử dụng");
    throw error;
  }
}

async function updateUser(req, res) {
  const user = await User.findById(req.params.id).select("+googleSubject +passwordHash");
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");
  const { password, ...inputData } = req.adminUserData;
  const data = {
    ...inputData,
    ...(typeof inputData.email === "string" ? { email: inputData.email.trim().toLowerCase() } : {}),
  };
  await assertUniqueFields(data, user._id);
  await assertActiveAdminRemains(user, data);

  if (user._id.equals(req.user._id) &&
      ((data.role && data.role !== "ADMIN") || (data.status && data.status !== "ACTIVE"))) {
    throw new AppError(409, "Không thể tự vô hiệu hóa hoặc thay đổi vai trò quản trị viên của chính mình");
  }

  const previousStatus = user.status;
  const previousRole = user.role;
  const previousEmail = String(user.email || "").trim().toLowerCase();
  try {
    user.set(data);
    const emailChanged = data.email !== undefined && data.email !== previousEmail;
    if (emailChanged) {
      user.email = data.email;
      user.emailVerified = false;
    }

    let isPasswordActuallyChanged = false;
    if (password) {
      const isSamePassword = user.passwordHash ? await user.comparePassword(password) : false;
      if (!isSamePassword) {
        user.passwordHash = password;
        isPasswordActuallyChanged = true;
      }
    }

    const isStatusChangedToBlockedOrInactive =
      data.status !== undefined &&
      data.status !== previousStatus &&
      ["BLOCKED", "INACTIVE"].includes(data.status);

    const shouldIncrementTokenVersion =
      isPasswordActuallyChanged || isStatusChangedToBlockedOrInactive || emailChanged;

    if (shouldIncrementTokenVersion && data.tokenVersion === undefined) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    if (data.status === "BLOCKED" && previousStatus !== "BLOCKED") user.blockedAt = new Date();
    if (data.status && data.status !== "BLOCKED") {
      user.blockedAt = undefined;
      user.blockedReason = undefined;
    }
    await user.save();
    if (shouldIncrementTokenVersion) {
      await revokeAllUserSessions(user._id, "ADMIN_REVOCATION");
    }
    if (emailChanged && isEmailDeliveryConfigured()) {
      try {
        await issueEmailVerificationCode(user);
      } catch {
        // The new address remains unverified; it can request a fresh code later.
      }
    }
    if (user.role === "PROVIDER") {
      try {
        const profileUpdate = {};
        if (data.status) profileUpdate.userStatus = data.status;
        if (data.fullName) profileUpdate.fullName = data.fullName.trim();
        if (Object.keys(profileUpdate).length > 0) {
          await ProviderProfile.updateOne({ user: user._id }, { $set: profileUpdate });
        }
      } catch {
        // Safe fallback in environments without ProviderProfile
      }
    }

    if (data.role && data.role !== previousRole) {
      logAuditEvent({
        actorId: req.user._id,
        role: req.user.role,
        action: "USER_ROLE_CHANGE",
        targetType: "USER",
        targetId: user._id,
        ip: req.ip || null,
        result: "SUCCESS",
        details: {
          previousRole,
          newRole: data.role,
        },
      });
    }

    if (data.status && data.status !== previousStatus) {
      logAuditEvent({
        actorId: req.user._id,
        role: req.user.role,
        action: "USER_STATUS_CHANGE",
        targetType: "USER",
        targetId: user._id,
        ip: req.ip || null,
        result: "SUCCESS",
        details: {
          previousStatus,
          newStatus: data.status,
        },
      });
    }

    if (emailChanged) {
      logAuditEvent({
        actorId: req.user._id,
        role: req.user.role,
        action: "ADMIN_USER_EMAIL_CHANGE",
        targetType: "USER",
        targetId: user._id,
        ip: req.ip || null,
        result: "SUCCESS",
      });
    }

    res.json({ success: true, message: "Đã cập nhật tài khoản người dùng", data: toUserDTO(user) });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AppError(409, "Email hoặc số điện thoại đã được sử dụng");
    throw error;
  }
}

async function getUserReferenceCount(userId) {
  const checks = await Promise.all([
    ProviderProfile.countDocuments({ user: userId }),
    ServiceRequest.countDocuments({ customer: userId }),

    Booking.countDocuments({ $or: [{ customer: userId }, { provider: userId }, { "statusHistory.changedBy": userId }] }),
    Availability.countDocuments({ provider: userId }),
    Review.countDocuments({ $or: [{ customer: userId }, { provider: userId }] }),
    Complaint.countDocuments({ $or: [{ reporter: userId }, { against: userId }, { resolvedBy: userId }] }),
  ]);
  return checks.reduce((total, count) => total + count, 0);
}

async function deleteUser(req, res) {
  if (req.params.id === req.user._id.toString()) {
    throw new AppError(409, "Không thể xóa tài khoản đang đăng nhập");
  }
  const user = await User.findById(req.params.id).select("role status");
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");

  if (user.role === "ADMIN" && user.status === "ACTIVE") {
    const activeAdmins = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
    if (activeAdmins <= 1) throw new AppError(409, "Không thể xóa quản trị viên hoạt động cuối cùng");
  }
  if (await getUserReferenceCount(user._id)) {
    throw new AppError(409, "Người dùng đã có dữ liệu liên quan. Hãy chuyển trạng thái thành INACTIVE hoặc BLOCKED thay vì xóa để bảo toàn lịch sử.");
  }

  await user.deleteOne();
  logAuditEvent({
    actorId: req.user._id,
    role: req.user.role,
    action: "USER_DELETE",
    targetType: "USER",
    targetId: user._id,
    ip: req.ip || null,
    result: "SUCCESS",
    details: {
      deletedUserRole: user.role,
      deletedUserStatus: user.status,
    },
  });
  res.json({ success: true, message: "Đã xóa tài khoản người dùng", data: { id: req.params.id } });
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };

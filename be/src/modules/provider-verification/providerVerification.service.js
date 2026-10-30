const ProviderProfile = require('./providerProfile.model.js');
const User = require('../users/user.model.js');
const { AppError } = require('../../shared/app-error.js');

/**
 * Lấy danh sách hồ sơ thợ kèm bộ lọc và thống kê số lượng theo trạng thái
 */
async function listProviders({ status, search, page = 1, limit = 10 }) {
  const query = {};

  // Lọc theo trạng thái xét duyệt
  if (status && status !== 'ALL') {
    if (status === 'APPROVED') {
      query.verificationStatus = { $in: ['APPROVED', 'VERIFIED'] };
    } else {
      query.verificationStatus = status;
    }
  }

  // Lọc theo từ khóa tìm kiếm (tên, email, sđt hoặc tên cửa hàng)
  if (search) {
    const matchingUsers = await User.find({
      role: 'PROVIDER',
      $or: [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean();

    const userIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { user: { $in: userIds } },
      { businessName: { $regex: search, $options: 'i' } },
      { serviceAreas: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total, counts] = await Promise.all([
    ProviderProfile.find(query)
      .populate('user', 'fullName email phone avatar status createdAt')
      .populate('skills', 'name slug icon iconUrl')
      .populate('serviceCategories', 'name slug icon iconUrl')
      .populate('verifiedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProviderProfile.countDocuments(query),
    getVerificationCounts(),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    counts,
  };
}

/**
 * Đếm số lượng hồ sơ theo từng nhóm trạng thái
 */
async function getVerificationCounts() {
  const [all, pending, underReview, approved, rejected, infoRequested] = await Promise.all([
    ProviderProfile.countDocuments({}),
    ProviderProfile.countDocuments({ verificationStatus: 'PENDING' }),
    ProviderProfile.countDocuments({ verificationStatus: 'UNDER_REVIEW' }),
    ProviderProfile.countDocuments({ verificationStatus: { $in: ['APPROVED', 'VERIFIED'] } }),
    ProviderProfile.countDocuments({ verificationStatus: 'REJECTED' }),
    ProviderProfile.countDocuments({ additionalInfoRequested: true }),
  ]);

  return {
    all,
    pending,
    underReview,
    approved,
    rejected,
    additionalInfoRequested: infoRequested,
  };
}

/**
 * Xem chi tiết hồ sơ thợ (bảo mật giấy tờ cá nhân)
 */
async function getProviderDetails(id, callerRole, callerUserId) {
  const profile = await ProviderProfile.findOne({
    $or: [{ _id: id }, { user: id }],
  })
    .populate('user', 'fullName email phone avatar status createdAt')
    .populate('skills', 'name slug icon iconUrl')
    .populate('serviceCategories', 'name slug icon iconUrl')
    .populate('verifiedBy', 'fullName email')
    .populate('verificationLogs.adminId', 'fullName email')
    .lean();

  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ');
  }

  // Bảo mật: Nếu người xem KHÔNG phải là ADMIN và KHÔNG phải là chính chủ thợ
  const isOwner = callerUserId && String(profile.user?._id || profile.user) === String(callerUserId);
  const isAdmin = callerRole === 'ADMIN';

  if (!isAdmin && !isOwner) {
    // Ẩn tài liệu nhạy cảm và nhật ký xét duyệt nội bộ
    delete profile.documents;
    delete profile.verificationLogs;
    delete profile.payoutInfo;
  }

  return profile;
}

/**
 * Bắt đầu xét duyệt hồ sơ: Chuyển PENDING -> UNDER_REVIEW
 */
async function startReview(profileId, adminId) {
  const profile = await ProviderProfile.findById(profileId);
  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ để xét duyệt');
  }

  // Nếu đang ở PENDING thì chuyển sang UNDER_REVIEW
  if (profile.verificationStatus === 'PENDING') {
    profile.verificationStatus = 'UNDER_REVIEW';
    profile.verificationLogs.push({
      action: 'START_REVIEW',
      status: 'UNDER_REVIEW',
      note: 'Admin bắt đầu mở xem và xét duyệt hồ sơ',
      adminId,
      timestamp: new Date(),
    });
    await profile.save();
  }

  return getProviderDetails(profile._id, 'ADMIN', adminId);
}

/**
 * Duyệt hồ sơ (APPROVE):
 * - Đặt verificationStatus = 'APPROVED'
 * - Xóa cờ additionalInfoRequested = false
 * - Ghi nhận verifiedBy và verifiedAt
 * - Ghi log xét duyệt
 */
async function approveProvider(profileId, adminId, note) {
  const profile = await ProviderProfile.findById(profileId);
  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ để phê duyệt');
  }

  const reviewNote = note || 'Hồ sơ và giấy tờ hợp lệ. Đã phê duyệt tài khoản thợ.';

  profile.verificationStatus = 'APPROVED';
  profile.additionalInfoRequested = false;
  profile.adminReviewNote = reviewNote;
  profile.verifiedBy = adminId;
  profile.verifiedAt = new Date();

  profile.verificationLogs.push({
    action: 'APPROVE',
    status: 'APPROVED',
    note: reviewNote,
    adminId,
    timestamp: new Date(),
  });

  await profile.save();
  return getProviderDetails(profile._id, 'ADMIN', adminId);
}

/**
 * Từ chối hồ sơ (REJECT):
 * - Bắt buộc có lý do từ chối (adminReviewNote)
 * - Đặt verificationStatus = 'REJECTED'
 * - Ghi nhận verifiedBy và verifiedAt
 * - Ghi log xét duyệt
 */
async function rejectProvider(profileId, adminId, note) {
  const profile = await ProviderProfile.findById(profileId);
  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ để từ chối');
  }

  if (!note || note.trim().length < 5) {
    throw new AppError(422, 'Bắt buộc phải nhập lý do từ chối hồ sơ rõ ràng');
  }

  profile.verificationStatus = 'REJECTED';
  profile.adminReviewNote = note.trim();
  profile.verifiedBy = adminId;
  profile.verifiedAt = new Date();

  profile.verificationLogs.push({
    action: 'REJECT',
    status: 'REJECTED',
    note: note.trim(),
    adminId,
    timestamp: new Date(),
  });

  await profile.save();
  return getProviderDetails(profile._id, 'ADMIN', adminId);
}

/**
 * Yêu cầu bổ sung thông tin (REQUEST_INFO):
 * - Đặt additionalInfoRequested = true
 * - verificationStatus chuyển/giữ ở 'UNDER_REVIEW'
 * - Bắt buộc có adminReviewNote nêu rõ nội dung cần bổ sung
 * - Ghi log xét duyệt
 */
async function requestAdditionalInfo(profileId, adminId, note) {
  const profile = await ProviderProfile.findById(profileId);
  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ để yêu cầu bổ sung thông tin');
  }

  if (!note || note.trim().length < 5) {
    throw new AppError(422, 'Bắt buộc phải nêu rõ tài liệu hoặc thông tin cần bổ sung');
  }

  profile.verificationStatus = 'UNDER_REVIEW';
  profile.additionalInfoRequested = true;
  profile.adminReviewNote = note.trim();
  profile.verifiedBy = adminId;

  profile.verificationLogs.push({
    action: 'REQUEST_INFO',
    status: 'UNDER_REVIEW',
    note: note.trim(),
    adminId,
    timestamp: new Date(),
  });

  await profile.save();
  return getProviderDetails(profile._id, 'ADMIN', adminId);
}

/**
 * Provider gửi lại hồ sơ bổ sung (UC-31)
 */
async function resubmitProviderInfo(userId, updateData) {
  const profile = await ProviderProfile.findOne({ user: userId });
  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ của bạn');
  }

  if (updateData.businessName) profile.businessName = updateData.businessName;
  if (updateData.description) {
    profile.description = updateData.description;
    profile.bio = updateData.description;
  }
  if (updateData.serviceAreas) profile.serviceAreas = updateData.serviceAreas;
  if (updateData.documents) profile.documents = updateData.documents;

  // Đặt lại cờ và chuyển trạng thái về PENDING để Admin duyệt lại
  profile.additionalInfoRequested = false;
  profile.verificationStatus = 'PENDING';

  profile.verificationLogs.push({
    action: 'RESUBMIT',
    status: 'PENDING',
    note: updateData.note || 'Thợ đã cập nhật và gửi lại hồ sơ bổ sung',
    timestamp: new Date(),
  });

  await profile.save();
  return getProviderDetails(profile._id, 'PROVIDER', userId);
}

/**
 * Provider xem trạng thái xét duyệt của chính mình (UC-31)
 */
async function getMyVerificationStatus(userId) {
  const profile = await ProviderProfile.findOne({ user: userId })
    .populate('skills', 'name slug icon iconUrl')
    .populate('serviceCategories', 'name slug icon iconUrl')
    .populate('verificationLogs.adminId', 'fullName email')
    .lean();

  if (!profile) {
    return {
      exists: false,
      verificationStatus: 'NOT_CREATED',
      additionalInfoRequested: false,
      adminReviewNote: null,
      documents: [],
      verificationLogs: [],
    };
  }

  return {
    exists: true,
    profileId: profile._id,
    businessName: profile.businessName,
    description: profile.description || profile.bio,
    verificationStatus: profile.verificationStatus,
    additionalInfoRequested: profile.additionalInfoRequested,
    adminReviewNote: profile.adminReviewNote,
    documents: profile.documents || [],
    verificationLogs: profile.verificationLogs || [],
    skills: profile.skills || [],
    serviceAreas: profile.serviceAreas || [],
    averageRating: profile.averageRating,
  };
}

/**
 * BOOKING ELIGIBILITY RULE:
 * Thợ có verificationStatus !== 'APPROVED' tuyệt đối không được nhận booking mới.
 * Module Booking có thể gọi lại hàm helper này:
 *   const { assertProviderApproved } = require('../provider-verification/providerVerification.service.js');
 *   await assertProviderApproved(providerId);
 */
async function assertProviderApproved(providerId) {
  const profile = await ProviderProfile.findOne({
    $or: [{ _id: providerId }, { user: providerId }],
  }).lean();

  if (!profile) {
    throw new AppError(404, 'Không tìm thấy hồ sơ thợ (ProviderProfile)');
  }

  const isApproved =
    profile.verificationStatus === 'APPROVED' || profile.verificationStatus === 'VERIFIED';

  if (!isApproved) {
    throw new AppError(
      403,
      `Hồ sơ thợ chưa được phê duyệt hoạt động (Trạng thái hiện tại: ${profile.verificationStatus}). Không đủ điều kiện nhận đơn đặt lịch mới.`,
      {
        code: 'PROVIDER_NOT_APPROVED',
        verificationStatus: profile.verificationStatus,
        additionalInfoRequested: profile.additionalInfoRequested,
      }
    );
  }

  return profile;
}

module.exports = {
  listProviders,
  getProviderDetails,
  getVerificationCounts,
  startReview,
  approveProvider,
  rejectProvider,
  requestAdditionalInfo,
  resubmitProviderInfo,
  getMyVerificationStatus,
  assertProviderApproved,
};


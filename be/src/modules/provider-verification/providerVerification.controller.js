const verificationService = require('./providerVerification.service.js');

/**
 * [GET] /api/admin/providers
 * Admin lấy danh sách hồ sơ thợ theo bộ lọc trạng thái và từ khóa tìm kiếm
 */
async function listProviders(req, res, next) {
  try {
    const result = await verificationService.listProviders(req.validatedQuery);
    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      counts: result.counts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/admin/providers/:id
 * Admin (hoặc Provider chính chủ) xem chi tiết hồ sơ thợ
 */
async function getProviderDetails(req, res, next) {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const userId = req.user?._id;
    const profile = await verificationService.getProviderDetails(id, role, userId);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PATCH] /api/admin/providers/:id/start-review
 * Admin chuyển hồ sơ từ PENDING sang UNDER_REVIEW
 */
async function startReview(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user._id;
    const data = await verificationService.startReview(id, adminId);
    res.json({
      success: true,
      message: 'Đã chuyển hồ sơ sang trạng thái đang xét duyệt',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PATCH] /api/admin/providers/:id/approve
 * Admin phê duyệt hồ sơ (APPROVED)
 */
async function approveProvider(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user._id;
    const note = req.validatedNote;
    const data = await verificationService.approveProvider(id, adminId, note);
    res.json({
      success: true,
      message: 'Phê duyệt hồ sơ thợ thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PATCH] /api/admin/providers/:id/reject
 * Admin từ chối hồ sơ (REJECTED)
 */
async function rejectProvider(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user._id;
    const note = req.validatedNote;
    const data = await verificationService.rejectProvider(id, adminId, note);
    res.json({
      success: true,
      message: 'Đã từ chối hồ sơ thợ',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [PATCH] /api/admin/providers/:id/request-info
 * Admin yêu cầu thợ bổ sung thông tin / tài liệu
 */
async function requestAdditionalInfo(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user._id;
    const note = req.validatedNote;
    const data = await verificationService.requestAdditionalInfo(id, adminId, note);
    res.json({
      success: true,
      message: 'Đã gửi yêu cầu bổ sung thông tin đến thợ',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [GET] /api/provider-verification/my-status
 * Provider xem trạng thái xét duyệt và ghi chú của Admin
 */
async function getMyVerificationStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const data = await verificationService.getMyVerificationStatus(userId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * [POST] /api/provider-verification/resubmit
 * Provider cập nhật lại thông tin và gửi lại hồ sơ (UC-31)
 */
async function resubmitMyInfo(req, res, next) {
  try {
    const userId = req.user._id;
    const payload = req.validatedResubmit;
    const data = await verificationService.resubmitProviderInfo(userId, payload);
    res.json({
      success: true,
      message: 'Đã gửi lại hồ sơ thành công. Hồ sơ đang chờ quản trị viên duyệt lại.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProviders,
  getProviderDetails,
  startReview,
  approveProvider,
  rejectProvider,
  requestAdditionalInfo,
  getMyVerificationStatus,
  resubmitMyInfo,
};


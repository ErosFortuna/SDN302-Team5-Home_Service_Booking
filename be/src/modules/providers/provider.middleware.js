const ProviderProfile = require('./provider.model.js');
require('../categories/service-category.model.js'); // registers model for populate()
const { AppError } = require('../../shared/app-error.js');

const VERIFICATION_MESSAGES = {
  PENDING: 'Hồ sơ thợ của bạn đang chờ duyệt. Bạn sẽ nhận được yêu cầu sau khi được phê duyệt.',
  REJECTED: 'Hồ sơ thợ của bạn đã bị từ chối. Vui lòng cập nhật hồ sơ và gửi lại.',
};

/**
 * Only ACTIVE providers whose profile is VERIFIED may continue.
 * Requires `protect`. Attaches the profile to `req.providerProfile`.
 * 403 responses carry `details.code` so the client can render a dedicated screen.
 */
async function isVerifiedProvider(req, res, next) {
  const { user } = req;

  if (!user || user.role !== 'PROVIDER') {
    throw new AppError(403, 'Chỉ tài khoản thợ (PROVIDER) mới truy cập được chức năng này', { code: 'NOT_PROVIDER' });
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'Tài khoản của bạn đang bị khóa hoặc chưa kích hoạt', { code: 'ACCOUNT_INACTIVE' });
  }

  const profile = await ProviderProfile.findOne({ user: user._id })
    .populate('skills', 'name slug icon iconUrl isActive')
    .lean();

  if (!profile) {
    throw new AppError(403, 'Bạn chưa có hồ sơ thợ. Vui lòng hoàn tất hồ sơ để nhận yêu cầu.', { code: 'PROFILE_MISSING' });
  }
  if (profile.verificationStatus !== 'VERIFIED') {
    throw new AppError(403, VERIFICATION_MESSAGES[profile.verificationStatus] || 'Hồ sơ thợ chưa được phê duyệt', {
      code: 'PROVIDER_NOT_APPROVED',
      verificationStatus: profile.verificationStatus,
    });
  }

  req.providerProfile = profile;
  next();
}

module.exports = { isVerifiedProvider };

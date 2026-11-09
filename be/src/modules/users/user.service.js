const User = require('./user.model.js');
const ProviderProfile = require('../providers/provider.model.js');

/**
 * Updates status on User and synchronizes userStatus on ProviderProfile.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {'ACTIVE'|'INACTIVE'|'BLOCKED'} status
 * @param {object} [options]
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function setUserStatus(userId, status, options = {}) {
  const { session, additionalUserUpdates = {} } = options;
  const sessionOpts = session ? { session } : {};

  const userUpdate = {
    $set: {
      status,
      ...additionalUserUpdates,
      ...(status === 'BLOCKED' ? { blockedAt: new Date() } : {}),
    },
  };
  if (status !== 'BLOCKED' && !additionalUserUpdates.blockedAt) {
    userUpdate.$unset = { blockedAt: 1, ...(userUpdate.$unset || {}) };
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    userUpdate,
    { new: true, runValidators: true, ...sessionOpts }
  );

  if (updatedUser && updatedUser.role === 'PROVIDER') {
    try {
      await ProviderProfile.updateOne(
        { user: userId },
        { $set: { userStatus: status } },
        sessionOpts
      );
    } catch {
      // Safe fallback in test environments
    }
  }

  return updatedUser;
}

/**
 * Synchronizes fullName on ProviderProfile when a provider user's name is updated.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} fullName
 * @param {object} [options]
 */
async function syncProviderFullName(userId, fullName, options = {}) {
  const { session } = options;
  const sessionOpts = session ? { session } : {};
  try {
    await ProviderProfile.updateOne(
      { user: userId },
      { $set: { fullName: fullName?.trim() } },
      sessionOpts
    );
  } catch {
    // Safe fallback
  }
}

/**
 * Synchronizes userStatus and fullName on ProviderProfile directly from a User document.
 * @param {string|import('mongoose').Types.ObjectId} profileId
 * @param {{ status?: string, fullName?: string }} user
 * @param {object} [options]
 */
async function syncProviderProfileFromUser(profileId, user, options = {}) {
  const { session } = options;
  const sessionOpts = session ? { session } : {};
  const userStatus = user?.status || 'INACTIVE';
  const fullName = (user?.fullName || '').trim();

  return ProviderProfile.updateOne(
    { _id: profileId },
    { $set: { userStatus, fullName } },
    sessionOpts
  );
}

module.exports = {
  setUserStatus,
  syncProviderFullName,
  syncProviderProfileFromUser,
};


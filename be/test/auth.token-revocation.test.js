const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const User = require('../src/modules/users/user.model.js');

test('V-11: Token revocation, tokenVersion lifecycle and logout / password change', async (t) => {
  const originalFindById = User.findById;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalFindOne = User.findOne;

  t.after(() => {
    User.findById = originalFindById;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
    User.findOne = originalFindOne;
  });

  const userId = new mongoose.Types.ObjectId();

  function makeMockUser(overrides = {}) {
    const userDoc = {
      _id: userId,
      fullName: 'Test User',
      email: 'test@example.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: true,
      tokenVersion: 0,
      passwordHash: 'old_secret_hash',
      async comparePassword(candidate) {
        return candidate === 'CorrectPassword123!';
      },
      async save() {
        return this;
      },
      set(fields) {
        Object.assign(this, fields);
      },
      ...overrides,
    };
    return userDoc;
  }

  await t.test('1. Legacy token without tokenVersion works if user tokenVersion is 0', async () => {
    const user = makeMockUser({ tokenVersion: 0 });
    User.findById = () => ({
      select: () => Promise.resolve(user),
      then: (r) => Promise.resolve(user).then(r),
    });

    // Sign token without tokenVersion (legacy)
    const legacyToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1h' });

    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${legacyToken}` },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.tokenVersion, 0);
  });

  await t.test('2. Token with outdated tokenVersion is rejected with 401', async () => {
    const user = makeMockUser({ tokenVersion: 2 });
    User.findById = () => ({
      select: () => Promise.resolve(user),
      then: (r) => Promise.resolve(user).then(r),
    });

    // Token has tokenVersion = 1, but user in DB has tokenVersion = 2
    const oldToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER', tokenVersion: 1 }, env.jwtSecret, { expiresIn: '1h' });

    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${oldToken}` },
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Unauthorized');
  });

  await t.test('3. Legacy token without tokenVersion is rejected with 401 once tokenVersion is incremented', async () => {
    const user = makeMockUser({ tokenVersion: 1 });
    User.findById = () => ({
      select: () => Promise.resolve(user),
      then: (r) => Promise.resolve(user).then(r),
    });

    // Legacy token with undefined tokenVersion (coerced to 0) vs DB tokenVersion = 1
    const legacyToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER' }, env.jwtSecret, { expiresIn: '1h' });

    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${legacyToken}` },
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Unauthorized');
  });

  await t.test('4. POST /api/auth/logout invalidates current token and all active tokens', async () => {
    const user = makeMockUser({ tokenVersion: 0 });

    User.findById = () => ({
      select: () => Promise.resolve(user),
      then: (r) => Promise.resolve(user).then(r),
    });

    User.findByIdAndUpdate = async (id, update) => {
      if (update?.$inc?.tokenVersion) {
        user.tokenVersion = (user.tokenVersion || 0) + update.$inc.tokenVersion;
      }
      return user;
    };

    const activeToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });

    // Step 1: Call logout
    const logoutRes = await dispatch(app, {
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${activeToken}` },
    });

    assert.equal(logoutRes.statusCode, 200);
    assert.equal(logoutRes.body.success, true);
    assert.equal(user.tokenVersion, 1);

    // Step 2: Attempt to use the same token again -> must be 401
    const postLogoutRes = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${activeToken}` },
    });

    assert.equal(postLogoutRes.statusCode, 401);
    assert.equal(postLogoutRes.body.success, false);
  });

  await t.test('5. POST /api/auth/change-password invalidates existing token and increments tokenVersion', async () => {
    const user = makeMockUser({ tokenVersion: 3 });

    User.findById = (id) => ({
      select: () => Promise.resolve(user),
      then: (r) => Promise.resolve(user).then(r),
    });

    const currentToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER', tokenVersion: 3 }, env.jwtSecret, { expiresIn: '1h' });

    // Wrong password -> 400
    const failRes = await dispatch(app, {
      method: 'POST',
      url: '/api/auth/change-password',
      headers: {
        authorization: `Bearer ${currentToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword123!',
      }),
    });
    assert.equal(failRes.statusCode, 400);
    assert.equal(user.tokenVersion, 3);

    // Correct password -> 200, increments tokenVersion to 4
    const changeRes = await dispatch(app, {
      method: 'POST',
      url: '/api/auth/change-password',
      headers: {
        authorization: `Bearer ${currentToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: 'CorrectPassword123!',
        newPassword: 'BrandNewPassword123!',
      }),
    });
    assert.equal(changeRes.statusCode, 200);
    assert.equal(changeRes.body.success, true);
    assert.equal(user.tokenVersion, 4);

    // Old token with tokenVersion 3 must now be 401
    const checkRes = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${currentToken}` },
    });
    assert.equal(checkRes.statusCode, 401);

    // New token with tokenVersion 4 succeeds
    const newToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER', tokenVersion: 4 }, env.jwtSecret, { expiresIn: '1h' });
    const successRes = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${newToken}` },
    });
    assert.equal(successRes.statusCode, 200);
    assert.equal(successRes.body.data.tokenVersion, 4);
  });

  await t.test('6. Admin updating user password increments tokenVersion and invalidates tokens', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const adminUser = makeMockUser({ _id: adminId, role: 'ADMIN', status: 'ACTIVE' });
    const targetUser = makeMockUser({ _id: userId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 0 });

    User.findById = (id) => {
      const u = id.toString() === adminId.toString() ? adminUser : targetUser;
      return {
        select: () => Promise.resolve(u),
        lean: () => Promise.resolve(u),
        then: (r) => Promise.resolve(u).then(r),
      };
    };
    User.findOne = () => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
    User.countDocuments = async () => 2;

    const adminToken = jwt.sign({ sub: adminId.toString(), role: 'ADMIN', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });
    const userOldToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });

    const updateRes = await dispatch(app, {
      method: 'PATCH',
      url: `/api/admin/users/${userId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Test User Updated',
        password: 'NewAdminAssignedPass123!',
      }),
    });

    assert.equal(updateRes.statusCode, 200);
    assert.equal(targetUser.tokenVersion, 1);

    // Old token must fail
    const checkRes = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${userOldToken}` },
    });
    assert.equal(checkRes.statusCode, 401);
  });

  await t.test('7. Admin blocking/deactivating user increments tokenVersion and revokes tokens', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const adminUser = makeMockUser({ _id: adminId, role: 'ADMIN', status: 'ACTIVE' });
    const targetUser = makeMockUser({ _id: userId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 5 });

    User.findById = (id) => {
      const u = id.toString() === adminId.toString() ? adminUser : targetUser;
      return {
        select: () => Promise.resolve(u),
        lean: () => Promise.resolve(u),
        then: (r) => Promise.resolve(u).then(r),
      };
    };
    User.findOne = () => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
    User.countDocuments = async () => 2;

    const adminToken = jwt.sign({ sub: adminId.toString(), role: 'ADMIN', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });
    const userOldToken = jwt.sign({ sub: userId.toString(), role: 'CUSTOMER', tokenVersion: 5 }, env.jwtSecret, { expiresIn: '1h' });

    const updateRes = await dispatch(app, {
      method: 'PATCH',
      url: `/api/admin/users/${userId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Test User Blocked',
        status: 'BLOCKED',
      }),
    });

    assert.equal(updateRes.statusCode, 200);
    assert.equal(targetUser.tokenVersion, 6);

    // Old token must fail
    const checkRes = await dispatch(app, {
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${userOldToken}` },
    });
    assert.equal(checkRes.statusCode, 401);
  });

  await t.test('8. Admin updating already BLOCKED/INACTIVE user with same status does not increment tokenVersion', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const adminUser = makeMockUser({ _id: adminId, role: 'ADMIN', status: 'ACTIVE' });
    const blockedUser = makeMockUser({ _id: userId, role: 'CUSTOMER', status: 'BLOCKED', tokenVersion: 10 });

    User.findById = (id) => {
      const u = id.toString() === adminId.toString() ? adminUser : blockedUser;
      return {
        select: () => Promise.resolve(u),
        lean: () => Promise.resolve(u),
        then: (r) => Promise.resolve(u).then(r),
      };
    };
    User.findOne = () => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
    User.countDocuments = async () => 2;

    const adminToken = jwt.sign({ sub: adminId.toString(), role: 'ADMIN', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });

    const updateRes = await dispatch(app, {
      method: 'PATCH',
      url: `/api/admin/users/${userId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Blocked User Renamed',
        status: 'BLOCKED',
      }),
    });

    assert.equal(updateRes.statusCode, 200);
    // tokenVersion MUST NOT increment because user was ALREADY BLOCKED
    assert.equal(blockedUser.tokenVersion, 10);
  });

  await t.test('9. Admin submitting identical password does not increment tokenVersion', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const adminUser = makeMockUser({ _id: adminId, role: 'ADMIN', status: 'ACTIVE' });
    const targetUser = makeMockUser({ _id: userId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 7 });

    User.findById = (id) => {
      const u = id.toString() === adminId.toString() ? adminUser : targetUser;
      return {
        select: () => Promise.resolve(u),
        lean: () => Promise.resolve(u),
        then: (r) => Promise.resolve(u).then(r),
      };
    };
    User.findOne = () => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
    User.countDocuments = async () => 2;

    const adminToken = jwt.sign({ sub: adminId.toString(), role: 'ADMIN', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });

    // In makeMockUser, comparePassword returns true for 'CorrectPassword123!'
    const updateRes = await dispatch(app, {
      method: 'PATCH',
      url: `/api/admin/users/${userId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        password: 'CorrectPassword123!',
      }),
    });

    assert.equal(updateRes.statusCode, 200);
    // tokenVersion MUST NOT increment because password was NOT actually changed
    assert.equal(targetUser.tokenVersion, 7);
  });

  await t.test('10. Admin updating regular fields (fullName) does not increment tokenVersion', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const adminUser = makeMockUser({ _id: adminId, role: 'ADMIN', status: 'ACTIVE' });
    const targetUser = makeMockUser({ _id: userId, role: 'CUSTOMER', status: 'ACTIVE', tokenVersion: 2 });

    User.findById = (id) => {
      const u = id.toString() === adminId.toString() ? adminUser : targetUser;
      return {
        select: () => Promise.resolve(u),
        lean: () => Promise.resolve(u),
        then: (r) => Promise.resolve(u).then(r),
      };
    };
    User.findOne = () => ({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
    User.countDocuments = async () => 2;

    const adminToken = jwt.sign({ sub: adminId.toString(), role: 'ADMIN', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });

    const updateRes = await dispatch(app, {
      method: 'PATCH',
      url: `/api/admin/users/${userId}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Just Changing Name',
      }),
    });

    assert.equal(updateRes.statusCode, 200);
    assert.equal(targetUser.tokenVersion, 2);
  });
});

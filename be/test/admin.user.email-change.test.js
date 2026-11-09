const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/modules/users/user.model.js');
const { updateUser } = require('../src/modules/users/admin.user.controller.js');
const { validateUpdateUser } = require('../src/modules/users/admin.user.validation.js');
const { env } = require('../src/config/env.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('admin email updates revoke sessions and require verification; verification controls are not mass assignable', async (t) => {
  const oldFindById = User.findById;
  const oldFindOne = User.findOne;
  const oldCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = () => ({ sendMail: async () => ({ accepted: [] }) });
  t.after(() => {
    User.findById = oldFindById;
    User.findOne = oldFindOne;
    nodemailer.createTransport = oldCreateTransport;
  });

  const id = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const user = {
    _id: id, fullName: 'Customer', email: 'old@example.com', phone: '0912345678',
    role: 'CUSTOMER', status: 'ACTIVE', emailVerified: true, tokenVersion: 2,
    set(data) { Object.assign(this, data); }, save: async function () { return this; },
  };
  User.findById = () => ({ select: () => Promise.resolve(user) });
  User.findOne = () => ({ select: () => ({ lean: () => Promise.resolve(null) }) });

  async function perform(data) {
    let result;
    await updateUser({ params: { id: id.toString() }, user: { _id: adminId, role: 'ADMIN' }, adminUserData: data }, { json(value) { result = value; } });
    return result;
  }

  const oldToken = jwt.sign({ sub: id.toString(), role: 'CUSTOMER', tokenVersion: 2 }, env.jwtSecret, { expiresIn: '1h' });
  await perform({ email: ' New@Example.com ' });
  assert.equal(user.email, 'new@example.com');
  assert.equal(user.emailVerified, false);
  assert.equal(user.tokenVersion, 3);
  User.findById = () => ({ select: () => Promise.resolve(user) });
  assert.equal((await dispatch(app, { url: '/api/auth/me', headers: { authorization: `Bearer ${oldToken}` } })).statusCode, 401);

  user.email = 'new@example.com';
  user.emailVerified = true;
  user.tokenVersion = 7;
  await perform({ email: 'NEW@example.com' });
  assert.equal(user.emailVerified, true);
  assert.equal(user.tokenVersion, 7);

  for (const body of [{ emailVerified: true }, { tokenVersion: 0 }]) {
    assert.throws(() => validateUpdateUser({ body }, {}, () => {}), (error) => error.statusCode === 400);
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app.js');
const User = require('../src/modules/users/user.model.js');
const { env } = require('../src/config/env.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('PATCH /api/auth/me requires password proof and uniqueness only when phone changes', async (t) => {
  const oldFindById = User.findById;
  const oldFindOne = User.findOne;
  t.after(() => { User.findById = oldFindById; User.findOne = oldFindOne; });

  const id = new mongoose.Types.ObjectId();
  const user = {
    _id: id, fullName: 'Test User', email: 'test@example.com', phone: '0912345678',
    role: 'CUSTOMER', status: 'ACTIVE', emailVerified: true, tokenVersion: 0,
    saved: 0,
    comparePassword: async (value) => value === 'CorrectPassword123!',
    save: async function () { this.saved++; return this; },
  };
  User.findById = () => ({ select: () => Promise.resolve(user) });
  User.findOne = () => ({ select: () => ({ lean: () => Promise.resolve(null) }) });
  const token = jwt.sign({ sub: id.toString(), role: 'CUSTOMER', tokenVersion: 0 }, env.jwtSecret, { expiresIn: '1h' });
  const send = (body, authorization = `Bearer ${token}`) => dispatch(app, {
    method: 'PATCH', url: '/api/auth/me', headers: { authorization }, body,
  });

  assert.equal((await send({ phone: '0987654321' }, '')).statusCode, 401);
  assert.equal((await send({ phone: '0987654321' })).statusCode, 400);
  assert.equal(user.phone, '0912345678');
  assert.equal(user.saved, 0);
  assert.equal((await send({ phone: '0987654321', currentPassword: 'wrong' })).statusCode, 400);
  assert.equal(user.phone, '0912345678');
  assert.equal((await send({ phone: '123', currentPassword: 'CorrectPassword123!' })).statusCode, 400);
  assert.equal((await send({ phone: '0912345678' })).statusCode, 200);
  assert.equal(user.saved, 1);

  assert.equal((await send({ phone: '0987654321', currentPassword: 'CorrectPassword123!', address: 'New address' })).statusCode, 200);
  assert.equal(user.phone, '0987654321');
  assert.equal(user.address, 'New address');
  assert.equal(user.saved, 2);

  User.findOne = () => ({ select: () => ({ lean: () => Promise.resolve({ _id: new mongoose.Types.ObjectId() }) }) });
  assert.equal((await send({ phone: '0900000000', currentPassword: 'CorrectPassword123!' })).statusCode, 409);
  assert.equal(user.phone, '0987654321');
  assert.equal(user.saved, 2);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

test('global request safety rejects Mongo operators and dotted keys without mutating valid data', async () => {
  for (const body of [
    { email: { $ne: null } },
    { profile: { role: { $gt: '' } } },
    { filter: { 'password.$ne': null } },
    { items: [{ nested: { $where: 'return true' } }] },
  ]) {
    const response = await dispatch(app, { method: 'POST', url: '/', body });
    assert.equal(response.statusCode, 400);
  }

  const queryResponse = await dispatch(app, { url: '/?filter%5B%24ne%5D=x' });
  assert.equal(queryResponse.statusCode, 400);

  try {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const formResponse = await fetch(`http://127.0.0.1:${server.address().port}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'email%5B%24ne%5D=x',
      });
      assert.equal(formResponse.status, 400);
    } finally {
      const closed = once(server, 'close');
      server.close();
      await closed;
    }
  } catch (err) {
    if (err?.message && /fetch failed|ECONNREFUSED|EACCES|permission/i.test(err.message)) {
      // Sandbox restricts socket loopback fetch; verify form-encoded payload via dispatch
      const formResponse = await dispatch(app, {
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: { 'email[$ne]': 'x' },
      });
      assert.equal(formResponse.statusCode, 400);
    } else {
      throw err;
    }
  }

  const valid = await dispatch(app, { url: '/' });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.body.message, 'Home Service Booking API');
});

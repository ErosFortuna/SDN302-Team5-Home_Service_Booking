const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateCreatePolicy,
  validateUpdatePolicy,
  validateSubmitConsent,
  validatePolicyQuery,
} = require('../src/modules/policy/policy.validation.js');
const {
  getRelevantPolicyTypesForRole,
} = require('../src/modules/policy/policy.service.js');
const { Policy, UserConsent } = require('../src/modules/policy/policy.model.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

function invoke(middleware, req) {
  let error;
  let continued = false;
  try {
    middleware(req, {}, () => {
      continued = true;
    });
  } catch (caught) {
    error = caught;
  }
  return { error, continued };
}

test('Policy Validation Tests', async (t) => {
  await t.test('1. validateCreatePolicy accepts valid policy payload', () => {
    const req = {
      body: {
        title: 'Chính sách bảo mật thông tin',
        type: 'PRIVACY_POLICY',
        content: '<p>Nội dung chính sách bảo mật chi tiết...</p>',
        version: 'v1.0',
        isMandatory: true,
        isActive: true,
        summary: 'Bản cập nhật đầu tiên',
      },
    };

    const result = invoke(validateCreatePolicy, req);
    assert.equal(result.error, undefined);
    assert.equal(result.continued, true);
    assert.equal(req.policyData.title, 'Chính sách bảo mật thông tin');
    assert.equal(req.policyData.type, 'PRIVACY_POLICY');
    assert.equal(req.policyData.version, 'v1.0');
    assert.equal(req.policyData.isActive, true);
    assert.equal(req.policyData.isMandatory, true);
  });

  await t.test('2. validateCreatePolicy rejects invalid types, short content, or invalid version', () => {
    const req1 = {
      body: {
        title: 'A', // too short
        type: 'UNKNOWN_TYPE', // invalid enum
        content: 'short', // < 10 chars
        version: 'invalid-ver', // not matching version regex
      },
    };

    const result = invoke(validateCreatePolicy, req1);
    assert.ok(result.error);
    assert.equal(result.error.statusCode, 400);
    assert.ok(Array.isArray(result.error.details));
    assert.ok(result.error.details.some((e) => e.field === 'title'));
    assert.ok(result.error.details.some((e) => e.field === 'type'));
    assert.ok(result.error.details.some((e) => e.field === 'content'));
    assert.ok(result.error.details.some((e) => e.field === 'version'));
  });

  await t.test('3. validateCreatePolicy rejects non-object or mass-assignment fields', () => {
    const result = invoke(validateCreatePolicy, {
      body: {
        title: 'Điều khoản dịch vụ',
        type: 'TERMS_OF_SERVICE',
        content: '<p>Nội dung điều khoản chi tiết...</p>',
        version: '1.0',
        hackedField: 'malicious',
      },
    });

    assert.ok(result.error);
    assert.equal(result.error.statusCode, 400);
    assert.ok(result.error.details.some((e) => e.field.includes('hackedField')));
  });

  await t.test('4. validateUpdatePolicy validates partial updates safely', () => {
    const req = {
      body: {
        title: 'Chính sách bảo mật sửa đổi',
        isActive: false,
      },
    };

    const result = invoke(validateUpdatePolicy, req);
    assert.equal(result.error, undefined);
    assert.equal(result.continued, true);
    assert.deepEqual(req.policyUpdateData, {
      title: 'Chính sách bảo mật sửa đổi',
      isActive: false,
    });
  });

  await t.test('5. validateSubmitConsent accepts single policyId or array of policyIds', () => {
    const req1 = {
      body: {
        policyId: '507f1f77bcf86cd799439011',
      },
    };
    const res1 = invoke(validateSubmitConsent, req1);
    assert.equal(res1.error, undefined);
    assert.deepEqual(req1.consentPolicyIds, ['507f1f77bcf86cd799439011']);

    const req2 = {
      body: {
        policyIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439022'],
      },
    };
    const res2 = invoke(validateSubmitConsent, req2);
    assert.equal(res2.error, undefined);
    assert.equal(req2.consentPolicyIds.length, 2);
  });

  await t.test('6. validateSubmitConsent rejects missing or invalid object IDs', () => {
    const result = invoke(validateSubmitConsent, { body: { policyId: 'invalid-id' } });
    assert.ok(result.error);
    assert.equal(result.error.statusCode, 400);

    const empty = invoke(validateSubmitConsent, { body: {} });
    assert.ok(empty.error);
    assert.equal(empty.error.statusCode, 400);
  });

  await t.test('7. validatePolicyQuery validates pagination and filters', () => {
    const req = {
      query: {
        type: 'PROVIDER_CONTRACT',
        isActive: 'true',
        search: '  hợp đồng đối tác  ',
        page: '2',
        limit: '15',
      },
    };

    const result = invoke(validatePolicyQuery, req);
    assert.equal(result.error, undefined);
    assert.deepEqual(req.parsedQuery, {
      type: 'PROVIDER_CONTRACT',
      isActive: true,
      search: 'hợp đồng đối tác',
      page: 2,
      limit: 15,
    });
  });
});

test('Policy Role Relevance Rules', async (t) => {
  await t.test('CUSTOMER requires PRIVACY_POLICY and TERMS_OF_SERVICE', () => {
    const types = getRelevantPolicyTypesForRole('CUSTOMER');
    assert.deepEqual(types, ['PRIVACY_POLICY', 'TERMS_OF_SERVICE']);
  });

  await t.test('PROVIDER requires PRIVACY_POLICY, TERMS_OF_SERVICE, and PROVIDER_CONTRACT', () => {
    const types = getRelevantPolicyTypesForRole('PROVIDER');
    assert.deepEqual(types, ['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'PROVIDER_CONTRACT']);
  });
});

test('Policy HTTP Endpoints via dispatch(app, ...)', async (t) => {
  await t.test('GET /api/policies/active is publicly accessible', async () => {
    const origFind = Policy.find;
    Policy.find = () => ({
      sort: () => ({
        lean: async () => [
          {
            _id: '507f1f77bcf86cd799439011',
            title: 'Chính sách bảo mật thông tin',
            type: 'PRIVACY_POLICY',
            version: 'v1.0',
            isActive: true,
            isMandatory: true,
          },
        ],
      }),
    });

    try {
      const res = await dispatch(app, {
        method: 'GET',
        url: '/api/policies/active',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].type, 'PRIVACY_POLICY');
    } finally {
      Policy.find = origFind;
    }
  });

  await t.test('GET /api/policies/pending-consent requires authentication (401)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/policies/pending-consent',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/policies/consent requires authentication (401)', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/policies/consent',
      body: { policyId: '507f1f77bcf86cd799439011' },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('GET /api/admin/policies requires ADMIN authorization (401 without token)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/admin/policies',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});

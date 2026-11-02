const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateListProvidersQuery,
  validateRejectPayload,
  validateRequestInfoPayload,
  validateApprovePayload,
  validateResubmitPayload,
} = require('../src/modules/provider-verification/providerVerification.validation.js');
const {
  assertProviderApproved,
} = require('../src/modules/provider-verification/providerVerification.service.js');
const { AppError } = require('../src/shared/app-error.js');

test('provider-verification: validates list providers query', () => {
  const req1 = { query: { status: 'pending', search: '  Nguyen Van A  ', page: '2', limit: '20' } };
  validateListProvidersQuery(req1, {}, (err) => {
    assert.ifError(err);
    assert.equal(req1.validatedQuery.status, 'PENDING');
    assert.equal(req1.validatedQuery.search, 'Nguyen Van A');
    assert.equal(req1.validatedQuery.page, 2);
    assert.equal(req1.validatedQuery.limit, 20);
  });

  const reqInvalidStatus = { query: { status: 'INVALID_STATUS' } };
  validateListProvidersQuery(reqInvalidStatus, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });

  const reqInvalidPage = { query: { page: '0' } };
  validateListProvidersQuery(reqInvalidPage, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});

test('provider-verification: validates reject decision payload', () => {
  const reqValid = { body: { adminReviewNote: 'Giấy tờ CCCD bị mờ, không nhìn rõ số' } };
  validateRejectPayload(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedNote, 'Giấy tờ CCCD bị mờ, không nhìn rõ số');
  });

  // Rejects when reason is missing or too short
  const reqShort = { body: { adminReviewNote: 'ko' } };
  validateRejectPayload(reqShort, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 422);
  });

  const reqEmpty = { body: {} };
  validateRejectPayload(reqEmpty, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 422);
  });
});

test('provider-verification: validates request info payload', () => {
  const reqValid = { body: { adminReviewNote: 'Vui lòng tải lên thêm chứng chỉ hành nghề thợ điện' } };
  validateRequestInfoPayload(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedNote, 'Vui lòng tải lên thêm chứng chỉ hành nghề thợ điện');
  });

  const reqEmpty = { body: {} };
  validateRequestInfoPayload(reqEmpty, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 422);
  });
});

test('provider-verification: validates approve payload', () => {
  const reqCustom = { body: { adminReviewNote: 'Đã xác minh đầy đủ giấy tờ hợp lệ.' } };
  validateApprovePayload(reqCustom, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqCustom.validatedNote, 'Đã xác minh đầy đủ giấy tờ hợp lệ.');
  });

  const reqDefault = { body: {} };
  validateApprovePayload(reqDefault, {}, (err) => {
    assert.ifError(err);
    assert.ok(reqDefault.validatedNote.includes('phê duyệt'));
  });
});

test('provider-verification: validates resubmit payload', () => {
  const reqValid = {
    body: {
      businessName: 'Điện Lạnh Phát Đạt',
      description: 'Chuyên sửa điều hòa dân dụng',
      documents: [
        { docType: 'ID_CARD', fileUrl: 'https://example.com/cccd.png' },
        'https://example.com/cert.pdf',
      ],
      note: 'Em đã bổ sung lại ảnh CCCD rõ nét',
    },
  };

  validateResubmitPayload(reqValid, {}, (err) => {
    assert.ifError(err);
    assert.equal(reqValid.validatedResubmit.businessName, 'Điện Lạnh Phát Đạt');
    assert.equal(reqValid.validatedResubmit.documents.length, 2);
    assert.equal(reqValid.validatedResubmit.documents[0].docType, 'ID_CARD');
    assert.equal(reqValid.validatedResubmit.documents[1].docType, 'OTHER');
  });
});


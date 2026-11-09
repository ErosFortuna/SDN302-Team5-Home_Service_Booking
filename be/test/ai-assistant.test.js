const assert = require('node:assert/strict');
const test = require('node:test');
const { validateEstimateRequest } = require('../src/modules/ai-assistant/ai-assistant.validation.js');
const { generateHeuristicBreakdown } = require('../src/modules/ai-assistant/ai-assistant.service.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

function invoke(middleware, req) {
  let error;
  let continued = false;
  try {
    middleware(req, {}, (err) => {
      error = err;
      continued = !err;
    });
  } catch (caught) {
    error = caught;
  }
  return { error, continued };
}

test('AI Assistant Validation Tests', async (t) => {
  await t.test('1. Accepts valid description and serviceCategoryName', () => {
    const req = {
      body: {
        description: 'Máy lạnh bật không mát, chỉ có gió nhẹ và kêu rè rè ở cục nóng',
        serviceCategoryName: 'Sửa máy lạnh',
      },
    };
    const result = invoke(validateEstimateRequest, req);
    assert.equal(result.error, undefined);
    assert.equal(result.continued, true);
    assert.equal(req.validatedAiPayload.description, req.body.description);
    assert.equal(req.validatedAiPayload.serviceCategoryName, 'Sửa máy lạnh');
  });

  await t.test('2. Rejects empty or too short description', () => {
    const req = {
      body: {
        description: 'a',
        serviceCategoryName: 'Sửa máy lạnh',
      },
    };
    const result = invoke(validateEstimateRequest, req);
    assert.ok(result.error);
    assert.equal(result.error.statusCode, 400);
    assert.ok(result.error.details.some((e) => e.field === 'description'));
  });

  await t.test('3. Rejects missing serviceCategoryName', () => {
    const req = {
      body: {
        description: 'Đường ống nước bị xì mạnh dưới chậu rửa bát',
      },
    };
    const result = invoke(validateEstimateRequest, req);
    assert.ok(result.error);
    assert.equal(result.error.statusCode, 400);
    assert.ok(result.error.details.some((e) => e.field === 'serviceCategoryName'));
  });

  await t.test('4. Rejects mass assignment / unexpected fields', () => {
    const req = {
      body: {
        description: 'Đường ống nước bị xì mạnh',
        serviceCategoryName: 'Sửa ống nước',
        adminOverride: true,
      },
    };
    const result = invoke(validateEstimateRequest, req);
    assert.ok(result.error);
    assert.equal(result.error.statusCode, 400);
  });
});

test('AI Assistant Heuristic Engine Tests', async (t) => {
  await t.test('Generates structured breakdown for air conditioner', () => {
    const res = generateHeuristicBreakdown({
      description: 'Máy lạnh chảy nước và thổi không lạnh',
      serviceCategoryName: 'Điện lạnh',
    });

    assert.ok(Array.isArray(res.possibilities));
    assert.ok(res.possibilities.length >= 2);
    assert.ok(res.possibilities[0].cause);
    assert.ok(res.possibilities[0].estimatedPrice.min > 0);
    assert.ok(res.possibilities[0].estimatedPrice.max >= res.possibilities[0].estimatedPrice.min);
    assert.ok(Array.isArray(res.suggestedQuestions));
    assert.ok(res.suggestedQuestions.length >= 2);
    assert.ok(res.disclaimer);
  });

  await t.test('Generates structured breakdown for plumbing', () => {
    const res = generateHeuristicBreakdown({
      description: 'Vòi nước bồn rửa mặt bị nứt rỉ nước lênh láng',
      serviceCategoryName: 'Sửa ống nước',
    });

    assert.ok(Array.isArray(res.possibilities));
    assert.ok(res.possibilities.some((p) => p.cause.includes('gioăng') || p.cause.includes('ống')));
    assert.ok(res.suggestedQuestions.length > 0);
  });
});

test('AI Assistant HTTP Endpoints via dispatch(app, ...)', async (t) => {
  await t.test('POST /api/ai/estimate-price returns 200 with structured response', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/ai/estimate-price',
      body: {
        description: 'Bồn cầu bị xả nước không trôi và bốc mùi hôi',
        serviceCategoryName: 'Thông tắc bồn cầu',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.ok(Array.isArray(res.body.data.possibilities));
    assert.ok(res.body.data.possibilities.length > 0);
    assert.ok(res.body.data.overallEstimate.min > 0);
    assert.ok(res.body.data.overallEstimate.max >= res.body.data.overallEstimate.min);
    assert.ok(Array.isArray(res.body.data.suggestedQuestions));
    assert.ok(res.body.data.disclaimer);
  });
});

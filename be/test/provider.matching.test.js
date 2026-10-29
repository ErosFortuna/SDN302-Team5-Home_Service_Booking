const test = require('node:test');
const assert = require('node:assert/strict');
const {
  haversineKm,
  calculateBayesianRating,
  calculateDistanceScore,
  calculateExperienceScore,
  evaluateScheduleMatch,
  calculateBudgetScore,
  scoreProvider,
  MATCHING_WEIGHTS,
} = require('../src/modules/providers/provider.matching.js');

test('haversineKm accurately calculates distances between coordinates', () => {
  // District 1 (Ben Nghe: 10.7769, 106.7009) to Binh Thanh (10.8031, 106.7118) ~ 3.1 km
  const dist = haversineKm(10.7769, 106.7009, 10.8031, 106.7118);
  assert.ok(dist > 2.5 && dist < 4.0, `Expected ~3.1km, got ${dist}`);

  // Same coordinates should yield 0 km
  assert.strictEqual(haversineKm(10.7769, 106.7009, 10.7769, 106.7009), 0);

  // Invalid coordinates should yield NaN
  assert.ok(Number.isNaN(haversineKm(null, 106.7, 10.8, 106.7)));
});

test('calculateBayesianRating dampens low-review outliers', () => {
  // Provider with 1 review of 5.0 vs Provider with 50 reviews of 4.8
  const rookie = calculateBayesianRating(5.0, 1);
  const veteran = calculateBayesianRating(4.8, 50);

  // Veteran should have higher weighted rating than rookie with just 1 review
  assert.ok(
    veteran.weightedRating > rookie.weightedRating,
    `Veteran (${veteran.weightedRating}) should rank higher than 1-review rookie (${rookie.weightedRating})`
  );

  // Zero reviews gets the prior mean (3.5 -> 70.0 score)
  const unreviewed = calculateBayesianRating(0, 0);
  assert.strictEqual(unreviewed.weightedRating, 3.5);
  assert.strictEqual(unreviewed.ratingScore, 70);
});

test('calculateDistanceScore decays inversely with distance and caps at radiusKm', () => {
  assert.strictEqual(calculateDistanceScore(0, 15), 100);
  assert.strictEqual(calculateDistanceScore(15, 15), 0);
  assert.strictEqual(calculateDistanceScore(7.5, 15), 50);
  assert.strictEqual(calculateDistanceScore(20, 15), 0);
  // Missing distance fallback
  assert.strictEqual(calculateDistanceScore(null, 15), 70);
});

test('calculateExperienceScore normalizes and applies ceilings', () => {
  const mid = calculateExperienceScore(7.5, 50);
  assert.strictEqual(mid, 50); // (0.5 * 0.5 + 0.5 * 0.5) * 100 = 50

  const max = calculateExperienceScore(25, 200);
  assert.strictEqual(max, 100); // capped at 100
});

test('evaluateScheduleMatch detects booking conflicts and weekly availability', () => {
  const reqStart = '2026-11-01T09:00:00.000Z';
  const reqEnd = '2026-11-01T11:00:00.000Z';

  // Conflict: active booking from 10:00 to 12:00
  const activeBookings = [
    {
      scheduledStartAt: '2026-11-01T10:00:00.000Z',
      scheduledEndAt: '2026-11-01T12:00:00.000Z',
    },
  ];
  const resConflict = evaluateScheduleMatch(reqStart, reqEnd, [], activeBookings);
  assert.strictEqual(resConflict.isEligible, false);
  assert.strictEqual(resConflict.matchType, 'BOOKING_CONFLICT');

  // No conflict
  const resNoConflict = evaluateScheduleMatch(reqStart, reqEnd, [], []);
  assert.strictEqual(resNoConflict.isEligible, true);
});

test('calculateBudgetScore handles within-range, below, and over budget', () => {
  assert.strictEqual(calculateBudgetScore(200000, 150000, 300000), 100);
  assert.strictEqual(calculateBudgetScore(100000, 150000, 300000), 95);
  // 50% over budget
  assert.strictEqual(calculateBudgetScore(450000, 150000, 300000), 50);
});

test('scoreProvider calculates weighted total and returns reasons', () => {
  const profile = {
    averageRating: 4.8,
    reviewCount: 30,
    yearsOfExperience: 5,
    completedJobCount: 40,
    serviceAreas: ['Quận 1'],
  };
  const request = {
    budgetMin: 100000,
    budgetMax: 300000,
  };

  const result = scoreProvider(profile, request, {
    radiusKm: 15,
    distanceKm: 3.0,
    historicalPrice: 200000,
    scheduleScore: 100,
    scheduleMatchType: 'FULL_MATCH',
  });

  assert.ok(result.score > 70 && result.score <= 100);
  assert.ok(Array.isArray(result.reasons));
  assert.ok(result.reasons.length > 0);
  assert.ok(result.scoreBreakdown.ratingScore > 0);
  assert.ok(result.scoreBreakdown.distanceScore > 0);
});

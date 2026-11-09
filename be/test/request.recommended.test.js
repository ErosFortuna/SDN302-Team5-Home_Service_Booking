const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { getRecommendedProviders } = require('../src/modules/providers/provider.controller.js');
const { AppError } = require('../src/shared/app-error.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');
const Availability = require('../src/modules/availability/availability.model.js');

test('getRecommendedProviders returns 400 if request is not OPEN', async () => {
  const requestId = new mongoose.Types.ObjectId().toString();
  const customerId = new mongoose.Types.ObjectId().toString();

  const originalFindById = ServiceRequest.findById;
  ServiceRequest.findById = () => ({
    populate: () => ({
      populate: () => ({
        lean: async () => ({
          _id: requestId,
          status: 'BOOKED',
          customer: customerId,
        }),
      }),
    }),
  });

  const req = {
    params: { requestId },
    recommendedQuery: { limit: 10, radiusKm: 25, sortBy: 'score' },
    user: { _id: customerId, role: 'CUSTOMER' },
  };

  try {
    await assert.rejects(
      async () => {
        await getRecommendedProviders(req, {});
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /OPEN/);
        return true;
      }
    );
  } finally {
    ServiceRequest.findById = originalFindById;
  }
});

test('getRecommendedProviders returns scored list of matching verified providers', async () => {
  const requestId = new mongoose.Types.ObjectId().toString();
  const customerId = new mongoose.Types.ObjectId().toString();
  const categoryId = new mongoose.Types.ObjectId();
  const providerUserId = new mongoose.Types.ObjectId();
  const providerProfileId = new mongoose.Types.ObjectId();

  const originalReqFindById = ServiceRequest.findById;
  const originalProfileFind = ProviderProfile.find;
  const originalBookingFind = Booking.find;
  const originalBookingAggregate = Booking.aggregate;
  const originalAvailFind = Availability.find;

  ServiceRequest.findById = () => ({
    populate: () => ({
      populate: () => ({
        lean: async () => ({
          _id: requestId,
          status: 'OPEN',
          customer: customerId,
          category: { _id: categoryId, name: 'Điện nước' },
          preferredStartAt: new Date(Date.now() + 86400000).toISOString(),
          address: {
            city: 'TP. Hồ Chí Minh',
            location: {
              type: 'Point',
              coordinates: [106.7009, 10.7769], // District 1, HCM
            },
          },
          service: {
            estimatedDurationMinutes: 60,
            basePrice: 200000,
            pricingType: 'FIXED',
          },
        }),
      }),
    }),
  });

  ProviderProfile.find = () => ({
    populate: () => ({
      sort: () => ({
        limit: () => ({
          lean: async () => [
            {
              _id: providerProfileId,
              user: {
                _id: providerUserId,
                fullName: 'Nguyễn Văn Thợ',
                avatarUrl: null,
                status: 'ACTIVE',
                role: 'PROVIDER',
              },
              businessName: 'Thợ Điện Nước Sài Gòn',
              verificationStatus: 'VERIFIED',
              userStatus: 'ACTIVE',
              isDeleted: false,
              averageRating: 4.8,
              reviewCount: 25,
              completedJobCount: 40,
              yearsOfExperience: 5,
              city: 'TP. Hồ Chí Minh',
              location: {
                type: 'Point',
                coordinates: [106.7032, 10.7745], // ~0.3km away
              },
              skills: [categoryId],
            },
          ],
        }),
      }),
    }),
  });

  Booking.find = () => ({
    select: () => ({
      lean: async () => [], // No conflicting bookings
    }),
  });

  Booking.aggregate = async () => [{ _id: providerUserId, avgPrice: 200000 }];

  Availability.find = () => ({
    lean: async () => [
      {
        provider: providerUserId,
        settings: { isAcceptingBookings: true, travelBufferMinutes: 30 },
        daysOff: [],
        weeklySchedule: [
          {
            dayOfWeek: new Date(Date.now() + 86400000).getDay(),
            isOff: false,
            startTime: '07:00',
            endTime: '19:00',
            breaks: [],
          },
        ],
      },
    ],
  });

  let responseData = null;
  const res = {
    json: (payload) => {
      responseData = payload;
      return payload;
    },
  };

  const req = {
    params: { requestId },
    recommendedQuery: { limit: 10, radiusKm: 25, sortBy: 'score' },
    user: { _id: customerId, role: 'CUSTOMER' },
  };

  try {
    await getRecommendedProviders(req, res);
    assert.ok(responseData, 'Expected responseData');
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.count, 1);
    assert.strictEqual(responseData.data[0].fullName, 'Nguyễn Văn Thợ');
    assert.ok(responseData.data[0].score > 50, 'Expected positive recommendation score');
    assert.ok(responseData.data[0].distanceKm < 1.0, 'Expected distance < 1km');
  } finally {
    ServiceRequest.findById = originalReqFindById;
    ProviderProfile.find = originalProfileFind;
    Booking.find = originalBookingFind;
    Booking.aggregate = originalBookingAggregate;
    Availability.find = originalAvailFind;
  }
});

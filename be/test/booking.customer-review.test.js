const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Booking = require('../src/modules/bookings/booking.model.js');
const Review = require('../src/modules/reviews/review.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const { getMyCustomerBookings } = require('../src/modules/bookings/booking.controller.js');

test('customer booking list includes the customer own review for completed bookings', async () => {
  const customerId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const originalBookingFind = Booking.find;
  const originalReviewFind = Review.find;
  const originalProviderFind = ProviderProfile.find;

  Booking.find = () => {
    const query = {
      sort() { return query; },
      limit() { return query; },
      populate() { return query; },
      then(resolve, reject) {
        return Promise.resolve([{
          _id: bookingId,
          provider: providerId,
          status: 'COMPLETED',
          address: {},
          request: null,
          toJSON: () => ({
            _id: bookingId.toString(),
            id: bookingId.toString(),
            status: 'COMPLETED',
          }),
        }]).then(resolve, reject);
      },
    };
    return query;
  };
  Review.find = (filter) => {
    assert.deepEqual(filter, {
      booking: { $in: [bookingId] },
      customer: customerId,
    });
    const query = {
      select() { return query; },
      lean: async () => [{ booking: bookingId, rating: 4, comment: 'Good service' }],
    };
    return query;
  };
  ProviderProfile.find = (filter) => {
    assert.deepEqual(filter, { user: { $in: [providerId.toString()] } });
    return {
      select() { return this; },
      lean: async () => [],
    };
  };

  try {
    let responseBody;
    await getMyCustomerBookings(
      { user: { _id: customerId }, query: {} },
      { json(body) { responseBody = body; } },
    );
    assert.deepEqual(responseBody.data[0].customerReview, {
      rating: 4,
      comment: 'Good service',
    });
  } finally {
    Booking.find = originalBookingFind;
    Review.find = originalReviewFind;
    ProviderProfile.find = originalProviderFind;
  }
});

const { Router } = require("express");
const mongoose = require("mongoose");
const Booking = require("../bookings/booking.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const Review = require("./review.model.js");
const { protect } = require("../../middlewares/auth.middleware.js");

const router = Router();
const REVIEW_EDIT_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAGE_SIZE = 100;

function parseRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_PAGE_SIZE
  ) {
    return null;
  }

  return { page, limit };
}

async function updateProviderRating(providerId, session) {
  const [aggregate] = await Review.aggregate([
    { $match: { provider: providerId, isVisible: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]).session(session);

  await ProviderProfile.findOneAndUpdate(
    { user: providerId },
    {
      $set: {
        averageRating: aggregate?.averageRating ?? 0,
        reviewCount: aggregate?.reviewCount ?? 0,
      },
      $setOnInsert: { user: providerId },
    },
    { new: true, upsert: true, session, setDefaultsOnInsert: true },
  );
}

function sendDuplicateReviewError(error, res, next) {
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: "Booking already has a review" });
  }
  return next(error);
}

router.post("/bookings/:bookingId/reviews", protect, async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID" });
  }
  if (!parseRating(body.rating)) {
    return res.status(400).json({ success: false, message: "Rating must be an integer from 1 to 5" });
  }
  if (
    body.comment !== undefined &&
    (typeof body.comment !== "string" || body.comment.length > 2000)
  ) {
    return res.status(400).json({ success: false, message: "Comment must be a string of at most 2000 characters" });
  }

  let session;
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the booking customer can review it" });
    }
    if (booking.status !== "COMPLETED") {
      return res.status(409).json({ success: false, message: "Only completed bookings can be reviewed" });
    }

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Review.create(
        [
          {
            booking: booking._id,
            customer: booking.customer,
            provider: booking.provider,
            rating: body.rating,
            comment: body.comment?.trim() || undefined,
          },
        ],
        { session },
      );
      await updateProviderRating(booking.provider, session);
    });

    const review = await Review.findOne({ booking: booking._id }).populate("customer", "fullName");
    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    return sendDuplicateReviewError(error, res, next);
  } finally {
    await session?.endSession();
  }
});

router.get("/providers/:providerId/reviews", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.providerId)) {
    return res.status(400).json({ success: false, message: "Invalid provider ID" });
  }
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({ success: false, message: "page and limit must be positive integers; limit cannot exceed 100" });
  }

  try {
    const filter = {
      provider: new mongoose.Types.ObjectId(req.params.providerId),
      isVisible: true,
    };
    const [reviews, totalItems, [aggregate]] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .populate("customer", "fullName"),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]),
    ]);
    const totalPages = Math.ceil(totalItems / pagination.limit);

    return res.json({
      success: true,
      data: {
        reviews,
        averageRating: aggregate?.averageRating ?? 0,
        reviewCount: aggregate?.reviewCount ?? 0,
      },
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/reviews/:reviewId", protect, async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!mongoose.isValidObjectId(req.params.reviewId)) {
    return res.status(400).json({ success: false, message: "Invalid review ID" });
  }

  const hasRating = Object.prototype.hasOwnProperty.call(body, "rating");
  const hasComment = Object.prototype.hasOwnProperty.call(body, "comment");
  if (!hasRating && !hasComment) {
    return res.status(400).json({ success: false, message: "Provide a rating or comment to update" });
  }
  if (hasRating && !parseRating(body.rating)) {
    return res.status(400).json({ success: false, message: "Rating must be an integer from 1 to 5" });
  }
  if (
    hasComment &&
    body.comment !== null &&
    (typeof body.comment !== "string" || body.comment.length > 2000)
  ) {
    return res.status(400).json({ success: false, message: "Comment must be a string of at most 2000 characters or null" });
  }

  let session;
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    if (review.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the review author can update it" });
    }
    if (Date.now() - review.createdAt.getTime() > REVIEW_EDIT_PERIOD_MS) {
      return res.status(409).json({ success: false, message: "The 7-day review edit period has expired" });
    }

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const update = {};
      if (hasRating) update.rating = body.rating;
      if (hasComment) {
        const comment = body.comment?.trim();
        if (comment) update.comment = comment;
        else update.$unset = { comment: 1 };
      }
      await Review.findByIdAndUpdate(review._id, update, {
        new: true,
        runValidators: true,
        session,
      });
      await updateProviderRating(review.provider, session);
    });

    const updatedReview = await Review.findById(review._id).populate("customer", "fullName");
    return res.json({ success: true, data: updatedReview });
  } catch (error) {
    return next(error);
  } finally {
    await session?.endSession();
  }
});

module.exports = router;

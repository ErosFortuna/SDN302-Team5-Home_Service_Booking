const { Router } = require("express");
const mongoose = require("mongoose");
const Booking = require("../bookings/booking.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const Review = require("./review.model.js");
const { protect, authorize } = require("../../middlewares/auth.middleware.js");
const { startManagedTransaction } = require("../../shared/transaction.js");

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

function parseReviewQuery(query) {
  const pagination = parsePagination(query);
  if (!pagination) return null;

  const rating = query.rating === undefined || query.rating === "all"
    ? undefined
    : Number(query.rating);
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return null;
  }

  const sortBy = query.sortBy ?? "newest";
  if (!["newest", "highest", "lowest"].includes(sortBy)) return null;

  return { ...pagination, rating, sortBy };
}

function toReviewDto(review) {
  return {
    id: review._id.toString(),
    rating: review.rating,
    comment: review.comment || "",
    response: review.response || null,
    createdAt: review.createdAt,
    customer: {
      id: review.customer?._id?.toString() || "",
      fullName: review.customer?.fullName || "Khách hàng",
      avatarUrl: review.customer?.avatarUrl || "",
    },
    serviceName: review.booking?.service?.name || null,
  };
}

function toRatingSummary(aggregate) {
  const total = aggregate?.total ?? 0;
  const breakdown = {};

  for (let rating = 1; rating <= 5; rating += 1) {
    const count = aggregate?.[`star${rating}`] ?? 0;
    breakdown[rating] = {
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  }

  return {
    average: total > 0 ? Math.round((aggregate.average ?? 0) * 10) / 10 : 0,
    total,
    breakdown,
  };
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

    const { session, inTransaction } = await startManagedTransaction();
    const sessionOpts = session ? { session } : {};
    try {
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
        sessionOpts,
      );
      await updateProviderRating(booking.provider, session);
      if (inTransaction) {
        await session.commitTransaction();
      }
    } catch (txErr) {
      if (inTransaction) {
        await session.abortTransaction();
      }
      throw txErr;
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    const review = await Review.findOne({ booking: booking._id }).populate("customer", "fullName");
    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    return sendDuplicateReviewError(error, res, next);
  }
});

router.get("/providers/:providerId/reviews", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.providerId)) {
    return res.status(400).json({ success: false, message: "Invalid provider ID" });
  }
  const reviewQuery = parseReviewQuery(req.query);
  if (!reviewQuery) {
    return res.status(400).json({
      success: false,
      message: "page and limit must be positive integers; limit cannot exceed 100; rating must be 1-5; sortBy must be newest, highest, or lowest",
    });
  }

  try {
    const baseFilter = {
      provider: new mongoose.Types.ObjectId(req.params.providerId),
      isVisible: true,
    };
    const filter = reviewQuery.rating === undefined
      ? baseFilter
      : { ...baseFilter, rating: reviewQuery.rating };
    const sort = reviewQuery.sortBy === "highest"
      ? { rating: -1, createdAt: -1 }
      : reviewQuery.sortBy === "lowest"
        ? { rating: 1, createdAt: -1 }
        : { createdAt: -1 };

    const [reviews, totalItems, [aggregate]] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip((reviewQuery.page - 1) * reviewQuery.limit)
        .limit(reviewQuery.limit)
        .populate("customer", "fullName avatarUrl")
        .populate({
          path: "booking",
          select: "service",
          populate: { path: "service", select: "name" },
        }),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            total: { $sum: 1 },
            star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / reviewQuery.limit));
    const summary = toRatingSummary(aggregate);

    return res.json({
      success: true,
      data: {
        reviews: reviews.map(toReviewDto),
        averageRating: summary.average,
        reviewCount: summary.total,
      },
      summary,
      pagination: {
        page: reviewQuery.page,
        limit: reviewQuery.limit,
        total: totalItems,
        totalPages,
        hasNext: reviewQuery.page < totalPages,
        hasPrev: reviewQuery.page > 1,
        totalItems,
        totalPages,
        hasNextPage: reviewQuery.page < totalPages,
        hasPreviousPage: reviewQuery.page > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/reviews/:reviewId/response", protect, authorize("PROVIDER"), async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!mongoose.isValidObjectId(req.params.reviewId)) {
    return res.status(400).json({ success: false, message: "Invalid review ID" });
  }
  if (typeof body.response !== "string" || !body.response.trim() || body.response.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Response must be a non-empty string of at most 2000 characters",
    });
  }

  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review || !review.isVisible) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    if (review.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the reviewed provider can respond" });
    }

    review.response = body.response.trim();
    await review.save();

    return res.json({
      success: true,
      data: toReviewDto(review),
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

    const { session, inTransaction } = await startManagedTransaction();
    const sessionOpts = session ? { session } : {};
    try {
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
        ...sessionOpts,
      });
      await updateProviderRating(review.provider, session);
      if (inTransaction) {
        await session.commitTransaction();
      }
    } catch (txErr) {
      if (inTransaction) {
        await session.abortTransaction();
      }
      throw txErr;
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    const updatedReview = await Review.findById(review._id).populate("customer", "fullName");
    return res.json({ success: true, data: updatedReview });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.parseReviewQuery = parseReviewQuery;
module.exports.toReviewDto = toReviewDto;
module.exports.toRatingSummary = toRatingSummary;

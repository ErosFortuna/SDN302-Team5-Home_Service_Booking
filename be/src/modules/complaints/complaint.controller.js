const mongoose = require('mongoose');
const Booking = require('../bookings/booking.model.js');
const Complaint = require('./complaint.model.js');

const MAX_PAGE_SIZE = 100;

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
    return { page: 1, limit: 20 };
  }

  return { page, limit };
}

/**
 * KAN-13: Create complain
 * Reporter must be CUSTOMER who owns the booking (or staff/admin).
 * Booking must not be PENDING_CONFIRMATION.
 * Mass assignment is strictly prevented.
 */
async function createComplaint(req, res, next) {
  try {
    const rawBookingId = req.body.booking || req.body.bookingId;
    const { category, title, description, evidenceUrls } = req.body;

    const booking = await Booking.findById(rawBookingId).populate('service', 'name slug');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check eligible booking status: cannot complain on pending confirmation booking
    if (booking.status === 'PENDING_CONFIRMATION') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create complaint for a booking that is still pending confirmation',
      });
    }

    const isCustomerOwner = req.user.role === 'CUSTOMER' && req.user._id.equals(booking.customer);
    const isStaffOrAdmin = req.user.role === 'STAFF' || req.user.role === 'ADMIN';

    if (!isCustomerOwner && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the customer who owns this booking (or Staff/Admin) may create a complaint',
      });
    }

    // Determine party against whom complaint is made
    let againstId = booking.provider;
    if (isStaffOrAdmin && req.body.against && mongoose.Types.ObjectId.isValid(req.body.against)) {
      againstId = req.body.against;
    }

    const upperCategory = category.trim().toUpperCase();
    const safeTitle = title && title.trim()
      ? title.trim()
      : `Khiếu nại đơn #${booking._id.toString().slice(-6)} - ${upperCategory}`;

    // Clean evidence URLs (max 5)
    const cleanEvidenceUrls = Array.isArray(evidenceUrls)
      ? evidenceUrls.filter((u) => typeof u === 'string').slice(0, 5)
      : [];

    // Strictly whitelist fields (anti mass-assignment)
    const complaint = await Complaint.create({
      booking: booking._id,
      reporter: req.user._id,
      against: againstId,
      category: upperCategory,
      title: safeTitle,
      description: description.trim(),
      evidenceUrls: cleanEvidenceUrls,
      status: 'OPEN',
      refundAmount: 0,
      replies: [],
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('booking', 'service scheduledStartAt scheduledEndAt price status')
      .populate('reporter', 'fullName avatarUrl role')
      .populate('against', 'fullName avatarUrl role');

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * KAN-19: View complain (List)
 * - CUSTOMER: views only complaints reported by them.
 * - PROVIDER: views complaints involving them as provider.
 * - STAFF / ADMIN: views all complaints.
 */
async function getComplaints(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const filter = {};

    // Role-based visibility
    if (req.user.role === 'CUSTOMER') {
      filter.reporter = req.user._id;
    } else if (req.user.role === 'PROVIDER') {
      filter.against = req.user._id;
    }

    // Safe sanitized query filters (NFR-06)
    if (req.query.status && typeof req.query.status === 'string') {
      const upperStatus = req.query.status.trim().toUpperCase();
      if (['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED'].includes(upperStatus)) {
        filter.status = upperStatus;
      }
    }
    if (req.query.category && typeof req.query.category === 'string') {
      const upperCat = req.query.category.trim().toUpperCase();
      if (['QUALITY', 'LATE_ARRIVAL', 'NO_SHOW', 'PRICE', 'BEHAVIOR', 'DAMAGE', 'OTHER'].includes(upperCat)) {
        filter.category = upperCat;
      }
    }
    if (req.query.booking && mongoose.Types.ObjectId.isValid(req.query.booking)) {
      filter.booking = req.query.booking;
    }

    const skip = (page - 1) * limit;

    const [total, complaints] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.find(filter)
        .populate({
          path: 'booking',
          select: 'service scheduledStartAt price status address',
          populate: { path: 'service', select: 'name slug category' },
        })
        .populate('reporter', 'fullName avatarUrl role')
        .populate('against', 'fullName avatarUrl role')
        .populate('resolvedBy', 'fullName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      success: true,
      data: complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * KAN-19: View complain (Detail)
 * IDOR protection (NFR-04): only reporter, against, or staff/admin.
 */
async function getComplaintById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID format' });
    }

    const complaint = await Complaint.findById(id)
      .populate({
        path: 'booking',
        select: 'service scheduledStartAt scheduledEndAt price status address paymentStatus',
        populate: { path: 'service', select: 'name slug category basePrice' },
      })
      .populate('reporter', 'fullName avatarUrl role')
      .populate('against', 'fullName avatarUrl role')
      .populate('resolvedBy', 'fullName role')
      .populate('replies.sender', 'fullName avatarUrl role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Role-based authorization
    const isStaffOrAdmin = req.user.role === 'STAFF' || req.user.role === 'ADMIN';
    const isReporter = complaint.reporter?._id?.equals(req.user._id) || (complaint.reporter && complaint.reporter.toString() === req.user._id.toString());
    const isAgainst = complaint.against?._id?.equals(req.user._id) || (complaint.against && complaint.against.toString() === req.user._id.toString());

    if (!isStaffOrAdmin && !isReporter && !isAgainst) {
      return res.status(403).json({ success: false, message: 'You do not have access to this complaint' });
    }

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * KAN-26: Replied complain (Staff / Admin resolve or reject)
 * Atomic conditional update on status $in: ['OPEN', 'UNDER_REVIEW'] prevents concurrent duplicate resolution.
 */
async function resolveComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { resolutionNote, status = 'RESOLVED', refundAmount = 0 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID format' });
    }

    const upperStatus = status.trim().toUpperCase();
    if (!['RESOLVED', 'REJECTED'].includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either RESOLVED or REJECTED',
      });
    }

    const cleanRefund = Math.max(0, Number(refundAmount) || 0);
    const cleanNote = resolutionNote.trim();

    const resolutionReply = {
      sender: req.user._id,
      senderRole: req.user.role,
      message: `[Xử lý khiếu nại - ${upperStatus}] ${cleanNote}${
        cleanRefund > 0 ? ` (Mức bồi thường: ${cleanRefund.toLocaleString('vi-VN')} VNĐ)` : ''
      }`,
      createdAt: new Date(),
    };

    // Atomic conditional update to prevent double resolution / race condition
    const updated = await Complaint.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['OPEN', 'UNDER_REVIEW'] },
      },
      {
        $set: {
          status: upperStatus,
          resolutionNote: cleanNote,
          refundAmount: cleanRefund,
          resolvedBy: req.user._id,
          resolvedAt: new Date(),
        },
        $push: {
          replies: resolutionReply,
        },
      },
      { new: true }
    )
      .populate('booking', 'service scheduledStartAt price status')
      .populate('reporter', 'fullName avatarUrl role')
      .populate('against', 'fullName avatarUrl role')
      .populate('resolvedBy', 'fullName role')
      .populate('replies.sender', 'fullName avatarUrl role');

    if (!updated) {
      const existing = await Complaint.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }
      return res.status(409).json({
        success: false,
        message: `Complaint has already been ${existing.status} and cannot be resolved again`,
      });
    }

    return res.json({
      success: true,
      message: 'Complaint resolved and reply recorded',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * KAN-26: Replied complain (User, Provider, or Staff replies in the complaint thread)
 * Rejects reply if complaint is already RESOLVED, REJECTED, or CLOSED.
 */
async function replyComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { message, evidenceUrls } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID format' });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const isStaffOrAdmin = req.user.role === 'STAFF' || req.user.role === 'ADMIN';
    const isReporter = complaint.reporter.equals(req.user._id);
    const isAgainst = complaint.against.equals(req.user._id);

    if (!isStaffOrAdmin && !isReporter && !isAgainst) {
      return res.status(403).json({ success: false, message: 'You do not have permission to reply to this complaint' });
    }

    // Spec: Closed complaints cannot be replied to
    if (['RESOLVED', 'REJECTED', 'CLOSED'].includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a resolved or closed complaint',
      });
    }

    const cleanEvidence = Array.isArray(evidenceUrls)
      ? evidenceUrls.filter((u) => typeof u === 'string').slice(0, 5)
      : [];

    const newReply = {
      sender: req.user._id,
      senderRole: req.user.role,
      message: message.trim(),
      evidenceUrls: cleanEvidence,
      createdAt: new Date(),
    };

    const updateOps = {
      $push: { replies: newReply },
    };

    // Auto-transition to UNDER_REVIEW when provider or staff replies to an OPEN complaint
    if (complaint.status === 'OPEN' && (isAgainst || isStaffOrAdmin)) {
      updateOps.$set = { status: 'UNDER_REVIEW' };
      if (isAgainst) {
        updateOps.$set.providerResponse = {
          note: message.trim(),
          evidenceUrls: cleanEvidence,
          respondedAt: new Date(),
        };
      }
    }

    const updated = await Complaint.findByIdAndUpdate(id, updateOps, { new: true })
      .populate('booking', 'service scheduledStartAt price status')
      .populate('reporter', 'fullName avatarUrl role')
      .populate('against', 'fullName avatarUrl role')
      .populate('resolvedBy', 'fullName role')
      .populate('replies.sender', 'fullName avatarUrl role');

    return res.json({
      success: true,
      message: 'Reply submitted successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  resolveComplaint,
  replyComplaint,
};

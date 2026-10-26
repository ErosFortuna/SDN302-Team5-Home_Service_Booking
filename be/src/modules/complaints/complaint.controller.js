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
 * Reporter must be a participant in the booking (customer or provider), or staff/admin.
 */
async function createComplaint(req, res, next) {
  try {
    const { booking: bookingId, category, title, description, evidenceUrls } = req.body;

    const booking = await Booking.findById(bookingId).populate('service', 'name slug');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const userIdStr = req.user._id.toString();
    const customerIdStr = booking.customer?.toString();
    const providerIdStr = booking.provider?.toString();

    const isCustomer = userIdStr === customerIdStr;
    const isProvider = userIdStr === providerIdStr;
    const isStaffOrAdmin = req.user.role === 'STAFF' || req.user.role === 'ADMIN';

    if (!isCustomer && !isProvider && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only participants in a booking may create a complaint',
      });
    }

    // Determine party against whom complaint is made
    let againstId = isCustomer ? booking.provider : booking.customer;
    if (isStaffOrAdmin && req.body.against) {
      againstId = req.body.against;
    }

    const upperCategory = category.trim().toUpperCase();
    const safeTitle = title && title.trim()
      ? title.trim()
      : `Khiếu nại đơn #${booking._id.toString().slice(-6)} - ${upperCategory}`;

    const complaint = await Complaint.create({
      booking: booking._id,
      reporter: req.user._id,
      against: againstId,
      category: upperCategory,
      title: safeTitle,
      description: description.trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      status: 'OPEN',
      replies: [],
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('booking', 'service scheduledStartAt scheduledEndAt price status')
      .populate('reporter', 'fullName email phone avatarUrl role')
      .populate('against', 'fullName email phone avatarUrl role');

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
 * - CUSTOMER: views complaints reported by them or against them.
 * - PROVIDER: views complaints involving them.
 * - STAFF / ADMIN: views all complaints.
 */
async function getComplaints(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const filter = {};

    // Role-based visibility
    if (req.user.role === 'CUSTOMER' || req.user.role === 'PROVIDER') {
      filter.$or = [{ reporter: req.user._id }, { against: req.user._id }];
    }

    // Optional query filters
    if (req.query.status) {
      filter.status = req.query.status.trim().toUpperCase();
    }
    if (req.query.category) {
      filter.category = req.query.category.trim().toUpperCase();
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
        .populate('reporter', 'fullName email phone avatarUrl role')
        .populate('against', 'fullName email phone avatarUrl role')
        .populate('resolvedBy', 'fullName email role')
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
      .populate('reporter', 'fullName email phone avatarUrl role')
      .populate('against', 'fullName email phone avatarUrl role')
      .populate('resolvedBy', 'fullName email role')
      .populate('replies.sender', 'fullName email avatarUrl role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Role-based authorization
    const isStaffOrAdmin = req.user.role === 'STAFF' || req.user.role === 'ADMIN';
    const isReporter = complaint.reporter?._id?.equals(req.user._id);
    const isAgainst = complaint.against?._id?.equals(req.user._id);

    if (!isStaffOrAdmin && !isReporter && !isAgainst) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
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
 * KAN-26: Replied complain (Staff / Admin resolve or update resolution note & refund)
 */
async function resolveComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { resolutionNote, status = 'RESOLVED', refundAmount = 0 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint ID format' });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const upperStatus = status.trim().toUpperCase();

    complaint.resolutionNote = resolutionNote.trim();
    complaint.status = upperStatus;
    complaint.refundAmount = Number(refundAmount) || 0;
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();

    // Append resolution entry to discussion thread
    complaint.replies.push({
      sender: req.user._id,
      senderRole: req.user.role,
      message: `[Xử lý khiếu nại - ${upperStatus}] ${resolutionNote.trim()}${
        refundAmount > 0 ? ` (Mức bồi thường: ${Number(refundAmount).toLocaleString('vi-VN')} VNĐ)` : ''
      }`,
      createdAt: new Date(),
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('booking', 'service scheduledStartAt price status')
      .populate('reporter', 'fullName email phone avatarUrl role')
      .populate('against', 'fullName email phone avatarUrl role')
      .populate('resolvedBy', 'fullName email role')
      .populate('replies.sender', 'fullName email avatarUrl role');

    return res.json({
      success: true,
      message: 'Complaint resolved and reply recorded',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * KAN-26: Replied complain (User, Provider, or Staff replies in the complaint thread)
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
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const reply = {
      sender: req.user._id,
      senderRole: req.user.role,
      message: message.trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      createdAt: new Date(),
    };

    complaint.replies.push(reply);

    // If provider is replying to an OPEN complaint, update status to UNDER_REVIEW
    if (isAgainst && complaint.status === 'OPEN') {
      complaint.status = 'UNDER_REVIEW';
      complaint.providerResponse = {
        note: message.trim(),
        evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
        respondedAt: new Date(),
      };
    }

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('booking', 'service scheduledStartAt price status')
      .populate('reporter', 'fullName email phone avatarUrl role')
      .populate('against', 'fullName email phone avatarUrl role')
      .populate('resolvedBy', 'fullName email role')
      .populate('replies.sender', 'fullName email avatarUrl role');

    return res.json({
      success: true,
      message: 'Reply submitted successfully',
      data: populated,
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

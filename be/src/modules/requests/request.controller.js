const Service = require('../services/service.model.js');
const ServiceRequest = require('./request.model.js');
const mongoose = require('mongoose');

const EDITABLE_STATUSES = ['OPEN'];
const CANCELLABLE_STATUSES = ['OPEN', 'QUOTED'];

async function createServiceRequest(req, res, next) {
  try {
    const {
      service: serviceId,
      description,
      address,
      preferredStartAt,
      preferredEndAt,
      budgetMin,
      budgetMax,
      attachments,
    } = req.body;

    // Verify service exists and is active
    const serviceDoc = await Service.findById(serviceId);
    if (!serviceDoc) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    if (!serviceDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Service is inactive',
      });
    }

    // Build address snapshot
    const safeAddress = {
      recipientName: address.recipientName.trim(),
      phone: address.phone.trim(),
      addressLine: address.addressLine.trim(),
      city: address.city.trim(),
    };

    if (address.label && typeof address.label === 'string' && address.label.trim()) {
      safeAddress.label = address.label.trim();
    }
    if (address.ward && typeof address.ward === 'string' && address.ward.trim()) {
      safeAddress.ward = address.ward.trim();
    }
    if (address.district && typeof address.district === 'string' && address.district.trim()) {
      safeAddress.district = address.district.trim();
    }
    if (address.country && typeof address.country === 'string' && address.country.trim()) {
      safeAddress.country = address.country.trim();
    }

    if (
      address.location &&
      Array.isArray(address.location.coordinates) &&
      address.location.coordinates.length === 2 &&
      typeof address.location.coordinates[0] === 'number' &&
      typeof address.location.coordinates[1] === 'number'
    ) {
      safeAddress.location = {
        type: 'Point',
        coordinates: [address.location.coordinates[0], address.location.coordinates[1]],
      };
    }

    // Create service request enforcing customer from token and status OPEN
    const newRequest = await ServiceRequest.create({
      customer: req.user._id,
      service: serviceDoc._id,
      category: serviceDoc.category,
      description: description.trim(),
      address: safeAddress,
      preferredStartAt: new Date(preferredStartAt),
      preferredEndAt: new Date(preferredEndAt),
      ...(budgetMin != null && { budgetMin: Number(budgetMin) }),
      ...(budgetMax != null && { budgetMax: Number(budgetMax) }),
      status: 'OPEN',
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    return res.status(201).json({
      success: true,
      message: 'Service request created',
      data: newRequest,
    });
  } catch (error) {
    next(error);
  }
}

async function updateServiceRequest(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ success: false, message: 'requestId must be a valid id' });
    }

    const request = await ServiceRequest.findOne({ _id: req.params.requestId, customer: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found' });
    if (!EDITABLE_STATUSES.includes(request.status)) {
      return res.status(409).json({ success: false, message: 'Only OPEN requests can be edited' });
    }

    const { preferredStartAt, preferredEndAt, budgetMin, budgetMax, address, ...otherFields } = req.body;
    const nextStart = preferredStartAt === undefined ? request.preferredStartAt : new Date(preferredStartAt);
    const nextEnd = preferredEndAt === undefined ? request.preferredEndAt : new Date(preferredEndAt);
    if (nextEnd <= nextStart) {
      return res.status(400).json({ success: false, message: 'preferredEndAt must be after preferredStartAt' });
    }

    const nextBudgetMin = budgetMin === undefined ? request.budgetMin : budgetMin;
    const nextBudgetMax = budgetMax === undefined ? request.budgetMax : budgetMax;
    if (nextBudgetMin != null && nextBudgetMax != null && nextBudgetMax < nextBudgetMin) {
      return res.status(400).json({ success: false, message: 'budgetMax must be >= budgetMin' });
    }

    const updates = { ...otherFields };
    if (preferredStartAt !== undefined) updates.preferredStartAt = nextStart;
    if (preferredEndAt !== undefined) updates.preferredEndAt = nextEnd;
    if (budgetMin !== undefined) updates.budgetMin = budgetMin;
    if (budgetMax !== undefined) updates.budgetMax = budgetMax;
    if (address !== undefined) updates.address = { ...request.address.toObject(), ...address };

    const updated = await ServiceRequest.findOneAndUpdate(
      { _id: request._id, customer: req.user._id, status: { $in: EDITABLE_STATUSES } },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(409).json({ success: false, message: 'Request status changed; reload and try again' });

    return res.json({ success: true, message: 'Service request updated', data: updated });
  } catch (error) {
    next(error);
  }
}

async function cancelServiceRequest(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId)) {
      return res.status(400).json({ success: false, message: 'requestId must be a valid id' });
    }

    const updated = await ServiceRequest.findOneAndUpdate(
      {
        _id: req.params.requestId,
        customer: req.user._id,
        status: { $in: CANCELLABLE_STATUSES },
      },
      {
        $set: {
          status: 'CANCELLED',
          cancellationReason: req.body.reason.trim(),
          cancelledBy: req.user._id,
          cancelledAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      const ownedRequest = await ServiceRequest.exists({ _id: req.params.requestId, customer: req.user._id });
      if (!ownedRequest) return res.status(404).json({ success: false, message: 'Service request not found' });
      return res.status(409).json({ success: false, message: 'This request can no longer be cancelled' });
    }

    return res.json({
      success: true,
      message: 'Service request cancelled',
      data: { id: updated._id.toString(), status: updated.status, cancellationReason: updated.cancellationReason },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createServiceRequest,
  updateServiceRequest,
  cancelServiceRequest,
};

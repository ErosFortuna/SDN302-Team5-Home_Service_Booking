const Service = require('../services/service.model.js');
const ServiceRequest = require('./request.model.js');

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

module.exports = {
  createServiceRequest,
};

const User = require("./users/user.model.js");
const ProviderProfile = require("./providers/provider.model.js");
const ServiceCategory = require("./categories/service-category.model.js");
const Service = require("./services/service.model.js");
const ServiceRequest = require("./requests/request.model.js");

const Booking = require("./bookings/booking.model.js");
const Availability = require("./availability/availability.model.js");
const Review = require("./reviews/review.model.js");
const Complaint = require("./complaints/complaint.model.js");
const Notification = require("./notifications/notification.model.js");
const MembershipPlan = require("./payments/membership-plan.model.js");
const ProviderSubscription = require("./payments/provider-subscription.model.js");
const MembershipPayment = require("./payments/membership-payment.model.js");
const { Policy, UserConsent } = require("./policy/policy.model.js");
const { AiEstimateAudit } = require("./ai-assistant/ai-assistant.model.js");

module.exports = {
  User,
  ProviderProfile,
  ServiceCategory,
  Service,
  ServiceRequest,

  Booking,
  Availability,
  Review,
  Complaint,
  Notification,
  MembershipPlan,
  ProviderSubscription,
  MembershipPayment,
  Policy,
  UserConsent,
  AiEstimateAudit,
};

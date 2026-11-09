const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { env } = require('../src/config/env.js');
const app = require('../src/app.js');
const { dispatch } = require('../test-helpers/dispatch.js');

const User = require('../src/modules/users/user.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');
const ServiceRequest = require('../src/modules/requests/request.model.js');
const Booking = require('../src/modules/bookings/booking.model.js');

test('V-04 Security Fix: Provider access to service requests and PII redaction', async (t) => {
  const originalUserFindById = User.findById;
  const originalRequestFindById = ServiceRequest.findById;
  const originalProfileFindOne = ProviderProfile.findOne;
  const originalBookingFindOne = Booking.findOne;

  const categoryId = new mongoose.Types.ObjectId();
  const differentCategoryId = new mongoose.Types.ObjectId();
  const serviceId = new mongoose.Types.ObjectId();
  const ownerCustomerId = new mongoose.Types.ObjectId();
  const otherCustomerId = new mongoose.Types.ObjectId();
  const eligibleProviderId = new mongoose.Types.ObjectId();
  const unverifiedProviderId = new mongoose.Types.ObjectId();
  const wrongSkillProviderId = new mongoose.Types.ObjectId();
  const outOfAreaProviderId = new mongoose.Types.ObjectId();
  const selectedProviderId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();

  const makeToken = (id) => jwt.sign({ sub: id.toString() }, env.jwtSecret, { expiresIn: '10m' });

  const tokens = {
    ownerCustomer: makeToken(ownerCustomerId),
    otherCustomer: makeToken(otherCustomerId),
    eligibleProvider: makeToken(eligibleProviderId),
    unverifiedProvider: makeToken(unverifiedProviderId),
    wrongSkillProvider: makeToken(wrongSkillProviderId),
    outOfAreaProvider: makeToken(outOfAreaProviderId),
    selectedProvider: makeToken(selectedProviderId),
    staff: makeToken(staffId),
    admin: makeToken(adminId),
  };

  const usersMap = new Map([
    [ownerCustomerId.toString(), { _id: ownerCustomerId, role: 'CUSTOMER', status: 'ACTIVE', fullName: 'Nguyễn Văn Chủ' }],
    [otherCustomerId.toString(), { _id: otherCustomerId, role: 'CUSTOMER', status: 'ACTIVE', fullName: 'Khách Lạ' }],
    [eligibleProviderId.toString(), { _id: eligibleProviderId, role: 'PROVIDER', status: 'ACTIVE', fullName: 'Thợ Đạt Chuẩn' }],
    [unverifiedProviderId.toString(), { _id: unverifiedProviderId, role: 'PROVIDER', status: 'ACTIVE', fullName: 'Thợ Chưa Duyệt' }],
    [wrongSkillProviderId.toString(), { _id: wrongSkillProviderId, role: 'PROVIDER', status: 'ACTIVE', fullName: 'Thợ Sai Kỹ Năng' }],
    [outOfAreaProviderId.toString(), { _id: outOfAreaProviderId, role: 'PROVIDER', status: 'ACTIVE', fullName: 'Thợ Xa Khu Vực' }],
    [selectedProviderId.toString(), { _id: selectedProviderId, role: 'PROVIDER', status: 'ACTIVE', fullName: 'Thợ Được Chọn' }],
    [staffId.toString(), { _id: staffId, role: 'STAFF', status: 'ACTIVE', fullName: 'Nhân Viên CSKH' }],
    [adminId.toString(), { _id: adminId, role: 'ADMIN', status: 'ACTIVE', fullName: 'Quản Trị Viên' }],
  ]);

  const profilesMap = new Map([
    [
      eligibleProviderId.toString(),
      {
        user: eligibleProviderId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        skills: [categoryId],
        serviceAreas: ['Quận 1', 'Quận 3'],
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.7009, 10.7769] },
      },
    ],
    [
      unverifiedProviderId.toString(),
      {
        user: unverifiedProviderId,
        verificationStatus: 'PENDING',
        isDeleted: false,
        skills: [categoryId],
        serviceAreas: ['Quận 1'],
        city: 'TP.HCM',
      },
    ],
    [
      wrongSkillProviderId.toString(),
      {
        user: wrongSkillProviderId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        skills: [differentCategoryId],
        serviceAreas: ['Quận 1'],
        city: 'TP.HCM',
      },
    ],
    [
      outOfAreaProviderId.toString(),
      {
        user: outOfAreaProviderId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        skills: [categoryId],
        serviceAreas: ['Hải Châu'],
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2208, 16.0544] },
      },
    ],
    [
      selectedProviderId.toString(),
      {
        user: selectedProviderId,
        verificationStatus: 'VERIFIED',
        isDeleted: false,
        skills: [categoryId],
        serviceAreas: ['Quận 1'],
        city: 'TP.HCM',
      },
    ],
  ]);

  const mockServiceRequest = {
    _id: requestId,
    customer: {
      _id: ownerCustomerId,
      fullName: 'Nguyễn Văn Chủ',
      phone: '0922222222',
      email: 'owner.customer@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    service: {
      _id: serviceId,
      name: 'Sửa đường nước',
      basePrice: 200000,
      pricingType: 'FIXED',
      estimatedDurationMinutes: 60,
      category: {
        _id: categoryId,
        name: 'Điện nước',
        slug: 'dien-nuoc',
      },
    },
    category: categoryId,
    description: 'Bồn rửa chén bị rò rỉ nước ở mối nối, cần xử lý gấp.',
    address: {
      recipientName: 'Nguyễn Văn Chủ',
      phone: '0922222222',
      addressLine: '123 Đường Lê Lợi',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP.HCM',
      location: {
        type: 'Point',
        coordinates: [106.7009, 10.7769],
      },
    },
    preferredStartAt: new Date(Date.now() + 3600000),
    preferredEndAt: new Date(Date.now() + 7200000),
    status: 'OPEN',
    declinedProviders: [],
  };

  // Mock DB handlers
  User.findById = (id) => ({
    select: async () => usersMap.get(id?.toString()) || null,
  });

  ServiceRequest.findById = () => ({
    populate(first) {
      return {
        populate(second) {
          return {
            lean: async () => JSON.parse(JSON.stringify(mockServiceRequest)),
          };
        },
        lean: async () => JSON.parse(JSON.stringify(mockServiceRequest)),
      };
    },
  });

  ProviderProfile.findOne = ({ user }) => ({
    lean: async () => profilesMap.get(user?.toString()) || null,
  });

  Booking.findOne = ({ provider }) => ({
    lean: async () => (provider?.toString() === selectedProviderId.toString() ? { _id: new mongoose.Types.ObjectId() } : null),
  });

  t.after(() => {
    User.findById = originalUserFindById;
    ServiceRequest.findById = originalRequestFindById;
    ProviderProfile.findOne = originalProfileFindOne;
    Booking.findOne = originalBookingFindOne;
  });

  await t.test('1. Provider không verified bị chặn (404)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.unverifiedProvider}` },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Service request not found');
  });

  await t.test('2. Provider verified nhưng sai kỹ năng bị chặn (404)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.wrongSkillProvider}` },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Service request not found');
  });

  await t.test('3. Provider verified nhưng ngoài khu vực hoạt động bị chặn (404)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.outOfAreaProvider}` },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Service request not found');
  });

  await t.test('4. Provider đủ điều kiện nhận DTO che PII (không email, SĐT che một phần, địa chỉ phường/quận không toạ độ, không addressLine)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.eligibleProvider}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { data } = res.body;
    assert.ok(data);
    assert.equal(data.id, requestId.toString());
    assert.equal(data.status, 'OPEN');

    // Customer PII check
    assert.equal(data.customer.fullName, 'Nguyễn Văn Chủ');
    assert.equal(data.customer.email, undefined, 'customer email must not be returned');
    assert.equal(data.customer.phone, '092****222', 'customer phone must be partially masked');

    // Address PII check
    assert.equal(data.address.ward, 'Bến Nghé');
    assert.equal(data.address.district, 'Quận 1');
    assert.equal(data.address.city, 'TP.HCM');
    assert.equal(data.address.addressLine, undefined, 'addressLine must not be returned');
    assert.equal(data.address.location, undefined, 'exact GPS coordinates location must not be returned');
    assert.equal(data.address.phone, '092****222', 'address phone must be partially masked');
  });

  await t.test('5. Provider được chọn nhận đầy đủ thông tin như cũ', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.selectedProvider}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { data } = res.body;
    assert.equal(data.customer.email, 'owner.customer@example.com', 'selected provider sees full email');
    assert.equal(data.customer.phone, '0922222222', 'selected provider sees full phone');
    assert.equal(data.address.addressLine, '123 Đường Lê Lợi', 'selected provider sees full addressLine');
    assert.deepEqual(data.address.location?.coordinates, [106.7009, 10.7769], 'selected provider sees coordinates');
  });

  await t.test('6. Customer khác (không phải chủ yêu cầu) bị chặn (404)', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.otherCustomer}` },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Service request not found');
  });

  await t.test('7. Owner customer nhận đầy đủ thông tin', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.ownerCustomer}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.customer.email, 'owner.customer@example.com');
    assert.equal(res.body.data.customer.phone, '0922222222');
    assert.equal(res.body.data.address.addressLine, '123 Đường Lê Lợi');
  });

  await t.test('8. STAFF và ADMIN nhận đầy đủ thông tin', async () => {
    const resStaff = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.staff}` },
    });
    assert.equal(resStaff.status, 200);
    assert.equal(resStaff.body.data.customer.email, 'owner.customer@example.com');
    assert.equal(resStaff.body.data.address.addressLine, '123 Đường Lê Lợi');

    const resAdmin = await dispatch(app, {
      method: 'GET',
      url: `/api/requests/${requestId}`,
      headers: { authorization: `Bearer ${tokens.admin}` },
    });
    assert.equal(resAdmin.status, 200);
    assert.equal(resAdmin.body.data.customer.email, 'owner.customer@example.com');
  });
});


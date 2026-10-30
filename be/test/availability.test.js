const assert = require('node:assert/strict');
const test = require('node:test');
const {
  timeToMinutes,
  isValidTime,
  isValidDate,
  validateDaySchedule,
  validateExceptionData,
  validateSettingsData,
} = require('../src/modules/availability/availability.validation.js');
const availabilityService = require('../src/modules/availability/availability.service.js');
const { minutesToTime } = availabilityService;

test('availability: time and date conversions and formats', () => {
  assert.equal(timeToMinutes('08:00'), 480);
  assert.equal(timeToMinutes('12:30'), 750);
  assert.equal(timeToMinutes('17:00'), 1020);
  assert.equal(timeToMinutes('00:00'), 0);
  assert.equal(timeToMinutes('23:59'), 1439);
  assert.equal(minutesToTime(480), '08:00');
  assert.equal(minutesToTime(750), '12:30');
  assert.equal(minutesToTime(1020), '17:00');

  assert.equal(isValidTime('08:00'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('8:00'), false);
  assert.equal(isValidDate('2026-11-05'), true);
  assert.equal(isValidDate('invalid-date'), false);
});

test('availability: validates valid day schedule', () => {
  const validDay = validateDaySchedule({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '17:00',
    isOff: false,
    breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }],
  }, 1);

  assert.equal(validDay.dayName, 'monday');
  assert.equal(validDay.isOff, false);
  assert.equal(validDay.breaks.length, 1);
  assert.equal(validDay.breaks[0].note, 'Nghỉ trưa');
});

test('availability: rejects invalid startTime >= endTime', () => {
  assert.throws(() => {
    validateDaySchedule({
      dayOfWeek: 1,
      startTime: '17:00',
      endTime: '08:00',
      isOff: false,
      breaks: [],
    }, 1);
  }, /phải nhỏ hơn giờ kết thúc/);
});

test('availability: rejects break outside working hours', () => {
  assert.throws(() => {
    validateDaySchedule({
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      isOff: false,
      breaks: [{ startTime: '17:30', endTime: '18:30', note: 'Ngoại giờ' }],
    }, 1);
  }, /phải nằm lọt trong khung giờ làm việc/);
});

test('availability: rejects overlapping breaks within a day', () => {
  assert.throws(() => {
    validateDaySchedule({
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      isOff: false,
      breaks: [
        { startTime: '12:00', endTime: '13:00', note: 'Trưa' },
        { startTime: '12:30', endTime: '13:30', note: 'Trùng' },
      ],
    }, 1);
  }, /không được chồng chéo nhau/);
});

test('availability: validates days off / exceptions', () => {
  const fullDay = validateExceptionData({
    date: '2026-12-25',
    isFullDayOff: true,
    reason: 'Giáng sinh',
  });
  assert.equal(fullDay.isFullDayOff, true);
  assert.equal(fullDay.reason, 'Giáng sinh');

  const customHours = validateExceptionData({
    date: '2026-12-31',
    isFullDayOff: false,
    customStartTime: '08:00',
    customEndTime: '12:00',
    reason: 'Tất niên',
  });
  assert.equal(customHours.isFullDayOff, false);
  assert.equal(customHours.customStartTime, '08:00');
  assert.equal(customHours.customEndTime, '12:00');

  assert.throws(() => {
    validateExceptionData({
      date: '2026-12-31',
      isFullDayOff: false,
      customStartTime: '15:00',
      customEndTime: '10:00',
    });
  }, /customStartTime.*phải nhỏ hơn customEndTime/);
});

test('availability: validates settings data', () => {
  const valid = validateSettingsData({
    slotDurationMinutes: 90,
    travelBufferMinutes: 45,
    isAcceptingBookings: false,
  });
  assert.equal(valid.slotDurationMinutes, 90);
  assert.equal(valid.travelBufferMinutes, 45);
  assert.equal(valid.isAcceptingBookings, false);

  assert.throws(() => {
    validateSettingsData({ slotDurationMinutes: 5 });
  }, /slotDurationMinutes/);
});

const isVietnamesePhone = (value) => /^(0)(3|5|7|8|9)\d{8}$/.test(value);
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

module.exports = { isVietnamesePhone, isObjectId };

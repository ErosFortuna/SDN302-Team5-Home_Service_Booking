/**
 * Helper xử lý Regular Expression an toàn, chống Regex Injection và ReDoS (V-25).
 * Thoát các ký tự đặc biệt của regex: . * + ? ^ $ { } ( ) | [ ] \
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeRegex(value) {
  if (value == null) return '';
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  escapeRegex,
};


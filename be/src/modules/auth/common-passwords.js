/**
 * Common / Weak Passwords Denylist (V-14)
 *
 * A curated list of commonly breached or predictable passwords.
 * Disallowed during registration and password change, but NOT enforced on login
 * to ensure legacy accounts remain accessible.
 */

const COMMON_PASSWORDS = [
  '1234567890',
  '12345678901',
  '123456789012',
  '0123456789',
  '1111111111',
  '0000000000',
  '1231231234',
  'password123',
  'password1234',
  'password12345',
  'password123456',
  'admin12345',
  'admin123456',
  'administrator',
  'qwertyuiop',
  'asdfghjkl;',
  'iloveyou123',
  'homecare123',
  'homecare1234',
  'homehero123',
  'homehero1234',
  'welcome1234',
  'welcome12345',
  'letmein1234',
  'monkey12345',
  'dragon12345',
  'sunshine123',
  'princess123',
  'football123',
  'master12345',
  'trustno1123',
  'superman123',
  'michael1234',
  'jennifer123',
  'jessica1234',
  'charlie1234',
  'shadow12345',
  'matrix12345',
  'killer12345',
  'starwars123',
  'passcode123',
  'default1234',
  'secret12345',
  'changeit123',
];

const COMMON_PASSWORDS_SET = new Set(COMMON_PASSWORDS.map((p) => p.toLowerCase()));

/**
 * Checks whether a password matches an easily guessed or common password.
 * @param {string} password
 * @returns {boolean}
 */
function isCommonPassword(password) {
  if (typeof password !== 'string') return false;
  return COMMON_PASSWORDS_SET.has(password.trim().toLowerCase());
}

module.exports = {
  COMMON_PASSWORDS,
  isCommonPassword,
};


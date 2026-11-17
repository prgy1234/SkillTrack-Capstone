const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Generate a random 12-character temporary password with mixed case, digits, and special characters.
 */
function generateTempPassword() {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + digits + special;

  // Ensure at least one of each type
  const required = [
    lowercase[crypto.randomInt(lowercase.length)],
    uppercase[crypto.randomInt(uppercase.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  // Fill remaining 8 characters randomly
  const remaining = [];
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    remaining.push(allChars[bytes[i] % allChars.length]);
  }

  // Shuffle all 12 characters
  const all = [...required, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}

/**
 * Hash a password using bcryptjs.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a hash.
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { generateTempPassword, hashPassword, comparePassword };

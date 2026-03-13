const bcrypt = require('bcryptjs');

/**
 * Hash a plain password using bcrypt
 * @param {string} plainPassword - Plain text password to hash
 * @returns {Promise<string>} - Bcrypt hashed password
 */
async function hashPassword(plainPassword) {
    // Cost factor 12 provides good security vs performance balance
    return await bcrypt.hash(plainPassword, 12);
}

/**
 * Compare a plain password with a hashed password
 * @param {string} plainPassword - Plain text password to verify
 * @param {string} hashedPassword - Bcrypt hashed password from database
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
async function comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
    hashPassword,
    comparePassword
};

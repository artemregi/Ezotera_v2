const crypto = require('crypto');

/**
 * Generate a 6-digit OTP using cryptographically secure random number
 * @returns {string} - 6-digit OTP (e.g., "123456")
 */
function generateOTP() {
    // Generate random integer between 100000 and 999999 (inclusive)
    const otp = crypto.randomInt(100000, 1000000);
    return otp.toString();
}

/**
 * Hash OTP using SHA-256
 * CRITICAL: Never store raw OTP in database
 * @param {string} otp - Plain OTP to hash
 * @returns {string} - SHA-256 hash of OTP (hex)
 */
function hashOTP(otp) {
    return crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');
}

/**
 * Compare OTP with stored hash using timing-safe comparison
 * Prevents timing attacks that could leak OTP information
 * @param {string} plainOTP - Plain OTP from user input
 * @param {string} storedHash - SHA-256 hash from database
 * @returns {boolean} - True if OTP matches hash, false otherwise
 */
function compareOTP(plainOTP, storedHash) {
    try {
        // Hash the plain OTP
        const plainHash = hashOTP(plainOTP);

        // Use timing-safe comparison to prevent timing attacks
        // Both must be buffers of equal length
        const plainBuffer = Buffer.from(plainHash, 'hex');
        const storedBuffer = Buffer.from(storedHash, 'hex');

        // Ensure both buffers are same length
        if (plainBuffer.length !== storedBuffer.length) {
            return false;
        }

        // Use crypto.timingSafeEqual for constant-time comparison
        return crypto.timingSafeEqual(plainBuffer, storedBuffer);
    } catch (error) {
        // If comparison fails, return false (safety default)
        console.error('❌ OTP comparison error:', error.message);
        return false;
    }
}

/**
 * Check if OTP has expired
 * @param {Date} expiresAt - Expiration timestamp from database
 * @returns {boolean} - True if OTP is expired, false otherwise
 */
function isOTPExpired(expiresAt) {
    if (!expiresAt) {
        return true;
    }
    return new Date() > new Date(expiresAt);
}

/**
 * Calculate OTP expiration time
 * @param {number} minutesFromNow - Minutes until expiration (default: 10)
 * @returns {Date} - Future timestamp when OTP expires
 */
function calculateOTPExpiration(minutesFromNow = 10) {
    const now = new Date();
    return new Date(now.getTime() + minutesFromNow * 60 * 1000);
}

module.exports = {
    generateOTP,
    hashOTP,
    compareOTP,
    isOTPExpired,
    calculateOTPExpiration
};

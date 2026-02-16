const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for authenticated user
 * @param {number} userId - User ID from database
 * @param {string} email - User email
 * @param {string} expiresIn - Token expiration (e.g., '24h', '7d')
 * @returns {string} - JWT token
 */
function generateToken(userId, email, expiresIn = '24h') {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn }
    );
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Set authentication cookie in HTTP response
 * @param {Object} res - HTTP response object
 * @param {string} token - JWT token to set as cookie
 * @param {number} maxAge - Cookie max age in seconds (default: 24 hours)
 */
function setCookie(res, token, maxAge = 24 * 60 * 60) {
    const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : '';
    res.setHeader('Set-Cookie', [
        `auth_token=${token}; HttpOnly; ${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`
    ]);
}

module.exports = {
    generateToken,
    verifyToken,
    setCookie
};

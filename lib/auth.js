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
 * Set authentication cookie in HTTP response.
 *
 * The Secure flag is derived from the actual request protocol — NOT from the
 * COOKIE_SECURE env var alone.  If COOKIE_SECURE=true is set in the system
 * environment but the site runs on HTTP (common on Yandex Cloud / plain VMs),
 * the browser silently discards any cookie with the Secure flag, so the
 * auth_token is never stored and every subsequent request gets 401.
 *
 * @param {Object} res    - HTTP response object
 * @param {string} token  - JWT token to set as cookie
 * @param {number} maxAge - Cookie max age in seconds (default: 24 hours)
 * @param {Object} [req]  - HTTP request object (used to detect HTTPS via X-Forwarded-Proto)
 */
function setCookie(res, token, maxAge = 24 * 60 * 60, req = null) {
    // Detect HTTPS from nginx's X-Forwarded-Proto header.
    // Fall back to COOKIE_SECURE env var only when no req is available.
    const proto = req && req.headers['x-forwarded-proto'];
    const isHttps = proto === 'https' || (!req && process.env.COOKIE_SECURE === 'true');
    const secure = isHttps ? 'Secure; ' : '';

    const cookieStr = `auth_token=${token}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${maxAge}`;
    console.log(`[Auth] Setting cookie — proto=${proto || 'unknown'} isHttps=${isHttps} — HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${maxAge}`);
    res.setHeader('Set-Cookie', [cookieStr]);
}

/**
 * Extract JWT token from request cookies
 * @param {Object} req - HTTP request object
 * @returns {string|null} - Token string or null if not found
 */
function extractTokenFromCookies(req) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
}

module.exports = {
    generateToken,
    verifyToken,
    setCookie,
    extractTokenFromCookies
};

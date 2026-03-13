// Simple in-memory rate limiter for MVP
// For production, upgrade to Upstash Redis for distributed rate limiting

const attempts = new Map();

/**
 * Check if request is within rate limit
 * @param {string} identifier - IP address or email to track
 * @param {number} maxAttempts - Maximum attempts allowed (default: 5)
 * @param {number} windowMinutes - Time window in minutes (default: 15)
 * @returns {boolean} - True if within limit, false if exceeded
 */
function checkRateLimit(identifier, maxAttempts = 5, windowMinutes = 15) {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const record = attempts.get(identifier) || { count: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
    } else {
        record.count++;
    }

    attempts.set(identifier, record);

    // Clean up old entries to prevent memory leak
    if (attempts.size > 10000) {
        const oldestAllowed = now - windowMs;
        for (const [key, value] of attempts.entries()) {
            if (value.resetTime < oldestAllowed) {
                attempts.delete(key);
            }
        }
    }

    return record.count <= maxAttempts;
}

module.exports = {
    checkRateLimit
};

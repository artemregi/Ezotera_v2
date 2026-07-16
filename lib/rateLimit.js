// Distributed rate limiter using Supabase Postgres
// Persists across Vercel serverless cold starts

const { pool } = require('./db');

let tableReady = false;

async function ensureTable() {
    if (tableReady) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rate_limits (
                identifier TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 1,
                reset_at TIMESTAMPTZ NOT NULL
            )
        `);
        tableReady = true;
    } catch (err) {
        console.warn('Rate limit table init failed:', err.message);
    }
}

/**
 * Check if request is within rate limit (async, DB-backed)
 * @param {string} identifier - IP or email to track
 * @param {number} maxAttempts - Max attempts allowed (default: 5)
 * @param {number} windowMinutes - Time window in minutes (default: 3)
 * @returns {Promise<boolean>} - true if within limit, false if exceeded
 */
async function checkRateLimit(identifier, maxAttempts = 5, windowMinutes = 3) {
    try {
        await ensureTable();
        const windowMs = windowMinutes * 60 * 1000;
        const resetAt = new Date(Date.now() + windowMs);

        const res = await pool.query(
            `INSERT INTO rate_limits (identifier, count, reset_at)
             VALUES ($1, 1, $2)
             ON CONFLICT (identifier) DO UPDATE
             SET count = CASE
                 WHEN rate_limits.reset_at < NOW() THEN 1
                 ELSE rate_limits.count + 1
             END,
             reset_at = CASE
                 WHEN rate_limits.reset_at < NOW() THEN $2
                 ELSE rate_limits.reset_at
             END
             RETURNING count`,
            [identifier, resetAt]
        );

        return res.rows[0].count <= maxAttempts;
    } catch (err) {
        console.warn('Rate limit check failed, allowing request:', err.message);
        return true; // fail-open: allow on DB error
    }
}

module.exports = { checkRateLimit };

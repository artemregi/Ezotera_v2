'use strict';

/**
 * POST /api/palmistry/upload
 *
 * Receives hand detection metadata from client-side ml5.js,
 * generates a personalized reading, stores it in DB,
 * and returns the preview text + session_id.
 *
 * NOTE: We do NOT store the actual image server-side.
 * The client does hand detection locally (ml5.js) and sends only:
 *   - handScore (confidence 0-1)
 *   - sessionId (client-generated UUID)
 *   - optional user context (name, gender, focusArea)
 *
 * This keeps costs zero, images private, and speed instant.
 */

const { pool }               = require('../../lib/db');
const { checkRateLimit }     = require('../../lib/rateLimit');
const { extractTokenFromCookies, verifyToken } = require('../../lib/auth');
const { generateReading }    = require('../../lib/palmistry-generator');
const crypto                 = require('crypto');

module.exports = async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin',  req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // --- Rate limiting: 5 analyses per hour per IP ---
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim()
                  || req.connection?.remoteAddress
                  || 'unknown';

    if (!checkRateLimit(`palm:${clientIp}`, 5, 60)) {
        return res.status(429).json({
            success: false,
            message: 'Слишком много запросов. Попробуйте через час.'
        });
    }

    // --- Validate body ---
    const {
        sessionId,
        handScore   = 0.7,
        name,
        gender,
        focusArea,
    } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 128) {
        return res.status(400).json({ success: false, message: 'Неверный sessionId' });
    }

    // Sanitize sessionId — only alphanumeric + hyphens
    if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
        return res.status(400).json({ success: false, message: 'Неверный формат sessionId' });
    }

    const score = Math.min(1, Math.max(0, parseFloat(handScore) || 0.7));

    // --- Optionally identify user from JWT cookie ---
    let userId = null;
    try {
        const token = extractTokenFromCookies(req);
        if (token) {
            const decoded = verifyToken(token);
            if (decoded?.userId) userId = decoded.userId;
        }
    } catch (_) { /* anonymous is fine */ }

    // --- Check if session already exists (idempotent) ---
    try {
        const existing = await pool.query(
            'SELECT session_id, preview_text, paid_at FROM public.palm_analyses WHERE session_id = $1',
            [sessionId]
        );

        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            // Increment refresh count for abuse tracking
            await pool.query(
                'UPDATE public.palm_analyses SET refresh_count = refresh_count + 1 WHERE session_id = $1',
                [sessionId]
            );
            return res.status(200).json({
                success:   true,
                sessionId: row.session_id,
                preview:   row.preview_text,
                isPaid:    !!row.paid_at,
            });
        }
    } catch (err) {
        console.error('[palmistry/upload] DB check error:', err.message);
        // Continue — will try to insert
    }

    // --- Generate reading ---
    const { preview, full } = generateReading({
        sessionId,
        name:      typeof name      === 'string' ? name.slice(0, 100)     : null,
        gender:    typeof gender    === 'string' ? gender.slice(0, 20)    : null,
        focusArea: typeof focusArea === 'string' ? focusArea.slice(0, 50) : null,
        handScore: score,
    });

    // --- Hash IP for storage (privacy) ---
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex');

    // --- Store in DB ---
    try {
        const seedData = {
            name:      name      || null,
            gender:    gender    || null,
            focusArea: focusArea || null,
        };

        await pool.query(
            `INSERT INTO public.palm_analyses
             (session_id, user_id, preview_text, full_text, hand_score, seed_data, ip_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (session_id) DO NOTHING`,
            [sessionId, userId, preview, full, score, JSON.stringify(seedData), ipHash]
        );
    } catch (err) {
        console.error('[palmistry/upload] DB insert error:', err.message);
        // Still return generated text even if DB fails — graceful degradation
    }

    return res.status(200).json({
        success:   true,
        sessionId,
        preview,
        isPaid:    false,
    });
};

'use strict';

/**
 * POST /api/palmistry/unlock
 *
 * Checks payment status for a session and returns full reading.
 * Currently: payment_stub mode (any request unlocks for demo).
 * Production: integrate Stripe / YooKassa webhook that marks paid_at.
 *
 * Security:
 * - Full text is NEVER sent to client until payment confirmed server-side
 * - No localStorage flags — all state in DB
 * - Session ID cannot be guessed (client generates UUID v4)
 */

const { pool }           = require('../../lib/db');
const { checkRateLimit } = require('../../lib/rateLimit');

// ---------------------------------------------------------------------------
// PAYMENT STUB — Replace this function when integrating real payment
// ---------------------------------------------------------------------------
async function verifyPayment(sessionId, paymentToken) {
    // TODO: Replace with real payment provider verification
    // Example for Stripe:
    //   const session = await stripe.checkout.sessions.retrieve(paymentToken);
    //   return session.payment_status === 'paid' && session.metadata.sessionId === sessionId;
    //
    // Example for YooKassa:
    //   const payment = await yookassa.getPayment(paymentToken);
    //   return payment.status === 'succeeded';
    //
    // For now: stub — mark as paid immediately (demo mode)
    return true;
}
// ---------------------------------------------------------------------------

module.exports = async (req, res) => {
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

    // Rate limit: 10 unlock attempts per hour per IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim()
                  || req.connection?.remoteAddress
                  || 'unknown';

    if (!checkRateLimit(`palm-unlock:${clientIp}`, 10, 60)) {
        return res.status(429).json({ success: false, message: 'Слишком много запросов.' });
    }

    const { sessionId, paymentToken } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
        return res.status(400).json({ success: false, message: 'Неверный sessionId' });
    }

    // --- Look up session ---
    let row;
    try {
        const result = await pool.query(
            'SELECT session_id, full_text, paid_at FROM public.palm_analyses WHERE session_id = $1',
            [sessionId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Сессия не найдена. Загрузите фото заново.' });
        }
        row = result.rows[0];
    } catch (err) {
        console.error('[palmistry/unlock] DB error:', err.message);
        return res.status(500).json({ success: false, message: 'Ошибка сервера. Попробуйте позже.' });
    }

    // --- Already paid? Return immediately ---
    if (row.paid_at) {
        return res.status(200).json({
            success:  true,
            fullText: row.full_text,
        });
    }

    // --- Verify payment ---
    const isPaid = await verifyPayment(sessionId, paymentToken || '');
    if (!isPaid) {
        return res.status(402).json({ success: false, message: 'Оплата не подтверждена.' });
    }

    // --- Mark as paid ---
    try {
        await pool.query(
            'UPDATE public.palm_analyses SET paid_at = CURRENT_TIMESTAMP WHERE session_id = $1',
            [sessionId]
        );
    } catch (err) {
        console.error('[palmistry/unlock] DB update error:', err.message);
        // Still return full text — payment was confirmed
    }

    return res.status(200).json({
        success:  true,
        fullText: row.full_text,
    });
};

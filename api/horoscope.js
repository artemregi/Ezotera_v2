const { pool } = require('../lib/db');

module.exports = async (req, res) => {
    // CORS
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const result = await pool.query(
            `SELECT data FROM horoscopes ORDER BY created_at DESC LIMIT 1`
        );

        if (result.rows.length === 0) {
            // Fallback to static file
            const fs = require('fs');
            const path = require('path');
            const file = path.join(__dirname, '../ezotera-frontend/horoscope-data.json');
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                return res.status(200).json(data);
            } catch {
                return res.status(404).json({ error: 'No horoscope data available' });
            }
        }

        res.status(200).json(result.rows[0].data);
    } catch (err) {
        console.error('Horoscope fetch error:', err.message);
        // Fallback to static file on DB error
        try {
            const fs = require('fs');
            const path = require('path');
            const file = path.join(__dirname, '../ezotera-frontend/horoscope-data.json');
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            return res.status(200).json(data);
        } catch {
            res.status(500).json({ error: 'Failed to load horoscope data' });
        }
    }
};

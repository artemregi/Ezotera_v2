const https = require('https');
const { pool } = require('../../lib/db');

// Allow up to 60s for OpenAI generation (Hobby plan max)
module.exports.maxDuration = 60;

/**
 * Vercel Cron Job — Weekly Horoscope Generator
 * Runs every Monday at 03:00 UTC
 * Uses OpenAI GPT-4o to generate horoscopes, stores in Supabase
 */
module.exports = async (req, res) => {
    // Verify cron secret (Vercel sends this header for cron jobs)
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const weekRange = getWeekRange();
        const moonPhase = getMoonPhase();
        const now = new Date().toISOString();

        console.log('[CRON] Generating horoscopes for:', weekRange);

        // Ensure table exists before any queries
        await pool.query(`
            CREATE TABLE IF NOT EXISTS horoscopes (
                id SERIAL PRIMARY KEY,
                data JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Check if we already have data for this week
        const existing = await pool.query(
            `SELECT id FROM horoscopes WHERE data->>'weekRange' = $1`,
            [weekRange]
        );
        if (existing.rows.length > 0) {
            console.log('[CRON] Horoscopes already exist for this week');
            return res.status(200).json({ message: 'Already generated', weekRange });
        }

        // Generate via OpenAI
        const prompt = buildPrompt(weekRange, moonPhase, now);
        const raw = await callOpenAI(prompt);

        // Parse JSON
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in AI response');

        const data = JSON.parse(jsonMatch[0]);

        // Validate
        const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
        if (!data.signs || !data.weekRange) throw new Error('Invalid horoscope structure');
        for (const s of signs) {
            if (!data.signs[s]) throw new Error('Missing sign: ' + s);
        }

        // Save to DB
        await pool.query(
            `INSERT INTO horoscopes (data) VALUES ($1)`,
            [JSON.stringify(data)]
        );

        console.log('[CRON] Horoscopes saved for:', weekRange);

        // Send Telegram notification
        try {
            await sendTelegramNotification(weekRange);
        } catch (e) {
            console.warn('[CRON] Telegram notification failed:', e.message);
        }

        res.status(200).json({ success: true, weekRange, moonPhase });

    } catch (err) {
        console.error('[CRON] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const ruMonths = [
        'января','февраля','марта','апреля','мая','июня',
        'июля','августа','сентября','октября','ноября','декабря'
    ];
    const fmt = d => `${d.getDate()} ${ruMonths[d.getMonth()]}`;
    return `${fmt(monday)} — ${fmt(sunday)} ${sunday.getFullYear()}`;
}

function getMoonPhase() {
    const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const synodicMs = 29.53058867 * 24 * 3600 * 1000;
    const elapsed = (Date.now() - knownNewMoon) % synodicMs;
    const fraction = elapsed / synodicMs;

    if (fraction < 0.03 || fraction >= 0.97) return 'Новолуние';
    if (fraction < 0.22) return 'Растущий серп';
    if (fraction < 0.28) return 'Первая четверть';
    if (fraction < 0.47) return 'Растущая луна';
    if (fraction < 0.53) return 'Полнолуние';
    if (fraction < 0.72) return 'Убывающая луна';
    if (fraction < 0.78) return 'Последняя четверть';
    return 'Убывающий серп';
}

function buildPrompt(weekRange, moonPhase, now) {
    return `Ты опытный астролог с 20-летним опытом. Составь детальный гороскоп на неделю (${weekRange}) для всех 12 знаков зодиака на русском языке. Обращение к читателю — на «Вы» с заглавной буквы.

Учитывай реальные астрологические события: текущие транзиты планет, ретроградности, аспекты. Сделай каждый гороскоп уникальным, содержательным и реалистичным. Не используй клише. Не используй эмодзи.

Для каждого знака напиши:
- general: общий прогноз (4-5 предложений, с упоминанием планет)
- love: прогноз в любви (2-3 предложения)
- career: прогноз в карьере и финансах (2-3 предложения)
- health: прогноз в здоровье (1-2 предложения)
- advice: главный совет недели (1 яркое предложение)
- luckyDays: массив из 2 дней (например ["Вторник", "Пятница"])
- luckyNumber: число удачи (1-99)
- luckyColor: цвет удачи (1-2 слова)
- energy: уровень энергии 1-10

Также:
- weeklyTip: главное астрологическое событие недели и совет (3-4 предложения)
- planetaryEvents: массив из 2-3 ключевых событий

Верни ТОЛЬКО валидный JSON:

{
  "weekRange": "${weekRange}",
  "generatedAt": "${now}",
  "moonPhase": "${moonPhase}",
  "weeklyTip": "...",
  "planetaryEvents": ["...", "..."],
  "signs": {
    "aries": { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 5, "luckyColor": "...", "energy": 8 },
    "taurus": { ... },
    "gemini": { ... },
    "cancer": { ... },
    "leo": { ... },
    "virgo": { ... },
    "libra": { ... },
    "scorpio": { ... },
    "sagittarius": { ... },
    "capricorn": { ... },
    "aquarius": { ... },
    "pisces": { ... }
  }
}`;
}

function callOpenAI(prompt) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return reject(new Error('OPENAI_API_KEY not set'));

        const body = JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 8192,
            temperature: 0.8
        });

        const req = https.request({
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(body)
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`OpenAI API error ${res.statusCode}: ${data.substring(0, 300)}`));
                }
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.choices[0].message.content);
                } catch (e) {
                    reject(new Error('Failed to parse OpenAI response'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function sendTelegramNotification(weekRange) {
    return new Promise((resolve, reject) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!token || !chatId) return resolve();

        const text = `[Horoscope] Generated for: ${weekRange}`;
        const body = JSON.stringify({ chat_id: chatId, text });

        const req = https.request({
            hostname: 'api.telegram.org',
            path: `/bot${token}/sendMessage`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

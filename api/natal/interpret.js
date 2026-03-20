'use strict';

/**
 * POST /api/natal/interpret
 * Generates AI interpretation of a natal chart.
 * Primary: DeepSeek API (DEEPSEEK_API_KEY)
 * Fallback: Claude API (ANTHROPIC_API_KEY)
 * If both fail: returns a structured template interpretation.
 */

const https = require('https');

function httpsPost(hostname, path, headers, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        };
        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch (e) { reject(new Error('JSON parse error: ' + raw.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(data);
        req.end();
    });
}

function buildPrompt(payload) {
    const { name, birthDate, birthTime, birthCity, asc, mc, planets, aspects } = payload;

    const planetsList = planets.map(p =>
        `  • ${p.name}: ${p.sign} ${p.deg}, ${p.house} дом`
    ).join('\n');

    const aspectsList = aspects.slice(0, 12).map(a =>
        `  • ${a.p1} ${a.aspect} ${a.p2} (орб ${a.orb}°)`
    ).join('\n');

    return `Ты — опытный астролог-аналитик. Составь развёрнутую, но структурированную интерпретацию натальной карты.

Данные рождения:
- Имя: ${name || 'не указано'}
- Дата: ${birthDate}
- Время: ${birthTime}
- Место: ${birthCity}
- Асцендент: ${asc.sign} ${asc.deg}
- MC (Зенит): ${mc.sign} ${mc.deg}

Планеты:
${planetsList}

Аспекты:
${aspectsList || '(нет значимых аспектов)'}

Напиши интерпретацию в следующем формате (используй ### для заголовков):

### Общий портрет личности
(2–3 абзаца о ключевой энергии — Солнце, Луна, Асцендент)

### Эмоциональный мир и отношения
(Луна, Венера, 7-й дом — как человек чувствует, строит связи)

### Карьера и жизненное призвание
(МС, 10-й дом, Юпитер, Сатурн — призвание и реализация)

### Сильные стороны
(список из 3–5 пунктов)

### Вызовы и области роста
(список из 2–4 пунктов)

### Ключевые темы ближайшего периода
(2–3 абзаца о тенденциях на основе аспектов)

Пиши по-русски, профессионально, без мистики. Не используй слова «магия», «заклинание», «ритуал». Стиль — аналитический коуч, не гадалка. Ограничение: 700–900 слов.`;
}

async function callDeepSeek(prompt) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('No DEEPSEEK_API_KEY');

    const result = await httpsPost(
        'api.deepseek.com',
        '/chat/completions',
        { Authorization: `Bearer ${apiKey}` },
        {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1200,
            temperature: 0.75
        }
    );

    if (result.status !== 200) throw new Error('DeepSeek error: ' + result.status);
    return result.body.choices[0].message.content;
}

async function callClaude(prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No ANTHROPIC_API_KEY');

    const result = await httpsPost(
        'api.anthropic.com',
        '/v1/messages',
        {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        {
            model: 'claude-sonnet-4-6',
            max_tokens: 1200,
            messages: [{ role: 'user', content: prompt }]
        }
    );

    if (result.status !== 200) throw new Error('Claude error: ' + result.status);
    return result.body.content[0].text;
}

function templateInterpretation(payload) {
    const { planets, asc, mc, name } = payload;
    const sun = planets.find(p => p.name === 'Солнце');
    const moon = planets.find(p => p.name === 'Луна');
    const venus = planets.find(p => p.name === 'Венера');
    const saturn = planets.find(p => p.name === 'Сатурн');

    let text = '';
    if (sun) {
        text += `### Общий портрет личности\n\n`;
        text += `Солнце в **${sun.sign}** (${sun.house} дом) — стержневая энергия этой карты. `;
        text += `Человек с таким Солнцем стремится к самовыражению через качества, присущие ${sun.sign}у. `;
    }
    if (moon) {
        text += `Луна в **${moon.sign}** (${moon.house} дом) указывает на эмоциональный фон — `;
        text += `интуитивные реакции и внутренние потребности во многом определяются природой этого знака.\n\n`;
    }
    text += `Асцендент в **${asc.sign}** формирует внешнюю манеру и первое впечатление. `;
    text += `Это «маска», через которую мир воспринимает личность.\n\n`;

    if (venus) {
        text += `### Эмоциональный мир и отношения\n\n`;
        text += `Венера в **${venus.sign}** (${venus.house} дом) указывает на стиль привязанности и ценности в отношениях. `;
        text += `Важна гармония, выраженная через призму качеств ${venus.sign}а.\n\n`;
    }

    text += `### Карьера и жизненное призвание\n\n`;
    text += `MC в **${mc.sign}** задаёт направление профессиональной реализации. `;
    if (saturn) {
        text += `Сатурн в **${saturn.sign}** (${saturn.house} дом) добавляет структуру и дисциплину в путь к целям. `;
    }
    text += `\n\n`;

    text += `### Ключевые темы\n\n`;
    text += `Натальная карта отражает уникальное сочетание энергий и тенденций. `;
    text += `Для углублённой персональной интерпретации рекомендуется индивидуальная консультация специалиста.\n\n`;
    text += `**Примечание:** Данная интерпретация носит информационный характер и предназначена для самопознания.`;

    return text;
}

module.exports = async function interpretHandler(req, res) {
    if (req.method !== 'POST') {
        res.writeHead(405);
        return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
    }

    const payload = req.body;

    if (!payload || !payload.birthDate) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, message: 'birthDate required' }));
    }

    const prompt = buildPrompt(payload);
    let interpretation = null;
    let source = 'template';

    // Try DeepSeek first
    try {
        interpretation = await callDeepSeek(prompt);
        source = 'deepseek';
        console.log('✅ Natal interpretation via DeepSeek');
    } catch (e1) {
        console.warn('DeepSeek failed:', e1.message);

        // Fallback to Claude
        try {
            interpretation = await callClaude(prompt);
            source = 'claude';
            console.log('✅ Natal interpretation via Claude');
        } catch (e2) {
            console.warn('Claude failed:', e2.message);
            // Use template
            interpretation = templateInterpretation(payload);
            source = 'template';
            console.log('ℹ️ Using template interpretation');
        }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        interpretation,
        source
    }));
};

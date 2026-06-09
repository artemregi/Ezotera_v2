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

    return `Ты — опытный астролог-консультант с 15-летним стажем. Твоя задача — составить персональную интерпретацию натальной карты, которая:
1) Поражает клиента точностью и глубиной
2) Дает ценные практические инсайты
3) Мотивирует узнать больше и заказать полную консультацию

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

Напиши интерпретацию в следующем формате (используй ### для заголовков). Обращайся к клиенту на «Вы» по имени (если указано).

### ✨ Ваш уникальный портрет
(3 абзаца. Начни с яркого, запоминающегося описания ключевой энергии — Солнце, Луна, Асцендент. Покажи, в чём уникальность именно этой комбинации. Используй конкретные, узнаваемые примеры из жизни: «Вы из тех людей, кто...», «Окружающие замечают в Вас...»)

### 💫 Таланты и суперсилы
(Список 4–6 пунктов с конкретными талантами. Каждый пункт — жирный заголовок + 1 предложение пояснения. Основывайся на аспектах и положениях планет. Будь конкретен: не «хорошая интуиция», а «способность считывать настроение группы и направлять его»)

### ❤️ Любовь и отношения
(2–3 абзаца. Венера, Луна, 7-й дом. Какой партнёр идеален? Что важно в отношениях? Какие паттерны могут повторяться? Дай один конкретный совет.)

### 💼 Призвание и деньги
(2–3 абзаца. МС, 2-й/10-й дом, Юпитер, Сатурн. Где клиент может зарабатывать больше всего? Какая сфера раскроет потенциал? Какой стиль работы подходит — команда или соло, креатив или система?)

### ⚡ Точки роста
(Список 3–4 пунктов. Мягко, но честно опиши зоны развития. Каждый пункт — вызов + как его преодолеть. Тон: поддерживающий наставник, не критик.)

### 🔮 Тенденции ближайшего периода
(2 абзаца на основе текущих аспектов. Что ожидать? На что обратить внимание? Закончи интригующе — намекни, что полная консультация раскроет более детальный прогноз на конкретные месяцы.)

ВАЖНЫЕ ПРАВИЛА:
- Пиши по-русски, тёплым, но профессиональным тоном
- Не используй слова «магия», «заклинание», «ритуал», «судьба предопределена»
- Стиль: мудрый наставник, который раскрывает потенциал клиента
- Будь конкретен и детален — избегай общих фраз типа «Вы творческий человек»
- Каждый раздел должен содержать информацию, которую клиент захочет перечитать и переслать друзьям
- Объём: 900–1200 слов`;
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
            max_tokens: 2000,
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
            max_tokens: 2000,
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
    const mars = planets.find(p => p.name === 'Марс');
    const jupiter = planets.find(p => p.name === 'Юпитер');
    const saturn = planets.find(p => p.name === 'Сатурн');
    const greeting = name ? `${name}, ` : '';

    let text = '';

    text += `### ✨ Ваш уникальный портрет\n\n`;
    if (sun) {
        text += `${greeting}Солнце в **${sun.sign}** (${sun.house} дом) — это стержень Вашей личности. `;
        text += `Вы несёте в себе энергию ${sun.sign}а, которая определяет Вашу жизненную мотивацию и то, как Вы проявляетесь в мире. `;
    }
    if (moon) {
        text += `Луна в **${moon.sign}** (${moon.house} дом) раскрывает Ваш внутренний мир — именно здесь живут Ваши глубинные потребности, интуиция и эмоциональные реакции. `;
    }
    text += `Асцендент в **${asc.sign}** формирует первое впечатление, которое Вы производите — это Ваша «визитная карточка» при знакомстве.\n\n`;

    text += `### 💫 Таланты и суперсилы\n\n`;
    if (sun) text += `- **Природная энергия ${sun.sign}а** — Ваша способность вдохновлять и вести за собой\n`;
    if (moon) text += `- **Эмоциональный интеллект** — глубокое понимание чувств благодаря Луне в ${moon.sign}е\n`;
    if (jupiter) text += `- **Удача и рост** — Юпитер в ${jupiter.sign}е (${jupiter.house} дом) открывает возможности для расширения\n`;
    if (mars) text += `- **Движущая сила** — Марс в ${mars.sign}е (${mars.house} дом) дает решительность и энергию действия\n`;
    text += `\n`;

    if (venus) {
        text += `### ❤️ Любовь и отношения\n\n`;
        text += `Венера в **${venus.sign}** (${venus.house} дом) определяет Ваш стиль любви. `;
        text += `Вы цените в партнёре качества, связанные с энергией ${venus.sign}а, и сами проявляете любовь именно через эту призму.\n\n`;
    }

    text += `### 💼 Призвание и деньги\n\n`;
    text += `MC в **${mc.sign}** указывает направление Вашей профессиональной реализации. `;
    if (saturn) {
        text += `Сатурн в **${saturn.sign}** (${saturn.house} дом) добавляет дисциплину и системность — со временем Ваши усилия приносят всё более весомые результаты. `;
    }
    text += `\n\n`;

    text += `### 🔮 Что дальше?\n\n`;
    text += `Это лишь верхушка айсберга. Ваша натальная карта содержит десятки нюансов, которые раскрываются при детальном разборе — `;
    text += `скрытые таланты, оптимальные периоды для ключевых решений, совместимость с партнёром и многое другое. `;
    text += `**Индивидуальная консультация** с экспертом Esoterra поможет увидеть полную картину и получить конкретные рекомендации.`;

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

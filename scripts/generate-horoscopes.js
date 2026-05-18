#!/usr/bin/env node
/**
 * Weekly Horoscope Generator — Esoterra
 * Calls Claude API and writes horoscope-data.json
 * Run: ANTHROPIC_API_KEY=... node scripts/generate-horoscopes.js
 */

const https = require('https');
const fs   = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY environment variable is not set');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekRange() {
  const now    = new Date();
  const day    = now.getDay(); // 0=Sun … 6=Sat
  const diff   = day === 0 ? -6 : 1 - day; // offset to Monday
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
  // Approximate moon phase by synodic period (29.53 days) from a known new moon
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const synodicMs    = 29.53058867 * 24 * 3600 * 1000;
  const elapsed      = (Date.now() - knownNewMoon) % synodicMs;
  const fraction     = elapsed / synodicMs;

  if (fraction < 0.03 || fraction >= 0.97) return 'Новолуние 🌑';
  if (fraction < 0.22) return 'Растущий серп 🌒';
  if (fraction < 0.28) return 'Первая четверть 🌓';
  if (fraction < 0.47) return 'Растущая луна 🌔';
  if (fraction < 0.53) return 'Полнолуние 🌕';
  if (fraction < 0.72) return 'Убывающая луна 🌖';
  if (fraction < 0.78) return 'Последняя четверть 🌗';
  return 'Убывающий серп 🌘';
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });

    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length':    Buffer.byteLength(body)
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Claude API error ${res.statusCode}: ${data}`));
          }
          try {
            resolve(JSON.parse(data).content[0].text);
          } catch (e) {
            reject(new Error('Failed to parse Claude response: ' + data.slice(0, 300)));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const weekRange = getWeekRange();
  const moonPhase = getMoonPhase();
  const now       = new Date().toISOString();

  console.log(`🔮  Generating horoscopes for: ${weekRange}`);
  console.log(`🌙  Moon phase: ${moonPhase}`);

  const prompt = `Ты опытный астролог с 20-летним опытом. Составь детальный гороскоп на неделю (${weekRange}) для всех 12 знаков зодиака на русском языке. Обращение к читателю — на «Вы» с заглавной буквы.

Учитывай реальные астрологические события: текущие транзиты планет, ретроградности, аспекты. Сделай каждый гороскоп уникальным, содержательным и реалистичным. Не используй клише — каждый знак должен получить разный прогноз.

Для каждого знака напиши:
- general: общий прогноз на неделю (4-5 предложений, конкретно, с упоминанием планет)
- love: прогноз в любви и отношениях (2-3 предложения)
- career: прогноз в карьере и финансах (2-3 предложения)
- health: прогноз в здоровье и энергетике (1-2 предложения)
- advice: главный совет недели (1 яркое, мотивирующее предложение)
- luckyDays: массив из 2 лучших дней недели (например ["Вторник", "Пятница"])
- luckyNumber: число удачи (целое число 1-99)
- luckyColor: цвет удачи (1-2 слова)
- energy: уровень энергии от 1 до 10 (целое число)

Также напиши:
- weeklyTip: главное астрологическое событие недели и общий совет для всех знаков (3-4 предложения)
- planetaryEvents: массив из 2-3 строк с ключевыми астрологическими событиями недели

Верни ТОЛЬКО валидный JSON без markdown, без пояснений, без \`\`\`:

{
  "weekRange": "${weekRange}",
  "generatedAt": "${now}",
  "moonPhase": "${moonPhase}",
  "weeklyTip": "...",
  "planetaryEvents": ["...", "..."],
  "signs": {
    "aries":       { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 5, "luckyColor": "...", "energy": 8 },
    "taurus":      { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 3, "luckyColor": "...", "energy": 7 },
    "gemini":      { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 9, "luckyColor": "...", "energy": 6 },
    "cancer":      { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 2, "luckyColor": "...", "energy": 7 },
    "leo":         { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 1, "luckyColor": "...", "energy": 9 },
    "virgo":       { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 6, "luckyColor": "...", "energy": 7 },
    "libra":       { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 7, "luckyColor": "...", "energy": 8 },
    "scorpio":     { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 8, "luckyColor": "...", "energy": 9 },
    "sagittarius": { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 3, "luckyColor": "...", "energy": 8 },
    "capricorn":   { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 4, "luckyColor": "...", "energy": 6 },
    "aquarius":    { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 11, "luckyColor": "...", "energy": 8 },
    "pisces":      { "general": "...", "love": "...", "career": "...", "health": "...", "advice": "...", "luckyDays": ["...", "..."], "luckyNumber": 7, "luckyColor": "...", "energy": 7 }
  }
}`;

  const raw = await callClaude(prompt);

  // Extract JSON block (Claude sometimes wraps with ```)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response:\n' + raw.slice(0, 500));

  let data;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error('JSON parse error: ' + e.message + '\nRaw:\n' + jsonMatch[0].slice(0, 300));
  }

  // Basic validation
  const required = ['weekRange','generatedAt','moonPhase','weeklyTip','signs'];
  for (const key of required) {
    if (!data[key]) throw new Error(`Missing field in response: ${key}`);
  }
  const signsNeeded = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  for (const sign of signsNeeded) {
    if (!data.signs[sign]) throw new Error(`Missing sign: ${sign}`);
  }

  // Write file
  const outPath = path.join(__dirname, '../ezotera-frontend/horoscope-data.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`✅  Saved to horoscope-data.json`);
  console.log(`📅  Week: ${data.weekRange}`);
  console.log(`🌙  Moon: ${data.moonPhase}`);
  console.log(`📝  Weekly tip: ${data.weeklyTip.slice(0, 80)}…`);
}

main().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});

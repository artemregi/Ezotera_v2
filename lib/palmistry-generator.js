/**
 * Palmistry Text Generator
 * Hybrid B+C approach: personalized Barnum-effect readings
 * Uses seed data (name, gender, focus area) + hand score for consistent,
 * emotionally resonant, positive results.
 *
 * Design principles:
 * - All results are positive, hope-giving, empowering
 * - Specific enough to feel personal, universal enough to resonate
 * - Consistent: same session_id always returns same text
 * - No hardcoded single text — algorithm selects from weighted pools
 * - 30 variations per life area (love, career, destiny) to prevent family repetition
 */

'use strict';

// Import life readings with 30 variations each
const { LOVE_READINGS, CAREER_READINGS, DESTINY_READINGS } = require('./palmistry-readings');

// ---------------------------------------------------------------------------
// Seeded pseudo-random (deterministic per session)
// ---------------------------------------------------------------------------
function seededRandom(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) {
        s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return function () {
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        return (s >>> 0) / 0xFFFFFFFF;
    };
}

function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}

function pickN(arr, n, rng) {
    const shuffled = [...arr].sort(() => rng() - 0.5);
    return shuffled.slice(0, n);
}

// ---------------------------------------------------------------------------
// Content pools
// ---------------------------------------------------------------------------

const LINE_TRAITS = {
    life: [
        'линия жизни у вас глубокая и чёткая — это признак человека с большим внутренним ресурсом',
        'ваша линия жизни имеет характерный изгиб, который говорит о способности восстанавливаться после любых трудностей',
        'линия жизни проходит широкой дугой — это редкий знак природной устойчивости и жизненной силы',
    ],
    heart: [
        'линия сердца у вас длинная и плавная — вы способны на глубокую, настоящую любовь',
        'ваша линия сердца говорит об эмоциональной зрелости: вы чувствуете глубоко, но умеете держать баланс',
        'особый изгиб линии сердца указывает на вашу способность прощать и двигаться вперёд с открытым сердцем',
    ],
    head: [
        'линия головы у вас длинная и ровная — признак аналитического ума с сильной интуицией',
        'ваша линия головы немного наклонена книзу, что говорит о развитом творческом мышлении',
        'линия головы пересекает ладонь уверенно — это признак человека, чьи решения часто оказываются правильными',
    ],
    fate: [
        'линия судьбы выражена отчётливо — ваш путь имеет чёткое направление, даже когда вам кажется иначе',
        'линия судьбы начинается у основания ладони и тянется вверх — классический признак человека, который сам строит свою жизнь',
        'особенности линии судьбы говорят о том, что лучшие ваши главы — ещё впереди',
    ],
};

// Полные предложения — для preview (после heartTrait)
const EMOTIONAL_TRAITS = [
    'В вас живёт глубокая чувствительность, которую вы скрываете от большинства людей',
    'У вас сильная внутренняя интуиция — вы не всегда ей доверяете, но она редко ошибается',
    'Вы умеете видеть людей насквозь — это дар, который вы порой принимаете за должное',
    'Вам свойственна редкая эмпатия, которая делает вас опорой для тех, кто вам дорог',
    'Вас отличает природная мудрость, которая часто удивляет даже вас самих',
];

// Творительный падеж — для вставки в "человек с [trait]"
const EMOTIONAL_TRAITS_INSTR = [
    'глубокой чувствительностью и тонким восприятием мира',
    'сильной внутренней интуицией, которой стоит доверять',
    'редкой способностью видеть суть людей и ситуаций',
    'природной эмпатией и умением поддерживать других',
    'внутренней мудростью, опережающей жизненный опыт',
];

const INNER_CONFLICT_POSITIVE = [
    'вы чувствовали, что топчетесь на месте — но это была не стагнация, а накопление энергии перед прорывом',
    'порой вы сомневаетесь в себе сильнее, чем следует: ваши способности превышают то, что вы о себе думаете',
    'вы привыкли ставить других на первое место, но ладонь говорит: сейчас время уделить внимание себе',
    'внутреннее противоречие, которое вы ощущаете — это не слабость, а признак человека, который растёт',
    'вы чувствовали, что чего-то не хватает. Это ощущение — компас, указывающий в сторону вашей настоящей силы',
];

const HIDDEN_POTENTIAL = [
    'в вашей ладони прослеживается незадействованный творческий потенциал — возможно, в сфере, о которой вы давно думаете',
    'знак на бугре Венеры указывает на способность к глубокому влиянию на людей вокруг вас',
    'структура пальцев и соотношение линий говорит о природной предрасположенности к лидерству — тихому, но реальному',
    'ваши руки несут отпечаток человека, чей потенциал раскрывается постепенно — и самое лучшее ещё не случилось',
    'редкое пересечение линий указывает на способность находить решения там, где другие видят только проблемы',
];

const NEAR_FUTURE = [
    'ближайшие месяцы будут периодом, когда важные вещи встанут на свои места',
    'ладонь говорит о приближении важного цикла — времени, когда ваши усилия начнут давать видимые плоды',
    'впереди — период ясности. То, что казалось запутанным, начнёт обретать смысл',
    'признаки на ладони указывают на скорое улучшение в той сфере, которая вас беспокоила',
    'линии говорят о том, что вы входите в один из лучших периодов своей жизни',
];

// Note: LOVE_FULL, CAREER_FULL, DESTINY_FULL are now imported from palmistry-readings.js
// which contains 30 variations each for better personalization and to prevent
// family members from seeing identical readings

const CLOSING_PREVIEW = [
    'Это только начало вашего разбора. Полный анализ раскроет детали, которые изменят ваш взгляд на себя.',
    'Ваша ладонь хранит намного больше. Полный разбор покажет то, что невозможно передать в нескольких строках.',
    'Это — лишь верхний слой. В полном анализе вас ждут инсайты, которые объяснят то, что вы давно чувствовали.',
];

// ---------------------------------------------------------------------------
// Name personalization helpers
// ---------------------------------------------------------------------------
function getFeminineForm(name) {
    // Detect likely female name by ending
    if (!name) return false;
    const n = name.trim().toLowerCase();
    return n.endsWith('а') || n.endsWith('я') || n.endsWith('ь');
}

function genderAdjective(isFemale, male, female) {
    return isFemale ? female : male;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate palm reading texts for a session.
 * @param {object} opts
 * @param {string} opts.sessionId  - Unique session ID (used as seed)
 * @param {string} [opts.name]     - User's first name from onboarding
 * @param {string} [opts.gender]   - 'male' | 'female' | null
 * @param {string} [opts.focusArea] - 'love' | 'career' | 'destiny' | null
 * @param {number} [opts.handScore] - 0–1 float from client-side detection
 * @returns {{ preview: string, full: string }}
 */
function generateReading({ sessionId, name, gender, focusArea, handScore = 0.7 }) {
    const rng = seededRandom(sessionId || 'default');

    // Determine gender
    const isFemale = gender === 'female' || (gender == null && name ? getFeminineForm(name) : false);

    // Personal address
    const address = name ? name.trim().split(' ')[0] : null;
    const addressStr = address
        ? `${address}, в`
        : 'В';

    // Hand score bucket influences how "strong" lines are described
    const scoreAdj = handScore > 0.75
        ? 'очень чёткие и выразительные'
        : handScore > 0.5
            ? 'хорошо выраженные'
            : 'богатые по рисунку';

    // Pick line traits
    const lifeTrait  = pick(LINE_TRAITS.life,  rng);
    const heartTrait = pick(LINE_TRAITS.heart, rng);
    const headTrait  = pick(LINE_TRAITS.head,  rng);
    const fateTrait  = pick(LINE_TRAITS.fate,  rng);

    // Pick Barnum elements
    const emotionalTrait  = pick(EMOTIONAL_TRAITS,        rng);
    const conflict        = pick(INNER_CONFLICT_POSITIVE,  rng);
    const potential       = pick(HIDDEN_POTENTIAL,         rng);
    const nearFuture      = pick(NEAR_FUTURE,              rng);
    const closingPreview  = pick(CLOSING_PREVIEW,          rng);

    // ---- PREVIEW TEXT (free, ~150 words) ----
    const preview = [
        `${addressStr} вашей ладони — ${scoreAdj} линии. Анализ выявил несколько важных знаков.`,
        '',
        `Прежде всего: ${lifeTrait}. Это говорит о вашей природной способности справляться с тем, с чем другие не справляются.`,
        '',
        `${heartTrait}. ${emotionalTrait}.`,
        '',
        `Ладонь также говорит о том, что ${conflict}.`,
        '',
        `Ключевое открытие: ${potential}.`,
        '',
        `${nearFuture}.`,
        '',
        `— — —`,
        closingPreview,
    ].join('\n');

    // ---- FULL TEXT (paid, ~600 words) ----

    // Focus area: pick or default to all three
    // Now using 30 variations each to prevent family repetition
    const loveText    = pick(LOVE_READINGS,    rng);
    const careerText  = pick(CAREER_READINGS,  rng);
    const destinyText = pick(DESTINY_READINGS, rng);

    // Extra traits for full version (творительный падеж для "человек с [trait]")
    const [trait1, trait2] = pickN(EMOTIONAL_TRAITS_INSTR, 2, rng);
    const [pot1, pot2]     = pickN(HIDDEN_POTENTIAL,       2, rng);

    const fullNameStr = address ? `${address}` : 'Дорогой читатель';

    const full = [
        `## Персональный анализ ладони — полная версия`,
        '',
        `${fullNameStr}, перед вами — детальное прочтение вашей ладони. Всё, что написано ниже, отражает уникальный рисунок именно вашей руки.`,
        '',
        `### Линии и что они говорят`,
        '',
        `${lifeTrait.charAt(0).toUpperCase() + lifeTrait.slice(1)}.`,
        `${headTrait.charAt(0).toUpperCase() + headTrait.slice(1)}.`,
        `${fateTrait.charAt(0).toUpperCase() + fateTrait.slice(1)}.`,
        '',
        `Эти три линии в совокупности дают редкую картину: человек с ${trait1} и ${trait2}. Это сочетание встречается нечасто — и оно многое объясняет в вашем жизненном пути.`,
        '',
        `### Ваши скрытые ресурсы`,
        '',
        `${pot1.charAt(0).toUpperCase() + pot1.slice(1)}.`,
        `${pot2.charAt(0).toUpperCase() + pot2.slice(1)}.`,
        '',
        `Важно понять: то, что вы воспринимаете как обычное — часто является исключительным. Ваши природные данные работают даже тогда, когда вы сами в них сомневаетесь.`,
        '',
        `### Любовь и отношения`,
        '',
        loveText,
        '',
        `### Карьера и реализация`,
        '',
        careerText,
        '',
        `### Ваш путь и судьба`,
        '',
        destinyText,
        '',
        `### Ближайший период`,
        '',
        `${nearFuture.charAt(0).toUpperCase() + nearFuture.slice(1)}.`,
        '',
        `Ладонь указывает: вы находитесь в точке, где осознанные действия дают непропорционально большие результаты. Это не обещание лёгкого пути — это сигнал о том, что ваши усилия сейчас особенно ценны.`,
        '',
        `---`,
        `*Анализ основан на классических принципах хиромантии и персонализирован по рисунку вашей ладони. Используйте его как зеркало — для лучшего понимания себя.*`,
    ].join('\n');

    return { preview, full };
}

module.exports = { generateReading };

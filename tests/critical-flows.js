/**
 * Критические сценарии (API-level, без браузера).
 * Usage: node tests/critical-flows.js
 * Требует запущенный dev-server (api/dev-server.js) и локальную БД.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3001';

let passed = 0, failed = 0;
function ok(name, cond, extra) {
    if (cond) { passed++; console.log('  ✅ ' + name); }
    else { failed++; console.log('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
}

async function api(path, opts = {}, cookie) {
    const res = await fetch(BASE + path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
    });
    let body = null;
    try { body = await res.json(); } catch (e) { /* non-JSON */ }
    return { status: res.status, body, setCookie: res.headers.get('set-cookie') || '' };
}

(async () => {
    const uniq = Date.now();
    const email = `cf-${uniq}@test.local`;
    const password = 'TestPass1';

    console.log('\n== 1. Регистрация и аутентификация ==');
    let r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'CF Тест', email, password }) });
    ok('register 200/201 + success', (r.status === 200 || r.status === 201) && r.body?.success, `status=${r.status}`);

    r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    ok('login success + Set-Cookie auth_token', r.body?.success && r.setCookie.includes('auth_token'), `status=${r.status}`);
    const cookie = r.setCookie.split(';')[0];

    r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'WrongPass1' }) });
    ok('login с неверным паролем отклонён', r.status === 401 || r.body?.success === false);

    r = await api('/api/auth/verify', {}, cookie);
    ok('verify с cookie', r.status === 200 && r.body?.success);

    r = await api('/api/auth/verify', {});
    ok('verify без cookie → 401', r.status === 401);

    console.log('\n== 2. Onboarding + профиль (персистентность, формат даты) ==');
    r = await api('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
            user_gender: 'female', user_birth_date: '1995-06-15', user_birth_time: '12:30',
            user_birth_place: 'Москва', relationship_status: 'single',
            focus_areas: ['career', 'love'], zodiac_sign: 'Близнецы',
        }),
    }, cookie);
    ok('onboarding/complete success', r.status === 200 && r.body?.success);

    r = await api('/api/user/profile', {}, cookie);
    ok('profile birthDate строго YYYY-MM-DD без TZ-сдвига', r.body?.user?.birthDate === '1995-06-15', `got=${r.body?.user?.birthDate}`);
    ok('profile focusArea в CSV-формате (не PG-массив)', r.body?.user?.focusArea === 'career,love', `got=${r.body?.user?.focusArea}`);
    ok('profile zodiacSign рассчитан', r.body?.user?.zodiacSign === 'Близнецы', `got=${r.body?.user?.zodiacSign}`);

    console.log('\n== 3. Palmistry: платный контент защищён ==');
    const sid = `cf-palm-${uniq}`;
    r = await api('/api/palmistry/upload', { method: 'POST', body: JSON.stringify({ sessionId: sid, handScore: 0.8, name: 'CF' }) });
    ok('upload success + preview', r.body?.success && !!r.body?.preview);
    ok('upload не отдаёт полный текст (только teaser ≤400)', !r.body?.fullText && (r.body?.teaser || '').length <= 400);

    r = await api('/api/palmistry/unlock', { method: 'POST', body: JSON.stringify({ sessionId: sid }) });
    ok('unlock без оплаты → 402', r.status === 402);

    r = await api('/api/palmistry/unlock', { method: 'POST', body: JSON.stringify({ sessionId: sid, paymentToken: '111111' }) });
    ok('unlock с несуществующим платежом → 402', r.status === 402);

    console.log('\n== 4. Оплата: создание заказа ==');
    r = await api('/api/payment/create', { method: 'POST', body: JSON.stringify({ amount: 490, description: 'CF тест' }) });
    ok('payment/create возвращает paymentUrl + orderId', r.body?.success && !!r.body?.paymentUrl && !!r.body?.orderId);

    console.log('\n== 5. Админ: авторизация ==');
    r = await api('/api/admin/products', { method: 'POST', body: JSON.stringify({ name: 'X', price: 1 }) });
    ok('POST products анонимом → 401', r.status === 401);

    r = await api('/api/admin/products', { method: 'POST', body: JSON.stringify({ name: 'X', price: 1 }) }, cookie);
    ok('POST products не-админом → 403', r.status === 403);

    r = await api('/api/admin/content-cards', {});
    ok('GET content-cards анонимом → 200 (публичный)', r.status === 200 && r.body?.success);

    r = await api('/api/admin/horoscope', { method: 'PUT', body: JSON.stringify({ weekRange: 'x', signs: {} }) });
    ok('PUT horoscope анонимом → 401', r.status === 401);

    console.log('\n== 6. Публичные данные ==');
    r = await api('/api/horoscope', {});
    ok('GET /api/horoscope отдаёт weekRange', r.status === 200 && !!r.body?.weekRange);

    r = await api('/api/admin/products', {});
    ok('GET products (каталог) публичный', r.status === 200 && Array.isArray(r.body?.products));

    console.log('\n== 7. Logout ==');
    r = await api('/api/auth/logout', { method: 'POST' }, cookie);
    ok('logout success', r.status === 200 && r.body?.success);

    console.log(`\n=== ИТОГ: ${passed} passed, ${failed} failed ===`);
    process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

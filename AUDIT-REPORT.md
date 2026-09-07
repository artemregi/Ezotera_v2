# Аудит Ezotera_v2 — итоговый отчёт

Дата: 2026-09-04. Метод: исследование кода → локальный запуск (Docker Postgres + Mailpit + dev-server) → полный обход через Playwright (все 58 страниц, desktop + mobile 375px, каждая форма с проверкой персистентности через refresh) → исправления первопричин → регрессия.

## Состояние проекта

Стек: Vercel serverless (Node.js/CommonJS) + PostgreSQL (Supabase) + статический frontend (HTML/CSS/JS). Auth — JWT в HttpOnly cookie. Платежи — Robokassa (рабочая) и CloudPayments (сломан, см. BUG-010).

После аудита: **все Critical и High баги исправлены**, кроме двух, требующих данных от клиента (ключи CloudPayments). Автотесты: **21/21 passed**.

## Bug Inventory

### Critical — исправлены

| ID | Проблема | Первопричина | Исправление |
|----|----------|--------------|-------------|
| BUG-001 | Платный palmistry-контент отдавался бесплатно | Стаб `verifyPayment() → return true` в `api/palmistry/unlock.js` | Реальная проверка `payments.status='success'` по order_id. Без оплаты / с фейковым токеном → 402 |
| BUG-002 | Palm-анализы и гороскопы не сохранялись | Отсутствовали таблицы БД | Миграция `010_create_palm_analyses_and_horoscopes.sql` (palm_analyses, horoscopes) |
| BUG-003 | Кнопка разблокировки palmistry вела в никуда | Фронт ждал CloudPayments-виджет с плейсхолдер-ключом | `js/palmistry-upload.js`: переведён на Robokassa (`/api/payment/create` → redirect → restore-флоу через `localStorage.ezo_palm_pending`). Проверено E2E в браузере: после оплаты полный текст разблокируется автоматически |
| BUG-004 | GET content-cards требовал admin, ломая публичный сайт | `requireAdmin` на публичном чтении | `getAdminUser` (мягкая проверка) для GET, admin — только на запись |

### High — исправлены

| ID | Проблема | Исправление |
|----|----------|-------------|
| BUG-005 | birthDate сдвигалась на день (TZ) | `to_char(birth_date,'YYYY-MM-DD')` в `api/user/profile.js` |
| BUG-006 | focus_area сохранялась как PG-массив `{"career","love"}` | `join(',')` в `api/onboarding/complete.js` + миграция `011_normalize_focus_area.sql` для старых данных |
| BUG-007 | `/api/horoscope` не маршрутизировался в dev | Маршрут добавлен в `api/dev-server.js` |
| BUG-008 | Кириллические URL падали | `decodeURIComponent` в dev-server |
| BUG-009 | Гороскоп из админки не сохранялся в проде | `fs.writeFileSync` на read-only ФС Vercel. Теперь: PUT → INSERT в `horoscopes` (БД primary), файл — best-effort; GET — БД first, файл fallback |

### Не исправлены (нужны данные от клиента)

| ID | Severity | Проблема | Что нужно |
|----|----------|----------|-----------|
| BUG-010 | High | CloudPayments на pay.html неработоспособен: publicId = плейсхолдер `test_XXXX…`, `window.CP_CONFIG`/`USER_DATA` нигде не задаются | Реальный publicId от клиента. Не выдумывал — либо получить ключ, либо перевести pay.html на Robokassa (как palmistry) |
| BUG-011 | Medium | `CP_SECRET_KEY` не задан → HMAC-проверка CloudPayments-webhook пропускается | Секретный ключ CloudPayments в env |
| BUG-016 | Medium | Модалка заказа в shop не предзаполняет имя/email залогиненного юзера (дублирование ввода) | Мелкая UX-доработка, не трогал (вне Critical/High) |

### Регистрация/онбординг (вторая волна, по жалобе на повторы шагов) — исправлены

| ID | Severity | Проблема | Исправление |
|----|----------|----------|-------------|
| BUG-017 | High | Онбординг залогиненного падал с 500, если время рождения пропущено ('' в TIME-колонку) | `api/onboarding/complete.js`: пустые строки → NULL |
| BUG-018 | High | Имя, введённое в онбординге, не сохранялось у залогиненных (complete.js не обновлял name) | `SET name = COALESCE(...)` |
| BUG-019 | Medium | Дублирование: после регистрации (имя+email+пароль) онбординг снова спрашивал имя (шаг 1) | `auth/auth.js`: имя и email кладутся в данные онбординга, редирект сразу на шаг 2 |
| BUG-020 | Medium | Шаг 9: кнопка «Далее» уходила на шаг 10 без проверки чекбокса оферты; у залогиненных гонка checkAuth давала пинг-понг шаг 9↔10 («повторяются шаги») | Единый click-обработчик: всегда валидирует оферту; залогиненный завершает на месте, аноним идёт на шаг 10 |
| BUG-021 | Medium | Шаг 4 обещал «время необязательно», но пропустить было нельзя — чекбокса skip не было в HTML (JS его поддерживал) | Добавлен чекбокс «Я не знаю время рождения» в `step-4-birth-time.html` |
| BUG-022 | Low | Шаг 1 не подставлял имя из аккаунта залогиненному | Префилл из `/api/user/profile` |
| BUG-023 | Low | Мобильный прогресс на шаге 8: «Шаг 8 из 9» вместо «из 10» | Исправлен текст |

Регрессия: браузерный E2E (регистрация → шаг 2 сразу → все шаги, время пропущено → шаг 8 автопропуск → шаг 9 «Завершить» → dashboard) — все данные в профиле корректны (имя, дата, NULL-время, место, знак, интересы), localStorage очищен. API-тесты 21/21.

Осталось (не исправлено, дизайн-решение за владельцем): оферта принимается дважды (шаг 9 и шаг 10) у незалогиненных; у обычной регистрации свой чекбокс условий — тройное подтверждение по пути «регистрация → онбординг».

### Low — в списке, не критично

- BUG-012: `/api/users` в dev-server без авторизации (dev-only, на Vercel не деплоится)
- BUG-013: `alert()` вместо UI-уведомлений в нескольких местах
- BUG-014: console.log-шум в проде
- BUG-015: раздел «Блог» ведёт на coming-soon
- Минорные: favicon.ico 404; пункт «Браслеты» в мобильном бургер-меню выбивается из выравнивания; двойной 401 `/api/auth/verify` в консоли анонима (guard-скрипты дублируют запрос)

## Тесты

`tests/critical-flows.js` (API-level, `node tests/critical-flows.js`, нужен запущенный dev-server): **21/21 passed**
- Аутентификация: регистрация, логин, неверный пароль, verify с/без cookie, logout
- Onboarding → профиль: персистентность, формат даты YYYY-MM-DD, CSV focus_area, zodiac
- Palmistry: teaser ≤400 симв., полный текст не утекает, unlock без оплаты → 402
- Payment: create возвращает paymentUrl + orderId
- Admin authz: 401 аноним / 403 не-админ на запись, публичные GET открыты

`tests/crawl-audit.js` — регрессионный обход всех страниц: 404/500 нет; «broken-link» на dashboard — ложная тревога краулера (редирект на /auth/login.html, реальные пути отвечают 200); 401 на защищённых API для анонима — ожидаемое поведение.

Браузерная регрессия (Playwright MCP): регистрация→onboarding→dashboard, OTP-сброс пароля, natal (fallback-шаблон без AI-ключей), shop (создание товара админом → каталог → модалка заказа), полный palmistry-флоу с оплатой, admin CRUD (products/horoscope/referrals/content-cards), guard админки, мобильная 375px.

## Риски и что сделать перед продом

1. **Применить миграции 010 и 011 на Supabase** — без них palmistry и админ-гороскоп не работают в проде.
2. **CloudPayments**: получить у клиента publicId + secret key, либо перевести pay.html на Robokassa. Сейчас страница оплаты через CP нерабочая.
3. Robokassa: проверить, что в проде заданы `ROBOKASSA_*` env-переменные и ResultURL указывает на `/api/payment/result`.
4. Env: `JWT_SECRET`, `ALLOWED_ORIGINS`, SMTP — проверить на Vercel.
5. AI-ключи (`ANTHROPIC_API_KEY`/`DEEPSEEK_API_KEY`/`OPENAI_API_KEY`) не заданы → natal/palmistry работают на шаблонах (graceful fallback, это заложено в код).

## Рекомендации (вне scope аудита)

- Предзаполнение формы заказа данными профиля (BUG-016)
- Убрать alert(), console.log; добавить favicon
- Единый guard-скрипт вместо дублирующих verify-запросов
- Rate-limit на /api/auth/* (сейчас нет защиты от перебора)

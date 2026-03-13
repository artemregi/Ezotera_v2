# P0 Security Fixes — Ezotera

Applied: 2026-02-17
Deployed to: https://ezoterav2.vercel.app

---

## What Was Changed and Why

### 1. CORS — Fixed in `vercel.json`

**Before (broken):**
```json
{ "key": "Access-Control-Allow-Origin", "value": "*" }
```
This wildcard combined with `Access-Control-Allow-Credentials: true` is:
- Invalid per the CORS spec (browsers ignore it)
- A CSRF risk — any website could make authenticated requests on behalf of your users

**After (correct):**
```json
{ "key": "Access-Control-Allow-Origin", "value": "https://ezoterav2.vercel.app" }
```
Only your own domain can send credentialed API requests.

**Also added security headers (zero-risk):**
- `X-Frame-Options: SAMEORIGIN` — prevents your pages from being embedded in iframes on other sites (clickjacking protection)
- `X-Content-Type-Options: nosniff` — prevents browsers from guessing file types (MIME sniffing attacks)
- `Referrer-Policy: strict-origin-when-cross-origin` — limits what URL info is sent to third parties

---

### 2. JWT Secret — Rotated

**Before (weak):**
```
ezoterra-super-secret-jwt-key-2026-vercel-production
```
A human-readable string is predictable. An attacker who knows the format could brute-force it.

**After (strong):**
A 384-bit cryptographically random secret generated with:
```
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Where it was updated:**
- `.env.local` (local development) ✅
- Vercel → production environment ✅
- Vercel → preview environment ✅
- Vercel → development environment ✅

**Important:** All existing login sessions were invalidated when the JWT secret changed.
Users who were logged in had to log in again. This is expected and correct behavior.

---

### 3. `.env.local` — Never Committed (Confirmed)

Checked with:
```
git log --all --full-history -- .env.local
```
Result: empty (no commits). Credentials were never in git history. ✅

---

## How to Verify Passwords (Testing Authentication)

### Method 1: Use the live login form (recommended)
1. Go to https://ezoterav2.vercel.app/auth/login.html
2. Enter a registered email and password
3. Should redirect to dashboard on success

### Method 2: Test via curl (API-level check)

**Test correct credentials:**
```bash
curl -X POST https://ezoterav2.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' \
  -c /tmp/cookies.txt

# Expected: {"success":true,"message":"Вход выполнен успешно","user":{...}}
```

**Test wrong password:**
```bash
curl -X POST https://ezoterav2.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"wrongpassword"}'

# Expected: {"success":false,"message":"Неверный email или пароль"}  (HTTP 401)
```

**Test that session cookie works after login:**
```bash
# After running the login command above with -c /tmp/cookies.txt:
curl https://ezoterav2.vercel.app/api/auth/verify \
  -b /tmp/cookies.txt

# Expected: {"success":true,"authenticated":true,"user":{...}}
```

**Test unauthenticated access:**
```bash
curl https://ezoterav2.vercel.app/api/auth/verify

# Expected: {"success":false,"authenticated":false,"message":"Необходима авторизация"}  (HTTP 401)
```

### Method 3: Check password hash directly in Supabase

1. Log into https://supabase.com/dashboard
2. Navigate to your project → Table Editor → `users` table
3. Find a user row — the `password_hash` column should start with `$2b$12$` (bcrypt, cost 12)

To manually verify a password against a hash (Node.js):
```javascript
const bcrypt = require('bcryptjs');
const hash = '$2b$12$...'; // paste from database
const password = 'the-password-to-check';
bcrypt.compare(password, hash).then(result => console.log('Valid:', result));
```

---

## Remaining P0 Action Required (Manual — Only You Can Do This)

### Rotate Supabase Database Password

The `.env.local` file contains the current live database password.
While the file was never committed to git, you should rotate it as a precaution.

**Steps:**
1. Go to https://supabase.com/dashboard → your project
2. Settings → Database → Reset database password
3. Copy the new password
4. Update `POSTGRES_URL` in `.env.local` with new password
5. Update `POSTGRES_URL` in Vercel dashboard → Settings → Environment Variables
6. Redeploy: `npx vercel --prod`

### Rotate Supabase Service Role Key (Optional but Recommended)

The service role key has full admin access to your database.

**Steps:**
1. Supabase dashboard → Settings → API
2. Click "Regenerate" next to Service Role Key
3. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables
4. Note: `SUPABASE_SERVICE_ROLE_KEY` is not currently used by any backend code — it's safe to rotate anytime

---

## How to Generate a New JWT Secret (Future Reference)

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Then update Vercel:
```bash
# Remove old
echo "y" | npx vercel env rm JWT_SECRET

# Add new (paste the generated value when prompted)
npx vercel env add JWT_SECRET production --force
npx vercel env add JWT_SECRET preview --force
npx vercel env add JWT_SECRET development --force

# Update local
# Edit .env.local: JWT_SECRET="<new_value>"

# Redeploy
npx vercel --prod
```

**Warning:** Rotating JWT secret invalidates ALL active sessions. All logged-in users must log in again.

---

## Current Security Status

| Check | Status |
|-------|--------|
| CORS origin locked to production domain | ✅ Done |
| JWT secret is cryptographically random | ✅ Done |
| `.env.local` never in git history | ✅ Confirmed |
| Security headers (X-Frame, nosniff, Referrer) | ✅ Done |
| Database password rotation | ⚠️ Recommended — manual step |
| Supabase service role key rotation | ⚠️ Optional — manual step |
| In-memory rate limiting (Vercel serverless issue) | 🔜 P3 task |
| Password complexity rules | 🔜 P3 task |

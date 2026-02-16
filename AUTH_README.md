# Ezoterra Authentication System

## Overview

Production-ready authentication system for the Ezoterra astrology consultation platform.

### Features ✨

- ✅ **User Registration** - Secure account creation with validation
- ✅ **User Login** - JWT token-based authentication
- ✅ **Password Security** - Bcrypt hashing (cost factor 12)
- ✅ **Database Persistence** - PostgreSQL with connection pooling
- ✅ **Rate Limiting** - 5 login attempts per 15 minutes
- ✅ **httpOnly Cookies** - XSS protection for JWT tokens
- ✅ **Input Validation** - Email, password, name validation with Russian error messages
- ✅ **Onboarding Integration** - Save user data after registration

### Technology Stack 🛠️

- **Backend:** Node.js + Vercel Serverless Functions
- **Database:** PostgreSQL (Vercel Postgres or Supabase)
- **Authentication:** JWT tokens with httpOnly cookies
- **Security:** bcrypt, parameterized queries, rate limiting

---

## Prerequisites 📋

Before you begin, ensure you have:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **PostgreSQL Database** - Choose one:
   - [Vercel Postgres](https://vercel.com/storage/postgres) (Recommended for production)
   - [Supabase](https://supabase.com/) (Free tier available)
   - Local PostgreSQL installation

3. **Vercel Account** - [Sign up free](https://vercel.com/signup)
4. **Vercel CLI** (optional, for local development):
   ```bash
   npm install -g vercel
   ```

---

## Quick Start 🚀

### Step 1: Database Setup

#### Option A: Vercel Postgres (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Storage** tab
3. Click **Create Database** → Choose **Postgres**
4. Copy the connection string (POSTGRES_URL)

#### Option B: Supabase (Free)

1. Create account at [Supabase](https://supabase.com/)
2. Create new project
3. Go to **Settings** → **Database**
4. Copy the connection string (Connection pooling → Transaction mode)

### Step 2: Run Database Migration

Connect to your database and run the migration script:

```bash
# Using psql command line
psql "YOUR_POSTGRES_URL" -f migrations/001_create_users_table.sql

# OR using Supabase SQL Editor:
# 1. Go to SQL Editor in Supabase dashboard
# 2. Copy contents of migrations/001_create_users_table.sql
# 3. Run query
```

Verify the table was created:
```sql
SELECT * FROM users LIMIT 1;
```

### Step 3: Environment Variables

#### Generate JWT Secret

```bash
# On Windows (Git Bash or WSL)
openssl rand -base64 32

# On PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

#### Create `.env.local` File

Create a file named `.env.local` in the project root:

```bash
# Database Connection
POSTGRES_URL=your_postgres_connection_string_here

# JWT Secret (from step above)
JWT_SECRET=your_generated_jwt_secret_here

# Application
NODE_ENV=development
APP_URL=http://localhost:3000
```

**⚠️ IMPORTANT:** Never commit `.env.local` to Git. It's already in `.gitignore`.

### Step 4: Install Dependencies

```bash
npm install
```

This installs:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `pg` - PostgreSQL client
- `validator` - Input validation

### Step 5: Run Locally

```bash
# Start Vercel development server
npm run dev

# Or if you have Vercel CLI:
vercel dev
```

The server will start at `http://localhost:3000`

### Step 6: Test the System

1. **Open Registration Page:**
   ```
   http://localhost:3000/ezotera-frontend/auth/register.html
   ```

2. **Create Test Account:**
   - Name: Test User
   - Email: test@example.com
   - Password: testpass123
   - Click "Зарегистрироваться"

3. **Verify in Database:**
   ```sql
   SELECT id, email, name, created_at FROM users;
   SELECT password_hash FROM users WHERE email = 'test@example.com';
   ```
   The `password_hash` should start with `$2a$` or `$2b$` (bcrypt format)

4. **Test Login:**
   ```
   http://localhost:3000/ezotera-frontend/auth/login.html
   ```
   - Use the credentials you just created
   - Should redirect to index.html on success

5. **Check Browser Cookies:**
   - Open DevTools → Application tab → Cookies
   - Look for `auth_token` cookie
   - Verify it has `HttpOnly` and `SameSite=Strict` flags

---

## Deployment to Vercel 🌐

### Step 1: Configure Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. Add these variables:

| Name | Value | Environments |
|------|-------|--------------|
| `POSTGRES_URL` | Your production database URL | Production, Preview, Development |
| `JWT_SECRET` | Your generated secret (use `openssl rand -base64 32`) | Production, Preview, Development |
| `NODE_ENV` | `production` | Production only |
| `APP_URL` | Your Vercel domain (e.g., `https://ezoterra.vercel.app`) | Production |

4. Click **Save** for each variable

### Step 2: Deploy

```bash
# Option A: Deploy via Git (Recommended)
git add .
git commit -m "Add authentication system"
git push origin main

# Vercel will auto-deploy

# Option B: Deploy via CLI
vercel --prod
```

### Step 3: Verify Production Deployment

1. Visit your production URL:
   ```
   https://your-domain.vercel.app/ezotera-frontend/auth/register.html
   ```

2. Test registration and login flows

3. Monitor logs:
   ```bash
   vercel logs --follow
   ```

---

## API Endpoints 📡

### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "name": "Артем",
  "email": "artem@example.com",
  "password": "securePass123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Регистрация успешна",
  "user": {
    "id": 1,
    "email": "artem@example.com",
    "name": "Артем"
  }
}
```

**Errors:**
- `400` - Validation error (invalid email/password/name)
- `409` - Email already registered
- `500` - Server error

---

### POST /api/auth/login

Authenticate user and issue JWT token.

**Request:**
```json
{
  "email": "artem@example.com",
  "password": "securePass123",
  "remember": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Вход выполнен успешно",
  "user": {
    "id": 1,
    "email": "artem@example.com",
    "name": "Артем"
  },
  "redirectUrl": "../index.html"
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Too many attempts (rate limited)
- `500` - Server error

---

### GET /api/auth/verify

Verify if user is authenticated.

**Response (200):**
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "artem@example.com"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "authenticated": false,
  "message": "Необходима авторизация"
}
```

---

### POST /api/auth/logout

Clear authentication cookie.

**Response (200):**
```json
{
  "success": true,
  "message": "Выход выполнен успешно"
}
```

---

### POST /api/onboarding/complete

Save onboarding data to user record (requires authentication).

**Request:**
```json
{
  "gender": "female",
  "birth_date": "1990-05-15",
  "birth_time": "14:30",
  "birth_place": "Москва, Россия",
  "relationship_status": "single",
  "focus_area": "Карьера и финансы",
  "zodiac_sign": "Телец"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Данные сохранены успешно",
  "redirectUrl": "../index.html"
}
```

**Errors:**
- `401` - Unauthorized (missing/invalid token)
- `500` - Server error

---

## Security Features 🔒

### Password Security
- **Bcrypt hashing** with cost factor 12
- **Min 8 characters** enforced on frontend and backend
- Never stored in plain text

### JWT Token Security
- **httpOnly cookies** - Immune to XSS attacks
- **Secure flag** - Only transmitted over HTTPS (production)
- **SameSite=Strict** - CSRF protection
- **Short expiration** - 24 hours (or 7 days with "remember me")

### Input Validation
- **Email** - Format check, length limit (255), normalized
- **Password** - Min 8 / max 128 characters
- **Name** - Trim whitespace, HTML entity sanitization

### Rate Limiting
- **Login endpoint** - 5 attempts per 15 minutes per IP
- **Registration endpoint** - 3 attempts per hour per IP

### SQL Injection Prevention
- All queries use **parameterized statements**
- Never use string concatenation for SQL queries

---

## Troubleshooting 🔧

### Issue: "Connection timeout" error

**Cause:** Database connection pool exhausted or network timeout

**Solution:**
```javascript
// Adjust pool settings in api endpoints:
max: 30,  // Increase max connections
connectionTimeoutMillis: 10000,  // Increase timeout
```

---

### Issue: "JWT Secret not found" error

**Cause:** `JWT_SECRET` environment variable not set

**Solution:**
1. Check `.env.local` file exists
2. Verify `JWT_SECRET` is set
3. Restart dev server: `npm run dev`

For production:
1. Go to Vercel Dashboard → Environment Variables
2. Add `JWT_SECRET` with your generated secret
3. Redeploy

---

### Issue: Cookie not being set

**Cause:** Missing `credentials: 'include'` in fetch calls

**Solution:**
Already fixed in frontend code. Verify:
```javascript
fetch('/api/auth/login', {
    credentials: 'include',  // This line is critical
    // ...
})
```

---

### Issue: "Email already registered" for new email

**Cause:** Database unique constraint working correctly (not an issue)

**Solution:** This is expected behavior. Use different email or check if account exists:
```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

---

### Issue: Password verification always fails

**Cause:** Password field might be trimmed/modified

**Solution:**
- Check password is sent exactly as entered (no trim on password field)
- Verify bcrypt version is consistent: `npm list bcryptjs`
- Test bcrypt directly:
  ```javascript
  const bcrypt = require('bcryptjs');
  const hash = '$2a$12$...'; // from database
  bcrypt.compare('testpass123', hash).then(console.log);
  ```

---

## Database Schema 📊

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,

    -- Onboarding data
    gender VARCHAR(50),
    birth_date DATE,
    birth_time TIME,
    birth_place VARCHAR(255),
    relationship_status VARCHAR(100),
    focus_area VARCHAR(255),
    zodiac_sign VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

---

## Project Structure 📁

```
Ezoterra/
├── api/                              # Vercel serverless functions
│   ├── auth/
│   │   ├── register.js               # User registration endpoint
│   │   ├── login.js                  # User login endpoint
│   │   ├── verify.js                 # Token verification endpoint
│   │   └── logout.js                 # Logout endpoint
│   └── onboarding/
│       └── complete.js               # Onboarding data endpoint
│
├── lib/                              # Shared utilities
│   ├── auth.js                       # JWT helpers
│   ├── password.js                   # bcrypt wrappers
│   ├── validation.js                 # Input validation
│   ├── errors.js                     # Error handling
│   └── rateLimit.js                  # Rate limiting
│
├── migrations/
│   └── 001_create_users_table.sql    # Database schema
│
├── ezotera-frontend/                 # Frontend (unchanged structure)
│   ├── auth/
│   │   ├── auth.js                   # ✅ Updated with API calls
│   │   ├── login.html
│   │   └── register.html
│   └── onboarding/
│       └── onboarding.js             # ✅ Updated with API calls
│
├── package.json                      # Dependencies
├── vercel.json                       # ✅ Updated with API routes
├── .env.example                      # Environment template
├── .env.local                        # Local environment (gitignored)
├── .gitignore                        # ✅ Updated
└── AUTH_README.md                    # This file
```

---

## Testing Checklist ✅

### Registration Flow
- [ ] Register with valid data → Success, redirects to onboarding
- [ ] Register with duplicate email → Error "Этот email уже зарегистрирован"
- [ ] Register with invalid email → Error "Пожалуйста, введите корректный email адрес"
- [ ] Register with short password → Error "Пароль должен содержать минимум 8 символов"
- [ ] Password stored as bcrypt hash (starts with `$2a$` or `$2b$`)

### Login Flow
- [ ] Login with correct credentials → Success, redirects to index.html
- [ ] Login with wrong password → Error "Неверный email или пароль"
- [ ] Login with "Remember me" → Cookie Max-Age = 7 days
- [ ] Login without "Remember me" → Cookie Max-Age = 24 hours
- [ ] `last_login_at` timestamp updated in database

### Security
- [ ] Cookies have HttpOnly flag (check DevTools)
- [ ] Cookies have Secure flag in production (HTTPS only)
- [ ] Cookies have SameSite=Strict flag
- [ ] 6+ failed logins trigger rate limit error

### Onboarding
- [ ] Complete onboarding while authenticated → Data saved
- [ ] Attempt onboarding without authentication → 401 Unauthorized

---

## Next Steps 🎯

### Recommended Enhancements

1. **Email Verification** - Send verification email after registration
2. **Password Reset** - "Forgot Password" flow
3. **Social Authentication** - Google, Yandex OAuth
4. **Two-Factor Authentication** - SMS or authenticator app
5. **User Profile Management** - Edit profile, change password
6. **Refresh Tokens** - Long-lived refresh + short-lived access tokens

### Production Upgrades

1. **Upstash Redis** - Distributed rate limiting (replace in-memory store)
2. **Monitoring** - Set up error tracking (Sentry, LogRocket)
3. **Database Backups** - Configure automated backups
4. **Load Testing** - Test with k6 or Artillery
5. **Security Audit** - Run npm audit, review OWASP Top 10

---

## Support 💬

If you encounter issues:

1. Check this README's **Troubleshooting** section
2. Review Vercel logs: `vercel logs --follow`
3. Check browser DevTools → Console and Network tabs
4. Verify environment variables are set correctly

---

## License

ISC License

---

**Built with ❤️ for Ezoterra**

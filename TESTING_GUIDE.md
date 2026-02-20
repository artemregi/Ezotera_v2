# 🧪 Complete Testing Guide - Authentication System

## Pre-Testing Setup

### 1. Clear Browser Data
```
Browser DevTools → Application → Clear Site Data
- Clear cookies
- Clear local storage
- Clear session storage
```

### 2. Open DevTools Console
```
F12 → Console tab
This will help debug any issues
```

### 3. Monitor Network Tab
```
F12 → Network tab
Watch for API calls and responses
```

---

## Test Suite 1: Basic Login

### Test 1.1: Login Page Load
**Steps:**
1. Navigate to `/ezotera-frontend/auth/login.html`
2. Check browser console for errors
3. Verify form is visible
4. Verify header is injected

**Expected:**
- No JavaScript errors in console
- Login form visible
- Header with "Войти" button visible
- Network call: `GET /components/header.html` → 200

**Verify:**
```javascript
// In console, check auth state:
window.AuthState.isLoggedIn()  // Should be: false
```

---

### Test 1.2: Valid Login
**Steps:**
1. Enter valid email and password
2. Click "Войти" button
3. Observe page behavior
4. Check what page you land on

**Expected:**
- Submit button shows "Вход..."
- Network call: `POST /api/auth/login` → 200
- Response includes: `redirectUrl: '../dashboard.html'`
- Browser sets auth_token cookie (check in DevTools)
- Page redirects to `/dashboard.html`
- Dashboard loads and shows user data

**Verify:**
```javascript
// In console:
window.AuthState.isLoggedIn()  // Should be: true
window.AuthState.user          // Should have id, email, name
document.cookie               // Should contain auth_token=...
```

---

### Test 1.3: Invalid Login
**Steps:**
1. Enter invalid credentials
2. Click "Войти" button
3. Check error message

**Expected:**
- Error message appears: "Неверный email или пароль"
- No redirect
- No cookie set
- Network call: `POST /api/auth/login` → 401

**Verify:**
```javascript
// In console:
window.AuthState.isLoggedIn()  // Should be: false
document.cookie               // Should NOT contain auth_token
```

---

### Test 1.4: Rate Limiting
**Steps:**
1. Try to login 6+ times with wrong credentials
2. Observe behavior on 6th attempt

**Expected:**
- After 5 failed attempts, 6th attempt returns error
- Error message: "Слишком много попыток. Попробуйте через 15 минут."
- Network call: `POST /api/auth/login` → 429

**Note:** Rate limiting resets after 15 minutes per IP

---

## Test Suite 2: Header Behavior

### Test 2.1: Logged-Out Header
**Steps:**
1. On any page, check if NOT logged in
2. Observe header

**Expected:**
- Two buttons in header:
  1. "Войти" (left button)
  2. "Получить прогноз" (right button - primary)

**HTML Check:**
```javascript
// In console:
document.querySelector('#header-actions').innerHTML
// Should show login/forecast links
```

---

### Test 2.2: Logged-In Header
**Steps:**
1. Login successfully
2. Check header on dashboard
3. Navigate to different page

**Expected:**
- Greeting: "Привет, [Your Name]"
- Button: "Личный кабинет" (dashboard link)
- Button: "Выйти" (logout button)
- Same header on ALL pages

**HTML Check:**
```javascript
// In console:
document.querySelector('#header-actions').innerHTML
// Should show user greeting and logout button
```

---

### Test 2.3: Mobile Header
**Steps:**
1. Resize browser to mobile width (< 768px)
2. Login successfully
3. Click hamburger menu
4. Check mobile actions section

**Expected:**
- Mobile menu appears
- Mobile actions section shows:
  - "Привет, [Your Name]"
  - "Личный кабинет" button
  - "Выйти" button
- Same content as desktop

---

### Test 2.4: Header Dynamic Updates
**Steps:**
1. Login successfully
2. Header shows greeting
3. Click logout button
4. Observe header immediately

**Expected:**
- Header updates WITHOUT page reload
- Changes from greeting to "Войти" / "Получить прогноз" instantly
- Page then redirects to homepage

---

## Test Suite 3: Logo Navigation

### Test 3.1: Logo Click While Logged In
**Steps:**
1. Login to dashboard
2. Verify header shows "Привет, [Name]"
3. Click logo (top-left Ezotera)
4. Observe navigation

**Expected:**
- Page navigates to `index.html`
- Header STILL shows "Привет, [Name]" (NOT "Войти")
- No logout occurs
- Auth state remains intact

**Verify:**
```javascript
// In console:
window.AuthState.isLoggedIn()  // Should be: true
```

---

### Test 3.2: Logo Click While Logged Out
**Steps:**
1. Logout or start fresh
2. Navigate to any page
3. Verify header shows "Войти"
4. Click logo

**Expected:**
- Page navigates to `index.html`
- Header still shows "Войти"
- Auth state still false

---

## Test Suite 4: Page Refresh

### Test 4.1: Refresh While Logged In
**Steps:**
1. Login and navigate to dashboard
2. Header shows greeting
3. Press F5 (refresh)
4. Wait for page to load

**Expected:**
- AuthState.initialize() runs
- Calls `/api/auth/verify`
- Backend validates cookie
- Sets `AuthState.isAuthenticated = true`
- Header renders with greeting
- No flash of "Войти" button

**Monitor:**
- Network tab should show: `GET /api/auth/verify` → 200
- Console should show auth logs

---

### Test 4.2: Refresh While Logged Out
**Steps:**
1. Logout completely
2. Delete cookies if needed
3. Navigate to any page
4. Press F5 (refresh)

**Expected:**
- AuthState.initialize() runs
- Calls `/api/auth/verify`
- Backend returns 401 (no valid cookie)
- Sets `AuthState.isAuthenticated = false`
- Header renders with "Войти" button

---

### Test 4.3: Rapid Navigation
**Steps:**
1. Login to dashboard
2. Quickly click logo, then click different nav link
3. Continue clicking between pages
4. Observe header behavior

**Expected:**
- Header always shows correct state
- No race conditions or flashing
- Auth state consistent across navigations

---

## Test Suite 5: Logout

### Test 5.1: Logout Button Click
**Steps:**
1. Login successfully
2. Locate logout button in header
3. Click "Выйти" button
4. Observe behavior

**Expected:**
- Button may show loading state briefly
- Network call: `POST /api/auth/logout` → 200
- Header updates immediately (no reload needed)
- Shows "Войти" / "Получить прогноз" buttons
- Page redirects to `index.html`
- Header on redirected page shows "Войти"

**Verify:**
```javascript
// In console:
window.AuthState.isLoggedIn()  // Should be: false
document.cookie               // Should NOT contain auth_token
```

---

### Test 5.2: Logout From Different Pages
**Steps:**
1. Login to dashboard
2. Navigate to index.html
3. Click logout
4. Then navigate to about.html
5. Click logout
6. Verify each time

**Expected:**
- Logout works from ANY page
- Consistent behavior everywhere
- No errors in console

---

### Test 5.3: Logout From Mobile
**Steps:**
1. Resize to mobile
2. Login successfully
3. Click hamburger menu
4. Click "Выйти" button
5. Observe behavior

**Expected:**
- Logout button is clickable
- Works the same as desktop
- Mobile menu closes after logout
- Redirect to homepage

---

## Test Suite 6: Registration

### Test 6.1: Valid Registration
**Steps:**
1. Navigate to `/ezotera-frontend/auth/register.html`
2. Enter:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "SecurePass123"
   - Confirm: "SecurePass123"
   - Accept terms checkbox
3. Click "Регистрация"
4. Observe result

**Expected:**
- Network call: `POST /api/auth/register` → 201
- User created in database
- auth_token cookie set
- Redirects to `index.html?newUser=true`
- Header shows greeting "Привет, Test User"
- Page may show welcome message (if implemented)

**Verify:**
```javascript
// In console:
window.AuthState.isLoggedIn()  // Should be: true
window.AuthState.user.name     // Should be: "Test User"
```

---

### Test 6.2: Duplicate Email Registration
**Steps:**
1. Try to register with email of existing user
2. Click "Регистрация"

**Expected:**
- Network call: `POST /api/auth/register` → 400 or 409
- Error message: "Пользователь с таким email уже существует"
- No user created
- Page doesn't redirect

---

### Test 6.3: Weak Password
**Steps:**
1. Register with password "short"
2. Click "Регистрация"

**Expected:**
- Frontend validation: "Пароль должен содержать минимум 8 символов."
- No network call made
- Error shown on password field

---

### Test 6.4: Password Mismatch
**Steps:**
1. Enter password and confirm password different
2. Click "Регистрация"

**Expected:**
- Frontend validation: "Пароли не совпадают."
- No network call made
- Error shown on confirm field

---

## Test Suite 7: Multi-Tab Behavior

### Test 7.1: Login in One Tab, Check Another
**Steps:**
1. Open Site in Tab 1
2. Open Site in Tab 2 (same domain)
3. In Tab 1: Login
4. In Tab 2: Refresh page

**Expected:**
- Tab 2 page reloads
- AuthState.initialize() calls `/api/auth/verify`
- Cookie from Tab 1 is shared (same domain)
- Tab 2 header shows "Привет, [Name]"
- Both tabs show authenticated state

---

### Test 7.2: Logout in One Tab, Check Another
**Steps:**
1. Both tabs logged in
2. In Tab 1: Click logout
3. In Tab 2: Make a request or refresh

**Expected:**
- Tab 1: Header updates, redirects to home
- Tab 2: Until refresh/request, still shows greeting
- Tab 2 after refresh: Shows "Войти" (cookie cleared)

**Note:** Cross-tab sync is not automatic; requires page interaction

---

## Test Suite 8: API Protection

### Test 8.1: Dashboard Without Auth
**Steps:**
1. Logout completely
2. Manually navigate to `/dashboard.html`
3. Observe behavior

**Expected:**
- Page loads HTML
- dashboard.js runs
- Calls `/api/user/profile`
- Gets 401 response (no valid auth_token)
- JavaScript redirects to login page
- User sees login form

---

### Test 8.2: API Call Without Cookie
**Steps:**
1. Open browser console
2. Make manual fetch:
```javascript
fetch('/api/user/profile', { method: 'GET' })
  .then(r => r.json())
  .then(d => console.log(d))
```

**Expected:**
- Response: `{ authenticated: false, message: "..." }`
- Status: 401

---

### Test 8.3: API Call With Credentials
**Steps:**
1. Login first
2. In console:
```javascript
fetch('/api/user/profile', {
    method: 'GET',
    credentials: 'include'
})
  .then(r => r.json())
  .then(d => console.log(d))
```

**Expected:**
- Response includes user profile data
- Status: 200

---

## Test Suite 9: Security Tests

### Test 9.1: XSS in Name Field
**Steps:**
1. Register with name: `<script>alert('XSS')</script>`
2. Login
3. Check header

**Expected:**
- No alert appears
- Name displayed as plain text (escaped)
- XSS blocked by HTML escaping

---

### Test 9.2: Cookie Accessibility
**Steps:**
1. Login
2. In console:
```javascript
// Try to access auth_token
console.log(document.cookie)
```

**Expected:**
- Output shows cookies
- If auth_token is NOT visible → Good (HttpOnly)
- If auth_token IS visible → Check backend (might not be HttpOnly)

---

### Test 9.3: CSRF Protection
**Steps:**
1. Login to ezotera.example.com
2. Open another tab with different site
3. That site tries to logout user
4. Check if logout works

**Expected:**
- Other site cannot make logout request
- Error: CORS error or blocked by SameSite
- User remains logged in to ezotera

---

## Test Suite 10: Browser Compatibility

### Test 10.1: Chrome/Edge
**Steps:**
1. Clear all data
2. Run full test suite
3. Check console for errors

**Expected:**
- All tests pass
- No console errors

---

### Test 10.2: Firefox
**Steps:**
1. Clear all data
2. Run full test suite
3. Check console for errors

**Expected:**
- All tests pass
- Cookies work same way

---

### Test 10.3: Safari (Mobile)
**Steps:**
1. On iPhone/iPad
2. Clear cookies
3. Test login/logout/navigation

**Expected:**
- Works same as desktop
- Header responsive
- Touch targets large enough

---

### Test 10.4: Older Browsers
**Steps:**
1. Test in IE11 (if needed)
2. Check for ES6 compatibility

**Note:** Project uses ES5 syntax, should work in older browsers

---

## Performance Tests

### Test P1: AuthState Init Speed
**Steps:**
1. Open DevTools Network tab
2. Reload page while logged in
3. Measure time for `/api/auth/verify` call

**Expected:**
- Response time: < 100ms
- Header renders after: < 200ms total
- No visible flash or delay

---

### Test P2: Header Injection Speed
**Steps:**
1. Open DevTools Performance tab
2. Record page load
3. Check timing for header injection

**Expected:**
- Header visible within 1 second
- No layout shift
- No CLS (Cumulative Layout Shift)

---

### Test P3: Logout Speed
**Steps:**
1. LoggedIn
2. Click logout
3. Measure time to header update

**Expected:**
- Header updates immediately (< 50ms)
- No refresh delay
- Smooth transition

---

## Edge Cases

### Test E1: Expired Token
**Steps:**
1. Wait for token to expire (24 hours) or manually expire
2. Try to access protected endpoint
3. Observe behavior

**Expected:**
- API returns 401
- AuthState clears
- Header updates to logout state
- User redirected to login

---

### Test E2: Network Offline
**Steps:**
1. Go to dashboard (logged in)
2. Turn off network (DevTools → offline)
3. Reload page

**Expected:**
- Network error handling graceful
- Page shows error message or offline state
- Not a complete crash

---

### Test E3: Slow Network
**Steps:**
1. DevTools → Network → Slow 3G
2. Login and navigate
3. Observe loading behavior

**Expected:**
- AuthState init takes longer but works
- Header eventually renders
- No timeout errors

---

### Test E4: JavaScript Disabled
**Steps:**
1. Disable JavaScript
2. Navigate to site
3. Try to login

**Expected:**
- Page loads with static header
- Static "Войти" button visible
- Form works (form submission)
- Login redirects properly

**Note:** This tests fallback/graceful degradation

---

## Debugging Checklist

If something doesn't work:

### 1. Check Auth State
```javascript
// In console:
console.log(window.AuthState)
console.log(window.AuthState.isLoggedIn())
console.log(window.AuthState.user)
```

### 2. Check Cookie
```javascript
// In console:
console.log(document.cookie)

// Or in DevTools → Application → Cookies
```

### 3. Check Network
```
DevTools → Network tab
Filter: auth
Look for /api/auth/verify, /api/auth/login, /api/auth/logout
```

### 4. Check Console
```
DevTools → Console
Look for:
- 🔐 LogState: ... messages
- Any red error messages
- Network errors (CORS, 404, 500)
```

### 5. Check Element
```javascript
// In console:
document.querySelector('#header-actions').innerHTML
// Should show current header state
```

### 6. Force Initialize
```javascript
// In console:
window.AuthState.initialize()
// Re-run auth check
```

---

## Sign-Off

Once all tests pass, authentication system is production-ready:

- [ ] Login/logout works
- [ ] Header reflects auth state
- [ ] Navigation preserves session
- [ ] Registration redirects correctly
- [ ] Mobile works
- [ ] Multi-tab works
- [ ] Security tests pass
- [ ] Performance acceptable
- [ ] No console errors
- [ ] No network errors

**Status:** ✅ Ready to deploy

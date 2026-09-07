const { extractTokenFromCookies, verifyToken } = require('./auth');
const { pool } = require('./db');

/**
 * Middleware to verify admin role.
 * Returns user object if admin, sends 403 otherwise.
 */
async function requireAdmin(req, res) {
    const token = extractTokenFromCookies(req);
    if (!token) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Требуется авторизация' }));
        return null;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Недействительный токен' }));
        return null;
    }

    // Check role in database
    try {
        const result = await pool.query(
            'SELECT id, email, name, role FROM public.users WHERE id = $1',
            [decoded.userId]
        );
        const user = result.rows[0];
        if (!user || user.role !== 'admin') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Доступ запрещён' }));
            return null;
        }
        return user;
    } catch (error) {
        console.error('Admin auth error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Ошибка сервера' }));
        return null;
    }
}

/**
 * Non-blocking admin check: returns user object if admin, null otherwise.
 * Never writes to the response — safe to use for "public or admin" endpoints.
 */
async function getAdminUser(req) {
    const token = extractTokenFromCookies(req);
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    try {
        const result = await pool.query(
            'SELECT id, email, name, role FROM public.users WHERE id = $1',
            [decoded.userId]
        );
        const user = result.rows[0];
        return (user && user.role === 'admin') ? user : null;
    } catch (error) {
        console.error('Admin auth error:', error);
        return null;
    }
}

module.exports = { requireAdmin, getAdminUser };

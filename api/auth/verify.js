const { verifyToken, extractTokenFromCookies } = require('../../lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        const token = extractTokenFromCookies(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Необходима авторизация'
            });
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Недействительный токен'
            });
        }

        // Token valid
        res.status(200).json({
            success: true,
            authenticated: true,
            user: {
                id: decoded.userId,
                email: decoded.email
            }
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({
            success: false,
            authenticated: false,
            message: 'Ошибка проверки авторизации'
        });
    }
};

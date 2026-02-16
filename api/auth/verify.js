const { verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        // Get token from cookie
        const cookies = req.headers.cookie || '';
        const tokenMatch = cookies.match(/auth_token=([^;]+)/);

        if (!tokenMatch) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Необходима авторизация'
            });
        }

        const token = tokenMatch[1];
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

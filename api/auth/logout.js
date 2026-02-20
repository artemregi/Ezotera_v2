module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        console.log('🔓 Logout handler called');

        // Clear auth cookie by setting Max-Age to 0
        // This invalidates the cookie on all clients
        const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
        res.setHeader('Set-Cookie', [
            `auth_token=; HttpOnly; ${secure}SameSite=Strict; Path=/; Max-Age=0`
        ]);

        console.log('✅ Auth token cookie cleared');

        res.status(200).json({
            success: true,
            message: 'Выход выполнен успешно'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при выходе'
        });
    }
};

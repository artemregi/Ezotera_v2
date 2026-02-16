module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Метод не разрешен' });
    }

    try {
        // Clear auth cookie by setting Max-Age to 0
        const secure = process.env.NODE_ENV === 'production' ? 'Secure;' : '';
        res.setHeader('Set-Cookie', [
            `auth_token=; HttpOnly; ${secure} SameSite=Strict; Path=/; Max-Age=0`
        ]);

        res.status(200).json({
            success: true,
            message: 'Выход выполнен успешно'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка'
        });
    }
};

const https = require('https');

/**
 * Send a message to Telegram chat via Bot API
 * @param {string} text - Message text (supports Markdown)
 * @returns {Promise<boolean>} - true if sent successfully
 */
function sendTelegramNotification(text) {
    return new Promise((resolve) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification');
            resolve(false);
            return;
        }

        const payload = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('[Telegram] Notification sent successfully');
                    resolve(true);
                } else {
                    console.error('[Telegram] Failed to send:', res.statusCode, data);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.error('[Telegram] Request error:', err.message);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
}

/**
 * Format and send order notification to managers
 */
async function notifyOrderSuccess({ orderId, amount, productName, customerName, customerEmail, date }) {
    const now = date || new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    const text =
        `✅ *Новый заказ оплачен!*\n\n` +
        `📦 *Товар:* ${productName || 'Не указан'}\n` +
        `💰 *Сумма:* ${amount} ₽\n` +
        `👤 *Имя:* ${customerName || 'Не указано'}\n` +
        `📧 *Email:* ${customerEmail || 'Не указан'}\n` +
        `🆔 *Заказ:* #${orderId}\n` +
        `📅 *Дата:* ${now}`;

    return sendTelegramNotification(text);
}

module.exports = { sendTelegramNotification, notifyOrderSuccess };

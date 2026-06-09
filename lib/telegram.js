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
            parse_mode: 'MarkdownV2'
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
 * Escape Markdown special characters for Telegram
 */
function escMd(str) {
    if (!str) return '';
    return String(str).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format and send order notification to managers
 */
async function notifyOrderSuccess({ orderId, amount, productName, customerName, customerEmail, referralCode, date }) {
    const now = date || new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    let text =
        `✅ *Новый заказ оплачен\\!*\n\n` +
        `📦 *Товар:* ${escMd(productName) || 'Не указан'}\n` +
        `💰 *Сумма:* ${escMd(amount)} ₽\n` +
        `👤 *Имя:* ${escMd(customerName) || 'Не указано'}\n` +
        `📧 *Email:* ${escMd(customerEmail) || 'Не указан'}\n` +
        `🆔 *Заказ:* \\#${escMd(orderId)}\n` +
        `📅 *Дата:* ${escMd(now)}`;

    if (referralCode) {
        text += `\n🔗 *Реферал:* ${escMd(referralCode)}`;
    }

    return sendTelegramNotification(text);
}

/**
 * Send notification when a new order/lead is created (before payment)
 */
async function notifyNewLead({ productName, amount, customerName, customerEmail, orderId }) {
    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    const text =
        `🔔 *Новая заявка\\!*\n\n` +
        `📦 *Товар:* ${escMd(productName) || 'Не указан'}\n` +
        `💰 *Сумма:* ${escMd(amount)} ₽\n` +
        `👤 *Имя:* ${escMd(customerName) || 'Не указано'}\n` +
        `📧 *Email:* ${escMd(customerEmail) || 'Не указан'}\n` +
        `🆔 *Заказ:* \\#${escMd(orderId)}\n` +
        `📅 *Дата:* ${escMd(now)}\n\n` +
        `_Ожидание оплаты\\.\\.\\._`;

    return sendTelegramNotification(text);
}

module.exports = { sendTelegramNotification, notifyOrderSuccess, notifyNewLead };

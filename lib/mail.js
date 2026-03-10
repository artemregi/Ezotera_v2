const nodemailer = require('nodemailer');

/**
 * Initialize SMTP transporter
 * Uses environment variables for configuration
 * Supports both development and production SMTP servers
 */
let transporter = null;

function initializeMailer() {
    if (transporter) {
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
}

/**
 * Send password reset OTP email
 * Includes both HTML and plain text versions
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP (plain text, will be shown in email)
 * @param {Object} options - Optional config {expirationMinutes: 10}
 * @returns {Promise<Object>} - Email send result
 */
async function sendPasswordResetOTP(email, otp, options = {}) {
    const { expirationMinutes = 10 } = options;

    const mailer = initializeMailer();

    // Create beautiful HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="en" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #152b35 0%, #6c5ce7 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            color: #1a202c;
            font-size: 16px;
            line-height: 24px;
            margin-bottom: 24px;
        }
        .otp-section {
            background-color: #f0f4ff;
            border: 2px solid #6c5ce7;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 32px 0;
        }
        .otp-label {
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        .otp-code {
            font-size: 48px;
            font-weight: 700;
            color: #6c5ce7;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 0;
        }
        .otp-note {
            color: #64748b;
            font-size: 13px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        .info-box {
            background-color: #fef5e7;
            border-left: 4px solid #f39c12;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .info-box p {
            margin: 0;
            color: #7f5a0d;
            font-size: 14px;
            line-height: 20px;
        }
        .security-warning {
            background-color: #fce4e6;
            border-left: 4px solid #e17055;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
        }
        .security-warning p {
            margin: 0;
            color: #743d3d;
            font-size: 14px;
            line-height: 20px;
        }
        .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 24px 30px;
            font-size: 13px;
            color: #64748b;
            line-height: 20px;
        }
        .footer-brand {
            font-weight: 600;
            color: #152b35;
            margin-bottom: 8px;
        }
        .divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
        }
        a {
            color: #6c5ce7;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🔐 Password Reset</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Ezoterra Astrology Platform</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                <p style="margin: 0 0 8px 0;">Hi there,</p>
                <p style="margin: 0;">
                    This is <strong>Artyom Novikov</strong> from <strong>Ezoterra</strong>. You requested a password reset code for your account.
                </p>
            </div>

            <!-- OTP Code -->
            <div class="otp-section">
                <div class="otp-label">Your Reset Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-note">
                    <strong>Valid for ${expirationMinutes} minutes</strong><br>
                    This code will expire automatically for security reasons.
                </div>
            </div>

            <!-- Instructions -->
            <div class="info-box">
                <p>
                    ✨ <strong>How to use this code:</strong><br>
                    Enter this 6-digit code on the password reset page to verify your identity and create a new password.
                </p>
            </div>

            <!-- Security Warning -->
            <div class="security-warning">
                <p>
                    🛡️ <strong>Didn't request this?</strong><br>
                    If you didn't ask for a password reset, you can safely ignore this email. Your account is secure. Do not share this code with anyone.
                </p>
            </div>

            <!-- Footer -->
            <hr class="divider">
            <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0 0;">
                If you need help, please contact our support team or reply to this email.
            </p>
        </div>

        <!-- Footer Section -->
        <div class="footer">
            <div class="footer-brand">Ezoterra — Astrology Redefined</div>
            <p style="margin: 8px 0;">
                Empowering your cosmic journey with personalized astrological insights and readings.
            </p>
            <p style="margin: 8px 0 0 0; color: #94a3b8;">
                © 2025 Ezoterra. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // Create plain text version
    const plainTextContent = `
PASSWORD RESET CODE

Hi there,

This is Artyom Novikov from Ezoterra. You requested a password reset code for your account.

YOUR RESET CODE: ${otp}

Valid for: ${expirationMinutes} minutes

INSTRUCTIONS:
Enter this 6-digit code on the password reset page to verify your identity and create a new password.

SECURITY NOTE:
If you didn't request this password reset, you can safely ignore this email. Your account is secure. Do not share this code with anyone.

---

If you need help, please contact our support team or reply to this email.

© 2025 Ezoterra — Astrology Redefined
Empowering your cosmic journey with personalized astrological insights and readings.
    `;

    try {
        const result = await mailer.sendMail({
            from: `"Ezoterra" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: '🔐 Your Ezoterra Password Reset Code',
            text: plainTextContent,
            html: htmlContent,
            // Headers for security
            headers: {
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal'
            }
        });

        console.log('✅ Password reset email sent to:', email);
        return result;
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        throw error;
    }
}

/**
 * Send payment receipt email after successful Robokassa payment
 * @param {string} email - Recipient email address
 * @param {Object} order - { invId, amount, description, isTest }
 * @returns {Promise<Object>}
 */
async function sendPaymentReceiptEmail(email, order) {
    const { invId, amount, description, isTest } = order;
    const paidAt = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    const amountFormatted = parseFloat(amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 });

    const mailer = initializeMailer();

    const testBanner = isTest
        ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:12px 16px;margin-bottom:24px;text-align:center;color:#856404;font-weight:600;">
               ⚠️ ТЕСТОВЫЙ ПЛАТЁЖ — деньги не списаны
           </div>`
        : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="ru" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#152b35 0%,#6c5ce7 100%);color:white;padding:40px 20px;text-align:center;">
            <h1 style="margin:0;font-size:26px;font-weight:600;">&#10003; Оплата прошла успешно</h1>
            <p style="margin:8px 0 0 0;opacity:0.9;font-size:14px;">Ezotera — персональные астрологические консультации</p>
        </div>
        <div style="padding:40px 30px;">
            ${testBanner}
            <p style="color:#1a202c;font-size:16px;margin:0 0 28px 0;">
                Спасибо за оплату! Сохраните этот чек для истории.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px;margin-bottom:28px;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:10px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Номер заказа</td>
                        <td style="padding:10px 0;color:#1a202c;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0;">#${invId}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Услуга</td>
                        <td style="padding:10px 0;color:#1a202c;text-align:right;border-bottom:1px solid #e2e8f0;">${description}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Сумма</td>
                        <td style="padding:10px 0;color:#1a202c;font-weight:700;font-size:18px;text-align:right;border-bottom:1px solid #e2e8f0;">${amountFormatted} &#8381;</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0;color:#64748b;font-size:14px;">Дата и время</td>
                        <td style="padding:10px 0;color:#1a202c;text-align:right;">${paidAt} (МСК)</td>
                    </tr>
                </table>
            </div>
            <div style="background:#f0f4ff;border-left:4px solid #6c5ce7;border-radius:4px;padding:16px;margin-bottom:28px;">
                <p style="margin:0;color:#3d3580;font-size:14px;line-height:1.6;">
                    Наш эксперт свяжется с вами в течение <strong>24 часов</strong> для организации консультации.
                    Если у вас есть вопросы — напишите нам в Telegram.
                </p>
            </div>
            <div style="text-align:center;">
                <a href="https://t.me/m/ZW1MW_RSYTQy"
                   style="display:inline-block;background:linear-gradient(135deg,#6c5ce7,#a855f7);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Написать в Telegram
                </a>
            </div>
        </div>
        <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 30px;font-size:13px;color:#64748b;">
            <div style="font-weight:600;color:#152b35;margin-bottom:6px;">Ezotera — Astrology Redefined</div>
            <p style="margin:0;">© 2025 Ezotera. Все права защищены.</p>
        </div>
    </div>
</body>
</html>`;

    const plainText = `ЧЕК ОБ ОПЛАТЕ

Номер заказа: #${invId}
Услуга: ${description}
Сумма: ${amountFormatted} руб.
Дата: ${paidAt} (МСК)
${isTest ? '\n⚠️ ТЕСТОВЫЙ ПЛАТЁЖ — деньги не списаны\n' : ''}
Наш эксперт свяжется с вами в течение 24 часов.

© 2025 Ezotera`;

    try {
        const result = await mailer.sendMail({
            from: `"Ezotera" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: `Чек об оплате №${invId} — Ezotera`,
            text: plainText,
            html: htmlContent,
        });
        console.log('✅ Payment receipt email sent to:', email);
        return result;
    } catch (error) {
        console.error('❌ Failed to send receipt email:', error.message);
        throw error;
    }
}

module.exports = {
    sendPasswordResetOTP,
    sendPaymentReceiptEmail,
    initializeMailer
};

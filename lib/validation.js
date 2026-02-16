const validator = require('validator');

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} - {valid: boolean, error?: string, normalized?: string}
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Пожалуйста, введите email' };
    }

    const trimmed = email.trim().toLowerCase();

    if (!validator.isEmail(trimmed)) {
        return { valid: false, error: 'Пожалуйста, введите корректный email адрес' };
    }

    if (trimmed.length > 255) {
        return { valid: false, error: 'Email слишком длинный' };
    }

    return { valid: true, normalized: trimmed };
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} - {valid: boolean, error?: string}
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Пожалуйста, введите пароль' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Пароль должен содержать минимум 8 символов' };
    }

    if (password.length > 128) {
        return { valid: false, error: 'Пароль слишком длинный' };
    }

    return { valid: true };
}

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {Object} - {valid: boolean, error?: string, sanitized?: string}
 */
function validateName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Пожалуйста, введите имя' };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: 'Имя должно содержать минимум 2 символа' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Имя слишком длинное' };
    }

    // Sanitize HTML entities to prevent XSS
    const sanitized = validator.escape(trimmed);

    return { valid: true, sanitized };
}

module.exports = {
    validateEmail,
    validatePassword,
    validateName
};

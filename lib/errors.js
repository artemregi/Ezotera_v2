/**
 * Handle database errors and return appropriate HTTP response
 * @param {Error} error - Database error object
 * @returns {Object} - {status: number, message: string}
 */
function handleDatabaseError(error) {
    // Duplicate email (PostgreSQL unique constraint violation)
    if (error.code === '23505' && error.constraint === 'users_email_key') {
        return {
            status: 409,
            message: 'Этот email уже зарегистрирован'
        };
    }

    // Connection timeout
    if (error.code === 'ETIMEDOUT') {
        return {
            status: 503,
            message: 'Сервис временно недоступен. Попробуйте позже.'
        };
    }

    // Connection refused
    if (error.code === 'ECONNREFUSED') {
        return {
            status: 503,
            message: 'Не удалось подключиться к базе данных'
        };
    }

    // Generic database error
    console.error('Database error:', error);
    return {
        status: 500,
        message: 'Произошла ошибка сервера. Попробуйте позже.'
    };
}

module.exports = {
    handleDatabaseError
};

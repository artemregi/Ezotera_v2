/**
 * Calculate zodiac sign based on birth date
 * @param {string|Date} birthDate - Birth date in YYYY-MM-DD format or Date object
 * @returns {string} - Zodiac sign name in Russian
 */
function calculateZodiacSign(birthDate) {
    const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const day = date.getDate();

    // Zodiac sign date ranges
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
        return 'Овен'; // Aries
    }
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
        return 'Телец'; // Taurus
    }
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
        return 'Близнецы'; // Gemini
    }
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
        return 'Рак'; // Cancer
    }
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
        return 'Лев'; // Leo
    }
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
        return 'Дева'; // Virgo
    }
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
        return 'Весы'; // Libra
    }
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
        return 'Скорпион'; // Scorpio
    }
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
        return 'Стрелец'; // Sagittarius
    }
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
        return 'Козерог'; // Capricorn
    }
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
        return 'Водолей'; // Aquarius
    }
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
        return 'Рыбы'; // Pisces
    }

    return 'Неизвестно';
}

module.exports = {
    calculateZodiacSign
};

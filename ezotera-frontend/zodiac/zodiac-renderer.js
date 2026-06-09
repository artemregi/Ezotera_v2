/**
 * Zodiac Sign Page Renderer
 * Dynamically renders complete zodiac sign profile pages
 */

class ZodiacRenderer {
    constructor() {
        this.zodiacData = null;
        this.currentSignId = null;
    }

    /**
     * Initialize and render the zodiac page
     */
    async init() {
        // Get sign ID from URL path
        const pathSegments = window.location.pathname.split('/');
        this.currentSignId = pathSegments[pathSegments.length - 1]?.replace('.html', '');

        if (!this.currentSignId) {
            console.error('Sign ID not found in URL');
            return;
        }

        // Load zodiac data
        await this.loadZodiacData();

        // Render the complete page
        this.renderPage();

        // Initialize interactive elements
        this.initializeInteractivity();
    }

    /**
     * Load zodiac data from JSON file
     */
    async loadZodiacData() {
        try {
            const response = await fetch('./zodiac-data.json');
            const data = await response.json();

            // Find the sign data
            this.zodiacData = data.find(sign => sign.id === this.currentSignId);

            if (!this.zodiacData) {
                console.error(`Sign data not found for: ${this.currentSignId}`);
            }
        } catch (error) {
            console.error('Failed to load zodiac data:', error);
        }
    }

    /**
     * Render the complete page structure
     */
    renderPage() {
        if (!this.zodiacData) return;

        const main = document.querySelector('main') || document.body;
        main.innerHTML = `
            ${this.renderHero()}
            <div class="zodiac-container">
                ${this.renderCharacteristics()}
                ${this.renderAstrology()}
                ${this.renderBirthDatesTable()}
                ${this.renderContentSections()}
                ${this.renderCompatibility()}
                ${/* renderConsultation() temporarily hidden */ ''}
                ${this.renderAllSigns()}
            </div>
        `;
    }

    /**
     * Render hero section (title and dates)
     */
    renderHero() {
        return `
            <section class="zodiac-hero">
                <div class="zodiac-container">
                    <div class="zodiac-hero__icon">${this.zodiacData.icon}</div>
                    <h1 class="zodiac-hero__title">${this.zodiacData.name} — Гороскоп и Профиль Личности</h1>
                    <p class="zodiac-hero__dates">${this.zodiacData.dates}</p>
                </div>
            </section>
        `;
    }

    /**
     * Render characteristics block (Polarity, Modality, etc.)
     */
    renderCharacteristics() {
        const polarityText = this.zodiacData.polarity === 'Positive' ? 'Позитивная' : 'Негативная';
        const modalityMap = {
            'Cardinal': 'Кардинальный',
            'Fixed': 'Фиксированный',
            'Mutable': 'Мутабельный'
        };

        return `
            <section class="zodiac-characteristics">
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Полярность</div>
                    <div class="zodiac-char__value">${polarityText}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Модальность</div>
                    <div class="zodiac-char__value">${modalityMap[this.zodiacData.modality] || this.zodiacData.modality}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Управляющая планета</div>
                    <div class="zodiac-char__value">${this.zodiacData.rulingPlanet}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Управляющий дом</div>
                    <div class="zodiac-char__value">${this.zodiacData.rulingHouse}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Элемент</div>
                    <div class="zodiac-char__value">${this.zodiacData.element}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Счастливое число</div>
                    <div class="zodiac-char__value">${this.zodiacData.luckyNumber}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Счастливый день</div>
                    <div class="zodiac-char__value">${this.zodiacData.luckyDay}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Счастливый цвет</div>
                    <div class="zodiac-char__value">${this.zodiacData.color}</div>
                </div>
            </section>
        `;
    }

    /**
     * Render astrology section (traits, likes/dislikes, compatibility)
     */
    renderAstrology() {
        const positiveTraits = this.zodiacData.positiveTraits.slice(0, 6).join(', ');
        const negativeTraits = this.zodiacData.negativeTraits.slice(0, 5).join(', ');
        const likes = this.zodiacData.likes.join(', ');
        const dislikes = this.zodiacData.dislikes.join(', ');
        const topMatches = this.zodiacData.topLoveMatches.join(', ');

        return `
            <section class="zodiac-astrology">
                <h2 class="zodiac-astrology__title">Астрологический Профиль Знака</h2>
                <div class="zodiac-astrology__grid">
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">✨ Позитивные Качества</div>
                        <div class="zodiac-astro-item__content">${positiveTraits}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">⚡ Негативные Качества</div>
                        <div class="zodiac-astro-item__content">${negativeTraits}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">💚 Нравится</div>
                        <div class="zodiac-astro-item__content">${likes}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">🚫 Не Нравится</div>
                        <div class="zodiac-astro-item__content">${dislikes}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">💑 Лучшие Пары</div>
                        <div class="zodiac-astro-item__content">${topMatches}</div>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Render birth dates section with period range
     */
    renderBirthDatesTable() {
        return `
            <section class="zodiac-dates-table">
                <h2 class="zodiac-dates-table__title">📅 Период рождения ${this.zodiacData.name}</h2>
                <div class="zodiac-dates-info">
                    <div class="zodiac-date-range">
                        <p class="zodiac-date-label">Период:</p>
                        <p class="zodiac-date-value">${this.zodiacData.dates}</p>
                    </div>
                    <div class="zodiac-date-details">
                        <p class="zodiac-details-text">
                            Люди, рожденные в период между <strong>${this.zodiacData.dates}</strong>,
                            принадлежат к знаку зодиака <strong>${this.zodiacData.name}</strong>.
                            Это ${this.zodiacData.element === 'Огонь' ? 'огненный' :
                                   this.zodiacData.element === 'Земля' ? 'земной' :
                                   this.zodiacData.element === 'Воздух' ? 'воздушный' : 'водный'} знак,
                            управляемый планетой <strong>${this.zodiacData.rulingPlanet}</strong>.
                        </p>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Render content sections as compact cards with "Узнать подробнее" buttons
     */
    renderContentSections() {
        const textSections = this.zodiacData.textSections || {};
        const elementName = this.zodiacData.element;

        const sections = [
            { icon: '🔥', title: `${this.zodiacData.name}: Знак Стихии ${elementName}`, text: textSections.element || '' },
            { icon: '💪', title: 'Сильные Стороны, Слабости и Динамика Отношений', text: textSections.strengths || '' },
            { icon: '💑', title: 'Совместимость с Другими Знаками Зодиака', text: textSections.compatibility || '' },
            { icon: '🌟', title: `Путь ${this.zodiacData.name}`, text: textSections.philosophy || '' }
        ];

        const cards = sections.map((s, i) => `
            <div class="zodiac-topic-card" onclick="window.__zodiacOpenModal(${i})">
                <span class="zodiac-topic-card__icon">${s.icon}</span>
                <h3 class="zodiac-topic-card__title">${s.title}</h3>
                <button class="zodiac-topic-card__btn">Узнать подробнее</button>
            </div>
        `).join('');

        // Store section data for modal
        window.__zodiacSections = sections;
        window.__zodiacOpenModal = function(idx) {
            const s = window.__zodiacSections[idx];
            if (!s) return;
            const modal = document.getElementById('zodiacSectionModal');
            const bg = document.getElementById('zodiacSectionModalBg');
            modal.querySelector('.zodiac-section-modal__title').textContent = s.icon + ' ' + s.title;
            modal.querySelector('.zodiac-section-modal__text').textContent = s.text;
            bg.classList.add('active');
            document.body.style.overflow = 'hidden';
        };
        window.__zodiacCloseModal = function() {
            document.getElementById('zodiacSectionModalBg').classList.remove('active');
            document.body.style.overflow = '';
        };

        return `
            <section class="zodiac-sections">
                <div class="zodiac-topic-grid">${cards}</div>
            </section>

            <!-- Section detail modal -->
            <div class="zodiac-section-modal-bg" id="zodiacSectionModalBg" onclick="if(event.target===this)window.__zodiacCloseModal()">
                <div class="zodiac-section-modal" id="zodiacSectionModal">
                    <button class="zodiac-section-modal__close" onclick="window.__zodiacCloseModal()">&times;</button>
                    <h2 class="zodiac-section-modal__title"></h2>
                    <div class="zodiac-section-modal__text"></div>
                    <button class="zodiac-section-modal__back" onclick="window.__zodiacCloseModal()">← Вернуться назад</button>
                </div>
            </div>
        `;
    }

    /**
     * Render compatibility section
     */
    renderCompatibility() {
        const compatible = this.zodiacData.compatibleSigns || {};
        let html = '<section class="zodiac-compatibility">';
        html += '<h2 class="zodiac-astrology__title">💕 Совместимость с Другими Знаками</h2>';
        html += '<div class="zodiac-compat-grid">';

        // Excellent matches
        if (compatible.excellent && compatible.excellent.length > 0) {
            html += '<div class="zodiac-compat-section">';
            html += '<h3 class="zodiac-compat-section__title">🟢 Идеальная Совместимость</h3>';
            html += '<div class="zodiac-compat-items">';
            compatible.excellent.forEach(sign => {
                html += `
                    <div class="zodiac-compat-item zodiac-compat-item--excellent">
                        <div class="zodiac-compat-item__sign">${sign}</div>
                        <div class="zodiac-compat-item__level">Идеально</div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Good matches
        if (compatible.good && compatible.good.length > 0) {
            html += '<div class="zodiac-compat-section">';
            html += '<h3 class="zodiac-compat-section__title">🔵 Хорошая Совместимость</h3>';
            html += '<div class="zodiac-compat-items">';
            compatible.good.forEach(sign => {
                html += `
                    <div class="zodiac-compat-item zodiac-compat-item--good">
                        <div class="zodiac-compat-item__sign">${sign}</div>
                        <div class="zodiac-compat-item__level">Хорошо</div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Challenging matches
        if (compatible.challenging && compatible.challenging.length > 0) {
            html += '<div class="zodiac-compat-section">';
            html += '<h3 class="zodiac-compat-section__title">🟠 Сложная Совместимость</h3>';
            html += '<div class="zodiac-compat-items">';
            compatible.challenging.forEach(sign => {
                html += `
                    <div class="zodiac-compat-item zodiac-compat-item--challenging">
                        <div class="zodiac-compat-item__sign">${sign}</div>
                        <div class="zodiac-compat-item__level">Сложно</div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        html += '</div></section>';
        return html;
    }

    /**
     * Render consultation section with advisors and FAQ
     */
    renderConsultation() {
        return `
            <section class="zodiac-consultation">
                <h2 class="zodiac-consultation__title">🔮 Бесплатная Астрологическая Консультация</h2>
                <p class="zodiac-consultation__text">
                    Получите персональные рекомендации о знаке зодиака ${this.zodiacData.name} от наших опытных астрологов.
                    Свяжитесь со специалистами, которые понимают уникальные характеристики Вашего знака.
                </p>

                <div class="zodiac-advisors">
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">🔮</div>
                        <div class="zodiac-advisor__name">Небесный Оракул</div>
                        <div class="zodiac-advisor__specialty">Натальные карты и прогнозы</div>
                    </div>
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">✨</div>
                        <div class="zodiac-advisor__name">Лунная Мистика</div>
                        <div class="zodiac-advisor__specialty">Чтение отношений</div>
                    </div>
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">💫</div>
                        <div class="zodiac-advisor__name">Звёздная Мудрость</div>
                        <div class="zodiac-advisor__specialty">Карьера и финансы</div>
                    </div>
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">🌙</div>
                        <div class="zodiac-advisor__name">Галактический Проводник</div>
                        <div class="zodiac-advisor__specialty">Личностный рост</div>
                    </div>
                </div>

                <div class="zodiac-faq">
                    <h3 class="zodiac-faq__title">❓ Часто Задаваемые Вопросы</h3>
                    ${this.renderFAQItem(
                        'Какие сильные и слабые стороны у этого знака?',
                        'Каждый знак зодиака имеет уникальные сильные стороны и вызовы. ' + this.zodiacData.name + ' известны своими отличительными качествами, которые формируют их личность и взаимодействия.'
                    )}
                    ${this.renderFAQItem(
                        'Как этот знак влияет на отношение к финансам и материальному благосостоянию?',
                        'Ваш знак зодиака влияет на Ваши финансовые привычки и отношение к материальному благосостоянию. Представители знака ' + this.zodiacData.name + ' обычно подходят к деньгам в соответствии со своими характеристиками.'
                    )}
                    ${this.renderFAQItem(
                        'Какую совместимость я могу ожидать с другими знаками?',
                        this.zodiacData.name + ' проявляет различные уровни совместимости с другими знаками зодиака. Некоторые комбинации работают естественно, а другим требуется больше усилий для баланса.'
                    )}
                    ${this.renderFAQItem(
                        'Какие вызовы и возможности связаны с этим знаком?',
                        'Каждый знак сталкивается с конкретными вызовами и возможностями. Понимание этого может помочь представителям ' + this.zodiacData.name + ' лучше ориентироваться в жизни.'
                    )}
                </div>
            </section>
        `;
    }

    /**
     * Helper to render FAQ items
     */
    renderFAQItem(question, answer) {
        return `
            <div class="zodiac-faq-item">
                <div class="zodiac-faq-item__question">
                    <span>${question}</span>
                    <span class="zodiac-faq-item__toggle">▼</span>
                </div>
                <div class="zodiac-faq-item__answer">${answer}</div>
            </div>
        `;
    }

    /**
     * Render all zodiac signs grid (footer)
     */
    renderAllSigns() {
        return `
            <section class="zodiac-all-signs">
                <h2 class="zodiac-all-signs__title">✨ Исследуйте Все Знаки Зодиака</h2>
                <div class="zodiac-signs-grid" id="zodiac-signs-grid">
                    <!-- Знаки будут загружены отсюда -->
                </div>
            </section>
        `;
    }

    /**
     * Initialize interactive elements
     */
    initializeInteractivity() {
        // FAQ accordion
        const faqItems = document.querySelectorAll('.zodiac-faq-item__question');
        faqItems.forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('active');
            });
        });

        // Load all signs grid
        this.loadAllSignsGrid();
    }

    /**
     * Load and display all zodiac signs
     */
    async loadAllSignsGrid() {
        const grid = document.getElementById('zodiac-signs-grid');
        if (!grid || !this.zodiacData) return;

        try {
            // Try to load all signs data
            const response = await fetch('./zodiac-data.json');
            const allSigns = await response.json();

            let gridHTML = '';
            allSigns.forEach(sign => {
                gridHTML += `
                    <a href="./${sign.id}.html" class="zodiac-sign-card">
                        <span class="zodiac-sign-card__icon">${sign.icon}</span>
                        <div class="zodiac-sign-card__name">${sign.name}</div>
                        <div class="zodiac-sign-card__dates">${sign.dates}</div>
                    </a>
                `;
            });

            grid.innerHTML = gridHTML;
        } catch (error) {
            console.error('Failed to load all signs:', error);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ZodiacRenderer();
    renderer.init();
});

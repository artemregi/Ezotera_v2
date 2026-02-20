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
            const response = await fetch('../zodiac-data.json');
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
                ${this.renderConsultation()}
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
                    <h1 class="zodiac-hero__title">${this.zodiacData.name} Horoscope & Personality Profile</h1>
                    <p class="zodiac-hero__dates">${this.zodiacData.datesEng}</p>
                </div>
            </section>
        `;
    }

    /**
     * Render characteristics block (Polarity, Modality, etc.)
     */
    renderCharacteristics() {
        return `
            <section class="zodiac-characteristics">
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Polarity</div>
                    <div class="zodiac-char__value">${this.zodiacData.polarity}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Modality</div>
                    <div class="zodiac-char__value">${this.zodiacData.modality}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Ruling Planet</div>
                    <div class="zodiac-char__value">${this.zodiacData.rulingPlanetEng}</div>
                </div>
                <div class="zodiac-char">
                    <div class="zodiac-char__label">Ruling House</div>
                    <div class="zodiac-char__value">${this.zodiacData.rulingHouse}</div>
                </div>
            </section>
        `;
    }

    /**
     * Render astrology section (traits, likes/dislikes, compatibility)
     */
    renderAstrology() {
        const positiveTraits = this.zodiacData.positiveTraitsEng.slice(0, 4).join(', ');
        const negativeTraits = this.zodiacData.negativeTraitsEng.slice(0, 4).join(', ');
        const likes = this.zodiacData.likesEng.join(', ');
        const dislikes = this.zodiacData.dislikesEng.join(', ');
        const topMatches = this.zodiacData.topLoveMatchesEng.join(', ');

        return `
            <section class="zodiac-astrology">
                <h2 class="zodiac-astrology__title">Astrology Zodiac Sign</h2>
                <div class="zodiac-astrology__grid">
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">Positive Traits</div>
                        <div class="zodiac-astro-item__content">${positiveTraits}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">Negative Traits</div>
                        <div class="zodiac-astro-item__content">${negativeTraits}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">Likes</div>
                        <div class="zodiac-astro-item__content">${likes}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">Dislikes</div>
                        <div class="zodiac-astro-item__content">${dislikes}</div>
                    </div>
                    <div class="zodiac-astro-item">
                        <div class="zodiac-astro-item__title">Top Love Matches</div>
                        <div class="zodiac-astro-item__content">${topMatches}</div>
                    </div>
                </div>
            </section>
        `;
    }

    /**
     * Render birth dates table
     */
    renderBirthDatesTable() {
        const dates = this.zodiacData.birthDates || [];
        const columns = 3;
        let tableHTML = `
            <section class="zodiac-dates-table">
                <h2 class="zodiac-dates-table__title">All Birth Dates for ${this.zodiacData.engName}</h2>
                <table class="zodiac-table">
                    <tbody>
        `;

        for (let i = 0; i < dates.length; i += columns) {
            tableHTML += '<tr>';
            for (let j = 0; j < columns; j++) {
                const date = dates[i + j] || '';
                tableHTML += `<td>${date}</td>`;
            }
            tableHTML += '</tr>';
        }

        tableHTML += `
                    </tbody>
                </table>
            </section>
        `;

        return tableHTML;
    }

    /**
     * Render content sections (element description, strengths, compatibility, philosophy)
     */
    renderContentSections() {
        const textSections = this.zodiacData.textSections || {};

        return `
            <section class="zodiac-sections">
                <article class="zodiac-section">
                    <h2 class="zodiac-section__title">${this.zodiacData.engName}: The ${this.zodiacData.elementEng} Sign of Stability and Sensuality</h2>
                    <div class="zodiac-section__content">
                        ${this.escapeHtml(textSections.element || 'Content about the element sign...')}
                    </div>
                </article>

                <article class="zodiac-section">
                    <h2 class="zodiac-section__title">Strengths, Weaknesses, and Relationship Dynamics</h2>
                    <div class="zodiac-section__content">
                        ${this.escapeHtml(textSections.strengths || 'Content about strengths and weaknesses...')}
                    </div>
                </article>

                <article class="zodiac-section">
                    <h2 class="zodiac-section__title">Compatibility with Other Zodiac Signs</h2>
                    <div class="zodiac-section__content">
                        ${this.escapeHtml(textSections.compatibility || 'Content about compatibility...')}
                    </div>
                </article>

                <article class="zodiac-section">
                    <h2 class="zodiac-section__title">Embracing the ${this.zodiacData.engName} Way</h2>
                    <div class="zodiac-section__content">
                        ${this.escapeHtml(textSections.philosophy || 'Content about philosophy and personal development...')}
                    </div>
                </article>
            </section>
        `;
    }

    /**
     * Render compatibility section
     */
    renderCompatibility() {
        const compatible = this.zodiacData.compatibleSigns || {};
        let html = '<section class="zodiac-compatibility">';
        html += '<h2 class="zodiac-astrology__title">Compatibility with Other Signs</h2>';
        html += '<div class="zodiac-compat-grid">';

        // Excellent matches
        if (compatible.excellent) {
            compatible.excellent.forEach(sign => {
                html += `
                    <div class="zodiac-compat-item zodiac-compat-item--excellent">
                        <div class="zodiac-compat-item__sign">${sign}</div>
                        <div class="zodiac-compat-item__level">Excellent Match</div>
                    </div>
                `;
            });
        }

        // Good matches
        if (compatible.good) {
            compatible.good.forEach(sign => {
                html += `
                    <div class="zodiac-compat-item zodiac-compat-item--good">
                        <div class="zodiac-compat-item__sign">${sign}</div>
                        <div class="zodiac-compat-item__level">Good Match</div>
                    </div>
                `;
            });
        }

        // Challenging matches
        if (compatible.challenging) {
            compatible.challenging.forEach(sign => {
                html += `
                    <div class="zodiac-compat-item zodiac-compat-item--challenging">
                        <div class="zodiac-compat-item__sign">${sign}</div>
                        <div class="zodiac-compat-item__level">Challenging</div>
                    </div>
                `;
            });
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
                <h2 class="zodiac-consultation__title">Free Astrology Consultation</h2>
                <p class="zodiac-consultation__text">
                    Get personalized insights about your zodiac sign from our expert astrologers.
                    Connect with specialists who understand the unique characteristics of ${this.zodiacData.engName}.
                </p>

                <div class="zodiac-advisors">
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">🔮</div>
                        <div class="zodiac-advisor__name">Celestine Oracle</div>
                        <div class="zodiac-advisor__specialty">Natal Charts & Predictions</div>
                    </div>
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">✨</div>
                        <div class="zodiac-advisor__name">Luna Mystique</div>
                        <div class="zodiac-advisor__specialty">Relationship Readings</div>
                    </div>
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">💫</div>
                        <div class="zodiac-advisor__name">Stellar Wisdom</div>
                        <div class="zodiac-advisor__specialty">Career & Finance</div>
                    </div>
                    <div class="zodiac-advisor">
                        <div class="zodiac-advisor__image">🌙</div>
                        <div class="zodiac-advisor__name">Nova Guide</div>
                        <div class="zodiac-advisor__specialty">Personal Growth</div>
                    </div>
                </div>

                <div class="zodiac-faq">
                    <h3 class="zodiac-faq__title">Frequently Asked Questions</h3>
                    ${this.renderFAQItem(
                        'What strengths and weaknesses are associated with this sign?',
                        'Every zodiac sign has unique strengths and challenges. ' + this.zodiacData.engName + ' is known for their distinctive qualities that shape their personality and interactions.'
                    )}
                    ${this.renderFAQItem(
                        'How does this zodiac sign affect approach to finances and material wealth?',
                        'Your zodiac sign influences your financial habits and relationship with material wealth. ' + this.zodiacData.engName + ' natives typically approach money with their characteristic traits.'
                    )}
                    ${this.renderFAQItem(
                        'What compatibility can I expect with other signs?',
                        this.zodiacData.engName + ' shows varying levels of compatibility with different zodiac signs. Some combinations flow naturally, while others require more effort to balance.'
                    )}
                    ${this.renderFAQItem(
                        'What horoscopes or challenges can often be associated with this sign?',
                        'Each sign faces specific challenges and opportunities. Understanding these can help ' + this.zodiacData.engName + ' natives navigate life with greater awareness.'
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
        // This would typically load all signs from the data
        // For now, we'll create a placeholder that references external data
        return `
            <section class="zodiac-all-signs">
                <h2 class="zodiac-all-signs__title">Explore All Zodiac Signs</h2>
                <div class="zodiac-signs-grid" id="zodiac-signs-grid">
                    <!-- Signs will be loaded here -->
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
            const response = await fetch('../zodiac-data.json');
            const allSigns = await response.json();

            let gridHTML = '';
            allSigns.forEach(sign => {
                gridHTML += `
                    <a href="./${sign.id}.html" class="zodiac-sign-card">
                        <span class="zodiac-sign-card__icon">${sign.icon}</span>
                        <div class="zodiac-sign-card__name">${sign.engName}</div>
                        <div class="zodiac-sign-card__dates">${sign.datesEng}</div>
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

/**
 * Palmistry Page — Interaction Handlers
 * Wires CTA buttons to the PalmistryUpload modal.
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // Init the upload / analysis module (defined in palmistry-upload.js)
        if (window.PalmistryUpload) {
            window.PalmistryUpload.init();
        }

        // Wire all CTA buttons to open the modal
        const ctaButtons = [
            document.getElementById('cta-hero-primary'),
            document.getElementById('cta-final-primary'),
        ];

        ctaButtons.forEach(function (btn) {
            if (!btn) return;
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (window.PalmistryUpload) {
                    window.PalmistryUpload.openModal();
                }
            });
        });

        // Smooth scroll for internal anchor links
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });
    });

})();

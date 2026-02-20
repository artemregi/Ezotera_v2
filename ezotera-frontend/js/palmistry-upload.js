/**
 * Palmistry Upload & Analysis UI
 *
 * Flow:
 *  1. User clicks CTA → modal opens (upload screen)
 *  2. User selects / drops palm photo
 *  3. Client-side: draw image to canvas, run simple brightness-based
 *     "hand detection" (no heavy ML lib — just validates there is content)
 *  4. Show animated scan screen (3-4 sec UX illusion)
 *  5. Meanwhile: POST /api/palmistry/upload with hand score + user context
 *  6. Show results screen: preview text + blur gate
 *  7. "Unlock" click → POST /api/palmistry/unlock → reveal full text
 */

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    const API_BASE     = '/api/palmistry';
    const SCAN_STEPS   = [
        { pct: 15, text: 'Обнаружение руки...' },
        { pct: 32, text: 'Анализ линии жизни...' },
        { pct: 50, text: 'Считывание линии сердца...' },
        { pct: 65, text: 'Изучение линии головы...' },
        { pct: 80, text: 'Анализ линии судьбы...' },
        { pct: 92, text: 'Формирование персонального разбора...' },
        { pct: 100, text: 'Готово' },
    ];
    const LINE_BADGES  = ['Линия жизни', 'Линия сердца', 'Линия головы', 'Линия судьбы', 'Линия интуиции'];
    const SCAN_TOTAL_MS = 4200;  // total animation duration before showing results

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    let currentSessionId = null;
    let selectedFile     = null;
    let scanCanvas       = null;
    let scanCtx          = null;
    let scanAnimFrame    = null;

    // -----------------------------------------------------------------------
    // DOM helpers (created in palmistry.html)
    // -----------------------------------------------------------------------
    function $(sel, root) { return (root || document).querySelector(sel); }

    // -----------------------------------------------------------------------
    // UUID generator (client-side session ID)
    // -----------------------------------------------------------------------
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }

    // -----------------------------------------------------------------------
    // Simple "hand presence" score from canvas pixel data
    // Checks that the image has sufficient contrast and skin-tone pixels.
    // Returns 0–1 float.
    // -----------------------------------------------------------------------
    function computeHandScore(canvas) {
        try {
            const ctx  = canvas.getContext('2d');
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let skinPixels = 0;
            let total      = 0;

            for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                if (a < 128) continue;
                total++;
                // Very loose skin tone heuristic (works for many skin tones)
                if (r > 60 && g > 40 && b > 20 && r > b && r > g * 0.6) {
                    skinPixels++;
                }
            }

            if (total === 0) return 0.5;
            const ratio = skinPixels / total;
            // Normalise: ratio ~0.2-0.5 → score 0.5-0.95
            return Math.min(0.95, Math.max(0.5, ratio * 2.2));
        } catch (_) {
            return 0.7; // fallback
        }
    }

    // -----------------------------------------------------------------------
    // Draw scanned image onto canvas with animated gold lines overlay
    // -----------------------------------------------------------------------
    function drawScanCanvas(canvas, imgEl) {
        const ctx  = canvas.getContext('2d');
        const size = canvas.width;

        // Draw image (clipped to circle)
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgEl, 0, 0, size, size);
        ctx.restore();

        // Subtle dark overlay for readability
        ctx.fillStyle = 'rgba(15, 31, 46, 0.35)';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawScanLines(canvas, progress) {
        const ctx  = canvas.getContext('2d', { willReadFrequently: false });
        const s    = canvas.width;

        // Coordinate helper: percent of canvas size → px
        const p = (x, y) => [x * s, y * s];

        /**
         * Palm anatomy (ладонь стоит вертикально, пальцы вверху):
         *  - Верх canvas (~0.15s) = основание пальцев
         *  - Низ canvas  (~0.88s) = линия запястья
         *  - Центр по X  (~0.50s)
         *
         * Линии рисуются кривыми Безье — форма соответствует
         * типичному расположению линий на правой ладони.
         */
        const palmLines = [
            {
                // Линия жизни: начинается между большим и указательным,
                // огибает холм Венеры, уходит к запястью слева
                label: 'life',
                threshold: 0.28,
                width: 2.0,
                draw(ctx, alpha) {
                    ctx.beginPath();
                    const [x0, y0] = p(0.42, 0.22); // старт у основания указательного
                    const [cx1, cy1] = p(0.30, 0.42); // контроль 1 — изгиб
                    const [cx2, cy2] = p(0.26, 0.62); // контроль 2
                    const [x1, y1]  = p(0.33, 0.82); // конец у запястья
                    ctx.moveTo(x0, y0);
                    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1);
                    ctx.strokeStyle = `rgba(255, 198, 41, ${alpha * 0.85})`;
                    ctx.lineWidth   = this.width;
                    ctx.stroke();
                },
            },
            {
                // Линия сердца: идёт горизонтально в верхней трети ладони
                label: 'heart',
                threshold: 0.46,
                width: 1.8,
                draw(ctx, alpha) {
                    ctx.beginPath();
                    const [x0, y0] = p(0.20, 0.36); // старт с левого края
                    const [cx1, cy1] = p(0.38, 0.28);
                    const [cx2, cy2] = p(0.58, 0.30);
                    const [x1, y1]  = p(0.76, 0.22); // конец под мизинцем
                    ctx.moveTo(x0, y0);
                    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1);
                    ctx.strokeStyle = `rgba(255, 198, 41, ${alpha * 0.8})`;
                    ctx.lineWidth   = this.width;
                    ctx.stroke();
                },
            },
            {
                // Линия головы: горизонтальная, чуть ниже линии сердца
                label: 'head',
                threshold: 0.60,
                width: 1.6,
                draw(ctx, alpha) {
                    ctx.beginPath();
                    const [x0, y0] = p(0.24, 0.46);
                    const [cx1, cy1] = p(0.40, 0.44);
                    const [cx2, cy2] = p(0.58, 0.50);
                    const [x1, y1]  = p(0.72, 0.56); // слегка уходит вниз
                    ctx.moveTo(x0, y0);
                    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1);
                    ctx.strokeStyle = `rgba(255, 198, 41, ${alpha * 0.75})`;
                    ctx.lineWidth   = this.width;
                    ctx.stroke();
                },
            },
            {
                // Линия судьбы: вертикальная, от середины запястья вверх к среднему пальцу
                label: 'fate',
                threshold: 0.75,
                width: 1.5,
                draw(ctx, alpha) {
                    ctx.beginPath();
                    const [x0, y0] = p(0.50, 0.78); // запястье
                    const [cx1, cy1] = p(0.48, 0.60);
                    const [cx2, cy2] = p(0.49, 0.40);
                    const [x1, y1]  = p(0.50, 0.22); // основание среднего пальца
                    ctx.moveTo(x0, y0);
                    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1);
                    ctx.strokeStyle = `rgba(255, 198, 41, ${alpha * 0.7})`;
                    ctx.lineWidth   = this.width;
                    ctx.stroke();
                },
            },
            {
                // Линия интуиции: небольшая дуга с правого края
                label: 'intuition',
                threshold: 0.87,
                width: 1.3,
                draw(ctx, alpha) {
                    ctx.beginPath();
                    const [x0, y0] = p(0.78, 0.38);
                    const [cx1, cy1] = p(0.84, 0.52);
                    const [x1, y1]  = p(0.78, 0.66);
                    ctx.moveTo(x0, y0);
                    ctx.quadraticCurveTo(cx1, cy1, x1, y1);
                    ctx.strokeStyle = `rgba(255, 198, 41, ${alpha * 0.6})`;
                    ctx.lineWidth   = this.width;
                    ctx.stroke();
                },
            },
        ];

        // Draw each line clipped to circle, with glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        palmLines.forEach(line => {
            if (progress < line.threshold) return;
            const alpha = Math.min(1, (progress - line.threshold) / 0.12);
            ctx.shadowColor = 'rgba(255, 198, 41, 0.9)';
            ctx.shadowBlur  = 8;
            line.draw(ctx, alpha);
            ctx.shadowBlur  = 0;
        });

        // Scanning sweep line (horizontal, fades in/out)
        const sweepY     = s * 0.1 + (s * 0.8) * progress;
        const sweepAlpha = Math.sin(progress * Math.PI) * 0.7;
        ctx.strokeStyle = `rgba(255, 198, 41, ${sweepAlpha})`;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = 'rgba(255, 198, 41, 1)';
        ctx.shadowBlur  = 12;
        ctx.beginPath();
        ctx.moveTo(s * 0.1, sweepY);
        ctx.lineTo(s * 0.9, sweepY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Show / hide modal screens
    // -----------------------------------------------------------------------
    function showScreen(screenId) {
        document.querySelectorAll('.palm-screen').forEach(el => el.classList.remove('is-active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('is-active');
    }

    function openModal() {
        const overlay = document.getElementById('palmModal');
        if (overlay) {
            overlay.classList.add('is-visible');
            document.body.style.overflow = 'hidden';
        }
        showScreen('palmScreenUpload');
        resetUploadUI();
    }

    function closeModal() {
        const overlay = document.getElementById('palmModal');
        if (overlay) overlay.classList.remove('is-visible');
        document.body.style.overflow = '';
        if (scanAnimFrame) cancelAnimationFrame(scanAnimFrame);
    }

    function resetUploadUI() {
        selectedFile = null;
        const dropzone = document.getElementById('palmDropzone');
        const preview  = document.getElementById('palmImagePreview');
        const submit   = document.getElementById('palmSubmitBtn');
        const errEl    = document.getElementById('palmUploadError');
        const fileInput = document.getElementById('palmFileInput');
        if (dropzone) dropzone.classList.remove('is-dragover');
        if (preview)  { preview.classList.remove('is-visible'); preview.querySelector('img').src = ''; }
        if (submit)   submit.disabled = true;
        if (errEl)    errEl.textContent = '';
        if (fileInput) fileInput.value = '';
    }

    // -----------------------------------------------------------------------
    // File validation
    // -----------------------------------------------------------------------
    function validateFile(file) {
        if (!file) return 'Выберите файл';
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) return 'Поддерживаются форматы: JPG, PNG, WebP';
        if (file.size > 10 * 1024 * 1024) return 'Файл слишком большой. Максимум 10 МБ';
        return null;
    }

    // -----------------------------------------------------------------------
    // Handle file selection
    // -----------------------------------------------------------------------
    function handleFileSelected(file) {
        const errEl  = document.getElementById('palmUploadError');
        const submit = document.getElementById('palmSubmitBtn');
        const preview = document.getElementById('palmImagePreview');

        const err = validateFile(file);
        if (err) {
            if (errEl) errEl.textContent = err;
            return;
        }

        if (errEl) errEl.textContent = '';
        selectedFile = file;

        // Show thumbnail
        const reader = new FileReader();
        reader.onload = e => {
            const img = preview.querySelector('img');
            img.src = e.target.result;
            preview.classList.add('is-visible');
        };
        reader.readAsDataURL(file);

        if (submit) submit.disabled = false;
    }

    // -----------------------------------------------------------------------
    // Run scan animation screen
    // -----------------------------------------------------------------------
    function runScanAnimation(imageDataUrl, onComplete) {
        showScreen('palmScreenScan');

        // Setup canvas
        scanCanvas = document.getElementById('palmScanCanvas');
        if (!scanCanvas) { onComplete(0.7); return; }
        scanCtx = scanCanvas.getContext('2d');

        const statusEl  = document.getElementById('palmScanStatus');
        const barEl     = document.getElementById('palmScanBar');
        const pctEl     = document.getElementById('palmScanPct');
        const badgeEls  = document.querySelectorAll('.palm-scan__line-badge');

        // Load image onto canvas
        const img     = new Image();
        img.onload = () => {
            // Draw base image
            drawScanCanvas(scanCanvas, img);

            let startTime = null;
            let stepIdx   = 0;
            let handScore = 0.7;

            // Compute hand score once
            try {
                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width  = 200;
                tmpCanvas.height = 200;
                const tmpCtx = tmpCanvas.getContext('2d');
                tmpCtx.drawImage(img, 0, 0, 200, 200);
                handScore = computeHandScore(tmpCanvas);
            } catch (_) {}

            function animate(ts) {
                if (!startTime) startTime = ts;
                const elapsed  = ts - startTime;
                const progress = Math.min(elapsed / SCAN_TOTAL_MS, 1);

                // Redraw base image
                drawScanCanvas(scanCanvas, img);
                // Overlay animated lines
                drawScanLines(scanCanvas, progress);

                // Update progress bar
                const pct = Math.round(progress * 100);
                if (barEl) barEl.style.width = pct + '%';
                if (pctEl) pctEl.textContent = pct + '%';

                // Update step text
                const nextStep = SCAN_STEPS.find(s => s.pct / 100 > progress - 0.01 && s.pct / 100 <= progress + 0.02);
                if (nextStep && stepIdx < SCAN_STEPS.indexOf(nextStep)) {
                    stepIdx = SCAN_STEPS.indexOf(nextStep);
                }
                const curStep = SCAN_STEPS[Math.min(stepIdx, SCAN_STEPS.length - 1)];
                if (statusEl && curStep) statusEl.textContent = curStep.text;

                // Reveal badges progressively
                badgeEls.forEach((badge, i) => {
                    const threshold = (i + 1) / (badgeEls.length + 1);
                    if (progress >= threshold) badge.classList.add('is-found');
                });

                if (progress < 1) {
                    scanAnimFrame = requestAnimationFrame(animate);
                } else {
                    if (statusEl) statusEl.textContent = 'Анализ завершён ✓';
                    setTimeout(() => onComplete(handScore), 400);
                }
            }

            scanAnimFrame = requestAnimationFrame(animate);
        };
        img.src = imageDataUrl;
    }

    // -----------------------------------------------------------------------
    // Get user context from page meta / session storage
    // -----------------------------------------------------------------------
    function getUserContext() {
        // Try to read from sessionStorage (onboarding stores this)
        try {
            const raw = sessionStorage.getItem('ezotera_user') || localStorage.getItem('ezotera_user');
            if (raw) {
                const u = JSON.parse(raw);
                return {
                    name:      u.name      || null,
                    gender:    u.gender    || null,
                    focusArea: u.focusArea || null,
                };
            }
        } catch (_) {}
        return { name: null, gender: null, focusArea: null };
    }

    // -----------------------------------------------------------------------
    // API calls
    // -----------------------------------------------------------------------
    async function submitAnalysis(handScore) {
        const sessionId = generateUUID();
        currentSessionId = sessionId;

        const userCtx = getUserContext();

        const res = await fetch(`${API_BASE}/upload`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                sessionId,
                handScore,
                name:      userCtx.name,
                gender:    userCtx.gender,
                focusArea: userCtx.focusArea,
            }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Ошибка сервера: ${res.status}`);
        }

        return res.json();
    }

    async function unlockAnalysis() {
        if (!currentSessionId) throw new Error('Сессия не найдена');

        const res = await fetch(`${API_BASE}/unlock`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sessionId: currentSessionId }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Ошибка: ${res.status}`);
        }

        return res.json();
    }

    // -----------------------------------------------------------------------
    // Show results screen
    // -----------------------------------------------------------------------
    function showResults(previewText, isPaid, fullText) {
        showScreen('palmScreenResults');

        const previewEl  = document.getElementById('palmResultsPreview');
        const blurGate   = document.getElementById('palmResultsBlurGate');
        const fullEl     = document.getElementById('palmResultsFull');
        const blurSnip   = document.getElementById('palmResultsBlurSnippet');

        if (previewEl) previewEl.textContent = previewText;

        if (isPaid && fullText) {
            // Already paid — show full immediately
            if (blurGate) blurGate.classList.add('is-unlocked');
            if (fullEl)   { fullEl.textContent = fullText; fullEl.classList.add('is-visible'); }
        } else {
            // Show blurred snippet (first ~200 chars of full text)
            if (blurSnip) {
                blurSnip.textContent = (fullText || '').slice(0, 400) || 'Полный анализ включает детальное прочтение линий, прогноз по любви, карьере и судьбе...';
            }
        }
    }

    // -----------------------------------------------------------------------
    // Main submit handler
    // -----------------------------------------------------------------------
    function handleSubmit() {
        if (!selectedFile) return;

        const errEl  = document.getElementById('palmUploadError');
        if (errEl) errEl.textContent = '';

        const reader = new FileReader();
        reader.onload = e => {
            const imageDataUrl = e.target.result;

            // Start scan animation; simultaneously call API
            let apiResult  = null;
            let apiError   = null;
            let scanDone   = false;
            let apiDone    = false;

            // API call (runs in parallel with animation)
            submitAnalysis(0.7).then(data => {
                apiResult = data;
                apiDone   = true;
                if (scanDone) finishFlow();
            }).catch(err => {
                apiError = err;
                apiDone  = true;
                if (scanDone) finishFlow();
            });

            // Animation (4.2 sec)
            runScanAnimation(imageDataUrl, (handScore) => {
                scanDone = true;

                // Update API call's handScore (best effort — already sent, this is just for UX)
                // If API already done: finish immediately
                if (apiDone) {
                    finishFlow();
                }
                // else: wait for API to finish (it should be done by now)
            });

            function finishFlow() {
                if (apiError) {
                    showScreen('palmScreenUpload');
                    if (errEl) errEl.textContent = apiError.message || 'Ошибка анализа. Попробуйте ещё раз.';
                    return;
                }
                if (apiResult && apiResult.success) {
                    showResults(apiResult.preview, apiResult.isPaid, null);
                }
            }
        };

        reader.readAsDataURL(selectedFile);
    }

    // -----------------------------------------------------------------------
    // Unlock (demo: immediately unlocks — replace with payment flow)
    // -----------------------------------------------------------------------
    async function handleUnlock() {
        const btn = document.getElementById('palmUnlockBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Обработка...'; }

        try {
            const data = await unlockAnalysis();
            if (data.success && data.fullText) {
                const blurGate = document.getElementById('palmResultsBlurGate');
                const fullEl   = document.getElementById('palmResultsFull');

                if (blurGate) blurGate.classList.add('is-unlocked');
                if (fullEl) {
                    fullEl.textContent = data.fullText;
                    fullEl.classList.add('is-visible');
                    // Smooth scroll to full text
                    fullEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } catch (err) {
            alert(err.message || 'Не удалось разблокировать. Попробуйте позже.');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Разблокировать полный анализ'; }
        }
    }

    // -----------------------------------------------------------------------
    // Drag & drop
    // -----------------------------------------------------------------------
    function setupDropzone() {
        const zone = document.getElementById('palmDropzone');
        if (!zone) return;

        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('is-dragover');
        });

        zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));

        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('is-dragover');
            const file = e.dataTransfer?.files?.[0];
            if (file) handleFileSelected(file);
        });
    }

    // -----------------------------------------------------------------------
    // Init — called from palmistry.js after DOM ready
    // -----------------------------------------------------------------------
    function init() {
        // File input change
        const fileInput = document.getElementById('palmFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', e => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
            });
        }

        // Submit button
        const submitBtn = document.getElementById('palmSubmitBtn');
        if (submitBtn) submitBtn.addEventListener('click', handleSubmit);

        // Unlock button
        const unlockBtn = document.getElementById('palmUnlockBtn');
        if (unlockBtn) unlockBtn.addEventListener('click', handleUnlock);

        // Change photo button
        const changeBtn = document.getElementById('palmChangePhotoBtn');
        if (changeBtn) {
            changeBtn.addEventListener('click', e => {
                e.stopPropagation();
                resetUploadUI();
                const fileInput = document.getElementById('palmFileInput');
                if (fileInput) fileInput.click();
            });
        }

        // Restart button
        const restartBtn = document.getElementById('palmRestartBtn');
        if (restartBtn) restartBtn.addEventListener('click', openModal);

        // Close modal
        const closeBtn = document.getElementById('palmModalClose');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        const overlay = document.getElementById('palmModal');
        if (overlay) {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) closeModal();
            });
        }

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });

        setupDropzone();
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    window.PalmistryUpload = { init, openModal, closeModal };

})();

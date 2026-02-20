/**
 * Palmistry Upload & Analysis UI
 *
 * Flow:
 *  1. User clicks CTA → modal opens (upload screen)
 *  2. User selects / drops palm photo
 *  3. MediaPipe Hands detects 21 landmarks on the image
 *  4. Show animated scan screen: sweep + real palm lines drawn from landmarks
 *  5. Meanwhile: POST /api/palmistry/upload with hand score + user context
 *  6. Show results screen: preview text + blur gate
 *  7. "Unlock" click → POST /api/palmistry/unlock → reveal full text
 */

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    const API_BASE      = '/api/palmistry';
    const SCAN_TOTAL_MS = 8000;
    const SCAN_STEPS    = [
        { pct: 10, text: 'Обнаружение руки...' },
        { pct: 28, text: 'Анализ линии жизни...' },
        { pct: 48, text: 'Считывание линии сердца...' },
        { pct: 64, text: 'Изучение линии головы...' },
        { pct: 78, text: 'Анализ линии судьбы...' },
        { pct: 92, text: 'Формирование персонального разбора...' },
        { pct: 100, text: 'Готово' },
    ];

    // MediaPipe Hands landmark indices
    // https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
    const LM = {
        WRIST:      0,
        THUMB_CMC:  1,  THUMB_MCP:  2,  THUMB_IP:   3,  THUMB_TIP:   4,
        INDEX_MCP:  5,  INDEX_PIP:  6,  INDEX_DIP:  7,  INDEX_TIP:   8,
        MIDDLE_MCP: 9,  MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP:  12,
        RING_MCP:   13, RING_PIP:   14, RING_DIP:   15, RING_TIP:    16,
        PINKY_MCP:  17, PINKY_PIP:  18, PINKY_DIP:  19, PINKY_TIP:   20,
    };

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    let currentSessionId = null;
    let selectedFile     = null;
    let scanCanvas       = null;
    let scanAnimFrame    = null;
    let detectedLandmarks = null; // null = no detection yet

    // -----------------------------------------------------------------------
    // UUID generator
    // -----------------------------------------------------------------------
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }

    // -----------------------------------------------------------------------
    // MediaPipe Hands — detect landmarks from an HTMLImageElement
    // Returns array of 21 {x,y} normalised (0-1) or null on failure
    // -----------------------------------------------------------------------
    async function detectHandLandmarks(imgEl) {
        try {
            // MediaPipe is loaded via CDN in palmistry.html
            if (typeof window.HandLandmarker === 'undefined' &&
                typeof window.mpHands        === 'undefined') {
                return null;
            }

            // Use the Tasks Vision API if available (newer MediaPipe)
            if (window.__palmHandLandmarker) {
                const result = window.__palmHandLandmarker.detect(imgEl);
                if (result.landmarks && result.landmarks.length > 0) {
                    return result.landmarks[0]; // first hand
                }
                return null;
            }

            return null;
        } catch (e) {
            console.warn('[palmistry] Hand detection failed:', e.message);
            return null;
        }
    }

    // -----------------------------------------------------------------------
    // Convert normalised landmark {x,y} → canvas px, accounting for image
    // aspect ratio centering (we letterbox/pillarbox the image in the circle)
    // -----------------------------------------------------------------------
    function lmToPx(lm, canvasSize, imgW, imgH) {
        const scale = Math.min(canvasSize / imgW, canvasSize / imgH);
        const offX  = (canvasSize - imgW * scale) / 2;
        const offY  = (canvasSize - imgH * scale) / 2;
        return {
            x: offX + lm.x * imgW * scale,
            y: offY + lm.y * imgH * scale,
        };
    }

    // -----------------------------------------------------------------------
    // Draw base image onto canvas (square, centered, clipped to circle)
    // -----------------------------------------------------------------------
    function drawBaseImage(canvas, imgEl) {
        const ctx  = canvas.getContext('2d');
        const size = canvas.width;
        const scale = Math.min(size / imgEl.naturalWidth, size / imgEl.naturalHeight);
        const w    = imgEl.naturalWidth  * scale;
        const h    = imgEl.naturalHeight * scale;
        const ox   = (size - w) / 2;
        const oy   = (size - h) / 2;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgEl, ox, oy, w, h);

        // Dark overlay for line visibility
        ctx.fillStyle = 'rgba(10, 20, 30, 0.40)';
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Build palm line paths from 21 MediaPipe landmarks
    //
    // Palmistry lines mapped to landmarks:
    //   Life line   — from between thumb/index, curves around thumb mount
    //                 approximated: THUMB_MCP → WRIST arc via INDEX_MCP
    //   Heart line  — across upper palm: PINKY_MCP → INDEX_MCP
    //   Head line   — middle palm:       THUMB_MCP → RING_MCP
    //   Fate line   — vertical center:   WRIST → MIDDLE_MCP
    // -----------------------------------------------------------------------
    function buildPalmLines(lms, canvasSize, imgW, imgH) {
        const t = id => lmToPx(lms[id], canvasSize, imgW, imgH);

        const wrist  = t(LM.WRIST);
        const tCmc   = t(LM.THUMB_CMC);
        const tMcp   = t(LM.THUMB_MCP);
        const iMcp   = t(LM.INDEX_MCP);
        const mMcp   = t(LM.MIDDLE_MCP);
        const rMcp   = t(LM.RING_MCP);
        const pMcp   = t(LM.PINKY_MCP);

        // Life line: starts between THUMB_MCP and INDEX_MCP,
        // curves down around the thumb mount to the wrist
        const lifeStart = {
            x: (tMcp.x + iMcp.x) / 2,
            y: (tMcp.y + iMcp.y) / 2,
        };
        const lifeCtrl1 = {
            x: tMcp.x - (iMcp.x - tMcp.x) * 0.3,
            y: tMcp.y + (wrist.y - tMcp.y) * 0.35,
        };
        const lifeCtrl2 = {
            x: tCmc.x,
            y: tCmc.y + (wrist.y - tCmc.y) * 0.5,
        };

        // Heart line: PINKY_MCP → INDEX_MCP (slight curve upward)
        const heartMid = {
            x: (pMcp.x + iMcp.x) / 2,
            y: Math.min(pMcp.y, iMcp.y) - (Math.abs(pMcp.y - iMcp.y) * 0.15 + 8),
        };

        // Head line: THUMB_MCP → RING_MCP (slight downward curve)
        const headStart = {
            x: (tMcp.x + iMcp.x) / 2,
            y: (tMcp.y + iMcp.y) / 2 + (wrist.y - iMcp.y) * 0.15,
        };
        const headCtrl = {
            x: (headStart.x + rMcp.x) / 2,
            y: (headStart.y + rMcp.y) / 2 + (wrist.y - mMcp.y) * 0.08,
        };

        // Fate line: WRIST → MIDDLE_MCP
        const fateCtrl = {
            x: (wrist.x + mMcp.x) / 2 + (mMcp.x - wrist.x) * 0.05,
            y: (wrist.y + mMcp.y) / 2,
        };

        return [
            {
                label:     'life',
                threshold: 0.25,
                width:     2.2,
                alpha:     0.90,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(lifeStart.x, lifeStart.y);
                    ctx.bezierCurveTo(
                        lifeCtrl1.x, lifeCtrl1.y,
                        lifeCtrl2.x, lifeCtrl2.y,
                        wrist.x, wrist.y
                    );
                },
            },
            {
                label:     'heart',
                threshold: 0.44,
                width:     2.0,
                alpha:     0.85,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(pMcp.x, pMcp.y);
                    ctx.quadraticCurveTo(heartMid.x, heartMid.y, iMcp.x, iMcp.y);
                },
            },
            {
                label:     'head',
                threshold: 0.60,
                width:     1.8,
                alpha:     0.80,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(headStart.x, headStart.y);
                    ctx.quadraticCurveTo(headCtrl.x, headCtrl.y, rMcp.x, rMcp.y);
                },
            },
            {
                label:     'fate',
                threshold: 0.76,
                width:     1.5,
                alpha:     0.70,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(wrist.x, wrist.y);
                    ctx.quadraticCurveTo(fateCtrl.x, fateCtrl.y, mMcp.x, mMcp.y);
                },
            },
        ];
    }

    // -----------------------------------------------------------------------
    // Fallback lines when MediaPipe finds no hand
    // Uses proportional Bezier paths relative to image bounds
    // (better than fixed arcs — adapts to canvas size)
    // -----------------------------------------------------------------------
    function buildFallbackLines(canvasSize) {
        const s = canvasSize;
        const p = (x, y) => ({ x: x * s, y: y * s });

        // Estimate palm region: roughly centre of canvas, slight top bias
        const wrist  = p(0.50, 0.82);
        const iMcp   = p(0.44, 0.22);
        const mMcp   = p(0.52, 0.18);
        const rMcp   = p(0.60, 0.20);
        const pMcp   = p(0.68, 0.26);
        const tMcp   = p(0.32, 0.34);
        const tCmc   = p(0.28, 0.46);

        const lifeStart = { x: (tMcp.x + iMcp.x) / 2, y: (tMcp.y + iMcp.y) / 2 };
        const lifeC1    = { x: tMcp.x - 12, y: tMcp.y + (wrist.y - tMcp.y) * 0.35 };
        const lifeC2    = { x: tCmc.x,      y: tCmc.y + (wrist.y - tCmc.y) * 0.5  };

        const heartMid = {
            x: (pMcp.x + iMcp.x) / 2,
            y: Math.min(pMcp.y, iMcp.y) - 10,
        };
        const headStart = {
            x: lifeStart.x,
            y: lifeStart.y + (wrist.y - lifeStart.y) * 0.22,
        };
        const headCtrl = {
            x: (headStart.x + rMcp.x) / 2,
            y: (headStart.y + rMcp.y) / 2 + 6,
        };
        const fateCtrl = { x: (wrist.x + mMcp.x) / 2, y: (wrist.y + mMcp.y) / 2 };

        return [
            {
                label: 'life', threshold: 0.25, width: 2.2, alpha: 0.90,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(lifeStart.x, lifeStart.y);
                    ctx.bezierCurveTo(lifeC1.x, lifeC1.y, lifeC2.x, lifeC2.y, wrist.x, wrist.y);
                },
            },
            {
                label: 'heart', threshold: 0.44, width: 2.0, alpha: 0.85,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(pMcp.x, pMcp.y);
                    ctx.quadraticCurveTo(heartMid.x, heartMid.y, iMcp.x, iMcp.y);
                },
            },
            {
                label: 'head', threshold: 0.60, width: 1.8, alpha: 0.80,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(headStart.x, headStart.y);
                    ctx.quadraticCurveTo(headCtrl.x, headCtrl.y, rMcp.x, rMcp.y);
                },
            },
            {
                label: 'fate', threshold: 0.76, width: 1.5, alpha: 0.70,
                draw(ctx) {
                    ctx.beginPath();
                    ctx.moveTo(wrist.x, wrist.y);
                    ctx.quadraticCurveTo(fateCtrl.x, fateCtrl.y, mMcp.x, mMcp.y);
                },
            },
        ];
    }

    // -----------------------------------------------------------------------
    // Draw one animation frame: base image + progressive palm lines + sweep
    // -----------------------------------------------------------------------
    function drawFrame(canvas, imgEl, palmLines, progress) {
        const ctx  = canvas.getContext('2d');
        const size = canvas.width;

        drawBaseImage(canvas, imgEl);

        ctx.save();
        // Clip all overlays to the circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        // Draw palm lines progressively
        palmLines.forEach(line => {
            if (progress < line.threshold) return;
            const a = Math.min(1, (progress - line.threshold) / 0.14);
            ctx.save();
            ctx.shadowColor = 'rgba(255, 198, 41, 0.9)';
            ctx.shadowBlur  = 10;
            ctx.strokeStyle = `rgba(255, 198, 41, ${a * line.alpha})`;
            ctx.lineWidth   = line.width;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            line.draw(ctx);
            ctx.stroke();
            ctx.restore();
        });

        // Horizontal sweep line
        const sweepY     = size * 0.05 + (size * 0.90) * progress;
        const sweepAlpha = Math.sin(progress * Math.PI) * 0.65;
        ctx.strokeStyle = `rgba(255, 198, 41, ${sweepAlpha})`;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = 'rgba(255, 198, 41, 1)';
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.moveTo(size * 0.05, sweepY);
        ctx.lineTo(size * 0.95, sweepY);
        ctx.stroke();

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
        selectedFile      = null;
        detectedLandmarks = null;
        const dropzone  = document.getElementById('palmDropzone');
        const preview   = document.getElementById('palmImagePreview');
        const submit    = document.getElementById('palmSubmitBtn');
        const errEl     = document.getElementById('palmUploadError');
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
    // Run scan animation — attempts MediaPipe detection first, then animates
    // -----------------------------------------------------------------------
    function runScanAnimation(imageDataUrl, onComplete) {
        showScreen('palmScreenScan');

        scanCanvas = document.getElementById('palmScanCanvas');
        if (!scanCanvas) { onComplete(0.7); return; }

        const statusEl = document.getElementById('palmScanStatus');
        const barEl    = document.getElementById('palmScanBar');
        const pctEl    = document.getElementById('palmScanPct');
        const badgeEls = document.querySelectorAll('.palm-scan__line-badge');

        if (statusEl) statusEl.textContent = 'Обнаружение руки...';

        const img = new Image();
        img.onload = async () => {
            // Draw initial frame while detecting
            drawBaseImage(scanCanvas, img);

            // --- MediaPipe detection ---
            let palmLines;
            let handScore = 0.72;

            try {
                const lms = await detectHandLandmarks(img);
                if (lms && lms.length === 21) {
                    detectedLandmarks = lms;
                    handScore = 0.92;
                    palmLines = buildPalmLines(
                        lms,
                        scanCanvas.width,
                        img.naturalWidth,
                        img.naturalHeight
                    );
                    if (statusEl) statusEl.textContent = 'Рука обнаружена ✓';
                } else {
                    palmLines = buildFallbackLines(scanCanvas.width);
                }
            } catch (_) {
                palmLines = buildFallbackLines(scanCanvas.width);
            }

            // --- Animation loop ---
            let startTime = null;
            let stepIdx   = 0;

            function animate(ts) {
                if (!startTime) startTime = ts;
                const elapsed  = ts - startTime;
                const progress = Math.min(elapsed / SCAN_TOTAL_MS, 1);

                drawFrame(scanCanvas, img, palmLines, progress);

                const pct = Math.round(progress * 100);
                if (barEl) barEl.style.width  = pct + '%';
                if (pctEl) pctEl.textContent  = pct + '%';

                // Step messages
                for (let i = SCAN_STEPS.length - 1; i >= 0; i--) {
                    if (progress >= SCAN_STEPS[i].pct / 100) {
                        if (stepIdx !== i) {
                            stepIdx = i;
                            if (statusEl) statusEl.textContent = SCAN_STEPS[i].text;
                        }
                        break;
                    }
                }

                // Reveal badges
                badgeEls.forEach((badge, i) => {
                    if (progress >= (i + 1) / (badgeEls.length + 1)) {
                        badge.classList.add('is-found');
                    }
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
    // Get user context from sessionStorage / localStorage (set by onboarding)
    // -----------------------------------------------------------------------
    function getUserContext() {
        try {
            const raw = sessionStorage.getItem('ezotera_user') || localStorage.getItem('ezotera_user');
            if (raw) {
                const u = JSON.parse(raw);
                return { name: u.name || null, gender: u.gender || null, focusArea: u.focusArea || null };
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

        const previewEl = document.getElementById('palmResultsPreview');
        const blurGate  = document.getElementById('palmResultsBlurGate');
        const fullEl    = document.getElementById('palmResultsFull');
        const blurSnip  = document.getElementById('palmResultsBlurSnippet');

        if (previewEl) previewEl.textContent = previewText;

        if (isPaid && fullText) {
            if (blurGate) blurGate.classList.add('is-unlocked');
            if (fullEl)   { fullEl.textContent = fullText; fullEl.classList.add('is-visible'); }
        } else {
            if (blurSnip) {
                blurSnip.textContent = (fullText || '').slice(0, 400) ||
                    'Полный анализ включает детальное прочтение линий, прогноз по любви, карьере и судьбе...';
            }
        }
    }

    // -----------------------------------------------------------------------
    // Main submit handler
    // -----------------------------------------------------------------------
    function handleSubmit() {
        if (!selectedFile) return;

        const errEl = document.getElementById('palmUploadError');
        if (errEl) errEl.textContent = '';

        const reader = new FileReader();
        reader.onload = e => {
            const imageDataUrl = e.target.result;

            let apiResult = null;
            let apiError  = null;
            let scanDone  = false;
            let apiDone   = false;

            // API call runs in parallel with animation
            submitAnalysis(0.72).then(data => {
                apiResult = data;
                apiDone   = true;
                if (scanDone) finishFlow();
            }).catch(err => {
                apiError = err;
                apiDone  = true;
                if (scanDone) finishFlow();
            });

            runScanAnimation(imageDataUrl, () => {
                scanDone = true;
                if (apiDone) finishFlow();
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
    // Unlock handler
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
        zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('is-dragover'); });
        zone.addEventListener('dragleave', ()  => zone.classList.remove('is-dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('is-dragover');
            const file = e.dataTransfer?.files?.[0];
            if (file) handleFileSelected(file);
        });
    }

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------
    function init() {
        const fileInput  = document.getElementById('palmFileInput');
        const submitBtn  = document.getElementById('palmSubmitBtn');
        const unlockBtn  = document.getElementById('palmUnlockBtn');
        const changeBtn  = document.getElementById('palmChangePhotoBtn');
        const restartBtn = document.getElementById('palmRestartBtn');
        const closeBtn   = document.getElementById('palmModalClose');
        const overlay    = document.getElementById('palmModal');

        if (fileInput)  fileInput.addEventListener('change', e => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); });
        if (submitBtn)  submitBtn.addEventListener('click',  handleSubmit);
        if (unlockBtn)  unlockBtn.addEventListener('click',  handleUnlock);
        if (changeBtn)  changeBtn.addEventListener('click',  e => { e.stopPropagation(); resetUploadUI(); fileInput?.click(); });
        if (restartBtn) restartBtn.addEventListener('click', openModal);
        if (closeBtn)   closeBtn.addEventListener('click',   closeModal);
        if (overlay)    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

        setupDropzone();
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    window.PalmistryUpload = { init, openModal, closeModal };

})();

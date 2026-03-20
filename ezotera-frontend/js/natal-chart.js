/**
 * Natal Chart — Astronomical calculations + SVG rendering
 * Uses astronomy-engine CDN for planet positions
 * Uses Nominatim (OpenStreetMap) for geocoding
 */
(function () {
    'use strict';

    /* =============================================
       CONSTANTS & DATA
       ============================================= */

    const ZODIAC_SIGNS = [
        { name: 'Овен',         short: 'Ari', symbol: '♈', color: '#e05050', element: 'fire' },
        { name: 'Телец',        short: 'Tau', symbol: '♉', color: '#80c060', element: 'earth' },
        { name: 'Близнецы',     short: 'Gem', symbol: '♊', color: '#e0c040', element: 'air' },
        { name: 'Рак',          short: 'Can', symbol: '♋', color: '#60a0d0', element: 'water' },
        { name: 'Лев',          short: 'Leo', symbol: '♌', color: '#e07830', element: 'fire' },
        { name: 'Дева',         short: 'Vir', symbol: '♍', color: '#80b060', element: 'earth' },
        { name: 'Весы',         short: 'Lib', symbol: '♎', color: '#d0a0e0', element: 'air' },
        { name: 'Скорпион',     short: 'Sco', symbol: '♏', color: '#9030a0', element: 'water' },
        { name: 'Стрелец',      short: 'Sag', symbol: '♐', color: '#e05050', element: 'fire' },
        { name: 'Козерог',      short: 'Cap', symbol: '♑', color: '#708060', element: 'earth' },
        { name: 'Водолей',      short: 'Aqu', symbol: '♒', color: '#60a8d8', element: 'air' },
        { name: 'Рыбы',         short: 'Pis', symbol: '♓', color: '#6080c0', element: 'water' },
    ];

    const ELEMENT_COLORS = {
        fire:  'rgba(220, 70, 50, 0.18)',
        earth: 'rgba(90, 160, 70, 0.18)',
        air:   'rgba(200, 180, 40, 0.18)',
        water: 'rgba(70, 130, 200, 0.18)',
    };

    const PLANETS_CONFIG = [
        { id: 'Sun',     name: 'Солнце',  glyph: '☉', color: '#ffe060' },
        { id: 'Moon',    name: 'Луна',    glyph: '☽', color: '#d0d8f0' },
        { id: 'Mercury', name: 'Меркурий',glyph: '☿', color: '#90c0a0' },
        { id: 'Venus',   name: 'Венера',  glyph: '♀', color: '#f0a0c0' },
        { id: 'Mars',    name: 'Марс',    glyph: '♂', color: '#e05040' },
        { id: 'Jupiter', name: 'Юпитер', glyph: '♃', color: '#e0b060' },
        { id: 'Saturn',  name: 'Сатурн',  glyph: '♄', color: '#c0a060' },
        { id: 'Uranus',  name: 'Уран',    glyph: '♅', color: '#80d0e0' },
        { id: 'Neptune', name: 'Нептун',  glyph: '♆', color: '#8090e0' },
        { id: 'Pluto',   name: 'Плутон',  glyph: '♇', color: '#b080c0' },
    ];

    const ASPECTS = [
        { name: 'Соединение',    symbol: '☌', orb: 8,  angle: 0,   type: 'conjunction' },
        { name: 'Оппозиция',     symbol: '☍', orb: 8,  angle: 180, type: 'opposition'  },
        { name: 'Трин',          symbol: '△', orb: 8,  angle: 120, type: 'trine'       },
        { name: 'Квадрат',       symbol: '□', orb: 7,  angle: 90,  type: 'square'      },
        { name: 'Секстиль',      symbol: '⚹', orb: 5,  angle: 60,  type: 'sextile'     },
    ];

    // SVG layout dimensions (600x600 viewBox)
    const CX = 300, CY = 300;
    const R_OUTER  = 285;   // Outer border
    const R_ZODIAC = 270;   // Zodiac ring outer edge
    const R_SIGN   = 250;   // Midpoint of sign ring (symbol placement)
    const R_INNER  = 230;   // Zodiac ring inner edge
    const R_HOUSE  = 210;   // House circle outer edge
    const R_PLANET = 175;   // Planet placement radius
    const R_ASPECT = 148;   // Aspect line terminus
    const R_CORE   = 90;    // Core chart circle

    /* =============================================
       MATH HELPERS
       ============================================= */

    const DEG = Math.PI / 180;

    function normDeg(d) { return ((d % 360) + 360) % 360; }

    /** Convert ecliptic longitude to SVG angle (ASC at 180°, CCW positive) */
    function lonToAngle(lon, asc) {
        return normDeg(180 + asc - lon);
    }

    /** Angle (0=right) to SVG x,y at radius r from centre */
    function polar(angleDeg, r, cx, cy) {
        const a = angleDeg * DEG;
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }

    /** Build a polygon approximation of an arc segment (for zodiac slices) */
    function arcPolygon(startAngle, endAngle, rOuter, rInner, cx, cy, steps = 24) {
        const pts = [];
        const dA = (endAngle - startAngle) / steps;
        for (let i = 0; i <= steps; i++) {
            const [x, y] = polar(startAngle + i * dA, rOuter, cx, cy);
            pts.push(`${x},${y}`);
        }
        for (let i = steps; i >= 0; i--) {
            const [x, y] = polar(startAngle + i * dA, rInner, cx, cy);
            pts.push(`${x},${y}`);
        }
        return pts.join(' ');
    }

    /* =============================================
       ASTRONOMICAL CALCULATIONS
       ============================================= */

    /**
     * Calculate planet ecliptic longitude using astronomy-engine
     * Returns degrees 0-360
     */
    function getPlanetLon(bodyId, date) {
        const Astro = window.Astronomy;
        if (!Astro) return 0;

        const astroDate = new Astro.AstroTime(date);

        if (bodyId === 'Sun') {
            const eq = Astro.SunPosition(astroDate);
            return normDeg(eq.elon);
        }
        if (bodyId === 'Moon') {
            const moon = Astro.GeoMoon(astroDate);
            const ecliptic = Astro.Ecliptic(moon);
            return normDeg(ecliptic.elon);
        }

        // Geocentric ecliptic for planets
        try {
            const body = Astro.Body[bodyId];
            if (body === undefined) return 0;
            const geo = Astro.GeoVector(body, astroDate, false);
            const ecl = Astro.Ecliptic(geo);
            return normDeg(ecl.elon);
        } catch (e) {
            console.warn('Planet calc error for', bodyId, e);
            return 0;
        }
    }

    /**
     * Calculate Ascendant and MC
     * Using LMST and obliquity approximation
     */
    function calcAngles(date, lat, lon) {
        const Astro = window.Astronomy;

        // Julian Day Number for sidereal time
        const jd = Astro ? new Astro.AstroTime(date).ut + 2451545.0 : julianDay(date);

        // Greenwich Mean Sidereal Time in degrees
        const T = (jd - 2451545.0) / 36525;
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
                   + 0.000387933 * T * T - T * T * T / 38710000;
        gmst = normDeg(gmst);

        // Local Mean Sidereal Time
        const lmst = normDeg(gmst + lon);
        const lmstRad = lmst * DEG;

        // Obliquity of ecliptic (degrees)
        const eps = (23.439291111 - 0.013004167 * T) * DEG;
        const latRad = lat * DEG;

        // ASC formula
        let ascRad = Math.atan2(
            -Math.cos(lmstRad),
            Math.sin(lmstRad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps)
        );
        let asc = normDeg(ascRad / DEG);

        // MC (Midheaven)
        let mcRad = Math.atan2(Math.tan(lmstRad), Math.cos(eps));
        let mc = normDeg(mcRad / DEG);

        // Ensure ASC and MC are in correct half (quadrant fix)
        // ASC should be in the eastern hemisphere of lmst
        // MC should be near RAMC
        if (Math.abs(normDeg(mc - lmst) - 180) < 90) {
            mc = normDeg(mc + 180);
        }

        // Whole sign ASC sign index
        const ascSign = Math.floor(asc / 30); // 0-11

        return { asc, mc, ic: normDeg(mc + 180), dsc: normDeg(asc + 180), ascSign, lmst };
    }

    function julianDay(date) {
        // Fallback JD calculation without astronomy-engine
        return date.getTime() / 86400000 + 2440587.5;
    }

    /**
     * Calculate house cusps using Whole Sign system
     * Returns array of 12 cusp longitudes (0°of each sign)
     */
    function calcWholeSignHouses(ascSign) {
        const cusps = [];
        for (let i = 0; i < 12; i++) {
            cusps.push(normDeg((ascSign + i) * 30));
        }
        return cusps;
    }

    /** Assign a planet longitude to a house number (1-12) */
    function getPlanetHouse(lon, houseCusps) {
        for (let h = 11; h >= 0; h--) {
            let cusp = houseCusps[h];
            let next = houseCusps[(h + 1) % 12];
            // Handle wraparound
            if (cusp <= next) {
                if (lon >= cusp && lon < next) return h + 1;
            } else {
                if (lon >= cusp || lon < next) return h + 1;
            }
        }
        return 1;
    }

    /* =============================================
       ASPECT CALCULATIONS
       ============================================= */

    function calcAspects(planets) {
        const result = [];
        for (let i = 0; i < planets.length; i++) {
            for (let j = i + 1; j < planets.length; j++) {
                const diff = Math.abs(normDeg(planets[i].lon - planets[j].lon));
                const angle = diff > 180 ? 360 - diff : diff;

                for (const asp of ASPECTS) {
                    if (Math.abs(angle - asp.angle) <= asp.orb) {
                        result.push({
                            p1: planets[i],
                            p2: planets[j],
                            aspect: asp,
                            orb: Math.abs(angle - asp.angle).toFixed(1)
                        });
                        break;
                    }
                }
            }
        }
        return result;
    }

    /* =============================================
       SVG RENDERING
       ============================================= */

    function makeSVGEl(tag, attrs) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        return el;
    }

    function renderChart(svg, planets, angles, houseCusps) {
        svg.innerHTML = '';

        const asc = angles.asc;

        // ---- Background ----
        svg.appendChild(makeSVGEl('circle', {
            cx: CX, cy: CY, r: R_OUTER,
            fill: '#08080f', stroke: 'rgba(130,80,220,0.15)', 'stroke-width': '1'
        }));

        // ---- Zodiac Sign Segments ----
        for (let i = 0; i < 12; i++) {
            const startLon = i * 30;
            const endLon = startLon + 30;
            const startAngle = lonToAngle(startLon, asc);
            const endAngle = lonToAngle(endLon, asc);

            const sign = ZODIAC_SIGNS[i];
            const poly = arcPolygon(startAngle, endAngle, R_ZODIAC, R_INNER, CX, CY);
            svg.appendChild(makeSVGEl('polygon', {
                points: poly,
                fill: ELEMENT_COLORS[sign.element],
                stroke: 'rgba(130,80,220,0.12)',
                'stroke-width': '0.5'
            }));

            // Sign symbol at midpoint
            const midLon = startLon + 15;
            const midAngle = lonToAngle(midLon, asc);
            const [sx, sy] = polar(midAngle, R_SIGN - 10, CX, CY);

            const symEl = makeSVGEl('text', {
                x: sx, y: sy + 5,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '14',
                fill: sign.color,
                'font-family': 'serif',
                opacity: '0.85'
            });
            symEl.textContent = sign.symbol;
            svg.appendChild(symEl);
        }

        // ---- Zodiac ring borders ----
        svg.appendChild(makeSVGEl('circle', {
            cx: CX, cy: CY, r: R_ZODIAC,
            fill: 'none', stroke: 'rgba(130,80,220,0.3)', 'stroke-width': '1'
        }));
        svg.appendChild(makeSVGEl('circle', {
            cx: CX, cy: CY, r: R_INNER,
            fill: 'none', stroke: 'rgba(130,80,220,0.2)', 'stroke-width': '0.8'
        }));

        // ---- Degree tick marks every 5° ----
        for (let deg = 0; deg < 360; deg += 5) {
            const angle = lonToAngle(deg, asc);
            const isSign = deg % 30 === 0;
            const r1 = isSign ? R_ZODIAC : (deg % 10 === 0 ? R_ZODIAC - 8 : R_ZODIAC - 4);
            const r2 = R_INNER + (isSign ? 0 : 6);
            const [x1, y1] = polar(angle, R_ZODIAC, CX, CY);
            const [x2, y2] = polar(angle, r1, CX, CY);
            svg.appendChild(makeSVGEl('line', {
                x1, y1, x2, y2,
                stroke: isSign ? 'rgba(130,80,220,0.4)' : 'rgba(130,80,220,0.15)',
                'stroke-width': isSign ? '1' : '0.5'
            }));
        }

        // ---- House circle ----
        svg.appendChild(makeSVGEl('circle', {
            cx: CX, cy: CY, r: R_HOUSE,
            fill: 'none', stroke: 'rgba(130,80,220,0.15)', 'stroke-width': '0.8'
        }));

        // ---- House cusp lines ----
        for (let h = 0; h < 12; h++) {
            const angle = lonToAngle(houseCusps[h], asc);
            const isAngle = h === 0 || h === 3 || h === 6 || h === 9;
            const [x1, y1] = polar(angle, R_INNER, CX, CY);
            const [x2, y2] = polar(angle, R_CORE + 10, CX, CY);
            svg.appendChild(makeSVGEl('line', {
                x1, y1, x2, y2,
                stroke: isAngle ? 'rgba(200,160,255,0.45)' : 'rgba(130,80,220,0.2)',
                'stroke-width': isAngle ? '1.5' : '0.8'
            }));

            // House number label
            const midNextLon = houseCusps[h] + 15;
            const midAngle = lonToAngle(midNextLon, asc);
            const [lx, ly] = polar(midAngle, (R_HOUSE + R_CORE) / 2 + 4, CX, CY);
            const hNum = makeSVGEl('text', {
                x: lx, y: ly,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '9',
                fill: 'rgba(160,130,200,0.5)',
                'font-family': 'sans-serif',
                'font-weight': '400'
            });
            hNum.textContent = h + 1;
            svg.appendChild(hNum);
        }

        // ---- Core circle ----
        svg.appendChild(makeSVGEl('circle', {
            cx: CX, cy: CY, r: R_CORE,
            fill: 'rgba(10,8,20,0.9)',
            stroke: 'rgba(130,80,220,0.2)',
            'stroke-width': '1'
        }));

        // ---- Aspect lines (inside core circle) ----
        const aspects = calcAspects(planets);
        const ASPECT_SVG_COLORS = {
            conjunction: 'rgba(200,160,255,0.4)',
            opposition:  'rgba(220,70,70,0.35)',
            trine:       'rgba(60,180,100,0.35)',
            square:      'rgba(220,120,40,0.35)',
            sextile:     'rgba(60,140,200,0.35)',
        };

        for (const asp of aspects) {
            const a1 = lonToAngle(asp.p1.lon, asc);
            const a2 = lonToAngle(asp.p2.lon, asc);
            const [x1, y1] = polar(a1, R_ASPECT, CX, CY);
            const [x2, y2] = polar(a2, R_ASPECT, CX, CY);
            svg.appendChild(makeSVGEl('line', {
                x1, y1, x2, y2,
                stroke: ASPECT_SVG_COLORS[asp.aspect.type] || 'rgba(200,200,200,0.2)',
                'stroke-width': '1',
                'stroke-dasharray': asp.aspect.type === 'sextile' ? '3 2' : 'none'
            }));
        }

        // ---- Planets ----
        // Resolve overlapping positions
        const sorted = [...planets].sort((a, b) => a.lon - b.lon);
        const angles2 = sorted.map(p => lonToAngle(p.lon, asc));
        resolveOverlap(angles2, 14);

        for (let i = 0; i < sorted.length; i++) {
            const planet = sorted[i];
            const baseAngle = lonToAngle(planet.lon, asc);
            const displayAngle = angles2[i];

            // Small tick line from inner ring to planet
            const [tx1, ty1] = polar(baseAngle, R_INNER - 2, CX, CY);
            const [tx2, ty2] = polar(baseAngle, R_HOUSE - 2, CX, CY);
            svg.appendChild(makeSVGEl('line', {
                x1: tx1, y1: ty1, x2: tx2, y2: ty2,
                stroke: planet.color + '70',
                'stroke-width': '0.8'
            }));

            // Planet glyph
            const [px, py] = polar(displayAngle, R_PLANET, CX, CY);
            const gEl = makeSVGEl('text', {
                x: px, y: py + 5,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '15',
                fill: planet.color,
                'font-family': 'serif',
                filter: 'drop-shadow(0 0 3px ' + planet.color + '60)'
            });
            gEl.textContent = planet.glyph;
            svg.appendChild(gEl);
        }

        // ---- Cardinal points labels ----
        // ASC (left = 180°)
        const cardinals = [
            { label: 'ASC', lon: angles.asc,  angle: 180 },
            { label: 'DSC', lon: angles.dsc,  angle: 0   },
            { label: 'MC',  lon: angles.mc,   angle: null },
            { label: 'IC',  lon: angles.ic,   angle: null },
        ];
        for (const c of cardinals) {
            const a = lonToAngle(c.lon, asc);
            const [lx, ly] = polar(a, R_OUTER - 10, CX, CY);
            const lbl = makeSVGEl('text', {
                x: lx, y: ly,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '10',
                'font-weight': '700',
                fill: 'rgba(200,160,255,0.8)',
                'font-family': 'sans-serif'
            });
            lbl.textContent = c.label;
            svg.appendChild(lbl);
        }

        return aspects;
    }

    /** Spread overlapping display angles so glyphs don't collide */
    function resolveOverlap(angles, minGap) {
        for (let iter = 0; iter < 6; iter++) {
            let changed = false;
            for (let i = 0; i < angles.length; i++) {
                for (let j = i + 1; j < angles.length; j++) {
                    let diff = angles[j] - angles[i];
                    // Normalize to [-180, 180]
                    while (diff > 180) diff -= 360;
                    while (diff < -180) diff += 360;
                    if (Math.abs(diff) < minGap) {
                        const push = (minGap - Math.abs(diff)) / 2 + 0.5;
                        const sign = diff >= 0 ? 1 : -1;
                        angles[i] -= push * sign;
                        angles[j] += push * sign;
                        changed = true;
                    }
                }
            }
            if (!changed) break;
        }
    }

    /* =============================================
       GEOCODING (Nominatim)
       ============================================= */

    let geocodeTimeout = null;

    async function geocodeCity(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ru`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'ru', 'User-Agent': 'Ezotera/1.0' }
        });
        return await res.json();
    }

    /* =============================================
       RENDERING HELPERS
       ============================================= */

    function signForLon(lon) {
        return ZODIAC_SIGNS[Math.floor(normDeg(lon) / 30)];
    }

    function formatDegInSign(lon) {
        const deg = Math.floor(normDeg(lon) % 30);
        const min = Math.floor((normDeg(lon) % 1) * 60);
        return `${deg}°${min.toString().padStart(2,'0')}'`;
    }

    function renderPlanetsTable(planets, houseCusps) {
        const tbody = document.getElementById('planetsBody');
        tbody.innerHTML = '';
        for (const p of planets) {
            const sign = signForLon(p.lon);
            const house = getPlanetHouse(p.lon, houseCusps);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
                <td>${sign.symbol} ${sign.name}</td>
                <td>${formatDegInSign(p.lon)}</td>
                <td>${house}</td>
            `;
            tbody.appendChild(tr);
        }
    }

    function renderAngles(angles) {
        const grid = document.getElementById('anglesGrid');
        const items = [
            { label: 'Асцендент (ASC)', lon: angles.asc  },
            { label: 'МС (Зенит)',      lon: angles.mc   },
            { label: 'Десцендент',      lon: angles.dsc  },
            { label: 'IC (Надир)',       lon: angles.ic   },
        ];
        grid.innerHTML = '';
        for (const it of items) {
            const sign = signForLon(it.lon);
            const div = document.createElement('div');
            div.className = 'natal-angle-item';
            div.innerHTML = `
                <div class="natal-angle-item__label">${it.label}</div>
                <div class="natal-angle-item__value">${sign.symbol} ${sign.name} ${formatDegInSign(it.lon)}</div>
            `;
            grid.appendChild(div);
        }
    }

    function renderAspects(aspects) {
        const list = document.getElementById('aspectsList');
        list.innerHTML = '';
        if (!aspects.length) {
            list.innerHTML = '<p style="color:#6a5a80;font-size:0.88rem">Ключевых аспектов не обнаружено</p>';
            return;
        }
        for (const asp of aspects) {
            const chip = document.createElement('span');
            chip.className = `natal-aspect-chip natal-aspect-chip--${asp.aspect.type}`;
            chip.innerHTML = `
                <span>${asp.p1.glyph}</span>
                <span>${asp.aspect.symbol}</span>
                <span>${asp.p2.glyph}</span>
                <span style="opacity:0.7;font-size:0.78em">${asp.aspect.name} (${asp.orb}°)</span>
            `;
            list.appendChild(chip);
        }
    }

    /* =============================================
       INTERPRETATION (backend call)
       ============================================= */

    async function fetchInterpretation(planets, angles, houseCusps, meta) {
        document.getElementById('interpretationLoading').style.display = 'flex';
        document.getElementById('interpretationText').style.display = 'none';

        const payload = {
            name: meta.name,
            birthDate: meta.birthDate,
            birthTime: meta.birthTime,
            birthCity: meta.birthCity,
            asc: { sign: signForLon(angles.asc).name, deg: formatDegInSign(angles.asc) },
            mc:  { sign: signForLon(angles.mc).name,  deg: formatDegInSign(angles.mc)  },
            planets: planets.map(p => ({
                name: p.name,
                sign: signForLon(p.lon).name,
                deg: formatDegInSign(p.lon),
                house: getPlanetHouse(p.lon, houseCusps)
            })),
            aspects: calcAspects(planets).map(a => ({
                p1: a.p1.name, p2: a.p2.name,
                aspect: a.aspect.name, orb: a.orb
            }))
        };

        try {
            const res = await fetch('/api/natal/interpret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success && data.interpretation) {
                displayInterpretation(data.interpretation);
            } else {
                displayInterpretation(generateFallbackInterpretation(planets, angles, houseCusps));
            }
        } catch (e) {
            displayInterpretation(generateFallbackInterpretation(planets, angles, houseCusps));
        }
    }

    function displayInterpretation(text) {
        document.getElementById('interpretationLoading').style.display = 'none';
        const el = document.getElementById('interpretationText');
        el.style.display = 'block';
        // Convert simple markdown-like formatting
        const html = text
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        el.innerHTML = '<p>' + html + '</p>';
    }

    function generateFallbackInterpretation(planets, angles, houseCusps) {
        const sun = planets.find(p => p.id === 'Sun');
        const moon = planets.find(p => p.id === 'Moon');
        const sunSign = sun ? signForLon(sun.lon) : null;
        const moonSign = moon ? signForLon(moon.lon) : null;
        const ascSign = signForLon(angles.asc);

        let text = '';

        if (sunSign) {
            text += `### Солнце в ${sunSign.name}\n\n`;
            text += `Ваш солнечный знак — **${sunSign.name}**. Это ключевая энергия вашей личности, `;
            text += `вектор самовыражения и жизненной силы. `;
        }

        if (moonSign) {
            text += `\n\n### Луна в ${moonSign.name}\n\n`;
            text += `Луна в **${moonSign.name}** указывает на эмоциональную природу и глубинные потребности. `;
            text += `Это то, как вы реагируете инстинктивно, что даёт ощущение внутреннего комфорта.`;
        }

        text += `\n\n### Асцендент в ${ascSign.name}\n\n`;
        text += `Асцендент в **${ascSign.name}** — это ваша «витрина», манера держаться и первое впечатление, `;
        text += `которое вы производите на других. Через призму этого знака вы воспринимаете окружающий мир.`;

        text += `\n\n### Ключевые тенденции\n\n`;
        text += `На основе положения планет в данный момент времени карта указывает на активную жизненную фазу. `;
        text += `Для получения детальной персональной интерпретации рекомендуем консультацию со специалистом.`;

        return text;
    }

    /* =============================================
       MAIN FORM LOGIC
       ============================================= */

    function showSection(id) {
        ['natalForm', 'natalLoading', 'natalResult'].forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = s === id ? '' : 'none';
        });
    }

    const loadingMessages = [
        'Вычисляем положение планет…',
        'Строим знаковый круг…',
        'Рассчитываем дома и асцендент…',
        'Определяем аспекты…',
        'Формируем персональный портрет…',
    ];

    let loadingInterval = null;

    function startLoadingAnimation() {
        let i = 0;
        const el = document.getElementById('loadingText');
        if (el) el.textContent = loadingMessages[0];
        loadingInterval = setInterval(() => {
            i = (i + 1) % loadingMessages.length;
            if (el) {
                el.style.animation = 'none';
                el.offsetHeight; // force reflow
                el.style.animation = 'fadeText 0.8s ease-in-out';
                el.textContent = loadingMessages[i];
            }
        }, 1800);
    }

    function stopLoadingAnimation() {
        if (loadingInterval) clearInterval(loadingInterval);
    }

    function init() {
        const form = document.getElementById('birthForm');
        const cityInput = document.getElementById('birthCity');
        const autocomplete = document.getElementById('cityAutocomplete');

        if (!form) return;

        // City autocomplete
        cityInput.addEventListener('input', () => {
            clearTimeout(geocodeTimeout);
            const q = cityInput.value.trim();
            if (q.length < 2) { autocomplete.innerHTML = ''; return; }
            geocodeTimeout = setTimeout(async () => {
                try {
                    const results = await geocodeCity(q);
                    autocomplete.innerHTML = '';
                    results.slice(0, 5).forEach(r => {
                        const item = document.createElement('div');
                        item.className = 'natal-form__autocomplete-item';
                        item.textContent = r.display_name;
                        item.addEventListener('click', () => {
                            cityInput.value = r.display_name.split(',')[0].trim();
                            document.getElementById('birthLat').value = r.lat;
                            document.getElementById('birthLon').value = r.lon;
                            const coords = document.getElementById('coordsDisplay');
                            document.getElementById('coordsText').textContent =
                                `${r.display_name.split(',').slice(0,2).join(',')} — ${parseFloat(r.lat).toFixed(4)}°N, ${parseFloat(r.lon).toFixed(4)}°E`;
                            coords.style.display = 'flex';
                            autocomplete.innerHTML = '';
                        });
                        autocomplete.appendChild(item);
                    });
                } catch (e) {}
            }, 400);
        });

        document.addEventListener('click', (e) => {
            if (!cityInput.contains(e.target)) autocomplete.innerHTML = '';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const dateVal = document.getElementById('birthDate').value;
            const timeVal = document.getElementById('birthTime').value || '12:00';
            const cityVal = document.getElementById('birthCity').value.trim();
            const latVal  = document.getElementById('birthLat').value;
            const lonVal  = document.getElementById('birthLon').value;
            const nameVal = document.getElementById('birthName').value.trim() || 'Натальная карта';

            if (!dateVal) { alert('Введите дату рождения'); return; }
            if (!cityVal) { alert('Введите место рождения'); return; }

            let lat = parseFloat(latVal);
            let lon = parseFloat(lonVal);

            // If no coords yet, geocode now
            if (!latVal || !lonVal || isNaN(lat) || isNaN(lon)) {
                const btn = document.getElementById('calcBtn');
                btn.disabled = true;
                btn.textContent = 'Ищем город…';
                try {
                    const results = await geocodeCity(cityVal);
                    if (!results.length) {
                        alert('Город не найден. Попробуйте уточнить название.');
                        btn.disabled = false;
                        btn.innerHTML = '<span class="natal-form__submit-icon">✦</span> Рассчитать карту';
                        return;
                    }
                    lat = parseFloat(results[0].lat);
                    lon = parseFloat(results[0].lon);
                    document.getElementById('birthLat').value = lat;
                    document.getElementById('birthLon').value = lon;
                } catch (err) {
                    alert('Ошибка геокодирования. Проверьте интернет-соединение.');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="natal-form__submit-icon">✦</span> Рассчитать карту';
                    return;
                }
                btn.disabled = false;
                btn.innerHTML = '<span class="natal-form__submit-icon">✦</span> Рассчитать карту';
            }

            showSection('natalLoading');
            startLoadingAnimation();

            // Small delay to allow loading animation to render
            setTimeout(() => {
                try {
                    const [year, month, day] = dateVal.split('-').map(Number);
                    const [hour, minute] = timeVal.split(':').map(Number);
                    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

                    // Calculate angles
                    const angles = calcAngles(date, lat, lon);
                    const houseCusps = calcWholeSignHouses(angles.ascSign);

                    // Calculate planet positions
                    const planets = [];
                    for (const cfg of PLANETS_CONFIG) {
                        const pLon = getPlanetLon(cfg.id, date);
                        planets.push({ ...cfg, lon: pLon });
                    }

                    stopLoadingAnimation();

                    // Update result header
                    document.getElementById('resultName').textContent = nameVal;
                    const dateStr = new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    });
                    document.getElementById('resultMeta').textContent =
                        `${dateStr}, ${timeVal} · ${cityVal}`;

                    // Render SVG
                    const svg = document.getElementById('natalSvg');
                    const aspects = renderChart(svg, planets, angles, houseCusps);

                    // Render tables
                    renderPlanetsTable(planets, houseCusps);
                    renderAngles(angles);
                    renderAspects(aspects);

                    showSection('natalResult');

                    // Fetch AI interpretation (async, non-blocking)
                    fetchInterpretation(planets, angles, houseCusps, {
                        name: nameVal,
                        birthDate: dateVal,
                        birthTime: timeVal,
                        birthCity: cityVal
                    });

                } catch (err) {
                    stopLoadingAnimation();
                    console.error('Chart calculation error:', err);
                    alert('Ошибка расчёта карты. Проверьте введённые данные.');
                    showSection('natalForm');
                }
            }, 200);
        });

        // New chart button
        document.getElementById('newChartBtn').addEventListener('click', () => {
            document.getElementById('birthLat').value = '';
            document.getElementById('birthLon').value = '';
            document.getElementById('coordsDisplay').style.display = 'none';
            showSection('natalForm');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

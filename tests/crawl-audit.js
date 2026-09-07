/**
 * Full-site crawler audit: visits every HTML page, collects
 * console errors, failed requests (4xx/5xx), and broken internal links.
 * Usage: node tests/crawl-audit.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3001';
const FRONTEND = path.join(__dirname, '../ezotera-frontend');

function collectHtmlFiles(dir, prefix = '') {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'components' || entry.name === 'assets') continue;
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out.push(...collectHtmlFiles(path.join(dir, entry.name), rel));
        else if (entry.name.endsWith('.html')) out.push('/' + rel);
    }
    return out;
}

(async () => {
    const pages = collectHtmlFiles(FRONTEND);
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const report = [];

    for (const p of pages) {
        const entry = { page: p, consoleErrors: [], failedRequests: [], brokenLinks: [] };
        page.removeAllListeners('console');
        page.removeAllListeners('response');
        page.on('console', m => { if (m.type() === 'error') entry.consoleErrors.push(m.text().slice(0, 200)); });
        page.on('response', r => {
            if (r.status() >= 400 && r.url().startsWith(BASE)) {
                // 401 on auth/verify is expected for anonymous visitor
                if (r.url().includes('/api/auth/verify') && r.status() === 401) return;
                entry.failedRequests.push(`${r.status()} ${r.url().replace(BASE, '')}`);
            }
        });
        try {
            await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 15000 });
        } catch (e) {
            entry.consoleErrors.push('NAV FAIL: ' + e.message.slice(0, 120));
        }
        // check internal links exist on disk (page may auto-redirect, e.g. auth guards)
        let hrefs = [];
        try {
            hrefs = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
        } catch (e) {
            entry.consoleErrors.push('REDIRECTED: ' + page.url().replace(BASE, ''));
        }
        const seen = new Set();
        for (let h of hrefs) {
            if (!h || h.startsWith('http') || h.startsWith('mailto') || h.startsWith('tel') || h.startsWith('#') || h.startsWith('javascript')) continue;
            h = h.split('#')[0].split('?')[0];
            if (!h || seen.has(h)) continue;
            seen.add(h);
            const resolved = h.startsWith('/')
                ? path.join(FRONTEND, h)
                : path.join(FRONTEND, path.dirname(p), h);
            if (h.endsWith('.html') && !fs.existsSync(resolved)) entry.brokenLinks.push(h);
        }
        if (entry.consoleErrors.length || entry.failedRequests.length || entry.brokenLinks.length) report.push(entry);
        process.stdout.write('.');
    }

    await browser.close();
    console.log('\n\n=== PAGES WITH ISSUES: ' + report.length + ' / ' + pages.length + ' ===\n');
    for (const r of report) {
        console.log('--- ' + r.page);
        r.consoleErrors.slice(0, 5).forEach(e => console.log('  [console] ' + e));
        r.failedRequests.slice(0, 5).forEach(e => console.log('  [request] ' + e));
        r.brokenLinks.forEach(e => console.log('  [broken-link] ' + e));
    }
})();

import { chromium } from 'playwright';
import path from 'node:path';

export const HERE = path.dirname(new URL(import.meta.url).pathname);
export const OUT = path.join(HERE, '..', 'screens');
export const BASE = 'http://localhost:5199';
// Wed Sep 30 2026, 8:42 AM New York
export const FIXED_TIME = new Date('2026-09-30T08:42:00-04:00');

export async function launch({ video = false } = {}) {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=${path.join(HERE, 'camera_feed.y4m')}`,
            '--host-resolver-rules=MAP localhost 127.0.0.1',
            '--font-render-hinting=none',
        ],
    });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        timezoneId: 'America/New_York',
        locale: 'en-US',
        geolocation: { latitude: 40.7128, longitude: -74.006 },
        permissions: ['geolocation', 'camera'],
        ...(video ? { recordVideo: { dir: path.join(HERE, 'video-tmp'), size: { width: 390, height: 844 } } } : {}),
    });
    // Block every non-local request (fonts are served locally; no Firebase/AI/network).
    await context.route(/^(?!http:\/\/(localhost|127\.0\.0\.1):5199).*/, (route) => {
        const u = route.request().url();
        if (u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    await context.addInitScript(() => {
        window.__DEMO__ = Object.assign({ aiDelay: 1200, intakeDelay: 2200, dataDelay: 120 }, window.__DEMO__ || {});
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED_TIME);
    const logs = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
    return { browser, context, page, logs };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function settle(page, ms = 600) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle').catch(() => { });
    // wait for all images to be decoded
    await page.evaluate(async () => {
        const imgs = [...document.images];
        await Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    await sleep(ms);
}

export async function shot(page, name) {
    const file = path.join(OUT, name);
    await page.screenshot({ path: file });
    console.log('saved', name);
    return file;
}

/**
 * Full-content capture: the app scrolls inside a 100dvh container, so grow the viewport to the
 * scroll container's content height, screenshot, then restore.
 */
export async function tallShot(page, name) {
    const h = await page.evaluate(() => {
        const sc = document.querySelector('.overflow-y-auto.scrollbar-hide');
        return sc ? sc.scrollHeight : document.body.scrollHeight;
    });
    const height = Math.max(844, Math.ceil(h) + 0);
    await page.setViewportSize({ width: 390, height });
    await sleep(500);
    await settle(page, 300);
    const file = path.join(OUT, name);
    await page.screenshot({ path: file });
    console.log('saved', name, 'height', height);
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(300);
    return file;
}

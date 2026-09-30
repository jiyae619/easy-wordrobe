import { launch, settle, shot, tallShot, sleep, BASE } from './lib.mjs';

const only = process.argv.slice(2);
const want = (k) => only.length === 0 || only.includes(k);

async function flow(name, fn, opts) {
    if (!want(name)) return;
    const { browser, context, page, logs } = await launch(opts);
    try {
        await fn(page, context);
    } catch (e) {
        console.error(`[${name}] FAILED`, e);
        await page.screenshot({ path: `${name}_failure.png` }).catch(() => { });
    } finally {
        if (logs.length) console.log(`[${name}] console:\n  ` + logs.filter(l => !l.includes('ERR_FAILED')).join('\n  '));
        await context.close();
        await browser.close();
    }
}

const nav = (page, href) => page.locator(`a[href="${href}"]`).last().click();

// ---------- Home ----------
await flow('home', async (page) => {
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: 'Wear it' }).waitFor({ timeout: 20000 });
    await settle(page, 900);
    await shot(page, '01_home.png');
    await tallShot(page, '01_home_tall.png');
});

// ---------- Wardrobe ----------
await flow('wardrobe', async (page) => {
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: 'Wear it' }).waitFor({ timeout: 20000 });
    await nav(page, '/wardrobe');
    await page.getByText(/items found/).waitFor();
    await settle(page, 900);
    await shot(page, '02_wardrobe.png');
    await tallShot(page, '02_wardrobe_tall.png');
    // Item detail sheet for the neglected denim jacket
    await page.getByRole('button', { name: 'Open details for Denim Jacket' }).click();
    await settle(page, 900);
    await shot(page, '02b_wardrobe_item_detail.png');
});

// ---------- Scan (camera -> analyzing -> result -> saved) ----------
await flow('scan', async (page) => {
    await page.goto(BASE + '/wardrobe');
    await page.getByText(/items found/).waitFor();
    await settle(page, 400);
    await page.getByRole('button', { name: 'Open wardrobe scanner' }).click();
    await page.waitForFunction(() => {
        const v = document.querySelector('video');
        return v && v.videoWidth > 0 && v.readyState >= 2;
    }, null, { timeout: 15000 });
    await sleep(1200);
    await shot(page, '03_scan_camera.png');
    await page.locator('button.w-20.h-20').click();
    await page.getByText('AI is analyzing your clothing...').waitFor();
    await sleep(700);
    await shot(page, '04_scan_analyzing.png');
    await page.getByText('Analysis Complete').waitFor({ timeout: 20000 });
    await settle(page, 900);
    await shot(page, '05_scan_result.png');
    await page.getByRole('button', { name: 'Add to Wardrobe' }).click();
    await page.getByText(/items found/).waitFor();
    await settle(page, 900);
    await shot(page, '05b_scan_added_to_wardrobe.png');
});

// ---------- Suggest ----------
await flow('suggest', async (page) => {
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: 'Wear it' }).waitFor({ timeout: 20000 });
    await nav(page, '/suggest');
    await page.getByText(/Outfits for you/).waitFor({ timeout: 20000 });
    await settle(page, 900);
    await shot(page, '06_suggest_moods.png');
    // pick "Creative"
    await page.getByRole('button', { name: /Creative/ }).click();
    await page.getByText('Curating Your Outfit').waitFor();
    await sleep(350);
    await shot(page, '07_suggest_loading.png');
    await page.getByText(/Outfits for you/).waitFor({ timeout: 20000 });
    await settle(page, 1000);
    await shot(page, '08_suggest_results.png');
    await tallShot(page, '08_suggest_results_tall.png');
    // outfit 2 and 3
    const scroller = '.overflow-y-auto.scrollbar-hide';
    await page.evaluate((sel) => document.querySelector(sel).scrollTo({ top: 175 }), scroller);
    await settle(page, 500);
    await shot(page, '08_suggest_results_scrolled.png');
    const dots = page.locator('button.rounded-full.w-2\\.5');
    for (const n of [2, 3]) {
        await dots.nth(n - 1).click();
        await page.evaluate((sel) => { document.activeElement?.blur(); document.querySelector(sel).scrollTo({ top: 0 }); }, scroller);
        await settle(page, 900);
        await shot(page, `08_suggest_results_outfit${n}.png`);
    }
    // back to outfit 1 and wear it
    await dots.nth(0).click();
    await page.evaluate((sel) => { document.activeElement?.blur(); document.querySelector(sel).scrollTo({ top: 175 }); }, scroller);
    await settle(page, 900);
    await page.getByRole('button', { name: 'Wear This' }).click();
    await sleep(600);
    await shot(page, '08b_suggest_wear_pending.png');
    await page.getByText('Outfit logged!').waitFor({ timeout: 8000 });
    await sleep(500);
    await shot(page, '08c_suggest_outfit_logged.png');
});

// ---------- Insights ----------
await flow('insights', async (page) => {
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: 'Wear it' }).waitFor({ timeout: 20000 });
    await settle(page, 300);
    await nav(page, '/insights');
    await page.getByText('Generating your style insights...').waitFor();
    await sleep(400);
    await shot(page, '09a_insights_loading.png');
    await page.getByText('Try Next Week').waitFor({ timeout: 20000 });
    await settle(page, 1000);
    await shot(page, '09_insights.png');
    await tallShot(page, '09_insights_tall.png');
    await page.getByRole('button', { name: 'More' }).first().click();
    await settle(page, 500);
    await shot(page, '09b_insights_nudge_expanded.png');
    await page.evaluate(() => {
        const sc = document.querySelector('.overflow-y-auto.scrollbar-hide');
        const h = [...document.querySelectorAll('h2')].find((e) => e.textContent === 'Most Worn');
        sc.scrollTo({ top: h.getBoundingClientRect().top + sc.scrollTop - 24 });
    });
    await settle(page, 500);
    await shot(page, '09c_insights_most_worn.png');
});

// ---------- Video ----------
await flow('video', async (page, context) => {
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: 'Wear it' }).waitFor({ timeout: 20000 });
    await settle(page, 1500);
    await nav(page, '/suggest');
    await page.getByText(/Outfits for you/).waitFor({ timeout: 20000 });
    await sleep(1500);
    await page.getByRole('button', { name: /Creative/ }).click();
    await page.getByText(/Outfits for you/).waitFor({ timeout: 20000 });
    await sleep(1800);
    const dots = page.locator('button.rounded-full.w-2\\.5');
    await dots.nth(1).click();
    await sleep(1500);
    await dots.nth(2).click();
    await sleep(1500);
    await nav(page, '/insights');
    await page.getByText('Try Next Week').waitFor({ timeout: 20000 });
    await sleep(1500);
    await page.evaluate(() => document.querySelector('.overflow-y-auto.scrollbar-hide')?.scrollBy({ top: 500, behavior: 'smooth' }));
    await sleep(2000);
    const v = page.video();
    await context.close();
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = await v.path();
    fs.copyFileSync(src, path.join(new URL('..', import.meta.url).pathname, 'screens', 'flow.webm'));
    console.log('saved flow.webm');
}, { video: true });

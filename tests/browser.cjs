const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const base = process.env.PORTFOLIO_URL;

/** Verify the currently available views and responsive frame without external services. */
async function verifyPortfolio() {
    const browser = await chromium.launch({ headless: true });
    try {
        await require('./section-order.cjs')(browser);
        await require('./previews.cjs')(browser, base, require('./helpers/browser-fixtures.cjs').fixtures);
        const context = await browser.newContext();
        await require('./helpers/browser-fixtures.cjs').fixtures(context);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.locator('h1').first().waitFor();
        await page.locator('.shell').waitFor();
        assert(await page.locator('.shellFinish__faceEdges polygon').first().getAttribute('points'));
        await page.locator('.profileHeader__name').first().waitFor();
        assert.equal(await page.locator('#view-home').getAttribute('aria-current'), 'page');
        await page.locator('#home-featured-title').waitFor();
        await page.evaluate(() => { window.savedShell = document.querySelector('.shell'); });
        await page.locator('#view-projects').click();
        await page.locator('#projects-work').check();
        await page.locator('#projects-play').check();
        await page.locator('#view-home').click();
        await page.goBack();
        await page.locator('#projects-view').waitFor();
        assert(await page.locator('#projects-play').isChecked());
        assert(await page.evaluate(() => window.savedShell === document.querySelector('.shell')));
        assert.equal(await page.locator('.projectCard__studyLink').count(), 0);

        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            assert(await page.locator('h1:visible').first().isVisible());
        }
        assert.deepEqual(errors, []);
        await context.close();
        console.log('Passed: available views, responsive rendering, section order, and runtime errors.');
    } finally {
        await browser.close();
    }
}

verifyPortfolio().catch(error => { console.error(error); process.exitCode = 1; });

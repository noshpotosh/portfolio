const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const base = process.env.PORTFOLIO_URL;

/** Verify the currently available views and responsive frame without external services. */
async function verifyPortfolio() {
    const browser = await chromium.launch({ headless: true });
    try {
        await require('./section-order.cjs')(browser);
        
        const context = await browser.newContext();
        
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.locator('h1').waitFor();
        await page.locator('.shell').waitFor();
        assert(await page.locator('.shellFinish__faceEdges polygon').first().getAttribute('points'));
        await page.locator('.profileHeader__name').waitFor();
        assert.equal(await page.locator('#view-home').getAttribute('aria-current'), 'page');
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            assert(await page.locator('h1').first().isVisible());
        }
        assert.deepEqual(errors, []);
        await context.close();
        console.log('Passed: available views, responsive rendering, section order, and runtime errors.');
    } finally {
        await browser.close();
    }
}

verifyPortfolio().catch(error => { console.error(error); process.exitCode = 1; });

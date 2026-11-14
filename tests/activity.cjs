const assert = require('node:assert/strict');

/** Verify activity rendering, independent loading, and unavailable-data fallbacks. */
module.exports = async function testActivity(browser, base, fixtures) {
    for (const scenario of ['delayed', 'failed', 'empty']) {
        const context = await browser.newContext();
        try {
            await fixtures(context, { activity: scenario === 'failed' });
            let releaseContributions;
            let contributionsRequested;
            const contributionRequest = new Promise(resolve => { contributionsRequested = resolve; });
            await context.route('https://github-contributions-api.jogruber.de/**', route => {
                if (scenario === 'failed') return route.fulfill({ status: 503, body: '' });
                if (scenario === 'empty') return route.fulfill({ json: { contributions: [] } });
                releaseContributions = () => route.fulfill({ json: {
                    contributions: Array.from({ length: 190 }, (_, index) => ({
                        date: new Date(Date.UTC(2026, 4, 10 + index)).toISOString().slice(0, 10),
                        count: 2,
                        level: 2,
                    })).reverse(),
                } });
                contributionsRequested();
            });
            if (scenario === 'empty') {
                await context.route('https://api.github.com/search/commits?*', route => route.fulfill({ json: { items: [] } }));
            }

            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(base);

            if (scenario !== 'delayed') {
                await page.locator('#activity-fallback').filter({ hasText: 'unavailable' }).waitFor({ state: 'attached' });
                assert.equal(await page.locator('.activityRail__item').count(), 0);
            } else {
                await page.locator('.activityRail__item').waitFor();
                assert.equal(await page.locator('.activityRail__age').getAttribute('datetime'), '2026-11-07T12:00:00Z');
                assert.equal(await page.locator('.activityRail__age').textContent(), 'Nov 7, 2026');
                assert.equal(await page.locator('.activityRail__message b').count(), 0);
                assert.equal(await page.locator('.activityRail__message').textContent(), 'A commit <b>plain text</b>');
            }

            if (scenario === 'delayed') {
                await page.locator('#contribution-summary').filter({ hasText: 'Loading' }).waitFor();
                await contributionRequest;
                assert(releaseContributions, 'Contribution request started while commits rendered');
                await releaseContributions();
                await page.locator('#contribution-grid').waitFor();
                const days = page.locator('#contribution-grid > span');
                assert.equal(await days.count(), 176, '26 weeks end with a partial Sunday column');
                assert.equal(await days.first().getAttribute('class'), 'activityRail__day activityRail__day--level2');
                assert.equal(await days.last().getAttribute('title'), '2 contributions on 2026-11-15');
                assert.equal(await page.locator('#contribution-summary').textContent(), '352 contributions · last 26 weeks');
                assert.match(await page.locator('#contribution-grid').getAttribute('aria-label'), /^352 contributions/);
            } else {
                await page.locator('#contribution-summary').filter({ hasText: 'unavailable' }).waitFor({ state: 'attached' });
                assert.equal(await page.locator('#contribution-grid').count(), 0);
            }
            assert.deepEqual(errors, []);
        } finally {
            await context.close();
        }
    }
};

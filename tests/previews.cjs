const assert = require('node:assert/strict');
const { repository } = require('./project-fixtures.cjs');

/** Verify card rendering and link behavior; URL and file-discovery edge cases live in the logic tests. */
module.exports = async function testProjectCards(browser, base, fixtures) {
    const context = await browser.newContext();
    try {
        await fixtures(context, { cards: [
            { ...repository('custom-project', ['portfolio-work', 'portfolio-featured']), homepage: ' https://example.com/live ' },
            { ...repository('cfjs', ['portfolio-work']), homepage: 'javascript:alert(1)' },
            repository('other', ['portfolio-work']),
        ] });
        await context.route('https://example.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Live destination</h1>' }));
        const page = await context.newPage();
        await page.goto(base);
        await page.locator('#home-featured-title').waitFor();

        for (const view of ['home', 'projects']) {
            await page.locator('#view-' + view).click();
            const card = page.locator(`#${view}-view [data-repository="custom-project"]`);
            await card.locator('.projectCard__preview').waitFor();
            assert.equal(await card.locator('.projectCard__preview').getAttribute('src'), 'https://raw.githubusercontent.com/noshpotosh/custom-project/release%2Fdocs/.github/project-preview.png');
            assert.equal(await card.locator('.projectCard__icon').count(), 1);
            assert.equal(await card.locator('.projectCard__previewLink').getAttribute('href'), 'https://example.com/live');
        }

        const card = page.locator('#projects-view [data-repository="custom-project"]');
        for (const [selector, destination] of [
            ['.projectCard__previewLink', 'https://example.com/live'],
            ['.projectCard__repositoryLink', 'https://github.com/noshpotosh/custom-project'],
        ]) {
            const [popup] = await Promise.all([context.waitForEvent('page'), card.locator(selector).click()]);
            await popup.waitForLoadState();
            assert.equal(popup.url(), destination);
            assert.equal(await popup.evaluate(() => window.opener), null);
            assert.equal(new URL(page.url()).hash, '#projects');
            await popup.close();
        }

        const invalidLinkCard = page.locator('#projects-view [data-repository="cfjs"]');
        assert.equal(await invalidLinkCard.locator('.projectCard__preview').count(), 1);
        assert.equal(await invalidLinkCard.locator('.projectCard__previewLink').count(), 0);
        assert.equal(await invalidLinkCard.locator('.projectCard__previewBadge').count(), 0);
        assert.equal(await invalidLinkCard.locator('.projectCard__icon').count(), 0);
        const iconOnlyCard = page.locator('#projects-view [data-repository="other"]');
        assert.equal(await iconOnlyCard.locator('.projectCard__preview').count(), 0);
        assert.equal(await iconOnlyCard.locator('.projectCard__icon').count(), 1);
    } finally {
        await context.close();
    }
};

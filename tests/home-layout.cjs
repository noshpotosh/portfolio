const assert = require('node:assert/strict');

/** Check that featured content cannot stretch the desktop introduction spacing. */
module.exports = async function checkHomeLayout(browser, base, fixtures) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

    try {
        await fixtures(context);
        const page = await context.newPage();
        await page.goto(base);
        await page.locator('#home-featured-title').waitFor();
        await page.locator('.featuredProject').evaluate(element => {
            element.style.minHeight = '1000px';
        });

        const spacing = await page.locator('.home-overview').evaluate(element => {
            const intro = element.querySelector('.homeIntro').getBoundingClientRect();
            const interests = element.querySelector('.homeInterests').getBoundingClientRect();

            return {
                actual: interests.top - intro.bottom,
                expected: parseFloat(getComputedStyle(element).rowGap),
            };
        });

        assert(Math.abs(spacing.actual - spacing.expected) < 1,
            'A tall featured project must not add space below the introduction');

        await page.setViewportSize({ width: 390, height: 1000 });
        const intro = await page.locator('.homeIntro').boundingBox();
        const project = await page.locator('.featuredProject').boundingBox();
        const interests = await page.locator('.homeInterests').boundingBox();

        assert(intro.y + intro.height <= project.y && project.y + project.height <= interests.y,
            'Mobile order remains introduction, featured project, then interests');
    } finally {
        await context.close();
    }
};

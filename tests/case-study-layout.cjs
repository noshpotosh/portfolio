const assert = require('node:assert/strict');

/** Keep the shell stable while a cold case-study request is pending. */
module.exports = async function checkCaseStudyLayout(browser, base, fixtures) {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
        for (const status of [200, 503]) {
            const context = await browser.newContext({ viewport });
            await fixtures(context);
            const page = await context.newPage();
            await page.goto(base);
            const studyLink = page.locator('.featuredProject .projectCard__studyLink');
            await studyLink.waitFor();
            // Scroll before measuring, just as clicking a below-the-fold link would.
            await studyLink.scrollIntoViewIfNeeded();
            const shell = page.locator('.shell');
            const previousHeight = await shell.evaluate(element => element.getBoundingClientRect().height);

            let releaseResponse;
            let markRequested;
            const requested = new Promise(resolve => { markRequested = resolve; });
            await context.route('**/CASE_STUDY.md', route => {
                releaseResponse = () => route.fulfill({ status, body: '# A short study' });
                markRequested();
            });
            await studyLink.click();
            await requested;
            await page.getByRole('status').filter({ hasText: 'Loading case study' }).waitFor();
            const loadingHeight = await shell.evaluate(element => element.getBoundingClientRect().height);
            assert(Math.abs(loadingHeight - previousHeight) < 1, 'Loading must not collapse the shell');

            await releaseResponse();
            await page.locator(status === 200 ? '.caseStudy__markdown' : '.caseStudy__status[role="alert"]').waitFor();
            assert.equal(await page.locator('[data-view="case-study"]').evaluate(element => element.style.minHeight), '', 'Release reserved space after success or failure');
            const finishedHeight = await shell.evaluate(element => element.getBoundingClientRect().height);
            assert(finishedHeight < previousHeight, 'Short articles and errors return to their natural height');
            await context.close();
        }
    }
};

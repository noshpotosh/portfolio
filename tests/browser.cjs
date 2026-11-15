const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const { repositories, markdown } = require('./project-fixtures.cjs');
const base = (process.env.PORTFOLIO_URL || 'http://127.0.0.1:4322/').replace(/\/?$/, '/');

const { fixtures } = require('./helpers/browser-fixtures.cjs');

(async () => {
    const browser = await chromium.launch({ headless:true });
    try {
        await require('./section-order.cjs')(browser);
        await require('./home-layout.cjs')(browser, base, fixtures);
        await require('./case-study-layout.cjs')(browser, base, fixtures);
        await require('./activity.cjs')(browser, base, fixtures);
        await require('./previews.cjs')(browser, base, fixtures);
        await require('./resume.cjs')(browser, base);
        const context = await browser.newContext();
        const requests = await fixtures(context);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.locator('#home-featured-title').waitFor();
        await page.locator('.activityRail__item').waitFor();
        assert.equal((await page.locator('#home-featured-title').textContent()).trim(), 'live-work');
        assert.equal(await page.locator('.projectCard__description b').count(), 0);
        assert.deepEqual(await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id).filter((id, i, ids) => ids.indexOf(id) !== i)), [], 'IDs remain unique with all pages mounted');
        const homeLink = page.locator('.featuredProject .projectCard__studyLink');
        await homeLink.click();
        await page.locator('.caseStudy__markdown').waitFor();
        assert.equal(new URL(page.url()).hash, '#projects/live-work');
        assert.equal(await page.title(), 'live-work — Noah Stewart');
        assert.equal(await page.locator('#case-study-back').getAttribute('href'), '#home');
        assert.deepEqual(await page.locator('#case-study-links a').evaluateAll(links => links.map(link => link.getAttribute('href'))), [
            'https://github.com/noshpotosh/live-work',
            'https://example.com/project',
        ]);
        assert(await page.locator('#case-study-view').isVisible());
        assert(!await page.locator('#home-view').isVisible());
        assert.equal(await page.locator('.caseStudy__markdown table').count(), 1);
        assert.equal(await page.locator('.caseStudy__markdown .caseStudy__gallery img').count(), 2, 'consecutive images form a gallery');
        assert.equal(await page.locator('.caseStudy__markdown img[alt="Screenshot"]').evaluate(image => image.parentElement.classList.contains('caseStudy__gallery')), false, 'a lone image stays full width');
        assert.equal(await page.evaluate(() => window.caseStudyScript), undefined);
        assert.equal(await page.locator('.caseStudy__markdown a[href^="javascript:"]').count(), 0);
        assert((await page.locator('.caseStudy__markdown a').filter({hasText:'Docs'}).getAttribute('href')).includes('/blob/release%2Fdocs/docs/guide.md'));
        await page.locator('.caseStudy__markdown a').filter({hasText:'Local'}).click();
        assert.equal(new URL(page.url()).hash, '#results');
        assert(await page.locator('.caseStudy__markdown').isVisible(), 'In-page anchors preserve the study');
        await page.goBack();
        await page.locator('.caseStudy__markdown').waitFor();
        await page.goBack();
        await page.locator('#home-view').waitFor();
        await page.goForward();
        await page.locator('.caseStudy__markdown').waitFor();
        assert.equal(new URL(page.url()).hash, '#projects/live-work');
        await page.reload();
        await page.locator('.caseStudy__markdown').waitFor();
        await page.getByRole('link', {name:'Back to home'}).click();
        await page.locator('#home-view').waitFor();
        await page.evaluate(() => { window.originalShell = document.querySelector('.shell'); window.originalRail = document.getElementById('right-rail'); });
        const repositoryRequests = requests.filter(url => url.includes('/users/')).length;
        const activityRequests = requests.filter(url => url.includes('/search/commits')).length;
        await page.locator('#view-projects').click();
        await page.locator('#projects-view').waitFor();
        await page.locator('[data-repository="live-play"]').waitFor({state:'attached'});
        assert(await page.locator('#projects-work').isChecked());
        assert.equal(new URL(page.url()).hash, '#projects');
        assert.equal(await page.title(), 'Projects — Noah Stewart');
        await page.locator('#projects-play').check();
        assert(await page.locator('#play-projects').isVisible());
        assert(!await page.locator('#work-projects').isVisible());
        await page.locator('#view-home').click();
        await page.locator('#view-projects').click();
        assert(await page.locator('#projects-play').isChecked(), 'Navigation preserves category selection');
        assert(await page.evaluate(() => window.originalShell === document.querySelector('.shell') && window.originalRail === document.getElementById('right-rail')));
        assert.equal(requests.filter(url => url.includes('/users/')).length, repositoryRequests);
        assert.equal(requests.filter(url => url.includes('/search/commits')).length, activityRequests);

        const link = page.locator('[data-repository="live-play"] .projectCard__studyLink');
        await link.click();
        await page.locator('.caseStudy__markdown').waitFor();
        assert.equal(await page.locator('#case-study-title').textContent(), 'live-play');
        await page.goBack();
        await page.locator('#projects-view').waitFor();
        assert(await page.locator('#projects-play').isChecked(), 'Back preserves the selected category');
        const [popup] = await Promise.all([context.waitForEvent('page'),link.click({modifiers:['ControlOrMeta']})]);
        await popup.waitForLoadState();
        await popup.locator('.caseStudy__markdown').waitFor();
        assert.equal(new URL(popup.url()).hash, '#projects/live-play');
        await popup.close();
        await page.goto(base+'#projects');
        await page.locator('#projects-work').check();
        const missingCard = page.locator('[data-repository="missing"]');
        await missingCard.waitFor();
        assert.equal(await missingCard.locator('.projectCard__studyLink').count(), 0);
        assert(await missingCard.locator('.projectCard__repositoryLink').isVisible());

        // A response from a previous study must not overwrite the current view.
        let release, received;
        const arrived = new Promise(resolve => { received = resolve; });
        await context.route(/raw.githubusercontent.com\/noshpotosh\/live-work\/[^/]+\/CASE_STUDY/, route => {
            release = () => route.fulfill({body:markdown});
            received();
        });
        await page.locator('#projects-view [data-repository="live-work"] .projectCard__studyLink').click();
        await arrived;
        await page.locator('#case-study-back').click();
        await page.evaluate(() => { location.hash = '#projects/missing'; });
        await page.locator('.caseStudy__status').filter({hasText:'hasn’t been published'}).waitFor();
        const completed = page.waitForResponse(response => response.url().includes('/live-work/') && response.url().endsWith('/CASE_STUDY.md'));
        await release();
        await completed;
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        assert.equal(await page.locator('#case-study-title').textContent(),'missing');
        assert.equal(await page.locator('.caseStudy__markdown').count(),0);
        assert.equal(await page.locator('#case-study-links a').first().getAttribute('href'), 'https://github.com/noshpotosh/missing');
        assert(await page.evaluate(() => window.originalShell === document.querySelector('.shell') && window.originalRail === document.getElementById('right-rail')));
        assert.equal(await page.locator('#case-study-view').count(), 1);
        assert.deepEqual(errors, []);
        await context.close();

        for (const failure of ['repositories','markdown','empty']) {
            const context = await browser.newContext();
            await fixtures(context, {[failure]:true});
            const page = await context.newPage();
            await page.goto(base+'#projects');
            if (failure==='markdown') {
                await page.locator('#projects-view [data-repository="live-work"]').waitFor();
                assert.equal(await page.locator('.projectCard__studyLink').count(), 0);
                await page.evaluate(() => { location.hash = '#projects/live-work'; });
            }
            if (failure==='repositories') await page.locator('#work-status').filter({hasText:'could not load'}).waitFor();
            if (failure==='markdown') await page.locator('.caseStudy__status').filter({hasText:'could not load'}).waitFor();
            if (failure==='empty') await page.locator('#work-status').filter({hasText:'No projects'}).waitFor();
            await context.close();
        }
        const directContext = await browser.newContext();
        await fixtures(directContext);
        const direct = await directContext.newPage();
        await direct.goto(base+'#resume');
        await direct.locator('#resume-view').waitFor();
        assert.equal(await direct.locator('#view-resume').getAttribute('aria-current'),'page');
        const [newTab] = await Promise.all([directContext.waitForEvent('page'), direct.locator('#view-projects').click({modifiers:['ControlOrMeta']})]);
        await newTab.locator('#projects-view [data-repository="live-work"]').waitFor();
        assert.equal(new URL(newTab.url()).hash, '#projects');
        await newTab.close();
        await direct.goto(base+'#projects/live-work');
        await direct.locator('.caseStudy__markdown').waitFor();
        await direct.reload();
        await direct.locator('.caseStudy__markdown').waitFor();
        assert.equal(await direct.title(), 'live-work — Noah Stewart');
        assert.equal(await direct.locator('#view-projects').getAttribute('aria-current'), 'page');
        await direct.getByRole('link', {name:'Back to projects'}).click();
        await direct.locator('#projects-view').waitFor();
        await direct.goto(base+'#projects/unknown-repository');
        await direct.locator('.caseStudy__status').filter({hasText:'could not load'}).waitFor();
        assert.equal(await direct.locator('.caseStudy__fallback').getAttribute('href'), 'https://github.com/noshpotosh/unknown-repository');
        assert.equal(await direct.locator('#case-study-links a').count(), 0);
        await directContext.close();

        // Delayed requests belong to their original page, even after rapid switches.
        const slowContext = await browser.newContext();
        await fixtures(slowContext);
        let releaseRepositories, repositoriesRequested;
        const waiting = new Promise(resolve => { repositoriesRequested = resolve; });
        await slowContext.route('https://api.github.com/users/noshpotosh/repos?*', route => {
            releaseRepositories = () => route.fulfill({json:repositories});
            repositoriesRequested();
        });
        const slow = await slowContext.newPage();
        const slowErrors = [];
        slow.on('pageerror', error => slowErrors.push(error.message));
        await slow.goto(base+'#projects');
        await slow.locator('#projects-view').waitFor();
        await waiting;
        assert(await slow.locator('#projects-view [role="status"]').isVisible(), 'Loading state remains visible');
        await slow.locator('#view-home').click();
        await slow.locator('#home-view').waitFor();
        await slow.locator('#view-resume').click();
        await slow.locator('#resume-view').waitFor();
        await releaseRepositories();
        await slow.locator('#view-projects').click();
        await slow.locator('#projects-view [data-repository="live-work"]').waitFor();
        assert.equal(await slow.locator('.screen-content:visible').count(), 1);
        assert.equal(await slow.locator('#projects-view .projectCard').count(), 4);
        assert.deepEqual(slowErrors, []);
        await slowContext.close();

        console.log('Passed: single entrypoint, hash routes, Back/Forward, direct links, persistent shell, rapid navigation, GitHub data, case-study routes, category preservation, modified clicks, stale responses, safe Markdown, failures, JSON resume, client PDF downloads.');
    } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});

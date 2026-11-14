const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');

module.exports = async function testResume(browser, base) {
    const data = JSON.parse(await readFile('src/data/resume.json', 'utf8'));
    const context = await browser.newContext();
    await context.route(/^https:\/\//, route => route.abort());
    let release, received;
    const requested = new Promise(resolve => { received = resolve; });
    await context.route(base + 'data/resume.json', route => {
        release = () => route.fulfill({ json: data });
        received();
    });
    const page = await context.newPage();
    await page.goto(base + '#resume');
    await requested;
    const downloadButton = page.getByRole('button', { name: 'Download PDF', exact: true });
    assert(await downloadButton.isDisabled(), 'Download waits for resume data');
    await release();
    await page.locator('#resume-experience').waitFor();
    assert(await downloadButton.isEnabled());
    assert.equal(await page.locator('.resumeEntry').count(), data.experience.length + data.projects.length + 1);
    assert.equal(await page.locator('.resumeEntry__bullet').count(), [...data.experience, ...data.projects].flatMap(entry => entry.bullets).length);
    assert.deepEqual(await page.locator('#resume-contact a').evaluateAll(links => links.map(link => link.getAttribute('href'))), data.contacts.map(contact => contact.href));
    assert.equal(await page.evaluate(() => window.jspdf), undefined, 'PDF library loads only on click');
    let jsonRequests = 0;
    page.on('request', request => { if (request.url().endsWith('/data/resume.json')) jsonRequests++; });
    const [download] = await Promise.all([
        page.waitForEvent('download'), downloadButton.click(),
    ]);
    assert.equal(download.suggestedFilename(), 'Noah-Stewart-Resume.pdf');
    assert.equal(await download.failure(), null);
    assert.equal(jsonRequests, 0, 'Download reuses the page JSON');
    assert((await readFile(await download.path())).subarray(0, 5).equals(Buffer.from('%PDF-')));
    if (process.env.RESUME_PDF_OUTPUT) await download.saveAs(process.env.RESUME_PDF_OUTPUT);
    await page.locator('#resume-download-status').filter({hasText:'PDF ready.'}).waitFor();
    assert(await downloadButton.isEnabled());

    await context.route(base + 'data/resume.json', route => route.fulfill({json: data}));

    // A failed lazy import shows a useful message and leaves the button usable.
    const failedPage = await context.newPage();
    await failedPage.route('**/vendor/jspdf.umd.min.js', route => route.abort());
    await failedPage.goto(base + '#resume');
    await failedPage.locator('#resume-experience').waitFor();
    const failedButton = failedPage.getByRole('button', {name:'Download PDF', exact:true});
    await failedButton.click();
    await failedPage.locator('#resume-download-status').filter({hasText:'PDF could not be created'}).waitFor();
    assert(await failedButton.isEnabled());
    await failedPage.close();

    // JSON changes reach the rendered content without changing the template.
    data.name = 'Example & <Engineer>';
    data.title = 'Example developer';
    data.location = 'Chicago, Illinois';
    data.experience[0].bullets[0] = 'Updated resume content from JSON.';
    await context.route(base + 'data/resume.json', route => route.fulfill({ json: data }));
    await page.reload();
    await page.locator('#resume-experience').waitFor();
    assert.equal(await page.locator('#resume-name').textContent(), data.name);
    assert.equal(await page.locator('#resume-name > *').count(), 0, 'JSON is text, never HTML');
    for (const header of await page.locator('.profileHeader__identity').all()) {
        assert.equal(await header.locator('.profileHeader__name').textContent(), data.name);
        assert.equal(await header.locator('.profileHeader__subtitle span').first().textContent(), data.title);
        assert.equal(await header.locator('.profileHeader__location').textContent(), data.location);
    }
    assert.equal(await page.locator('.resumeEntry__bullet').first().textContent(), data.experience[0].bullets[0]);

    const [changedDownload] = await Promise.all([
        page.waitForEvent('download'), downloadButton.click(),
    ]);
    assert.equal(changedDownload.suggestedFilename(), 'Example-Engineer-Resume.pdf');
    if (process.env.RESUME_PDF_OUTPUT) await changedDownload.saveAs(process.env.RESUME_PDF_OUTPUT.replace('.pdf', '-changed.pdf'));

    data.experience[0].bullets[0] = 'Additional experience. '.repeat(2000);
    await page.reload();
    await page.locator('#resume-experience').waitFor();
    let unexpectedDownload = false;
    page.on('download', () => { unexpectedDownload = true; });
    await downloadButton.click();
    await page.locator('#resume-download-status').filter({hasText:'exceeds one page'}).waitFor();
    assert(await downloadButton.isEnabled(), 'An export error does not leave the button stuck');
    assert.equal(unexpectedDownload, false, 'Overflow never downloads a truncated PDF');

    for (const response of [{ status: 503, body: 'Unavailable' }, { contentType: 'application/json', body: '{bad json' }]) {
        await context.route(base + 'data/resume.json', route => route.fulfill(response));
        await page.reload();
        await page.locator('#resume-data [role="alert"]').waitFor();
        assert(await downloadButton.isDisabled(), 'Failed data cannot download an empty resume');
    }
    await context.close();
};

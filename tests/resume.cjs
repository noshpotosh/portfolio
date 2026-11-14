const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');

module.exports = async function testResume(browser, base) {
    const data = JSON.parse(await readFile('src/data/resume.json', 'utf8'));
    const context = await browser.newContext();
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    await page.goto(base + '#resume');
    await page.locator('#resume-experience').waitFor();
    assert.equal(await page.locator('.resumeEntry').count(), data.experience.length + data.projects.length + 1);
    assert.equal(await page.locator('.resumeEntry__bullet').count(), [...data.experience, ...data.projects].flatMap(entry => entry.bullets).length);
    assert.deepEqual(await page.locator('#resume-contact a').evaluateAll(links => links.map(link => link.getAttribute('href'))), data.contacts.map(contact => contact.href));
    assert.equal(await page.evaluate(() => window.jspdf), undefined, 'PDF library loads only on click');
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

    for (const response of [{ status: 503, body: 'Unavailable' }, { contentType: 'application/json', body: '{bad json' }]) {
        await context.route(base + 'data/resume.json', route => route.fulfill(response));
        await page.reload();
        await page.locator('#resume-data [role="alert"]').waitFor();
    }
    await context.close();
};

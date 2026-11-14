import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Exercise the actual classic script as the browser does, without module exports.
const shell = await readFile('src/components/shell.html', 'utf8');
const githubScript = shell.match(/<script id="github">([\s\S]*?)<\/script>/)[1];
function githubHelpers(globals = {}) {
    return runInNewContext(githubScript + '\n({ repositoryCategory, repositoryTechnologies, fetchPortfolioRepositories, repositoryLiveURL, portfolioCards })', {
        fetch: (...args) => globalThis.fetch(...args), AbortSignal, URL, ...globals,
    });
}

test('repository categories and technology labels preserve their selection rules', () => {
    const { repositoryCategory, repositoryTechnologies } = githubHelpers();
    const repo = { topics: ['portfolio-work','portfolio-play','portfolio-featured','webgl'], language: 'JavaScript' };
    assert.equal(repositoryCategory(repo), 'play');
    assert.equal(repositoryTechnologies(repo), 'webgl');
    assert.equal(repositoryTechnologies({ topics: ['html', 'css'] }), 'html · css');
    assert.equal(repositoryTechnologies({ topics: ['portfolio-work'], language: 'JavaScript' }), 'JavaScript');
    assert.equal(repositoryTechnologies({}), '');
    assert.equal(repositoryCategory({topics:['portfolio-featured']}), 'work');
    assert.equal(repositoryCategory({}), null);
});

test('components share the browser repository request and paginate the response', async t => {
    const { fetchPortfolioRepositories } = githubHelpers();
    const requests = [];
    t.mock.method(globalThis, 'fetch', async url => {
        requests.push(url);
        return Response.json(requests.length === 1 ? Array.from({length:100}, (_,i) => ({name:String(i)})) : [{name:'last'}]);
    });
    const first = fetchPortfolioRepositories();
    assert.equal(first, fetchPortfolioRepositories());
    assert.equal((await first).length, 101);
    assert.equal(requests.length, 2);
    assert.match(requests[1], /page=2$/);
});

test('live destinations require absolute HTTP(S) URLs', () => {
    const { repositoryLiveURL } = githubHelpers();
    for (const value of [undefined, null, false, 42, {}, '', ' ', '/relative', '//example.com', 'example.com', 'https://', 'javascript:alert(1)', 'mailto:a@example.com', 'ftp://example.com']) {
        assert.equal(repositoryLiveURL(value), '', String(value));
    }
    assert.equal(repositoryLiveURL(' HTTPS://EXAMPLE.COM/path '), 'https://example.com/path');
    assert.equal(repositoryLiveURL('http://example.com'), 'http://example.com/');
});

test('repository cache survives reloads and preserves projects during a 403', async t => {
    const values = new Map();
    const localStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        calls++;
        return calls === 1 ? Response.json([{ name: 'saved-project' }]) : new Response(null, { status: 403 });
    });
    assert.equal((await githubHelpers({ localStorage }).fetchPortfolioRepositories())[0].name, 'saved-project');
    assert.equal((await githubHelpers({ localStorage }).fetchPortfolioRepositories())[0].name, 'saved-project');
    assert.equal(calls, 1);
    for (const [key, value] of values) {
        localStorage.setItem(key, JSON.stringify({ ...JSON.parse(value), savedAt: 0 }));
    }
    assert.equal((await githubHelpers({ localStorage }).fetchPortfolioRepositories())[0].name, 'saved-project');
    assert.equal(calls, 2);
    await assert.rejects(githubHelpers().fetchPortfolioRepositories(), /GitHub responded 403/);
});

test('invalid or unavailable repository storage does not prevent loading', async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json([{ name: 'live-project' }]));
    for (const localStorage of [
        { getItem: () => '{broken', setItem: () => { throw new Error('Quota'); } },
        { getItem: () => { throw new Error('Disabled'); }, setItem: () => { throw new Error('Disabled'); } },
    ]) {
        assert.equal((await githubHelpers({ localStorage }).fetchPortfolioRepositories())[0].name, 'live-project');
    }
});

test('project images use repository conventions, default branches, and shared checks', async t => {
    const requests = [];
    const repos = ['both', 'icon-only', 'preview-only', 'missing', 'failed', 'offline', 'unlisted', 'gif-only'].map(name => ({
        name, default_branch: 'release/docs', topics: name === 'unlisted' ? [] : ['portfolio-work'],
        homepage: 'https://example.com', html_url: `https://github.com/example/${name}`,
    }));
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        if (url.includes('/users/')) return Response.json(repos);
        if (url.endsWith('/CASE_STUDY.md')) return new Response(null);
        requests.push({ url, method: options.method });
        if (url.includes('/offline/')) throw new Error('Network unavailable');
        const exists = url.includes('/both/') ||
            (url.includes('/icon-only/') && url.endsWith('project-icon.png')) ||
            (url.includes('/preview-only/') && url.endsWith('project-preview.png')) ||
            (url.includes('/gif-only/') && url.endsWith('project-preview.gif'));
        return new Response(null, { status: url.includes('/failed/') ? 503 : exists ? 200 : 404 });
    });
    const { portfolioCards } = githubHelpers();
    const [cards, repeated] = await Promise.all([portfolioCards(), portfolioCards()]);
    assert.deepEqual(Array.from(cards, card => !!card.previewURL), [true, false, true, false, false, false, false, true]);
    assert.deepEqual(Array.from(cards, card => !!card.iconURL), [true, true, false, false, false, false, false, false]);
    assert.equal(repeated[0].previewURL, cards[0].previewURL);
    assert.equal(cards[0].previewURL, 'https://raw.githubusercontent.com/noshpotosh/both/release%2Fdocs/.github/project-preview.png');
    assert.equal(cards[0].iconURL, 'https://raw.githubusercontent.com/noshpotosh/both/release%2Fdocs/.github/project-icon.png');
    assert.equal(cards[0].previewAlt, 'both project screenshot');
    assert.equal(cards[0].liveURL, 'https://example.com/');
    assert.equal(cards[0].studyURL, '#projects/both');
    assert.equal(cards[0].html_url, 'https://github.com/example/both');
    assert.equal(cards[7].previewURL, 'https://raw.githubusercontent.com/noshpotosh/gif-only/release%2Fdocs/.github/project-preview.gif');
    assert.equal(requests.length, 19);
    assert.equal(new Set(requests.map(request => request.url)).size, requests.length);
    for (const { method } of requests) assert.equal(method, 'HEAD');
});

test('case-study availability keeps every card and shares file checks', async t => {
    const requests = [];
    const repos = ['published', 'missing', 'failed', 'offline', 'unlisted'].map(name => ({
        name, default_branch: 'release/docs', topics: name === 'unlisted' ? [] : ['portfolio-work'],
    }));
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        if (url.includes('/users/')) return Response.json(repos);
        if (url.includes('/.github/')) return new Response(null, { status: 404 });
        requests.push({ url, method: options.method });
        if (url.includes('/offline/')) throw new Error('Network unavailable');
        return new Response(null, { status: url.includes('/missing/') ? 404 : url.includes('/failed/') ? 503 : 200 });
    });
    const { portfolioCards } = githubHelpers();
    const [cards, repeated] = await Promise.all([portfolioCards(), portfolioCards()]);
    assert.deepEqual(Array.from(cards, repo => repo.name), repos.map(repo => repo.name));
    assert.deepEqual(Array.from(cards, repo => repo.hasCaseStudy), [true, false, false, false, false]);
    assert.deepEqual(Array.from(repeated, repo => repo.hasCaseStudy), [true, false, false, false, false]);
    assert.equal(requests.length, 4);
    for (const { url, method } of requests) {
        assert.equal(method, 'HEAD');
        assert.match(url, /\/release%2Fdocs\/CASE_STUDY\.md$/);
    }
});

const { repositories, markdown } = require('../project-fixtures.cjs');
async function fixtures(context, failures = {}) {
    const requests = [];
    await context.route('https://github.com/**', route => route.fulfill({ contentType:'text/html', body:'<h1>GitHub source</h1>' }));
    await context.route('https://raw.githubusercontent.com/**', route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/CASE_STUDY.md')) return route.fulfill({ status: failures.markdown ? 503 : url.pathname.includes('/missing/') ? 404 : 200, body: markdown });
        if (url.pathname.includes('/.github/')) {
            const preview = /\/project-preview\.(png|gif)$/.test(url.pathname);
            const available = preview
                ? url.pathname.endsWith('.png') && /\/(cfjs|custom-project)\//.test(url.pathname)
                : /\/(custom-project|other)\//.test(url.pathname);
            return route.fulfill(available
                ? { path: preview ? 'tests/fixtures/project-preview.png' : 'tests/fixtures/project-icon.png' }
                : { status: 404, body: '' });
        }
        return route.fulfill({ contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"></svg>' });
    });
    await context.route('https://api.github.com/**', route => {
        const url = new URL(route.request().url());
        requests.push(url.href);
        if (url.pathname === '/search/commits') return route.fulfill({ status: failures.activity ? 503 : 200, json: {items: [{
            sha:'abcdef1234567890', html_url:'https://github.com/noshpotosh/example/commit/abc',
            repository:{name:'Example',html_url:'https://github.com/noshpotosh/example'},
            commit:{ message:'A commit <b>plain text</b>\nMore details',committer:{date:'2026-11-07T12:00:00Z'}},
        }]} });
        if (url.pathname === '/users/noshpotosh/repos') return route.fulfill({ status: failures.repositories ? 503 : 200, json: failures.empty ? [] : failures.cards || repositories });
        throw new Error('Unexpected API request: '+url.href);
    });
    await context.route('https://github-contributions-api.jogruber.de/**', route => route.fulfill({ status: failures.activity ? 503 : 200, json:{contributions:Array.from({length:182}, (_,index) => ({ date:new Date(Date.UTC(2026,4,10+index)).toISOString().slice(0,10), count:index%5,level:index%5 }))} }));
    return requests;
}

module.exports = { fixtures };

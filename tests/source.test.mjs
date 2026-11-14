import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers/local-server.mjs';

test('the development server serves HTML and rejects missing paths and writes', async () => {
    const server = await startServer();
    try {
        const response = await fetch(server.url);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.match(await response.text(), /Noah Stewart/);
        assert.equal((await fetch(server.url + 'missing.html')).status, 404);
        assert.equal((await fetch(server.url, { method: 'POST' })).status, 405);
    } finally {
        await server.close();
    }
});

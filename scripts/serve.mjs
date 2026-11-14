import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('src');
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4321);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.ico': 'image/x-icon' };

const server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
    }
    try {
        const url = new URL(request.url, 'http://localhost');
        const pathname = decodeURIComponent(url.pathname);
        if (base !== '/' && pathname === base.slice(0, -1)) {
            response.writeHead(301, { Location: base + url.search }).end();
            return;
        }
        if (!pathname.startsWith(base)) throw new Error('Not found');
        let file = resolve(root, pathname.slice(base.length));
        if (file !== root && !file.startsWith(root + sep)) throw new Error('Not found');
        if ((await stat(file)).isDirectory()) {
            if (!url.pathname.endsWith('/')) {
                response.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
                return;
            }
            file = resolve(file, 'index.html');
        }
        const contents = await readFile(file);
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        response.end(request.method === 'HEAD' ? undefined : contents);
    } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}${base}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });

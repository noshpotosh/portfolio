import { spawn } from 'node:child_process';

// Port 0 lets the OS allocate a free port; never reuse an unrelated server.
export async function startServer() {
    const child = spawn(process.execPath, ['scripts/serve.mjs', '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const url = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { child.kill(); reject(new Error(`Server startup timed out: ${output}`)); }, 15000);
        child.stderr.on('data', data => { output += data; });
        child.stdout.on('data', data => {
            output += data;
            const match = output.match(/Local: (http:\/\/[^\s]+)/);
            if (match) { clearTimeout(timeout); resolve(match[1]); }
        });
        child.on('error', reject);
        child.on('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited (${code}): ${output}`)); });
    });
    const stop = () => { if (child.exitCode === null) child.kill(); };
    process.once('exit', stop);
    return { url, async close() {
        process.removeListener('exit', stop);
        if (child.exitCode !== null) return;
        await new Promise(resolve => { child.once('exit', resolve); stop(); });
    } };
}

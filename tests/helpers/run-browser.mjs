import { spawn } from 'node:child_process';
import { startServer } from './local-server.mjs';
const server = await startServer();
try {
    const args = process.argv.slice(2);
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, PORTFOLIO_URL: server.url } });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
    process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
} finally { await server.close(); }

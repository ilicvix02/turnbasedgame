// Runs the API server (tsx watch) and the Vite client dev server together.
import { spawn } from 'node:child_process';
const procs = [
  spawn('npx', ['tsx', 'watch', 'server/src/index.ts'], { stdio: 'inherit', env: { ...process.env, NODE_NO_WARNINGS: '1' } }),
  spawn('npx', ['vite'], { stdio: 'inherit' }),
];
const stop = () => { for (const p of procs) p.kill('SIGTERM'); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => { if (code) stop(); });

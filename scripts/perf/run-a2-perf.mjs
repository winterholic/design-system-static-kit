#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const port = 4310;
const url = `http://127.0.0.1:${port}`;

console.log(`Starting Next.js production server on ${url}...`);
const server = spawn('npm', ['--workspace', 'apps/web', 'run', 'start', '--', '-p', String(port)], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    DSK_PERF_METRICS: '1',
    NODE_ENV: 'production',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[server err] ${d}`));

const cleanup = () => {
  if (server.killed) return;
  console.log('Shutting down server...');
  server.kill('SIGTERM');
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

// Wait for server ready
let ready = false;
for (let i = 0; i < 40; i++) {
  try {
    const res = await fetch(`${url}/api/dev/perf-counters`);
    if (res.ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}

if (!ready) {
  console.error('Server failed to start within 10s');
  cleanup();
  process.exit(1);
}

console.log('Server ready! Running performance measurement...');
const args = process.argv.slice(2);
const measureArgs = [
  resolve(root, 'scripts/perf/measure.mjs'),
  '--url', url,
  '--out', resolve(root, 'docs/dev/catalog-platform-upgrade/PERFORMANCE-A2.json'),
  ...(args.length ? args : ['--pages', 'studio']),
];

const measure = spawn('node', measureArgs, {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

measure.on('close', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

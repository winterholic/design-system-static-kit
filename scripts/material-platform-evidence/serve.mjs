import {createServer} from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const reportPath = resolve(ROOT, 'docs/evidence/material-platform/layout/report.json');
const types = {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8'};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/__evidence/layout') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const report = JSON.parse(body);
      await mkdir(resolve(ROOT, 'docs/evidence/material-platform/layout'), {recursive: true});
      await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
      res.writeHead(201, {'content-type': 'text/plain; charset=utf-8'}).end('saved layout/report.json');
      return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const target = resolve(ROOT, relative);
    if (target !== ROOT && !target.startsWith(ROOT + sep)) { res.writeHead(403).end('forbidden'); return; }
    const content = await readFile(target);
    res.writeHead(200, {'content-type': types[extname(target)] ?? 'application/octet-stream'}).end(content);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'not found' : 'server error');
  }
});
server.listen(4339, '0.0.0.0', () => console.log('material evidence server on 4339'));

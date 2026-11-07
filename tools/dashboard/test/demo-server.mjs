// Local demo: mock Notion + the dashboard API + the PWA, no Cloudflare needed.
//   npm run demo   ->  http://localhost:8787
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock, mockConfig } from './mock-notion.mjs';
import { createApi } from '../src/api.js';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

export async function startDemo({ port = 8787, mockPort = 8788, withManualProp = true } = {}) {
  const mock = createMock({ withManualProp });
  await new Promise((r) => mock.server.listen(mockPort, '127.0.0.1', r));
  const api = createApi(mockConfig(), { NOTION_TOKEN: 'test-token', NOTION_API_BASE: `http://127.0.0.1:${mockPort}` });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname.startsWith('/api/')) {
      let raw = '';
      for await (const c of req) raw += c;
      const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : raw });
      const out = await api.handle(request, url);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(await out.text());
      return;
    }
    const path = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!path.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    try {
      const data = await readFile(path);
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { server, mock, close: () => { server.close(); mock.server.close(); } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startDemo();
  console.log('Demo on http://localhost:8787 (mock Notion data)');
}

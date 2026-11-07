// Single-module build of the Worker for deploys without Workers Static Assets
// (for example an upload through the Cloudflare API or dashboard). Same logic
// as worker.js; the PWA files are embedded by scripts/build-single.mjs.
import config from '../config/dashboard.config.json';
import { ASSETS } from '../dist/assets.generated.js';
import { authenticate } from './auth.js';
import { createApi } from './api.js';
import { SECURITY_HEADERS } from './headers.js';

function withHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function serveAsset(url) {
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const a = ASSETS[path] || (path.includes('.') ? null : ASSETS['/index.html']);
  if (!a) return new Response('Not found', { status: 404 });
  const body = a.b64 ? b64ToBytes(a.body) : a.body;
  return new Response(body, {
    headers: { 'Content-Type': a.type, 'Cache-Control': path === '/sw.js' ? 'no-cache' : 'public, max-age=300' },
  });
}

let api;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = await authenticate(request, env).catch((e) => ({ ok: false, status: 500, error: e.message }));
    if (!auth.ok) {
      return withHeaders(new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { 'Content-Type': 'application/json' },
      }));
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        api = api || createApi(config, env);
      } catch (e) {
        return withHeaders(new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        }));
      }
      return withHeaders(await api.handle(request, url));
    }
    return withHeaders(serveAsset(url));
  },
};

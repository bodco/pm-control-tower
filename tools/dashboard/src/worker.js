// Cloudflare Worker entry: serves the PWA from ./public (Workers Static Assets)
// and the /api routes. All deployment facts (database IDs, projects) come from
// config/dashboard.config.json, which is git-ignored. The Notion token is a
// Worker secret (NOTION_TOKEN).

import config from '../config/dashboard.config.json';
import { authenticate } from './auth.js';
import { createApi } from './api.js';
import { SECURITY_HEADERS } from './headers.js';


function withHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
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
    return withHeaders(await env.ASSETS.fetch(request));
  },
};

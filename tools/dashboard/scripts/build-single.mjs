// Builds dist/worker.single.mjs: one ES module with the PWA embedded.
// Use it when you deploy through the Cloudflare API or dashboard instead of
// `wrangler deploy`. Needs config/dashboard.config.json (git-ignored).
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { build } from 'esbuild';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const TEXT = new Set(['.html', '.js', '.css', '.svg', '.webmanifest']);

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

mkdirSync('dist', { recursive: true });
const assets = {};
for (const file of walk('public')) {
  const ext = extname(file);
  const key = '/' + relative('public', file).split('\\').join('/');
  const buf = readFileSync(file);
  // Everything is embedded as base64: plain HTML/JS inside the upload body can
  // trip the Cloudflare dashboard WAF ("Attention Required") on API uploads.
  assets[key] = { type: TYPES[ext] || (TEXT.has(ext) ? 'text/plain; charset=utf-8' : 'application/octet-stream'), b64: true, body: buf.toString('base64') };
}
writeFileSync('dist/assets.generated.js', `export const ASSETS = ${JSON.stringify(assets)};\n`);

await build({
  entryPoints: ['src/worker-inline.js'],
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  outfile: 'dist/worker.single.mjs', minify: true, legalComments: 'none',
});
console.log('dist/worker.single.mjs', statSync('dist/worker.single.mjs').size, 'bytes');

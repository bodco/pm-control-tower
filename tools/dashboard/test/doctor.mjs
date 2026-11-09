// Checks of `npm run doctor` against the mock Notion and temporary install folders.
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMock, mockConfig } from './mock-notion.mjs';
import { runDoctor, parseToml } from '../scripts/doctor.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.stack.split('\n').slice(0, 3).join('\n     ')}`); process.exitCode = 1; }
}

const TOKEN = 'test-token';
const GOOD_TOML = `name = "pm-control-tower-dashboard"\nmain = "src/worker.js"\n[vars]\nACCESS_TEAM_DOMAIN = "northwind.cloudflareaccess.com"\nACCESS_AUD = "aud-demo-123"\nALLOWED_EMAILS = "pm@northwind.example"\n`;

function folder({ config = mockConfig(), toml = GOOD_TOML } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ct-doctor-'));
  mkdirSync(join(dir, 'config'));
  if (config !== null) writeFileSync(join(dir, 'config/dashboard.config.json'), typeof config === 'string' ? config : JSON.stringify(config));
  if (toml !== null) writeFileSync(join(dir, 'wrangler.toml'), toml);
  return dir;
}
async function run(opts) {
  const lines = [];
  const out = await runDoctor({ print: (l) => lines.push(l), ...opts });
  return { ...out, text: lines.join('\n') };
}
const has = (r, level, re) => r.results.some((x) => x.level === level && re.test(x.msg));

async function withMock(options, fn) {
  const mock = createMock(options);
  await new Promise((r) => mock.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${mock.server.address().port}`;
  try { return await fn(base); } finally { mock.server.close(); }
}

await test('a complete install passes and the token never appears in the output', () => withMock({}, async (base) => {
  const dir = folder();
  const r = await run({ dir, env: { NOTION_TOKEN: TOKEN, NOTION_API_BASE: base } });
  assert.equal(r.fails, 0, r.text);
  assert.ok(has(r, 'ok', /Threads: visible, required properties present/));
  assert.ok(has(r, 'ok', /orbit: project page visible/));
  assert.ok(!r.text.includes(TOKEN), 'token printed');
  rmSync(dir, { recursive: true });
}));

await test('missing optional properties are warnings that say what is lost', () => withMock({ withManualProp: false, withRiskDates: false }, async (base) => {
  const dir = folder();
  const r = await run({ dir, env: { NOTION_TOKEN: TOKEN, NOTION_API_BASE: base } });
  assert.equal(r.fails, 0, r.text);
  assert.ok(has(r, 'warn', /"Manual Status At" is missing: a status set in the dashboard can be overwritten/));
  assert.ok(has(r, 'warn', /"Collector Status" is missing/));
  assert.ok(has(r, 'warn', /"Trigger Date" is missing/));
  assert.ok(has(r, 'warn', /"Last Reviewed" is missing/));
  rmSync(dir, { recursive: true });
}));

await test('a renamed required property fails, a schema override fixes it', () => withMock({}, async (base) => {
  const cfg = mockConfig();
  cfg.schema = { tasks: { due: 'Deadline' } };
  const dir = folder({ config: cfg });
  const r = await run({ dir, env: { NOTION_TOKEN: TOKEN, NOTION_API_BASE: base } });
  assert.ok(has(r, 'fail', /Tasks Tracker: missing required "Deadline"/), r.text);
  rmSync(dir, { recursive: true });
}));

await test('a database the token cannot see fails with the sharing fix', () => withMock({}, async (base) => {
  const cfg = mockConfig();
  cfg.notion.meetings_db = 'collection://12345678-1234-1234-1234-123456789abc';
  const dir = folder({ config: cfg });
  const r = await run({ dir, env: { NOTION_TOKEN: TOKEN, NOTION_API_BASE: base } });
  assert.ok(has(r, 'fail', /Meetings: the token does not see this database/));
  assert.match(r.text, /Connections/);
  rmSync(dir, { recursive: true });
}));

await test('a wrong token fails once and is not printed', () => withMock({}, async (base) => {
  const dir = folder();
  const wrong = 'secret_wrong_value_123';
  const r = await run({ dir, env: { NOTION_TOKEN: wrong, NOTION_API_BASE: base } });
  assert.ok(has(r, 'fail', /refuses the token/), r.text);
  assert.ok(!r.text.includes(wrong), 'token printed');
  rmSync(dir, { recursive: true });
}));

await test('without a token the Notion checks are skipped, not failed', async () => {
  const dir = folder();
  const r = await run({ dir, env: {} });
  assert.equal(r.fails, 0, r.text);
  assert.ok(has(r, 'info', /NOTION_TOKEN is not given/));
  rmSync(dir, { recursive: true });
});

await test('the committed examples are reported as placeholders', async () => {
  const dir = folder({ config: readFileSync(new URL('../config/dashboard.config.example.json', import.meta.url), 'utf8'), toml: readFileSync(new URL('../wrangler.example.toml', import.meta.url), 'utf8') });
  const r = await run({ dir, env: {} });
  assert.ok(has(r, 'fail', /notion\.tasks_db still holds the example placeholder/), r.text);
  assert.ok(has(r, 'fail', /project_page_id still holds the example placeholder/));
  assert.ok(has(r, 'fail', /ACCESS_AUD still holds the example value/));
  assert.ok(has(r, 'fail', /ALLOWED_EMAILS still holds the example address/));
  rmSync(dir, { recursive: true });
});

await test('missing files, broken JSON and unsafe wrangler.toml fail', async () => {
  let dir = folder({ config: null, toml: null });
  let r = await run({ dir, env: {} });
  assert.ok(has(r, 'fail', /dashboard\.config\.json is missing/));
  assert.ok(has(r, 'fail', /wrangler\.toml is missing/));
  rmSync(dir, { recursive: true });
  dir = folder({ config: '{"notion": {,}', toml: GOOD_TOML + 'DEV_ALLOW_NO_AUTH = "true"\nNOTION_TOKEN = "x"\n' });
  r = await run({ dir, env: {} });
  assert.ok(has(r, 'fail', /not valid JSON/));
  assert.ok(has(r, 'fail', /DEV_ALLOW_NO_AUTH/));
  assert.ok(has(r, 'fail', /NOTION_TOKEN is written in wrangler\.toml/));
  rmSync(dir, { recursive: true });
});

await test('--url: a redirect to Access passes, an open app fails', async () => {
  let mode = 'gate';
  const srv = http.createServer((req, res) => {
    if (mode === 'gate') { res.writeHead(302, { Location: 'https://northwind.cloudflareaccess.com/cdn-cgi/access/login' }); res.end(); }
    else if (mode === 'noaccess') { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"error":"Access is not configured (ACCESS_TEAM_DOMAIN, ACCESS_AUD)"}'); }
    else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); }
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const dir = folder();
  try {
    assert.ok(has(await run({ dir, env: {}, url }), 'ok', /redirects to the Cloudflare Access login/));
    mode = 'noaccess';
    assert.ok(has(await run({ dir, env: {}, url }), 'fail', /Access is not configured/));
    mode = 'open';
    assert.ok(has(await run({ dir, env: {}, url }), 'fail', /answers without a login/));
  } finally { srv.close(); rmSync(dir, { recursive: true }); }
});

await test('parseToml reads [vars] and ignores comments', () => {
  const t = parseToml('# c\nname = "x"\n[vars]\nACCESS_AUD = "a" # note\n# ALLOWED_EMAILS = "no"\n[assets]\ndirectory = "./public"\n');
  assert.equal(t.top.name, 'x');
  assert.deepEqual(t.vars, { ACCESS_AUD: 'a' });
});

await test('doctor output has no em dash', () => {
  const src = readFileSync(new URL('../scripts/doctor.mjs', import.meta.url), 'utf8');
  assert.ok(!src.includes('\u2014'));
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);

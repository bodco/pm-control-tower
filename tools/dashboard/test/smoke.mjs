// End-to-end checks of the API against the mock Notion, plus the Access check.
//   npm test
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { startDemo } from './demo-server.mjs';
import { IDS } from './mock-notion.mjs';
import { authenticate } from '../src/auth.js';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n     ${e.stack.split('\n').slice(0, 3).join('\n     ')}`); process.exitCode = 1; }
}

const demo = await startDemo({ port: 8790, mockPort: 8791 });
const base = 'http://127.0.0.1:8790';
const get = async (p) => { const r = await fetch(base + p); return { status: r.status, body: await r.json() }; };
const send = async (method, p, body, headers = { 'X-CT-Request': '1' }) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const findPage = (title) => [...demo.mock.pages.values()].find((p) => Object.values(p.properties).find((x) => x.type === 'title')?.title?.[0]?.plain_text === title);
const val = (page, name) => { const p = page.properties[name]; return p[p.type]?.name ?? p[p.type]?.start ?? p[p.type]; };

await test('config lists only configured projects, no IDs', async () => {
  const { status, body } = await get('/api/config');
  assert.equal(status, 200);
  assert.deepEqual(body.projects.map((p) => p.slug), ['orbit', 'playbook']);
  assert.ok(!JSON.stringify(body).includes(IDS.orbit), 'project page id leaked to client config');
  assert.equal(body.threadManualStatus, true);
  assert.ok(body.options.taskStatuses.includes("Won't Do"), 'options come from the live schema');
  assert.equal(body.colors.taskStatus['In progress'], 'blue', 'option colors come from the live schema');
  assert.deepEqual(body.turn.mine, ['Awaiting Reply'], 'turn mapping defaults to the framework rule');
  assert.equal(body.automation, true);
});

let overview;
await test('overview returns full lists, metrics are computed by the client', async () => {
  const { status, body } = await get('/api/overview');
  assert.equal(status, 200, JSON.stringify(body));
  overview = body;
  assert.deepEqual(body.errors, []);
  assert.ok(!JSON.stringify(body).includes('dropped idea'), "Won't Do task counted as open");
  assert.ok(body.projects.every((p) => !('metrics' in p)), 'one definition of each metric: no server-side metrics');
  const orbitTasks = body.tasks.filter((x) => x.project === 'orbit');
  assert.equal(orbitTasks.length, 5, 'open tasks incl. On Hold');
  assert.ok(body.threads.every((x) => x.status !== 'Closed'), 'no closed threads');
  assert.ok(body.threads.some((x) => x.status === 'Replied'), 'all open threads come back, the client sorts them');
  const cred = body.threads.find((x) => x.title.includes('staging credentials'));
  assert.equal(cred.description, 'I asked for staging credentials on Monday, no answer yet.', 'ledger line hidden');
  const risk = body.risks.find((x) => x.title.includes('staging credentials'));
  assert.ok(risk.triggerDate && risk.lastReviewed && risk.edited, 'optional risk dates and edit time are mapped');
  assert.ok(body.meetings.some((m) => m.date > new Date().toISOString().slice(0, 10)) || body.meetings.length > 3, 'upcoming meetings are included');
});

await test('config: freshness thresholds, turn mapping and optional risk fields', async () => {
  const { body } = await get('/api/config');
  assert.deepEqual(body.freshness, { quiet_days: 14, stale_days: 30, nudge_days: 5, turn_sla_workdays: 2, stale_bulk_days: 90 });
  assert.deepEqual(body.projects[0].turn.mine, ['Awaiting Reply']);
  assert.equal(body.projects[0].freshness.stale_days, 30);
  assert.deepEqual(body.riskFields, { trigger: true, reviewed: true });
});

await test('project Open in Notion is a redirect, not an ID in the config', async () => {
  const r = await fetch(base + '/api/p/orbit/notion', { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), new RegExp(IDS.orbit));
  assert.equal((await fetch(base + '/api/p/nope/notion', { redirect: 'manual' })).status, 404);
});

await test('nothing from an unconfigured project appears', async () => {
  const s = JSON.stringify(overview);
  assert.ok(!s.includes('outside this dashboard'));
  assert.ok(overview.tasks.every((x) => x.project));
  assert.ok(overview.threads.every((x) => x.project));
  assert.ok(overview.risks.every((x) => x.project));
});

await test('project sections load', async () => {
  for (const s of ['tasks', 'threads', 'meetings', 'decisions', 'risks', 'reports', 'state']) {
    const { status, body } = await get(`/api/p/orbit/${s}`);
    assert.equal(status, 200, `${s}: ${JSON.stringify(body)}`);
  }
  const st = await get('/api/p/orbit/state');
  assert.ok(st.body.blocks.length >= 5);
  assert.equal((await get('/api/p/playbook/state')).body.missing, true);
  assert.equal((await get('/api/p/nope/tasks')).status, 404);
  const closed = await get('/api/p/orbit/threads?all=1');
  assert.equal(closed.body.closed.length, 1);
});

await test('automation is read-only and project-scoped', async () => {
  const { status, body } = await get('/api/automation');
  assert.equal(status, 200);
  assert.equal(body.configured, true);
  assert.ok(body.items.some((x) => x.kind === 'skill') && body.items.some((x) => x.kind === 'task'));
  assert.ok(body.items.every((x) => x.project === null || ['orbit', 'playbook'].includes(x.project)));
  assert.ok(body.runs.some((r) => r.result === 'Failed'));
  for (const m of ['POST', 'PATCH']) assert.equal((await send(m, '/api/automation', {})).status, 404, 'no write route');
});

await test('writes need the X-CT-Request header', async () => {
  const r = await send('POST', '/api/inbox', { title: 'x' }, {});
  assert.equal(r.status, 403);
});

await test('task: status change, validation, undo', async () => {
  const id = findPage('🧪 Demo: send weekly status report').id;
  let r = await send('PATCH', `/api/tasks/${id}`, { status: 'Done' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.task.status, 'Done');
  r = await send('PATCH', `/api/tasks/${id}`, { status: 'Finished' });
  assert.equal(r.status, 400);
  r = await send('PATCH', `/api/tasks/${id}`, { status: 'To Do', priority: 'High', due: '2030-01-01' });
  assert.equal(r.status, 200);
  assert.equal(r.body.task.priority, 'High');
  assert.equal(r.body.task.due, '2030-01-01');
});

await test('cache is dropped after a write', async () => {
  const id = findPage('🧪 Demo: review staging deploy notes').id;
  await send('PATCH', `/api/tasks/${id}`, { status: 'Done' });
  const { body } = await get('/api/overview');
  assert.equal(body.done.filter((x) => x.project === 'orbit').length, 2);
});

await test('a newer edit in Notion wins: the action is refused with 409', async () => {
  const id = findPage('🧪 Demo: update onboarding checklist').id;
  const r = await send('PATCH', `/api/tasks/${id}`, { status: 'Done', expectEdited: '2000-01-01T00:00:00.000Z' });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /Changed in Notion/);
  const page = demo.mock.pages.get(id);
  assert.equal(val(page, 'Status'), 'To Do', 'nothing written');
  const ok = await send('PATCH', `/api/tasks/${id}`, { due: '2030-03-03', expectEdited: page.last_edited_time });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
});

await test('risk Reviewed writes the review date; thread "Still relevant" only moves the manual mark', async () => {
  const risk = findPage('🧪 Demo: single reviewer for the playbook').id;
  const r = await send('PATCH', `/api/risks/${risk}`, { reviewed: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.risk.lastReviewed, r.body.risk.lastUpdated);
  const th = findPage('🧪 Demo: access to the analytics workspace').id;
  const before = val(demo.mock.pages.get(th), 'Status');
  const t2 = await send('PATCH', `/api/threads/${th}`, { touch: true });
  assert.equal(t2.status, 200, JSON.stringify(t2.body));
  const page = demo.mock.pages.get(th);
  assert.equal(val(page, 'Status'), before, 'status unchanged');
  assert.ok(page.properties['Manual Status At'].date.start);
  assert.equal(page.icon.emoji, '🔴', 'icon unchanged');
});

await test('records outside the configured projects or databases are refused', async () => {
  const foreign = findPage('Task of a project outside this dashboard').id;
  assert.equal((await send('PATCH', `/api/tasks/${foreign}`, { status: 'Done' })).status, 403);
  assert.equal((await send('PATCH', `/api/tasks/${IDS.state}`, { status: 'Done' })).status, 403);
  const risk = findPage('🧪 Demo: scope creep around export').id;
  assert.equal((await send('PATCH', `/api/tasks/${risk}`, { status: 'Done' })).status, 403, 'risk page patched as a task');
});

await test('record body: full text and page content, guarded like a write', async () => {
  const weekly = findPage('🧪 Demo: send weekly status report').id;
  const { status, body } = await get(`/api/body/tasks/${weekly}`);
  assert.equal(status, 200, JSON.stringify(body));
  assert.match(body.text, /launch checklist/);
  assert.equal(body.blocks.length, 3);
  assert.equal(body.blocks[1].type, 'bulleted_list_item');
  const empty = await get(`/api/body/tasks/${findPage('🧪 Demo: review staging deploy notes').id}`);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.blocks, []);
  assert.equal((await get(`/api/body/tasks/${findPage('Task of a project outside this dashboard').id}`)).status, 403);
  assert.equal((await get(`/api/body/threads/${weekly}`)).status, 403, 'a task read as a thread');
  assert.equal((await get(`/api/body/secrets/${weekly}`)).status, 404);
});

await test('creating a task requires an explicit project', async () => {
  assert.equal((await send('POST', '/api/tasks', { title: 'No project' })).status, 400);
  const r = await send('POST', '/api/tasks', { title: 'Dashboard task', project: 'playbook', priority: 'Low', due: '2030-02-02' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const page = findPage('Dashboard task');
  assert.equal(val(page, 'Source'), 'manual');
  assert.equal(page.properties.Project.relation[0].id, IDS.playbook);
  assert.equal(page.properties.Workspace.relation[0].id, IDS.ws);
});

await test('thread status: manual mark and icon follow the status', async () => {
  const id = findPage('🧪 Demo: staging credentials').id;
  let r = await send('PATCH', `/api/threads/${id}`, { status: 'Awaiting Reply' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  let page = demo.mock.pages.get(id);
  assert.equal(page.icon.emoji, '🔴');
  assert.ok(page.properties['Manual Status At'].date.start);
  assert.equal(r.body.warning, null);
  r = await send('PATCH', `/api/threads/${id}`, { status: 'Closed' });
  page = demo.mock.pages.get(id);
  assert.equal(page.icon, null);
  assert.equal((await send('PATCH', `/api/threads/${id}`, { status: 'Done' })).status, 400);
});

await test('inbox: capture and route', async () => {
  let r = await send('POST', '/api/inbox', { title: 'Quick thought' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const item = findPage('Quick thought');
  assert.equal(val(item, 'Status'), 'New');
  assert.equal((await send('POST', `/api/inbox/${item.id}/route`, {})).status, 400);
  r = await send('POST', `/api/inbox/${item.id}/route`, { project: 'orbit', priority: 'High' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(val(item, 'Status'), 'Routed');
  const task = demo.mock.pages.get(r.body.task.id);
  assert.equal(val(task, 'Source'), 'inbox');
  assert.equal(task.properties.Inbox.relation[0].id.replace(/-/g, ''), item.id.replace(/-/g, ''));
  const foreign = findPage('Inbox of a project outside this dashboard').id;
  assert.equal((await send('POST', `/api/inbox/${foreign}/route`, { project: 'orbit' })).status, 403);
});

await test('risks and decisions', async () => {
  const risk = findPage('🧪 Demo: scope creep around export').id;
  let r = await send('PATCH', `/api/risks/${risk}`, { status: 'Mitigated', severity: 'Low' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.risk.status, 'Mitigated');
  assert.equal((await send('PATCH', `/api/risks/${risk}`, { severity: 'Huge' })).status, 400);
  r = await send('POST', '/api/decisions', { title: 'Use one release train', project: 'orbit', area: 'Process', door: 'Two-way' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.decision.status, 'Active');
  r = await send('PATCH', `/api/decisions/${r.body.decision.id}`, { status: 'Cancelled' });
  assert.equal(r.body.decision.status, 'Cancelled');
  assert.equal((await send('POST', '/api/decisions', { title: 'x' })).status, 400);
});

demo.close();

await test('without the manual-status property the API warns', async () => {
  const d = await startDemo({ port: 8792, mockPort: 8793, withManualProp: false });
  try {
    const cfg = await (await fetch('http://127.0.0.1:8792/api/config')).json();
    assert.equal(cfg.threadManualStatus, false);
    const id = [...d.mock.pages.values()].find((p) => p.properties['Thread Name']?.title?.[0]?.plain_text === '🧪 Demo: release announcement').id;
    const r = await fetch(`http://127.0.0.1:8792/api/threads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CT-Request': '1' }, body: JSON.stringify({ status: 'Closed' }) });
    const body = await r.json();
    assert.equal(r.status, 200, JSON.stringify(body));
    assert.match(body.warning, /Manual Status At/);
    const touch = await fetch(`http://127.0.0.1:8792/api/threads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CT-Request': '1' }, body: JSON.stringify({ touch: true }) });
    assert.equal(touch.status, 400, 'Still relevant needs the manual-status property');
  } finally { d.close(); }
});

await test('without the optional risk dates the API says so and refuses Reviewed', async () => {
  const d = await startDemo({ port: 8794, mockPort: 8795, withRiskDates: false });
  try {
    const cfg = await (await fetch('http://127.0.0.1:8794/api/config')).json();
    assert.deepEqual(cfg.riskFields, { trigger: false, reviewed: false });
    const id = [...d.mock.pages.values()].find((p) => p.properties.Name?.title?.[0]?.plain_text === '🧪 Demo: scope creep around export').id;
    const r = await fetch(`http://127.0.0.1:8794/api/risks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CT-Request': '1' }, body: JSON.stringify({ reviewed: true }) });
    assert.equal(r.status, 400);
    const ov = await (await fetch('http://127.0.0.1:8794/api/overview')).json();
    assert.deepEqual(ov.errors, []);
  } finally { d.close(); }
});

// ---------- Access JWT ----------
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => (String(u).includes('/cdn-cgi/access/certs') ? new Response(JSON.stringify({ keys: [jwk] })) : realFetch(u, o));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(payload, kid = 'k1') {
  const head = b64({ alg: 'RS256', kid });
  const body = b64(payload);
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(privateKey).toString('base64url');
  return `${head}.${body}.${sig}`;
}
const env = { ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud-1', ALLOWED_EMAILS: 'pm@example.com' };
const req = (token) => new Request('https://x/api/config', { headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} });
const now = Math.floor(Date.now() / 1000);

await test('auth fails closed without config', async () => {
  assert.equal((await authenticate(req(), {})).status, 503);
  assert.equal((await authenticate(req(), { DEV_ALLOW_NO_AUTH: 'true' })).ok, true);
});
await test('auth accepts a valid Access token', async () => {
  const r = await authenticate(req(jwt({ aud: ['aud-1'], email: 'pm@example.com', exp: now + 600 })), env);
  assert.equal(r.ok, true);
  assert.equal(r.email, 'pm@example.com');
});
await test('auth rejects bad tokens', async () => {
  assert.equal((await authenticate(req(), env)).status, 401);
  assert.equal((await authenticate(req(jwt({ aud: ['other'], email: 'pm@example.com', exp: now + 600 })), env)).status, 403);
  assert.equal((await authenticate(req(jwt({ aud: ['aud-1'], email: 'pm@example.com', exp: now - 10 })), env)).status, 401);
  assert.equal((await authenticate(req(jwt({ aud: ['aud-1'], email: 'someone@example.com', exp: now + 600 })), env)).status, 403);
  const good = jwt({ aud: ['aud-1'], email: 'pm@example.com', exp: now + 600 });
  const forged = good.split('.').slice(0, 2).join('.') + '.' + jwt({ aud: ['aud-1'], email: 'x@example.com' }).split('.')[2];
  assert.equal((await authenticate(req(forged), env)).status, 401);
  assert.equal((await authenticate(req(jwt({ aud: ['aud-1'], email: 'pm@example.com', exp: now + 600 }, 'nope')), env)).status, 401);
});
globalThis.fetch = realFetch;

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);

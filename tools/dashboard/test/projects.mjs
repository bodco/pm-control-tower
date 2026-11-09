// Project discovery rules (src/projects.js).
import assert from 'node:assert/strict';
import { resolveProjects, modeFor, slugify } from '../src/projects.js';
import { DEFAULT_SCHEMA } from '../src/schema.js';

const P = DEFAULT_SCHEMA.projects;
let passed = 0;
function test(name, fn) { try { fn(); passed++; console.log(`ok   ${name}`); } catch (e) { console.error(`FAIL ${name}\n     ${e.message}`); process.exitCode = 1; } }

const page = (id, name, { slug, status = 'In progress', dash } = {}) => ({
  id,
  properties: {
    [P.title]: { type: 'title', title: [{ plain_text: name }] },
    [P.slug]: { type: 'rich_text', rich_text: slug ? [{ plain_text: slug }] : [] },
    [P.status]: { type: 'status', status: { name: status } },
    [P.dashboard]: { type: 'select', select: dash ? { name: dash } : null },
    [P.workspace]: { type: 'relation', relation: [{ id: 'ws1' }] },
    [P.currentState]: { type: 'url', url: null },
  },
});
const cfg = [{ slug: 'alpha', name: 'Alpha', color: '#111111', project_page_id: 'a1', workspace_page_id: 'w', current_state_page_id: '' }];
const by = (list, s) => list.find((p) => p.slug === s);

test('a new In progress project is discovered and on by default', () => {
  const all = resolveProjects(cfg, [page('a1', 'Alpha'), page('n1', 'New Thing', { slug: 'new-thing' })], P);
  assert.equal(by(all, 'new-thing').enabled, true);
  assert.equal(by(all, 'new-thing').discovered, true);
  assert.equal(by(all, 'new-thing').workspace_page_id, 'ws1');
});
test('Not started, On Hold and Done are listed but off', () => {
  const all = resolveProjects([], [page('x', 'X', { status: 'Not started' }), page('y', 'Y', { status: 'On Hold' }), page('z', 'Z', { status: 'Done' })], P);
  assert.deepEqual(all.map((p) => p.enabled), [false, false, false]);
});
test('Dashboard On / Off overrides Status', () => {
  const all = resolveProjects([], [page('x', 'X', { status: 'Done', dash: 'On' }), page('y', 'Y', { dash: 'Off' })], P);
  assert.equal(by(all, 'x').enabled, true);
  assert.equal(by(all, 'y').enabled, false);
});
test('a project named in the config stays on whatever its Status, config values win', () => {
  const all = resolveProjects(cfg, [page('a1', 'Alpha renamed', { status: 'Done' })], P);
  const a = by(all, 'alpha');
  assert.equal(a.enabled, true);
  assert.equal(a.name, 'Alpha');
  assert.equal(a.color, '#111111');
  assert.equal(a.discovered, false);
});
test('Dashboard Off hides a config project too', () => {
  assert.equal(by(resolveProjects(cfg, [page('a1', 'Alpha', { dash: 'Off' })], P), 'alpha').enabled, false);
});
test('config project missing from Notion is kept, read-only', () => {
  const a = by(resolveProjects(cfg, [], P), 'alpha');
  assert.equal(a.enabled, true);
  assert.equal(a.configOnly, true);
});
test('slug falls back to the name; duplicates are dropped', () => {
  assert.equal(slugify('Minute Desk 2'), 'minute-desk-2');
  const all = resolveProjects([], [page('1', 'Same'), page('2', 'Same')], P);
  assert.equal(all.length, 1);
});
test('modeFor stores Auto when the wish matches what Auto gives', () => {
  const p = { auto: true };
  assert.equal(modeFor(p, true), 'Auto');
  assert.equal(modeFor(p, false), 'Off');
  assert.equal(modeFor({ auto: false }, true), 'On');
  assert.equal(modeFor({ auto: false }, false), 'Auto');
});
console.log(`\n${passed} passed`);

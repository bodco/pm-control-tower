// Project discovery: the Projects database in Notion is the list of projects,
// the deployment config only adds details (color, short name, turn mapping,
// freshness) for the ones it names. A project the config does not list is
// picked up automatically while its Status is "In progress".

import { prop, cleanId, sameId } from './notion.js';

const PALETTE = ['#3b6fd8', '#2f9e6b', '#c2410c', '#7c3aed', '#0e7490', '#b45309', '#be185d', '#4d7c0f', '#6d28d9', '#0369a1'];

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function colorFor(slug) {
  let n = 0;
  for (const ch of slug) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[n % PALETTE.length];
}

// Returns every known project with `enabled` (shown on the board) resolved:
//   Dashboard = On / Off  -> forced
//   Dashboard = Auto/empty -> a project listed in the config is on (it was put
//     there on purpose), a discovered one follows Status (activeStatuses).
export function resolveProjects(configProjects, pages, P) {
  const cfg = (configProjects || []).filter((p) => p.slug && p.project_page_id);
  const used = new Set();
  const out = [];
  const seen = new Set();
  for (const page of pages || []) {
    const name = (prop(page, P.title) || '').trim();
    const slug = (prop(page, P.slug) || '').trim() || slugify(name);
    if (!slug || seen.has(slug)) continue;
    const c = cfg.find((x) => sameId(x.project_page_id, page.id) || x.slug === slug);
    if (c) used.add(c);
    const status = prop(page, P.status);
    const mode = prop(page, P.dashboard) || 'Auto';
    const auto = c ? true : (P.activeStatuses || []).includes(status);
    const csUrl = prop(page, P.currentState) || '';
    seen.add(slug);
    out.push({
      ...(c || {}),
      slug: c?.slug || slug,
      name: c?.name || name || slug,
      color: c?.color || colorFor(slug),
      project_page_id: page.id,
      workspace_page_id: c?.workspace_page_id || (prop(page, P.workspace) || [])[0] || '',
      current_state_page_id: c?.current_state_page_id || (csUrl ? cleanId(csUrl) : ''),
      status, mode, auto,
      enabled: mode === 'On' ? true : mode === 'Off' ? false : auto,
      discovered: !c, configOnly: false,
    });
  }
  for (const c of cfg) {
    if (used.has(c) || seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push({ ...c, status: null, mode: 'Auto', auto: true, enabled: true, discovered: false, configOnly: true });
  }
  return out;
}

// What Auto would give for this project, and the value to store so that the
// requested state is reached with the least forcing.
export function modeFor(project, wantEnabled) {
  if (wantEnabled === project.auto) return 'Auto';
  return wantEnabled ? 'On' : 'Off';
}

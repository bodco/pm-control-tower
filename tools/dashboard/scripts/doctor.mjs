// npm run doctor: checks a dashboard installation and says what to fix.
//
//   npm run doctor                                   files only (config, wrangler.toml)
//   NOTION_TOKEN=... npm run doctor                  plus: the token sees every database,
//                                                    the expected properties exist
//   NOTION_TOKEN=... npm run doctor -- --url https://dashboard.example.com
//                                                    plus: the deployed URL is behind Access
//
// The token is read from the environment or from .dev.vars. It is never printed:
// every line of output passes through redact(). The Worker secret itself cannot be
// read back from Cloudflare, so give doctor the same token you put into
// `wrangler secret put NOTION_TOKEN`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeSchema } from '../src/schema.js';

const NOTION_VERSION = '2025-09-03';
const PLACEHOLDER_ID = /^(collection:\/\/)?0{8}-?0{4}-?0{4}-?0{4}-?0{10}\d\d$/;

// Databases the dashboard reads. required: the Today page and the project views need it.
const DATABASES = [
  { key: 'tasks_db', schema: 'tasks', label: 'Tasks Tracker', required: true },
  { key: 'threads_db', schema: 'threads', label: 'Threads', required: true },
  { key: 'meetings_db', schema: 'meetings', label: 'Meetings', required: true },
  { key: 'decisions_db', schema: 'decisions', label: 'Decisions', required: true },
  { key: 'risks_db', schema: 'risks', label: 'Risks', required: true },
  { key: 'reports_db', schema: 'reports', label: 'Reports', required: true },
  { key: 'inbox_db', schema: 'inbox', label: 'Inbox', required: false, without: 'the Inbox page stays empty and "+" cannot capture notes' },
  { key: 'automation_db', schema: null, label: 'Automation', required: false, without: 'the Automation page says it is not connected' },
  { key: 'runs_db', schema: null, label: 'Automation runs', required: false, without: 'the Automation page shows no run history' },
];

// Properties per database. The names are schema keys; the real names come from
// src/schema.js merged with `schema` overrides in the config.
// `without` says what happens when an optional property is missing.
const PROPERTIES = {
  tasks: {
    required: ['title', 'status', 'priority', 'due', 'project'],
    optional: {
      source: 'new tasks are created without Source = manual / inbox',
      type: 'the task type is not shown',
      jira: 'Ask Claude cannot match related items by Jira key',
      description: 'new tasks from a thread get no description',
      workspace: 'new tasks are not linked to a workspace', inbox: 'a routed Inbox note is not linked to its task',
    },
  },
  threads: {
    required: ['title', 'status', 'lastReply', 'project'],
    optional: {
      manualStatusAt: 'a status set in the dashboard can be overwritten by the next collector run; "Still relevant" does nothing',
      collectorStatus: 'collectors cannot tell a status you changed directly in Notion from their own',
      type: 'no channel mark (email, Slack) in the row', description: 'no preview text in the details sheet',
      emailLink: 'no "open in mail" link', slackLink: 'no "open in Slack" link',
      reportedAt: 'a thread without Last Reply Date takes its age from the page edit time', jiraKey: 'Ask Claude cannot match related items by Jira key',
    },
  },
  meetings: {
    required: ['title', 'date', 'project'],
    optional: { type: 'no meeting type in the Log', summary: 'no meeting summary in the details' },
  },
  decisions: {
    required: ['title', 'date', 'status', 'project'],
    optional: {
      area: 'new decisions get no Area', context: 'new decisions get no context', source: 'no source link',
      door: 'no one-way or two-way mark', statedBy: 'no "stated by"', tradeoff: 'no trade-off', workspace: 'new decisions are not linked to a workspace',
    },
  },
  risks: {
    required: ['title', 'status', 'severity', 'project'],
    optional: {
      triggerDate: 'no "in 2d"; risks sort by severity only',
      lastReviewed: 'no "not reviewed 15d" and no Reviewed action',
      lastUpdated: 'changes from the dashboard do not stamp a date',
      likelihood: 'no likelihood in the sheet', category: 'no category in the sheet', kind: 'no kind in the sheet',
      owner: 'no owner in the sheet', summary: 'no summary in the sheet', mitigation: 'no mitigation in the sheet',
    },
  },
  reports: {
    required: ['title', 'date', 'project'],
    optional: { type: 'no report type', skill: 'no skill name', visibility: 'no Internal / Client mark', summary: 'no summary' },
  },
  inbox: {
    required: ['title', 'status'],
    optional: { notes: 'notes are saved without text', due: 'a routed task gets no due date from the note', project: 'notes cannot carry a project', tasks: 'a routed note is not linked to its task', type: 'no note type' },
  },
};

const ACCESS_PLACEHOLDERS = { ACCESS_TEAM_DOMAIN: 'your-team.cloudflareaccess.com', ACCESS_AUD: 'paste-the-application-audience-tag', ALLOWED_EMAILS: 'you@example.com' };

function cleanId(id) {
  return String(id || '').replace(/^collection:\/\//, '').replace(/^.*\//, '').replace(/[?#].*$/, '').replace(/-/g, '').slice(-32);
}

// key = "value" pairs from wrangler.toml; enough for the flat [vars] table.
export function parseToml(text) {
  const out = { vars: {}, top: {} };
  let section = '';
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const sec = line.match(/^\[([^\]]+)\]$/);
    if (sec) { section = sec[1].trim(); continue; }
    const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"/);
    if (!kv) continue;
    if (section === 'vars') out.vars[kv[1]] = kv[2];
    else if (!section) out.top[kv[1]] = kv[2];
  }
  return out;
}

function readDevVars(dir) {
  const p = join(dir, '.dev.vars');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export async function runDoctor({ dir = process.cwd(), env = process.env, url = null, print = console.log } = {}) {
  const dev = readDevVars(dir);
  const token = env.NOTION_TOKEN || dev.NOTION_TOKEN || '';
  const base = (env.NOTION_API_BASE || dev.NOTION_API_BASE || 'https://api.notion.com').replace(/\/$/, '');
  const redact = (s) => (token ? String(s).split(token).join('***') : String(s));
  const results = [];
  const add = (level, msg, fix) => {
    results.push({ level, msg, fix });
    const tag = level === 'ok' ? 'ok  ' : level === 'warn' ? 'warn' : level === 'info' ? 'info' : 'FAIL';
    print(redact(`${tag} ${msg}`));
    if (fix) print(redact(`     fix: ${fix}`));
  };
  const section = (name) => print(`\n${name}`);

  // ---------- files ----------
  section('Files');
  const cfgPath = join(dir, 'config/dashboard.config.json');
  let config = null;
  if (!existsSync(cfgPath)) add('fail', 'config/dashboard.config.json is missing', 'run `npm run setup`, then fill it in');
  else {
    try { config = JSON.parse(readFileSync(cfgPath, 'utf8')); add('ok', 'config/dashboard.config.json is valid JSON'); }
    catch (e) { add('fail', `config/dashboard.config.json is not valid JSON (${e.message})`, 'fix the syntax; a trailing comma is the usual cause'); }
  }

  const tomlPath = join(dir, 'wrangler.toml');
  let toml = null;
  if (!existsSync(tomlPath)) add('fail', 'wrangler.toml is missing', 'run `npm run setup`, then fill in the Access values');
  else { toml = parseToml(readFileSync(tomlPath, 'utf8')); add('ok', 'wrangler.toml found'); }

  // ---------- config ----------
  if (config) {
    section('Config');
    const db = config.notion || {};
    for (const d of DATABASES) {
      const v = db[d.key];
      if (!v) { if (d.required) add('fail', `notion.${d.key} (${d.label}) is not set`, 'copy the data source ID (collection://...) from projects/<slug>.md or from Notion: database menu > Copy link to view > the ID after the last slash'); else add('info', `notion.${d.key} (${d.label}) is not set: optional, ${d.without}`); continue; }
      if (PLACEHOLDER_ID.test(v)) add('fail', `notion.${d.key} still holds the example placeholder`, 'replace it with your own data source ID');
    }
    const projects = Array.isArray(config.projects) ? config.projects : [];
    if (!projects.length) add('fail', 'projects is empty', 'add one entry per project: slug, name, color, project_page_id');
    const slugs = new Set();
    for (const p of projects) {
      const name = p.slug || p.name || '(no slug)';
      if (!p.slug || !/^[a-z0-9][a-z0-9-]*$/.test(p.slug)) add('fail', `project "${name}": slug must be lowercase letters, digits and dashes`, 'use the same slug as projects/<slug>.md');
      if (slugs.has(p.slug)) add('fail', `project "${name}": the slug is used twice`);
      slugs.add(p.slug);
      if (!p.name) add('fail', `project "${name}": name is missing`);
      if (!p.project_page_id) add('fail', `project "${name}": project_page_id is missing`, 'the page of this project in the Projects database (Copy link, the 32 characters at the end)');
      else if (/^0+\d\d$/.test(cleanId(p.project_page_id))) add('fail', `project "${name}": project_page_id still holds the example placeholder`);
      if (!p.current_state_page_id) add('info', `project "${name}": no current_state_page_id, the Current state view is hidden`);
    }
    if (projects.length && results.every((r) => r.level !== 'fail' || !r.msg.startsWith('project'))) add('ok', `${projects.length} project(s): ${projects.map((p) => p.slug).join(', ')}`);
  }

  // ---------- Access ----------
  if (toml) {
    section('Access (wrangler.toml)');
    for (const key of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD']) {
      const v = toml.vars[key];
      if (!v) add('fail', `${key} is not set in [vars]`, 'Zero Trust > Access > Applications > your app: team domain and Application Audience (AUD) tag. Without both the Worker answers 503 to everything');
      else if (v === ACCESS_PLACEHOLDERS[key]) add('fail', `${key} still holds the example value`, 'paste your own value from Zero Trust > Access > Applications');
      else add('ok', `${key} is set`);
    }
    if (toml.vars.ACCESS_TEAM_DOMAIN && !/\.cloudflareaccess\.com$/.test(toml.vars.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, ''))) add('warn', 'ACCESS_TEAM_DOMAIN does not end with .cloudflareaccess.com', 'use the team domain, for example acme.cloudflareaccess.com, not your own domain');
    const emails = toml.vars.ALLOWED_EMAILS;
    if (!emails) add('info', 'ALLOWED_EMAILS is empty: only the Access policy decides who gets in');
    else if (emails === ACCESS_PLACEHOLDERS.ALLOWED_EMAILS) add('fail', 'ALLOWED_EMAILS still holds the example address', 'put your own email, or remove the line');
    else add('ok', 'ALLOWED_EMAILS is set');
    if (toml.vars.DEV_ALLOW_NO_AUTH) add('fail', 'DEV_ALLOW_NO_AUTH is in wrangler.toml: the deployed Worker would skip the login', 'remove it; it belongs only in .dev.vars for local development');
    if (/NOTION_TOKEN\s*=/.test(readFileSync(tomlPath, 'utf8').replace(/#.*$/gm, ''))) add('fail', 'NOTION_TOKEN is written in wrangler.toml', 'remove it from the file, rotate the token in Notion, and store it with `npx wrangler secret put NOTION_TOKEN`');
  }

  // ---------- Notion ----------
  section('Notion');
  if (!token) add('info', 'NOTION_TOKEN is not given, the Notion checks are skipped', 'run `NOTION_TOKEN=<your integration token> npm run doctor` (the Worker secret cannot be read back)');
  else if (config) {
    const S = mergeSchema(config.schema || {});
    const call = async (path) => {
      const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION } });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, body };
    };
    let tokenOk = true;
    try {
      const me = await call('/v1/users/me');
      if (me.status === 401) { tokenOk = false; add('fail', 'Notion refuses the token (401)', 'copy the Internal Integration Secret again from notion.so/profile/integrations'); }
    } catch (e) { tokenOk = false; add('fail', `cannot reach ${base} (${e.message})`, 'check the network or a proxy'); }

    if (tokenOk) {
      for (const d of DATABASES) {
        const id = config.notion?.[d.key];
        if (!id || PLACEHOLDER_ID.test(id)) continue;
        const r = await call(`/v1/data_sources/${cleanId(id)}`);
        if (r.status === 404 || r.status === 403) { add(d.required ? 'fail' : 'warn', `${d.label}: the token does not see this database (${r.status})`, 'in Notion open the Control Tower page > ... > Connections > add your integration (it covers the databases inside); check that the ID is a data source ID'); continue; }
        if (r.status === 400) { add('fail', `${d.label}: Notion says the ID is not a data source (${r.body?.message || 400})`, 'use the collection://... ID of the data source, not the database or view link'); continue; }
        if (r.status !== 200) { add('fail', `${d.label}: Notion answered ${r.status}`); continue; }
        const have = new Set(Object.keys(r.body.properties || {}));
        const spec = d.schema && PROPERTIES[d.schema];
        if (!spec) { add('ok', `${d.label}: visible`); continue; }
        const names = S[d.schema];
        const missingReq = spec.required.filter((k) => !have.has(names[k])).map((k) => names[k]);
        const missingOpt = Object.entries(spec.optional).filter(([k]) => !have.has(names[k]));
        if (missingReq.length) add('fail', `${d.label}: missing required ${missingReq.map((n) => `"${n}"`).join(', ')}`, 'add the property in Notion with the name from docs/en/02-notion-control-tower.md, or map your name under "schema" in the config');
        else add('ok', `${d.label}: visible, required properties present`);
        for (const [k, why] of missingOpt) add('warn', `${d.label}: optional "${names[k]}" is missing: ${why}`);
        if (d.schema === 'threads' && have.has(names.manualStatusAt) && r.body.properties[names.manualStatusAt]?.type && r.body.properties[names.manualStatusAt].type !== 'date') add('fail', `Threads: "${names.manualStatusAt}" must be a date property`);
      }
      for (const p of config.projects || []) {
        for (const [field, label, level] of [['project_page_id', 'project page', 'fail'], ['current_state_page_id', 'Current State page', 'warn']]) {
          const id = p[field];
          if (!id || /^0+\d\d$/.test(cleanId(id))) continue;
          const r = await call(`/v1/pages/${cleanId(id)}`);
          if (r.status === 200) add('ok', `${p.slug}: ${label} visible`);
          else add(level, `${p.slug}: the token does not see the ${label} (${r.status})`, 'share this page with the integration (... > Connections)');
        }
      }
    }
  }

  // ---------- deployed URL ----------
  section('Deployed URL');
  if (!url) add('info', 'no --url given, the login gate of the deployed app is not checked', 'run `npm run doctor -- --url https://<your dashboard address>`');
  else {
    try {
      const res = await fetch(url.replace(/\/$/, '') + '/api/config', { redirect: 'manual' });
      const loc = res.headers.get('location') || '';
      const text = await res.text().catch(() => '');
      if ([301, 302, 303, 307, 308].includes(res.status) && /cloudflareaccess\.com/.test(loc)) add('ok', 'the URL redirects to the Cloudflare Access login');
      else if (res.status === 503 && /Access is not configured/.test(text)) add('fail', 'the Worker answers "Access is not configured"', 'set ACCESS_TEAM_DOMAIN and ACCESS_AUD in wrangler.toml and run `npm run deploy` again');
      else if (res.status === 401 || res.status === 403) add('warn', `the URL refuses without a login (${res.status}) but does not redirect to Access`, 'the Worker check works; turn on Access for this hostname so people get a login page');
      else if (res.status === 200) add('fail', 'the URL answers without a login', 'turn on Cloudflare Access for this hostname right away, then check again');
      else add('warn', `the URL answered ${res.status}`);
    } catch (e) { add('warn', `cannot open ${url} (${e.message})`); }
  }

  const fails = results.filter((r) => r.level === 'fail').length;
  const warns = results.filter((r) => r.level === 'warn').length;
  print(`\n${fails ? `${fails} to fix` : 'nothing to fix'}${warns ? `, ${warns} warning(s)` : ''}.`);
  return { results, fails, warns };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--url');
  const url = i > 0 ? process.argv[i + 1] : null;
  const { fails } = await runDoctor({ url });
  process.exitCode = fails ? 1 : 0;
}

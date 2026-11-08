// Dashboard API: reads the PM Control Tower databases and performs the few
// writes the dashboard allows. Every record is tied to a project from the
// deployment config; nothing outside the configured projects and databases is
// read or written.

import { Notion, NotionError, prop, buildProps, cleanId, sameId } from './notion.js';
import { mergeSchema } from './schema.js';
import { notionAutomationSource, fixtureAutomationSource } from './automation.js';

const TTL_MS = 30 * 1000;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Topic rows keep a ledger of message timestamps on the first line ("ts: ...").
// It is bookkeeping for the collectors, not something to show.
function cleanDescription(s) {
  if (!s) return '';
  return s.split('\n').filter((l) => !/^\s*ts:\s*[\d.,\s]+(\(\+\d+ older\))?\s*$/i.test(l)).join('\n').trim();
}

function short(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

export function createApi(config, env) {
  const S = mergeSchema(config.schema);
  const db = config.notion || {};
  const projects = (config.projects || []).filter((p) => p.slug && p.project_page_id);
  const tz = config.app?.timezone || 'UTC';
  const notion = new Notion({ token: env.NOTION_TOKEN, base: env.NOTION_API_BASE || undefined });

  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  // Which thread statuses mean "my turn" and "their turn". From config; the
  // defaults follow projects/_standards.md s11.
  const turn = {
    mine: config.app?.turn?.mine || ['Awaiting Reply'],
    theirs: config.app?.turn?.theirs || ['Need Follow-up'],
    ai: config.app?.turn?.ai || ['AI Review'],
  };
  // Freshness thresholds (days). Project config can override any of them.
  const FRESH_DEFAULTS = { quiet_days: 14, stale_days: 30, nudge_days: 5, turn_sla_workdays: 2, stale_bulk_days: 90 };
  function freshnessFor(p) {
    const out = { ...FRESH_DEFAULTS, ...(config.app?.freshness || {}), ...(p?.freshness || {}) };
    for (const k of Object.keys(FRESH_DEFAULTS)) {
      const n = Number(out[k]);
      out[k] = Number.isFinite(n) && n >= 0 ? n : FRESH_DEFAULTS[k];
    }
    return out;
  }
  function turnFor(p) {
    const o = p?.turn || {};
    return { mine: o.mine || turn.mine, theirs: o.theirs || turn.theirs, ai: o.ai || turn.ai };
  }
  const cache = new Map();

  function requireDb(key) {
    if (!db[key]) throw new HttpError(500, `Config is missing notion.${key}`);
    return db[key];
  }

  function project(slug) {
    if (!slug) throw new HttpError(400, 'project is required (the dashboard never guesses it)');
    const p = bySlug.get(slug);
    if (!p) throw new HttpError(404, `Unknown project "${slug}". Configured: ${projects.map((x) => x.slug).join(', ')}`);
    return p;
  }

  function slugOf(page, relProp) {
    const rel = prop(page, relProp) || [];
    const hit = projects.find((p) => rel.some((id) => sameId(id, p.project_page_id)));
    return hit ? hit.slug : null;
  }

  function projectFilter(relProp, list) {
    const ors = list.map((p) => ({ property: relProp, relation: { contains: cleanId(p.project_page_id) } }));
    return ors.length === 1 ? ors[0] : { or: ors };
  }

  // Equality filters depend on the property type (select vs status).
  async function typeOf(dbKey, name) {
    const ds = await notion.dataSource(requireDb(dbKey));
    return ds.properties?.[name]?.type || 'select';
  }
  async function eq(dbKey, name, value, negate = false) {
    const t = await typeOf(dbKey, name);
    const k = t === 'status' ? 'status' : t === 'multi_select' ? 'multi_select' : 'select';
    const op = k === 'multi_select' ? (negate ? 'does_not_contain' : 'contains') : (negate ? 'does_not_equal' : 'equals');
    return { property: name, [k]: { [op]: value } };
  }
  // Option names of a select/status property in the live schema (fallback: defaults).
  async function optionsOf(dbKey, name, fallback) {
    try {
      const ds = await notion.dataSource(requireDb(dbKey));
      const def = ds.properties?.[name];
      const opts = def?.[def?.type]?.options;
      return Array.isArray(opts) && opts.length ? opts.map((o) => o.name) : fallback;
    } catch { return fallback; }
  }
  // Option name -> Notion color name, so the client can paint any custom option.
  async function colorsOf(dbKey, name) {
    try {
      if (!db[dbKey]) return {};
      const ds = await notion.dataSource(db[dbKey]);
      const def = ds.properties?.[name];
      const opts = def?.[def?.type]?.options || [];
      return Object.fromEntries(opts.map((o) => [o.name, o.color || 'default']));
    } catch { return {}; }
  }
  async function closedTaskStatuses() {
    const live = await optionsOf('tasks_db', S.tasks.status, S.tasks.statuses);
    return S.tasks.closedStatuses.filter((x) => live.includes(x));
  }

  async function anyOf(dbKey, name, values) {
    const parts = await Promise.all(values.map((v) => eq(dbKey, name, v)));
    return parts.length === 1 ? parts[0] : { or: parts };
  }

  async function cached(key, fn, fresh) {
    const hit = cache.get(key);
    if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.value;
    const value = await fn();
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  // ---------- mappers ----------
  const mapTask = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.tasks.project),
    title: prop(pg, S.tasks.title) || '(untitled)',
    status: prop(pg, S.tasks.status), priority: prop(pg, S.tasks.priority),
    due: prop(pg, S.tasks.due), source: prop(pg, S.tasks.source),
    type: prop(pg, S.tasks.type), effort: prop(pg, S.tasks.effort),
    jira: prop(pg, S.tasks.jira), edited: pg.last_edited_time,
  });
  const mapThread = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.threads.project),
    title: prop(pg, S.threads.title) || '(untitled)',
    status: prop(pg, S.threads.status), types: prop(pg, S.threads.type) || [],
    category: prop(pg, S.threads.category),
    description: short(cleanDescription(prop(pg, S.threads.description)), 280),
    lastReply: prop(pg, S.threads.lastReply), reportedAt: prop(pg, S.threads.reportedAt),
    emailLink: prop(pg, S.threads.emailLink), slackLink: prop(pg, S.threads.slackLink),
    jiraKey: prop(pg, S.threads.jiraKey),
    manualAt: prop(pg, S.threads.manualStatusAt), edited: pg.last_edited_time,
    icon: pg.icon?.type === 'emoji' ? pg.icon.emoji : null,
  });
  const mapMeeting = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.meetings.project),
    title: prop(pg, S.meetings.title) || '(untitled)', date: prop(pg, S.meetings.date),
    types: prop(pg, S.meetings.type) || [], summary: short(prop(pg, S.meetings.summary), 700),
  });
  const mapDecision = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.decisions.project),
    title: prop(pg, S.decisions.title) || '(untitled)', date: prop(pg, S.decisions.date),
    area: prop(pg, S.decisions.area), status: prop(pg, S.decisions.status),
    door: prop(pg, S.decisions.door), statedBy: prop(pg, S.decisions.statedBy),
    context: short(prop(pg, S.decisions.context), 400), source: prop(pg, S.decisions.source),
    edited: pg.last_edited_time,
  });
  const mapRisk = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.risks.project),
    title: prop(pg, S.risks.title) || '(untitled)', status: prop(pg, S.risks.status),
    severity: prop(pg, S.risks.severity), likelihood: prop(pg, S.risks.likelihood),
    category: prop(pg, S.risks.category), kind: prop(pg, S.risks.kind),
    owner: prop(pg, S.risks.owner), summary: short(prop(pg, S.risks.summary), 300),
    mitigation: short(prop(pg, S.risks.mitigation), 300), lastUpdated: prop(pg, S.risks.lastUpdated),
    triggerDate: prop(pg, S.risks.triggerDate), lastReviewed: prop(pg, S.risks.lastReviewed),
    edited: pg.last_edited_time,
  });
  const mapReport = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.reports.project),
    title: prop(pg, S.reports.title) || '(untitled)', date: prop(pg, S.reports.date),
    type: prop(pg, S.reports.type), skill: prop(pg, S.reports.skill),
    visibility: prop(pg, S.reports.visibility), summary: short(prop(pg, S.reports.summary), 400),
  });
  const mapInbox = (pg) => ({
    id: pg.id, url: pg.url, project: slugOf(pg, S.inbox.project),
    title: prop(pg, S.inbox.title) || '(untitled)', status: prop(pg, S.inbox.status),
    notes: short(prop(pg, S.inbox.notes), 300), type: prop(pg, S.inbox.type),
    due: prop(pg, S.inbox.due), created: pg.created_time,
  });

  // ---------- queries ----------
  async function openTasks(list) {
    const closed = await closedTaskStatuses();
    const notClosed = await Promise.all((closed.length ? closed : [S.tasks.doneValue]).map((v) => eq('tasks_db', S.tasks.status, v, true)));
    const rows = await notion.query(requireDb('tasks_db'), {
      filter: { and: [projectFilter(S.tasks.project, list), ...notClosed] },
      sorts: [{ property: S.tasks.due, direction: 'ascending' }],
    });
    return rows.map(mapTask);
  }
  async function doneThisWeek(list) {
    const done = await eq('tasks_db', S.tasks.status, S.tasks.doneValue);
    const rows = await notion.query(requireDb('tasks_db'), {
      filter: { and: [projectFilter(S.tasks.project, list), done, { timestamp: 'last_edited_time', last_edited_time: { past_week: {} } }] },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      maxPages: 1,
    });
    return rows.map(mapTask);
  }
  async function threads(list, statuses) {
    const f = [projectFilter(S.threads.project, list)];
    if (statuses) f.push(await anyOf('threads_db', S.threads.status, statuses));
    else f.push(await eq('threads_db', S.threads.status, 'Closed', true));
    const rows = await notion.query(requireDb('threads_db'), {
      filter: { and: f },
      sorts: [{ property: S.threads.lastReply, direction: 'ascending' }],
    });
    return rows.map(mapThread);
  }
  async function recentlyClosedThreads(list) {
    const rows = await notion.query(requireDb('threads_db'), {
      filter: { and: [projectFilter(S.threads.project, list), await eq('threads_db', S.threads.status, 'Closed'), { timestamp: 'last_edited_time', last_edited_time: { past_week: {} } }] },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      maxPages: 1, pageSize: 30,
    });
    return rows.map(mapThread);
  }
  async function risks(list, all = false) {
    const f = [projectFilter(S.risks.project, list)];
    if (!all) f.push(await anyOf('risks_db', S.risks.status, S.risks.activeStatuses));
    const rows = await notion.query(requireDb('risks_db'), { filter: { and: f }, maxPages: 2 });
    const order = Object.fromEntries(S.risks.severities.map((s, i) => [s, i]));
    return rows.map(mapRisk).sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  }
  async function decisions(list, days = 60) {
    const since = addDays(todayIn(tz), -days);
    const rows = await notion.query(requireDb('decisions_db'), {
      filter: { and: [projectFilter(S.decisions.project, list), { property: S.decisions.date, date: { on_or_after: since } }] },
      sorts: [{ property: S.decisions.date, direction: 'descending' }],
      pageSize: 50, maxPages: 1,
    });
    return rows.map(mapDecision);
  }
  async function meetings(list, days = 30, limit = 20) {
    const since = addDays(todayIn(tz), -days);
    const rows = await notion.query(requireDb('meetings_db'), {
      filter: { and: [projectFilter(S.meetings.project, list), { property: S.meetings.date, date: { on_or_after: since } }] },
      sorts: [{ property: S.meetings.date, direction: 'descending' }],
      pageSize: limit, maxPages: 1,
    });
    return rows.map(mapMeeting);
  }
  async function reports(list, days = 14, limit = 30) {
    const since = addDays(todayIn(tz), -days);
    const rows = await notion.query(requireDb('reports_db'), {
      filter: { and: [projectFilter(S.reports.project, list), { property: S.reports.date, date: { on_or_after: since } }] },
      sorts: [{ property: S.reports.date, direction: 'descending' }],
      pageSize: limit, maxPages: 1,
    });
    return rows.map(mapReport);
  }
  async function inboxNew() {
    if (!db.inbox_db) return [];
    const rows = await notion.query(requireDb('inbox_db'), {
      filter: await eq('inbox_db', S.inbox.status, S.inbox.routedValue, true),
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      pageSize: 50, maxPages: 1,
    });
    // Inbox rows of projects outside this deployment are not shown.
    return rows.map(mapInbox).filter((r) => r.project || !(prop(rows.find((x) => x.id === r.id), S.inbox.project) || []).length);
  }

  let automationSrc = null;
  function automation() {
    if (automationSrc) return automationSrc;
    if (config.automation?.fixtures) automationSrc = fixtureAutomationSource(projects.map((p) => p.slug));
    else if (db.automation_db) automationSrc = notionAutomationSource({ notion, itemsDb: db.automation_db, runsDb: db.runs_db, slugOf: (pg, rel) => slugOf(pg, rel) });
    return automationSrc;
  }
  async function automationData(fresh) {
    const src = automation();
    if (!src) return { configured: false, items: [], runs: [] };
    return cached('automation', async () => ({ configured: true, ...(await src.list()) }), fresh);
  }

  // ---------- read endpoints ----------
  async function overview(fresh) {
    return cached('overview', async () => {
      const today = todayIn(tz);
      const settle = async (name, p) => {
        try { return { name, value: await p }; } catch (e) { return { name, value: [], error: e.message }; }
      };
      const parts = await Promise.all([
        settle('tasks', openTasks(projects)),
        settle('done', doneThisWeek(projects)),
        // Every thread that is not Closed: the client sorts them into your turn,
        // their turn and stale with one set of rules (public/js/logic.js).
        settle('threads', threads(projects)),
        settle('risks', risks(projects)),
        settle('decisions', decisions(projects, 30)),
        settle('meetings', meetings(projects, 30, 60)),
        settle('reports', reports(projects, 7, 40)),
      ]);
      const d = Object.fromEntries(parts.map((p) => [p.name, p.value]));
      const errors = parts.filter((p) => p.error).map((p) => ({ source: p.name, error: p.error }));
      return {
        generatedAt: new Date().toISOString(), today, errors,
        projects: projects.map((p) => ({ slug: p.slug, name: p.name, color: p.color })),
        // Full lists: the client computes every metric, the queue and health from
        // them, in one module (public/js/logic.js).
        tasks: d.tasks, done: d.done, threads: d.threads, risks: d.risks,
        meetings: d.meetings, reports: d.reports, decisions: d.decisions,
      };
    }, fresh);
  }

  async function projectSection(slug, section, url, fresh) {
    const p = project(slug);
    const list = [p];
    const all = url.searchParams.get('all') === '1';
    const key = `${slug}:${section}:${all}`;
    return cached(key, async () => {
      switch (section) {
        case 'tasks': {
          const [open, done] = await Promise.all([openTasks(list), doneThisWeek(list)]);
          return { open, done };
        }
        case 'threads': {
          const [open, closed] = await Promise.all([threads(list), all ? recentlyClosedThreads(list) : []]);
          return { open, closed };
        }
        case 'meetings': return { items: await meetings(list, all ? 120 : 45, all ? 100 : 30) };
        case 'decisions': return { items: await decisions(list, all ? 365 : 90) };
        case 'risks': return { items: await risks(list, all) };
        case 'reports': return { items: await reports(list, all ? 90 : 21, all ? 100 : 40) };
        case 'state': return currentState(p);
        default: throw new HttpError(404, `Unknown section ${section}`);
      }
    }, fresh);
  }

  async function currentState(p) {
    if (!p.current_state_page_id) return { missing: true };
    const page = await notion.page(p.current_state_page_id);
    let budget = 25; // extra child requests
    async function tree(id, depth) {
      const blocks = await notion.children(id, 2);
      const out = [];
      for (const b of blocks) {
        const node = simplifyBlock(b);
        if (!node) continue;
        if (b.has_children && depth < 2 && budget > 0 && b.type !== 'child_page' && b.type !== 'child_database') {
          budget--;
          node.children = await tree(b.id, depth + 1);
        }
        out.push(node);
      }
      return out;
    }
    return { url: page.url, edited: page.last_edited_time, title: prop(page, Object.keys(page.properties || {}).find((k) => page.properties[k].type === 'title')), blocks: await tree(p.current_state_page_id, 0) };
  }

  // ---------- writes ----------
  async function guardedPage(id, dbKey) {
    const page = await notion.page(id).catch((e) => { throw new HttpError(e.status === 404 ? 404 : 502, e.message); });
    if (!sameId(page.parent?.data_source_id, requireDb(dbKey))) {
      throw new HttpError(403, 'This record is not in the configured database');
    }
    return page;
  }

  // The client sends the last_edited_time it saw. A newer edit in Notion wins:
  // the action is refused instead of overwriting it.
  function assertNotChanged(page, body) {
    const seen = body?.expectEdited;
    if (!seen) return;
    const now = Date.parse(page.last_edited_time || '');
    const was = Date.parse(seen);
    if (Number.isFinite(now) && Number.isFinite(was) && now > was) {
      throw new HttpError(409, 'Changed in Notion, action not applied');
    }
  }

  function assertProjectPage(page, relProp, allowEmpty = false) {
    const rel = prop(page, relProp) || [];
    if (!rel.length && allowEmpty) return;
    if (!rel.some((id) => projects.some((p) => sameId(p.project_page_id, id)))) {
      throw new HttpError(403, 'This record belongs to a project outside this dashboard');
    }
  }

  function pick(value, allowed, field) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (allowed && !allowed.includes(value)) throw new HttpError(400, `Invalid ${field}: ${value}`);
    return value;
  }

  function dateOrNull(v, field) {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(v))) throw new HttpError(400, `Invalid ${field}`);
    return String(v);
  }

  function text(v, field, max = 2000, required = false) {
    if (v === undefined || v === null) {
      if (required) throw new HttpError(400, `${field} is required`);
      return undefined;
    }
    const s = String(v).trim();
    if (required && !s) throw new HttpError(400, `${field} is required`);
    return s.slice(0, max);
  }

  async function schemaProps(dbKey) {
    return (await notion.dataSource(requireDb(dbKey))).properties || {};
  }

  function relationFor(p) {
    return { project: [p.project_page_id], workspace: p.workspace_page_id ? [p.workspace_page_id] : undefined };
  }

  async function createTask(body) {
    const p = project(body.project); // Default Project Rule: project is mandatory
    const props = await schemaProps('tasks_db');
    const rel = relationFor(p);
    const values = {
      [S.tasks.title]: text(body.title, 'title', 300, true),
      [S.tasks.status]: pick(body.status || 'To Do', await optionsOf('tasks_db', S.tasks.status, S.tasks.statuses), 'status'),
      [S.tasks.priority]: pick(body.priority, S.tasks.priorities, 'priority'),
      [S.tasks.due]: dateOrNull(body.due, 'due'),
      [S.tasks.description]: text(body.description, 'description'),
      [S.tasks.source]: body.source === 'inbox' ? 'inbox' : 'manual',
      [S.tasks.project]: rel.project,
      [S.tasks.workspace]: rel.workspace,
    };
    if (body.inboxId) values[S.tasks.inbox] = [body.inboxId];
    const { properties, skipped } = buildProps(props, values);
    const page = await notion.createPage(requireDb('tasks_db'), { properties });
    return { task: mapTask(page), skipped };
  }

  async function updateTask(id, body) {
    const page = await guardedPage(id, 'tasks_db');
    assertProjectPage(page, S.tasks.project);
    assertNotChanged(page, body);
    const props = await schemaProps('tasks_db');
    const { properties } = buildProps(props, {
      [S.tasks.status]: pick(body.status, await optionsOf('tasks_db', S.tasks.status, S.tasks.statuses), 'status'),
      [S.tasks.priority]: pick(body.priority, await optionsOf('tasks_db', S.tasks.priority, S.tasks.priorities), 'priority'),
      [S.tasks.due]: dateOrNull(body.due, 'due'),
      [S.tasks.title]: body.title !== undefined ? text(body.title, 'title', 300, true) : undefined,
    });
    if (!Object.keys(properties).length) throw new HttpError(400, 'Nothing to update');
    return { task: mapTask(await notion.updatePage(id, { properties })) };
  }

  async function createInbox(body) {
    const props = await schemaProps('inbox_db');
    const p = body.project ? project(body.project) : null;
    const { properties } = buildProps(props, {
      [S.inbox.title]: text(body.title, 'title', 300, true),
      [S.inbox.notes]: text(body.notes, 'notes'),
      [S.inbox.status]: S.inbox.newValue,
      [S.inbox.project]: p ? [p.project_page_id] : undefined,
    });
    return { item: mapInbox(await notion.createPage(requireDb('inbox_db'), { properties })) };
  }

  async function routeInbox(id, body) {
    const inboxPage = await guardedPage(id, 'inbox_db');
    assertProjectPage(inboxPage, S.inbox.project, true);
    if (!body.project) throw new HttpError(400, 'project is required to route an Inbox item');
    const { task } = await createTask({
      project: body.project,
      title: body.title || prop(inboxPage, S.inbox.title),
      description: prop(inboxPage, S.inbox.notes) || undefined,
      priority: body.priority, due: body.due, source: 'inbox', inboxId: id,
    });
    const props = await schemaProps('inbox_db');
    const { properties } = buildProps(props, {
      [S.inbox.status]: S.inbox.routedValue,
      [S.inbox.project]: [project(body.project).project_page_id],
      [S.inbox.tasks]: [task.id],
    });
    await notion.updatePage(id, { properties });
    return { task };
  }

  async function updateRisk(id, body) {
    const page = await guardedPage(id, 'risks_db');
    assertProjectPage(page, S.risks.project);
    assertNotChanged(page, body);
    const props = await schemaProps('risks_db');
    if (body.reviewed && !props[S.risks.lastReviewed]) {
      throw new HttpError(400, `Property "${S.risks.lastReviewed}" is missing in Risks, so Reviewed cannot be saved.`);
    }
    const { properties } = buildProps(props, {
      [S.risks.status]: pick(body.status, await optionsOf('risks_db', S.risks.status, S.risks.statuses), 'status'),
      [S.risks.severity]: pick(body.severity, await optionsOf('risks_db', S.risks.severity, S.risks.severities), 'severity'),
      [S.risks.lastReviewed]: body.reviewed ? todayIn(tz) : undefined,
      [S.risks.lastUpdated]: todayIn(tz),
    });
    return { risk: mapRisk(await notion.updatePage(id, { properties })) };
  }

  async function createDecision(body) {
    const p = project(body.project);
    const props = await schemaProps('decisions_db');
    const rel = relationFor(p);
    const { properties, skipped } = buildProps(props, {
      [S.decisions.title]: text(body.title, 'decision', 500, true),
      [S.decisions.date]: dateOrNull(body.date, 'date') || todayIn(tz),
      [S.decisions.area]: pick(body.area, S.decisions.areas, 'area'),
      [S.decisions.context]: text(body.context, 'context'),
      [S.decisions.door]: pick(body.door, S.decisions.doors, 'door'),
      [S.decisions.statedBy]: text(body.statedBy, 'statedBy', 200),
      [S.decisions.status]: 'Active',
      [S.decisions.project]: rel.project,
      [S.decisions.workspace]: rel.workspace,
    });
    return { decision: mapDecision(await notion.createPage(requireDb('decisions_db'), { properties })), skipped };
  }

  async function updateDecision(id, body) {
    const page = await guardedPage(id, 'decisions_db');
    assertProjectPage(page, S.decisions.project);
    assertNotChanged(page, body);
    const props = await schemaProps('decisions_db');
    const { properties } = buildProps(props, {
      [S.decisions.status]: pick(body.status, await optionsOf('decisions_db', S.decisions.status, S.decisions.statuses), 'status'),
    });
    if (!Object.keys(properties).length) throw new HttpError(400, 'Nothing to update');
    return { decision: mapDecision(await notion.updatePage(id, { properties })) };
  }

  // A status set here is a human decision. It writes the manual-status date,
  // and the collectors keep it until the thread really gets a new message.
  async function updateThread(id, body) {
    const page = await guardedPage(id, 'threads_db');
    assertProjectPage(page, S.threads.project);
    assertNotChanged(page, body);
    const props = await schemaProps('threads_db');
    const hasManual = Boolean(props[S.threads.manualStatusAt]);
    // "Still relevant" from the stale review: only the manual mark moves, the
    // status stays. Freshness counts from the later of the last reply and this mark.
    if (body.touch && body.status === undefined) {
      if (!hasManual) throw new HttpError(400, `Property "${S.threads.manualStatusAt}" is missing in Threads, so "Still relevant" cannot be saved.`);
      const { properties } = buildProps(props, { [S.threads.manualStatusAt]: new Date().toISOString() });
      return { thread: mapThread(await notion.updatePage(id, { properties })), warning: null };
    }
    const status = pick(body.status, await optionsOf('threads_db', S.threads.status, S.threads.statuses), 'status');
    if (!status) throw new HttpError(400, 'status is required');
    const values = { [S.threads.status]: status };
    if (hasManual) values[S.threads.manualStatusAt] = new Date().toISOString();
    const { properties } = buildProps(props, values);
    const emoji = S.threads.icons[status];
    const updated = await notion.updatePage(id, { properties, icon: emoji ? { type: 'emoji', emoji } : null });
    return {
      thread: mapThread(updated),
      warning: hasManual ? null : `Property "${S.threads.manualStatusAt}" is missing in Threads, so collectors may overwrite this status on their next run.`,
    };
  }

  // ---------- router ----------
  async function handle(request, url) {
    const path = url.pathname.replace(/\/+$/, '');
    const m = request.method;
    const fresh = url.searchParams.get('fresh') === '1';
    try {
      if (m !== 'GET') {
        if (request.headers.get('X-CT-Request') !== '1') throw new HttpError(403, 'Missing X-CT-Request header');
        cache.clear();
      }
      const body = m === 'GET' ? null : await request.json().catch(() => { throw new HttpError(400, 'Body must be JSON'); });

      if (m === 'GET' && path === '/api/config') {
        return json({
          title: config.app?.title || 'PM Control Tower',
          locale: config.app?.locale || 'en', timezone: tz,
          projects: projects.map((p) => ({
            slug: p.slug, name: p.name, short: p.short_name || null, color: p.color, hasCurrentState: Boolean(p.current_state_page_id),
            turn: turnFor(p), freshness: freshnessFor(p),
          })),
          freshness: freshnessFor(null),
          inbox: Boolean(db.inbox_db),
          automation: Boolean(db.automation_db || config.automation?.fixtures),
          turn,
          threadManualStatus: Boolean(db.threads_db) && Boolean((await schemaProps('threads_db').catch(() => ({})))[S.threads.manualStatusAt]),
          riskFields: await (async () => {
            const rp = db.risks_db ? await schemaProps('risks_db').catch(() => ({})) : {};
            return { trigger: Boolean(rp[S.risks.triggerDate]), reviewed: Boolean(rp[S.risks.lastReviewed]) };
          })(),
          options: {
            taskStatuses: await optionsOf('tasks_db', S.tasks.status, S.tasks.statuses),
            priorities: await optionsOf('tasks_db', S.tasks.priority, S.tasks.priorities),
            threadStatuses: await optionsOf('threads_db', S.threads.status, S.threads.statuses),
            riskStatuses: await optionsOf('risks_db', S.risks.status, S.risks.statuses),
            severities: await optionsOf('risks_db', S.risks.severity, S.risks.severities),
            decisionStatuses: await optionsOf('decisions_db', S.decisions.status, S.decisions.statuses),
            decisionAreas: await optionsOf('decisions_db', S.decisions.area, S.decisions.areas),
            doors: await optionsOf('decisions_db', S.decisions.door, S.decisions.doors),
          },
          colors: {
            taskStatus: await colorsOf('tasks_db', S.tasks.status),
            priority: await colorsOf('tasks_db', S.tasks.priority),
            threadStatus: await colorsOf('threads_db', S.threads.status),
            riskStatus: await colorsOf('risks_db', S.risks.status),
            severity: await colorsOf('risks_db', S.risks.severity),
            decisionStatus: await colorsOf('decisions_db', S.decisions.status),
            area: await colorsOf('decisions_db', S.decisions.area),
          },
        });
      }
      if (m === 'GET' && path === '/api/overview') return json(await overview(fresh));
      let r;
      // "Open in Notion" for a project: a redirect, so page IDs stay out of the client config.
      if (m === 'GET' && (r = path.match(/^\/api\/p\/([\w-]+)\/notion$/))) {
        return new Response(null, { status: 302, headers: { Location: `https://www.notion.so/${cleanId(project(r[1]).project_page_id)}`, 'Cache-Control': 'no-store' } });
      }
      if (m === 'GET' && (r = path.match(/^\/api\/p\/([\w-]+)\/(\w+)$/))) return json(await projectSection(r[1], r[2], url, fresh));
      if (m === 'GET' && path === '/api/inbox') return json({ items: await inboxNew() });
      if (m === 'GET' && path === '/api/automation') return json(await automationData(fresh));

      if (m === 'POST' && path === '/api/tasks') return json(await createTask(body), 201);
      if (m === 'PATCH' && (r = path.match(/^\/api\/tasks\/([\w-]+)$/))) return json(await updateTask(r[1], body));
      if (m === 'POST' && path === '/api/inbox') return json(await createInbox(body), 201);
      if (m === 'POST' && (r = path.match(/^\/api\/inbox\/([\w-]+)\/route$/))) return json(await routeInbox(r[1], body), 201);
      if (m === 'PATCH' && (r = path.match(/^\/api\/risks\/([\w-]+)$/))) return json(await updateRisk(r[1], body));
      if (m === 'POST' && path === '/api/decisions') return json(await createDecision(body), 201);
      if (m === 'PATCH' && (r = path.match(/^\/api\/decisions\/([\w-]+)$/))) return json(await updateDecision(r[1], body));
      if (m === 'PATCH' && (r = path.match(/^\/api\/threads\/([\w-]+)$/))) return json(await updateThread(r[1], body));

      throw new HttpError(404, 'Not found');
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof NotionError) {
        const hint = e.status === 404 ? ' Share the database or page with the Notion integration.' : '';
        return json({ error: e.message + hint }, e.status === 404 ? 404 : 502);
      }
      return json({ error: e.message || 'Internal error' }, 500);
    }
  }

  return { handle };
}

// Block -> small JSON node the client renders. Unknown types fall back to a link.
function simplifyBlock(b) {
  const t = b.type;
  const data = b[t] || {};
  const rich = (data.rich_text || []).map((r) => ({
    text: r.plain_text, href: r.href || null,
    b: r.annotations?.bold, i: r.annotations?.italic, c: r.annotations?.code, s: r.annotations?.strikethrough,
  }));
  switch (t) {
    case 'paragraph': case 'heading_1': case 'heading_2': case 'heading_3':
    case 'bulleted_list_item': case 'numbered_list_item': case 'quote': case 'toggle':
      return { type: t, rich };
    case 'to_do': return { type: t, rich, checked: Boolean(data.checked) };
    case 'callout': return { type: t, rich, icon: data.icon?.emoji || null };
    case 'code': return { type: t, rich, language: data.language };
    case 'divider': return { type: t };
    case 'child_page': return { type: t, title: data.title };
    case 'child_database': return { type: t, title: data.title };
    case 'column_list': case 'column': case 'synced_block': return { type: 'group' };
    case 'table': return { type: 'unsupported', label: 'table' };
    default: return { type: 'unsupported', label: t };
  }
}

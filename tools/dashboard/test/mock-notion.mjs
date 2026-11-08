// In-memory mock of the Notion endpoints the Worker uses, seeded with neutral
// demo data (the same 🧪 demo projects as the public Notion template).
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const DS = {
  tasks: '00000000000000000000000000000001',
  threads: '00000000000000000000000000000002',
  meetings: '00000000000000000000000000000003',
  decisions: '00000000000000000000000000000004',
  risks: '00000000000000000000000000000005',
  reports: '00000000000000000000000000000006',
  inbox: '00000000000000000000000000000007',
};
export const IDS = { DS, orbit: '00000000000000000000000000000011', playbook: '00000000000000000000000000000012', other: '00000000000000000000000000000099', ws: '00000000000000000000000000000021', state: '00000000000000000000000000000031' };

const SCHEMAS = {
  tasks: { 'Task name': 'title', Status: 'status', Priority: 'select', 'Effort level': 'select', Type: 'select', Source: 'select', 'Due date': 'date', Description: 'rich_text', 'Jira Issue Key': 'rich_text', Project: 'relation', Workspace: 'relation', Inbox: 'relation' },
  threads: { 'Thread Name': 'title', Status: 'select', Type: 'multi_select', Description: 'rich_text', 'Email Link': 'url', 'Slack Link': 'url', 'Reported at': 'date', 'Last Reply Date': 'date', 'Jira Key': 'rich_text', Project: 'relation', Workspace: 'relation', 'Manual Status At': 'date' },
  meetings: { 'Meeting Name': 'title', Date: 'date', 'Meeting type': 'multi_select', Summary: 'rich_text', Project: 'relation' },
  decisions: { Decision: 'title', Date: 'date', Area: 'select', Context: 'rich_text', Source: 'url', Status: 'select', Door: 'select', 'Stated by': 'rich_text', 'Trade-off': 'rich_text', Project: 'relation', Workspace: 'relation' },
  risks: { Name: 'title', Status: 'select', Severity: 'select', Likelihood: 'select', Category: 'select', Kind: 'select', Owner: 'rich_text', Summary: 'rich_text', Mitigation: 'rich_text', 'Last Updated': 'date', 'Trigger Date': 'date', 'Last Reviewed': 'date', Project: 'relation' },
  reports: { 'Report Name': 'title', Date: 'date', Type: 'select', Skill: 'select', Visibility: 'select', Summary: 'rich_text', Project: 'relation' },
  inbox: { 'Inbox Name': 'title', Status: 'select', Notes: 'rich_text', Type: 'select', 'Due Date': 'date', Project: 'relation', 'Tasks Tracker': 'relation' },
};

export function createMock({ withManualProp = true, withRiskDates = true } = {}) {
  const schemas = structuredClone(SCHEMAS);
  if (!withManualProp) delete schemas.threads['Manual Status At'];
  if (!withRiskDates) { delete schemas.risks['Trigger Date']; delete schemas.risks['Last Reviewed']; }
  const pages = new Map();
  const log = [];
  const dsKey = (id) => Object.entries(DS).find(([, v]) => v === id.replace(/-/g, ''))?.[0];

  // Dates are relative to "today" in the demo timezone, so the tests do not flip around midnight UTC.
  const kyivToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const day = (n) => { const d = new Date(kyivToday + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const ts = (n, h = 10) => { const d = new Date(kyivToday + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); d.setUTCHours(h, 0, 0, 0); return d.toISOString(); };

  function toProp(type, v) {
    switch (type) {
      case 'title': return { type, title: [{ plain_text: v ?? '', text: { content: v ?? '' } }] };
      case 'rich_text': return { type, rich_text: v ? [{ plain_text: v, text: { content: v } }] : [] };
      case 'select': return { type, select: v ? { name: v } : null };
      case 'status': return { type, status: v ? { name: v } : null };
      case 'multi_select': return { type, multi_select: (v || []).map((name) => ({ name })) };
      case 'date': return { type, date: v ? { start: v } : null };
      case 'url': return { type, url: v || null };
      case 'relation': return { type, relation: (v || []).map((id) => ({ id })) };
      default: return { type };
    }
  }

  function add(db, values, extra = {}) {
    const id = randomUUID();
    const props = {};
    for (const [name, type] of Object.entries(schemas[db])) props[name] = toProp(type, values[name]);
    const page = {
      object: 'page', id, url: `https://www.notion.so/demo-${id.replace(/-/g, '')}`,
      parent: { type: 'data_source_id', data_source_id: DS[db] },
      properties: props, icon: extra.icon ? { type: 'emoji', emoji: extra.icon } : null,
      created_time: extra.created || ts(-1), last_edited_time: extra.edited || ts(-1),
    };
    pages.set(id, page);
    return page;
  }

  // ---------- seed ----------
  const O = [IDS.orbit], P = [IDS.playbook], X = [IDS.other];
  add('tasks', { 'Task name': '🧪 Demo: confirm launch checklist with client', Status: 'In progress', Priority: 'High', Source: 'client-meeting-prep', 'Due date': day(0), Project: O });
  add('tasks', { 'Task name': '🧪 Demo: send weekly status report', Status: 'To Do', Priority: 'Medium', Source: 'weekly-overview', 'Due date': day(-2), Project: O });
  add('tasks', { 'Task name': '🧪 Demo: review staging deploy notes', Status: 'Under Review', Priority: 'Low', Source: 'manual', 'Due date': day(3), Project: O });
  add('tasks', { 'Task name': '🧪 Demo: renew analytics access', Status: 'On Hold', Priority: 'Medium', Source: 'manual', 'Due date': day(10), Project: O });
  add('tasks', { 'Task name': '🧪 Demo: draft change request for export feature', Status: 'To Do', Priority: 'High', Source: 'change-request', Project: O });
  add('tasks', { 'Task name': '🧪 Demo: archive sprint notes', Status: 'Done', Priority: 'Low', Source: 'manual', 'Due date': day(-1), Project: O }, { edited: ts(-1) });
  add('tasks', { 'Task name': '🧪 Demo: dropped idea', Status: "Won't Do", Priority: 'High', 'Due date': day(-3), Project: O });
  add('tasks', { 'Task name': '🧪 Demo: update onboarding checklist', Status: 'To Do', Priority: 'Medium', Source: 'manual', 'Due date': day(1), Project: P });
  add('tasks', { 'Task name': '🧪 Demo: collect retro actions', Status: 'Done', Source: 'manual', Project: P }, { edited: ts(-2) });
  add('tasks', { 'Task name': 'Task of a project outside this dashboard', Status: 'To Do', Priority: 'High', 'Due date': day(-5), Project: X });

  add('threads', { 'Thread Name': '🧪 Demo: client asks for the export ETA', Status: 'Awaiting Reply', Type: ['Slack'], Description: 'Client: when can we expect the CSV export on production? Our finance team needs it before month end.', 'Slack Link': 'https://example.slack.com/archives/C000/p000', 'Last Reply Date': ts(-3), Project: O }, { icon: '🔴' });
  add('threads', { 'Thread Name': '🧪 Demo: invoice question from billing', Status: 'Awaiting Reply', Type: ['Email'], Description: 'Billing asked to confirm the hours for October before they send the invoice.', 'Email Link': 'https://mail.example.com/thread/1', 'Last Reply Date': ts(-1), Project: O }, { icon: '🔴' });
  add('threads', { 'Thread Name': '🧪 Demo: staging credentials', Status: 'Need Follow-up', Type: ['Email'], Description: 'ts: 1761939240.239889,1761939241.688330\nI asked for staging credentials on Monday, no answer yet.', 'Last Reply Date': ts(-4), Project: O }, { icon: '⏳' });
  add('threads', { 'Thread Name': '🧪 Demo: release announcement', Status: 'Spectator Mode', Type: ['Slack'], 'Last Reply Date': ts(-2), Project: O }, { icon: '👀' });
  add('threads', { 'Thread Name': '🧪 Demo: unclear request in #general', Status: 'AI Review', Type: ['Slack'], 'Last Reply Date': ts(-1), Project: P }, { icon: '🤖' });
  add('threads', { 'Thread Name': '🧪 Demo: playbook template feedback', Status: 'Replied', Type: ['Slack'], 'Last Reply Date': ts(-2), Project: P }, { icon: '💬' });
  add('threads', { 'Thread Name': '🧪 Demo: kickoff date confirmed', Status: 'Closed', Type: ['Email'], 'Last Reply Date': ts(-3), Project: O }, { edited: ts(-2) });
  add('threads', { 'Thread Name': '🧪 Demo: QA sign-off for the export build', Status: 'Need Follow-up', Type: ['Slack'], Description: 'Mike: we asked for the QA sign-off on Monday.', 'Last Reply Date': ts(-6), Project: O }, { icon: '⏳' });
  add('threads', { 'Thread Name': '🧪 Demo: billing contact for the new invoice address', Status: 'Replied', Type: ['Email'], 'Last Reply Date': ts(-2), Project: O }, { icon: '💬' });
  add('threads', { 'Thread Name': '🧪 Demo: second reviewer for the playbook', Status: 'Awaiting Reply', Type: ['Slack'], Description: 'Josh asked who can review the playbook next week.', 'Last Reply Date': ts(-18), Project: P }, { icon: '🔴' });
  add('threads', { 'Thread Name': '🧪 Demo: access to the analytics workspace', Status: 'Awaiting Reply', Type: ['Slack'], Description: 'We asked to add two people. No reply in the channel since.', 'Last Reply Date': ts(-41), Project: O }, { icon: '🔴' });
  add('threads', { 'Thread Name': '🧪 Demo: old vendor NDA', Status: 'Need Follow-up', Type: ['Email'], 'Last Reply Date': ts(-120), Project: O }, { icon: '⏳' });
  add('threads', { 'Thread Name': '🧪 Demo: holiday schedule question', Status: 'Replied', Type: ['Email'], 'Last Reply Date': ts(-95), Project: P }, { icon: '💬' });

  add('meetings', { 'Meeting Name': '🧪 Demo: Orbit Client Sync', Date: ts(-1, 13), 'Meeting type': ['Client Sync'], Summary: 'Client confirmed the launch scope. Export feature moves to a change request. Next sync on Thursday.', Project: O });
  add('meetings', { 'Meeting Name': '🧪 Demo: Orbit Internal Daily', Date: ts(0, 8), 'Meeting type': ['Internal Daily'], Summary: 'Staging deploy is green, waiting for credentials from the client.', Project: O });
  add('meetings', { 'Meeting Name': '🧪 Demo: Playbook Retro', Date: ts(-6, 14), 'Meeting type': ['Retro'], Summary: 'Agreed to shorten the onboarding checklist.', Project: P });
  add('meetings', { 'Meeting Name': `🧪 Demo: Orbit weekly with the client ${day(0)}`, Date: ts(0, 21), 'Meeting type': ['Client Sync'], Project: O });
  add('meetings', { 'Meeting Name': `🧪 Demo: Playbook planning ${day(1)}T08:00`, Date: ts(1, 8), 'Meeting type': ['Internal'], Project: P });

  add('decisions', { Decision: '🧪 Demo: export feature goes through a change request', Date: day(-1), Area: 'Scope', Status: 'Active', Door: 'Two-way', 'Stated by': 'Client PO', Context: 'Not in the original scope; estimate first.', Project: O });
  add('decisions', { Decision: '🧪 Demo: weekly report moves to Monday', Date: day(-12), Area: 'Process', Status: 'Active', Door: 'Two-way', Project: O });
  add('decisions', { Decision: '🧪 Demo: one shared retro board', Date: day(-20), Area: 'Process', Status: 'Superseded', Project: P });

  add('risks', { Name: '🧪 Demo: staging credentials delay the launch', Status: 'Open', Severity: 'High', Likelihood: 'Likely', Category: 'Dependency', Kind: 'Risk', Owner: 'PM', Summary: 'No staging access for 4 days.', 'Last Updated': day(-1), 'Trigger Date': day(2), 'Last Reviewed': day(-2), Project: O });
  add('risks', { Name: '🧪 Demo: scope creep around export', Status: 'Monitoring', Severity: 'Medium', Likelihood: 'Possible', Category: 'Scope', Kind: 'Risk', 'Last Updated': day(-3), 'Trigger Date': day(20), 'Last Reviewed': day(-16), Project: O });
  add('risks', { Name: '🧪 Demo: single reviewer for the playbook', Status: 'Open', Severity: 'Critical', Likelihood: 'Possible', Category: 'Resource', Kind: 'Issue', 'Last Updated': day(-2), 'Trigger Date': day(9), 'Last Reviewed': day(-15), Project: P });
  add('risks', { Name: '🧪 Demo: old vendor contract', Status: 'Closed', Severity: 'Low', Project: O });

  add('reports', { 'Report Name': '🧪 Demo: Daily Team Prep', Date: day(0), Type: 'Daily Team Prep', Skill: 'daily-team-prep', Visibility: 'Internal', Summary: 'Two blockers, one overdue task, client waits for the export ETA.', Project: O });
  add('reports', { 'Report Name': '🧪 Demo: Client Meeting Prep', Date: day(-1), Type: 'Client Meeting Prep', Skill: 'client-meeting-prep', Visibility: 'Internal', Project: O });
  add('reports', { 'Report Name': '🧪 Demo: Weekly Overview', Date: day(-4), Type: 'Weekly Overview', Skill: 'weekly-overview', Visibility: 'Internal', Project: P });

  add('inbox', { 'Inbox Name': '🧪 Demo: ask about the holiday schedule', Status: 'New', Notes: 'Before planning December.' }, { created: ts(0, 7) });
  add('inbox', { 'Inbox Name': '🧪 Demo: idea for the retro format', Status: 'New', Type: 'Idea', Project: P }, { created: ts(-1) });
  add('inbox', { 'Inbox Name': 'Inbox of a project outside this dashboard', Status: 'New', Project: X });
  add('inbox', { 'Inbox Name': '🧪 Demo: already routed', Status: 'Routed' });

  const stateBlocks = [
    { type: 'heading_2', heading_2: { rich_text: [{ plain_text: 'Open questions' }] } },
    { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Export ETA for the client', annotations: { bold: true } }, { plain_text: ': waiting for the estimate.' }] } },
    { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Staging credentials: follow-up sent.' }] } },
    { type: 'heading_2', heading_2: { rich_text: [{ plain_text: 'Planned deploys' }] } },
    { type: 'to_do', to_do: { rich_text: [{ plain_text: 'Release 1.4 on Tuesday' }], checked: false } },
    { type: 'callout', callout: { rich_text: [{ plain_text: 'Updated daily by the current-state skill.' }], icon: { emoji: '🧭' } } },
    { type: 'table', table: {} },
  ].map((b, i) => ({ object: 'block', id: `b${i}`, has_children: false, ...b }));
  pages.set(IDS.state, { object: 'page', id: IDS.state, url: 'https://www.notion.so/demo-current-state', parent: { type: 'page_id' }, properties: { title: { type: 'title', title: [{ plain_text: '🧪 Demo: Orbit Current State' }] } }, last_edited_time: ts(0, 6) });

  // ---------- filter evaluation ----------
  const val = (page, name) => {
    const p = page.properties[name];
    if (!p) return undefined;
    switch (p.type) {
      case 'title': return p.title.map((x) => x.plain_text).join('');
      case 'rich_text': return p.rich_text.map((x) => x.plain_text).join('');
      case 'select': return p.select?.name ?? null;
      case 'status': return p.status?.name ?? null;
      case 'multi_select': return p.multi_select.map((x) => x.name);
      case 'date': return p.date?.start ?? null;
      case 'relation': return p.relation.map((r) => r.id.replace(/-/g, ''));
      default: return null;
    }
  };
  function match(page, f, db) {
    if (!f) return true;
    if (f.and) return f.and.every((x) => match(page, x, db));
    if (f.or) return f.or.some((x) => match(page, x, db));
    if (f.timestamp) {
      const v = page[f.timestamp];
      if (f[f.timestamp].past_week) return Date.parse(v) >= Date.now() - 7 * 86400000;
      return true;
    }
    const type = schemas[db][f.property];
    if (!type) throw Object.assign(new Error(`Could not find property with name or id: ${f.property}`), { status: 400 });
    const v = val(page, f.property);
    const cond = f[Object.keys(f).find((k) => k !== 'property')];
    const key = Object.keys(f).find((k) => k !== 'property');
    if (key !== type && !(key === 'relation' && type === 'relation')) throw Object.assign(new Error(`Filter type ${key} does not match property type ${type}`), { status: 400 });
    if ('contains' in cond) return Array.isArray(v) && v.includes(String(cond.contains).replace(/-/g, ''));
    if ('does_not_contain' in cond) return !(Array.isArray(v) && v.includes(cond.does_not_contain));
    if ('equals' in cond) return v === cond.equals;
    if ('does_not_equal' in cond) return v !== cond.does_not_equal;
    if ('on_or_after' in cond) return v && v.slice(0, 10) >= cond.on_or_after;
    if ('before' in cond) return v && v.slice(0, 10) < cond.before;
    return true;
  }

  function sortRows(rows, sorts) {
    for (const s of [...(sorts || [])].reverse()) {
      rows.sort((a, b) => {
        const av = s.timestamp ? a[s.timestamp] : val(a, s.property);
        const bv = s.timestamp ? b[s.timestamp] : val(b, s.property);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * (s.direction === 'descending' ? -1 : 1);
      });
    }
    return rows;
  }

  function applyProps(page, db, props) {
    for (const [name, p] of Object.entries(props || {})) {
      const type = schemas[db][name];
      if (!type) throw Object.assign(new Error(`${name} is not a property that exists.`), { status: 400 });
      const key = Object.keys(p)[0];
      if (key !== type) throw Object.assign(new Error(`${name} is expected to be ${type}.`), { status: 400 });
      if (type === 'relation') page.properties[name] = { type, relation: p.relation.map((r) => ({ id: r.id })) };
      else if (type === 'title' || type === 'rich_text') page.properties[name] = { type, [type]: p[type].map((x) => ({ plain_text: x.text.content, text: x.text })) };
      else page.properties[name] = { type, [type]: p[type] };
    }
  }

  // ---------- server ----------
  const server = http.createServer(async (req, res) => {
    const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers.authorization !== 'Bearer test-token') return send(401, { code: 'unauthorized', message: 'API token is invalid.' });
    let raw = '';
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const url = new URL(req.url, 'http://x');
    log.push({ method: req.method, path: url.pathname, body });
    try {
      let m;
      if (req.method === 'GET' && (m = url.pathname.match(/^\/v1\/data_sources\/(\w+)$/))) {
        const db = dsKey(m[1]);
        if (!db) return send(404, { code: 'object_not_found', message: 'Could not find data_source' });
        const OPTS = { tasks: { Status: ['To Do', 'In progress', 'Under Review', 'Done', 'On Hold', "Won't Do"] } };
        const COLORS = { 'To Do': 'gray', 'In progress': 'blue', 'Under Review': 'purple', Done: 'green', 'On Hold': 'yellow', "Won't Do": 'brown' };
        return send(200, { object: 'data_source', id: m[1], properties: Object.fromEntries(Object.entries(schemas[db]).map(([n, type]) => {
          const opts = OPTS[db]?.[n];
          return [n, opts ? { name: n, type, [type]: { options: opts.map((name) => ({ name, color: COLORS[name] || 'default' })) } } : { name: n, type }];
        })) });
      }
      if (req.method === 'POST' && (m = url.pathname.match(/^\/v1\/data_sources\/(\w+)\/query$/))) {
        const db = dsKey(m[1]);
        if (!db) return send(404, { code: 'object_not_found', message: 'Could not find data_source' });
        const rows = sortRows([...pages.values()].filter((p) => p.parent.data_source_id === DS[db] && match(p, body.filter, db)), body.sorts);
        return send(200, { object: 'list', results: rows.slice(0, body.page_size || 100), has_more: false, next_cursor: null });
      }
      if ((m = url.pathname.match(/^\/v1\/pages\/([\w-]+)$/))) {
        const page = [...pages.values()].find((p) => p.id.replace(/-/g, '') === m[1].replace(/-/g, ''));
        if (!page) return send(404, { code: 'object_not_found', message: 'Could not find page' });
        if (req.method === 'GET') return send(200, page);
        if (req.method === 'PATCH') {
          applyProps(page, dsKey(page.parent.data_source_id), body.properties);
          if ('icon' in body) page.icon = body.icon;
          page.last_edited_time = new Date().toISOString();
          return send(200, page);
        }
      }
      if (req.method === 'POST' && url.pathname === '/v1/pages') {
        const db = dsKey(body.parent.data_source_id);
        if (!db) return send(404, { code: 'object_not_found', message: 'Could not find data_source' });
        const page = add(db, {}, { created: new Date().toISOString(), edited: new Date().toISOString() });
        applyProps(page, db, body.properties);
        return send(200, page);
      }
      if (req.method === 'GET' && (m = url.pathname.match(/^\/v1\/blocks\/(\w+)\/children$/))) {
        if (m[1] !== IDS.state) return send(404, { code: 'object_not_found', message: 'Could not find block' });
        return send(200, { object: 'list', results: stateBlocks, has_more: false });
      }
      send(404, { code: 'not_found', message: `mock: ${req.method} ${url.pathname}` });
    } catch (e) {
      send(e.status || 500, { code: 'validation_error', message: e.message });
    }
  });

  return { server, pages, log, schemas, DS };
}

export function mockConfig() {
  const c = (k) => `collection://${DS[k].replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')}`;
  return {
    app: { title: 'PM Control Tower', locale: 'en', timezone: 'Europe/Kyiv' },
    automation: { fixtures: true },
    notion: { tasks_db: c('tasks'), threads_db: c('threads'), meetings_db: c('meetings'), decisions_db: c('decisions'), risks_db: c('risks'), reports_db: c('reports'), inbox_db: c('inbox') },
    projects: [
      { slug: 'orbit', name: 'Orbit SaaS Launch', color: '#3b6fd8', project_page_id: IDS.orbit, workspace_page_id: IDS.ws, current_state_page_id: IDS.state },
      { slug: 'playbook', name: 'Internal Delivery Playbook', short_name: 'Playbook', color: '#2f9e6b', project_page_id: IDS.playbook, workspace_page_id: IDS.ws },
    ],
  };
}

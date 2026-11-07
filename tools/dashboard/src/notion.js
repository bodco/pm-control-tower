// Minimal Notion REST client for the dashboard Worker.
// API version 2025-09-03 (data sources). The token never leaves the Worker.

const NOTION_VERSION = '2025-09-03';

export class NotionError extends Error {
  constructor(status, body) {
    super(`Notion ${status}: ${body?.message || 'request failed'}`);
    this.status = status;
    this.code = body?.code;
  }
}

export function cleanId(id) {
  if (!id) return '';
  return String(id).replace(/^collection:\/\//, '').replace(/^.*\//, '').replace(/[?#].*$/, '').replace(/-/g, '').slice(-32);
}

export function sameId(a, b) {
  return cleanId(a) !== '' && cleanId(a) === cleanId(b);
}

export class Notion {
  constructor({ token, base = 'https://api.notion.com' }) {
    if (!token) throw new Error('NOTION_TOKEN is not set');
    this.token = token;
    this.base = base.replace(/\/$/, '');
    this.schemaCache = new Map();
  }

  async call(method, path, body, attempt = 0) {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 3) {
      const wait = Number(res.headers.get('Retry-After') || 1) * 1000;
      await new Promise((r) => setTimeout(r, Math.min(wait, 4000)));
      return this.call(method, path, body, attempt + 1);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new NotionError(res.status, data);
    return data;
  }

  // Query a data source, following pagination up to maxPages.
  async query(dataSourceId, { filter, sorts, pageSize = 100, maxPages = 3 } = {}) {
    const id = cleanId(dataSourceId);
    const results = [];
    let cursor;
    for (let i = 0; i < maxPages; i++) {
      const body = { page_size: pageSize };
      if (filter) body.filter = filter;
      if (sorts) body.sorts = sorts;
      if (cursor) body.start_cursor = cursor;
      const data = await this.call('POST', `/v1/data_sources/${id}/query`, body);
      results.push(...(data.results || []));
      if (!data.has_more || results.length >= pageSize * maxPages) break;
      cursor = data.next_cursor;
    }
    return results;
  }

  async dataSource(dataSourceId) {
    const id = cleanId(dataSourceId);
    if (!this.schemaCache.has(id)) {
      this.schemaCache.set(id, await this.call('GET', `/v1/data_sources/${id}`));
    }
    return this.schemaCache.get(id);
  }

  page(id) {
    return this.call('GET', `/v1/pages/${cleanId(id)}`);
  }

  updatePage(id, payload) {
    return this.call('PATCH', `/v1/pages/${cleanId(id)}`, payload);
  }

  createPage(dataSourceId, payload) {
    return this.call('POST', '/v1/pages', {
      parent: { type: 'data_source_id', data_source_id: cleanId(dataSourceId) },
      ...payload,
    });
  }

  async children(blockId, maxPages = 3) {
    const out = [];
    let cursor;
    for (let i = 0; i < maxPages; i++) {
      const q = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
      const data = await this.call('GET', `/v1/blocks/${cleanId(blockId)}/children${q}`);
      out.push(...(data.results || []));
      if (!data.has_more) break;
      cursor = data.next_cursor;
    }
    return out;
  }
}

// ---------- reading properties ----------

export function plain(richText) {
  return (richText || []).map((t) => t.plain_text ?? t.text?.content ?? '').join('');
}

// Normalised value of any property, independent of its Notion type.
export function prop(page, name) {
  const p = page?.properties?.[name];
  if (!p) return null;
  switch (p.type) {
    case 'title': return plain(p.title);
    case 'rich_text': return plain(p.rich_text);
    case 'select': return p.select?.name ?? null;
    case 'status': return p.status?.name ?? null;
    case 'multi_select': return (p.multi_select || []).map((o) => o.name);
    case 'date': return p.date?.start ?? null;
    case 'url': return p.url ?? null;
    case 'number': return p.number;
    case 'checkbox': return p.checkbox;
    case 'relation': return (p.relation || []).map((r) => r.id);
    case 'people': return (p.people || []).map((u) => u.name || u.id);
    case 'unique_id': return p.unique_id ? `${p.unique_id.prefix ? p.unique_id.prefix + '-' : ''}${p.unique_id.number}` : null;
    case 'formula': {
      const f = p.formula || {};
      return f[f.type] ?? null;
    }
    case 'created_time': return p.created_time;
    case 'last_edited_time': return p.last_edited_time;
    default: return null;
  }
}

export function propType(page, name) {
  return page?.properties?.[name]?.type || null;
}

// ---------- writing properties ----------

// Build a property value for the given Notion type.
export function buildProp(type, value) {
  const empty = value === null || value === undefined || value === '';
  switch (type) {
    case 'title': return { title: [{ text: { content: String(value ?? '').slice(0, 2000) } }] };
    case 'rich_text': return { rich_text: empty ? [] : [{ text: { content: String(value).slice(0, 2000) } }] };
    case 'select': return { select: empty ? null : { name: String(value) } };
    case 'status': return { status: empty ? null : { name: String(value) } };
    case 'multi_select': return { multi_select: (Array.isArray(value) ? value : [value]).filter(Boolean).map((name) => ({ name })) };
    case 'date': return { date: empty ? null : { start: String(value) } };
    case 'url': return { url: empty ? null : String(value) };
    case 'relation': return { relation: (Array.isArray(value) ? value : [value]).filter(Boolean).map((id) => ({ id: cleanId(id) })) };
    case 'number': return { number: empty ? null : Number(value) };
    case 'checkbox': return { checkbox: Boolean(value) };
    default: throw new Error(`Unsupported property type for writing: ${type}`);
  }
}

// Turn {propName: value} into Notion properties using the data source schema.
export function buildProps(schemaProps, values) {
  const out = {};
  const skipped = [];
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const def = schemaProps[name];
    if (!def) { skipped.push(name); continue; }
    out[name] = buildProp(def.type, value);
  }
  return { properties: out, skipped };
}

// PM Control Tower dashboard (PWA). Vanilla JS, no build step.
// Talks only to its own Worker (/api); the Worker talks to Notion.
// Layout and behaviour follow the 2.0 design: Home (tiles, Start here,
// projects worst first), Project tabs, read-only Automation, Settings.

// ---------- i18n ----------
const I18N = {
  en: {
    home: 'Home', projects: 'Projects', add: 'Add', auto: 'Auto', automation: 'Automation', settings: 'Settings',
    loading: 'Loading…', refresh: 'Refresh', retry: 'Retry', cancel: 'Cancel', save: 'Save', create: 'Create', close: 'Close',
    overview: 'Overview', tasks: 'Tasks', threads: 'Threads', risks: 'Risks', decisions: 'Decisions', meetings: 'Meetings',
    reports: 'Reports', state: 'Current state',
    overdue: 'Overdue', yourTurn: 'Your turn', theirTurn: 'Their turn', criticalRisk: 'Critical risk', dueToday: 'Due today',
    openRisks: 'Open risks', aiReview: 'AI review',
    tileOverdueSub: 'tasks past due', tileTurnSub: 'threads waiting on you', tileCritSub: 'open, severity Critical', tileTodaySub: 'tasks due today',
    startHere: 'Start here', startHereHint: 'Most urgent first. Scroll for the rest.', allClear: 'Nothing urgent.', allClearSub: 'No overdue work, no thread waiting on you.',
    needsYou: 'Needs you', watch: 'Watch', onTrack: 'On track',
    rCrit: '{n} critical risk', rOverdueHigh: '{n} overdue High', rOldTurn: '{n} waiting on you over 2 days', rOverdue: '{n} overdue',
    rToday: '{n} due today', rHigh: '{n} high risk', rTurn: '{n} your turn', rNone: 'Nothing overdue, nothing waiting on you.',
    open: 'open', risksShort: 'risks',
    quickAdd: 'Quick task', title: 'Title', description: 'Description', project: 'Project', due: 'Due', priority: 'Priority',
    whatToDo: 'What needs doing?', addDescription: 'Add a description', noDue: 'No date', todayW: 'Today', tomorrow: 'Tomorrow',
    nextWeek: 'Next week', pickDate: 'Date', projectRequired: 'Pick the project: the dashboard never guesses it.',
    created: 'Created', saved: 'Saved', undo: 'Undo', markedDone: 'Marked done', markedReplied: 'Marked Replied',
    movedTomorrow: 'Moved to tomorrow', markedFollow: 'Marked Need Follow-up', statusSet: 'Status: {s}',
    newTask: 'Task', newDecision: 'Decision', decision: 'Decision', area: 'Area', door: 'Door', context: 'Context', statedBy: 'Stated by',
    status: 'Status', severity: 'Severity', replied: 'Replied', done: 'Done', openInNotion: 'Open in Notion',
    all: 'All', active: 'Active', allOpen: 'All open', thisWeek: 'This week', high: 'High', onHold: 'On hold', done7: 'Done 7d',
    closedWeek: 'Closed this week', showOlder: 'Show older', empty: 'Nothing here.', emptyFilter: 'Nothing matches this filter.',
    manual: 'manual', draft: 'draft', slack: 'Slack', email: 'Email', updated: 'updated',
    yesterday: 'yesterday', daysAgo: '{n}d ago', inDays: 'in {n}d', dAge: '{n}d', hAgo: '{n}h ago', mAgo: '{n}m ago', inH: 'in {n}h', now: 'now',
    synced: 'Updated {t}', offline: 'Offline, data from {t}', offlineBanner: 'You are offline. Showing data saved at {t}; changes are disabled until you reconnect.',
    sourceErrors: 'Some sources failed to load', errorTitle: 'Could not load', noState: 'No Current State page in the config for this project.',
    lastEdited: 'Last edited {t}', mix: 'Open tasks by status', needsYouHere: 'Needs you here', recentDecisions: 'Recent decisions',
    latestMeetings: 'Latest meetings', latestReports: 'Latest reports', seeAll: 'See all',
    manualWarn: 'Collectors may overwrite this status: the Threads database has no "Manual Status At" property yet.',
    // automation
    autoReadOnly: 'Read-only. Tasks run on their schedule or by hand in Cowork; this page shows what ran, what is running and what is next.',
    autoNotConfigured: 'Automation is not connected. Add automation_db and runs_db to the config (see DEVELOPMENT.md, Automation bridge).',
    needsALook: 'Needs a look', ranToday: 'Ran today', scheduled: 'Scheduled', skills: 'Skills', runningNow: 'Running now',
    comingUp: 'Coming up', recentRuns: 'Recent runs', byProject: 'By project', generalTasks: 'General scheduled tasks',
    generalSkills: 'General skills', projectTasks: 'Scheduled for this project', projectSkills: 'Skills for this project',
    generalAlso: '{n} general tasks also cover this project.', lastRun: 'last run {t}', nextRun: 'next {t}', neverRan: 'never ran',
    general: 'General', retired: 'Retired', schedule: 'Schedule', manualRun: 'Manual', took: 'took {d}', runsAndSkills: 'Runs and skills',
    failedTasks: 'tasks failed last time', runsSince: 'runs since midnight', activeTasks: 'active scheduled tasks', skillsSub: 'skills on file',
    // settings
    visibleProjects: 'Projects on the board', visibleHint: 'Hidden projects stay in Notion and open by link; they are left out of Home, tiles and quick add.',
    language: 'Language', theme: 'Theme', themeSystem: 'System', themeDark: 'Dark', themeLight: 'Light',
    swapTurn: 'Swap whose turn', swapTurnHint: 'Turn on if Awaiting Reply and Need Follow-up read the other way round for you.',
    swipeLeft: 'Swipe left', swipeLeftHint: 'Task: due tomorrow. Thread: Need Follow-up.', keys: 'Keyboard shortcuts', about: 'About',
    keysHelp: 'Shortcuts', kMove: 'Move down / up', kSelect: 'Select row', kReplied: 'Mark thread Replied', kStatus: 'Change status',
    kDone: 'Mark task done', kOpen: 'Open in Notion', kNew: 'New task', kHelp: 'This help', kClose: 'Close sheet',
    pullRefresh: 'Pull to refresh', releaseRefresh: 'Release to refresh',
    listOverdue: 'Overdue tasks', listMine: 'Waiting on you', listCritical: 'Critical risks', listToday: 'Due today',
  },
  uk: {
    home: 'Головна', projects: 'Проєкти', add: 'Додати', auto: 'Авто', automation: 'Автоматизація', settings: 'Налаштування',
    loading: 'Завантаження…', refresh: 'Оновити', retry: 'Ще раз', cancel: 'Скасувати', save: 'Зберегти', create: 'Створити', close: 'Закрити',
    overview: 'Огляд', tasks: 'Задачі', threads: 'Треди', risks: 'Ризики', decisions: 'Рішення', meetings: 'Мітинги',
    reports: 'Звіти', state: 'Current state',
    overdue: 'Прострочено', yourTurn: 'Твоя черга', theirTurn: 'Їхня черга', criticalRisk: 'Критичні ризики', dueToday: 'На сьогодні',
    openRisks: 'Відкриті ризики', aiReview: 'AI review',
    tileOverdueSub: 'задач після дедлайну', tileTurnSub: 'тредів чекають на тебе', tileCritSub: 'відкриті, Critical', tileTodaySub: 'задач на сьогодні',
    startHere: 'Почни з цього', startHereHint: 'Найтерміновіше першим. Решта нижче, прокрути.', allClear: 'Нічого термінового.', allClearSub: 'Немає прострочок і тредів, що чекають на тебе.',
    needsYou: 'Потрібен ти', watch: 'Під наглядом', onTrack: 'Все гаразд',
    rCrit: 'критичних ризиків: {n}', rOverdueHigh: 'прострочених High: {n}', rOldTurn: 'чекають на тебе понад 2 дні: {n}', rOverdue: 'прострочено: {n}',
    rToday: 'на сьогодні: {n}', rHigh: 'високих ризиків: {n}', rTurn: 'твоя черга: {n}', rNone: 'Немає прострочок і нічого не чекає на тебе.',
    open: 'відкр.', risksShort: 'ризики',
    quickAdd: 'Швидка задача', title: 'Назва', description: 'Опис', project: 'Проєкт', due: 'Дедлайн', priority: 'Пріоритет',
    whatToDo: 'Що треба зробити?', addDescription: 'Додати опис', noDue: 'Без дати', todayW: 'Сьогодні', tomorrow: 'Завтра',
    nextWeek: 'Наступний тиждень', pickDate: 'Дата', projectRequired: 'Обери проєкт: дашборд ніколи його не вгадує.',
    created: 'Створено', saved: 'Збережено', undo: 'Відмінити', markedDone: 'Позначено Done', markedReplied: 'Позначено Replied',
    movedTomorrow: 'Перенесено на завтра', markedFollow: 'Позначено Need Follow-up', statusSet: 'Статус: {s}',
    newTask: 'Задача', newDecision: 'Рішення', decision: 'Рішення', area: 'Area', door: 'Door', context: 'Контекст', statedBy: 'Хто сказав',
    status: 'Статус', severity: 'Severity', replied: 'Replied', done: 'Done', openInNotion: 'Відкрити в Notion',
    all: 'Усі', active: 'Активні', allOpen: 'Усі відкриті', thisWeek: 'Цей тиждень', high: 'High', onHold: 'On hold', done7: 'Done 7д',
    closedWeek: 'Закриті за тиждень', showOlder: 'Показати старіші', empty: 'Тут порожньо.', emptyFilter: 'Під цей фільтр нічого немає.',
    manual: 'вручну', draft: 'драфт', slack: 'Slack', email: 'Пошта', updated: 'оновлено',
    yesterday: 'вчора', daysAgo: '{n}д тому', inDays: 'за {n}д', dAge: '{n}д', hAgo: '{n}год тому', mAgo: '{n}хв тому', inH: 'за {n}год', now: 'зараз',
    synced: 'Оновлено {t}', offline: 'Офлайн, дані з {t}', offlineBanner: 'Немає зʼєднання. Показую дані, збережені о {t}; зміни недоступні, поки звʼязок не повернеться.',
    sourceErrors: 'Частина джерел не завантажилась', errorTitle: 'Не вдалося завантажити', noState: 'У конфігу немає сторінки Current State для цього проєкту.',
    lastEdited: 'Остання зміна {t}', mix: 'Відкриті задачі за статусом', needsYouHere: 'Тут потрібен ти', recentDecisions: 'Останні рішення',
    latestMeetings: 'Останні мітинги', latestReports: 'Свіжі звіти', seeAll: 'Усі',
    manualWarn: 'Колектори можуть перезаписати статус: у Threads ще немає властивості "Manual Status At".',
    autoReadOnly: 'Лише перегляд. Таски запускаються за розкладом або вручну в Cowork; тут видно, що відпрацювало, що працює зараз і що далі.',
    autoNotConfigured: 'Автоматизацію не підключено. Додай automation_db і runs_db у конфіг (DEVELOPMENT.md, Automation bridge).',
    needsALook: 'Варто глянути', ranToday: 'Сьогодні', scheduled: 'За розкладом', skills: 'Скіли', runningNow: 'Працює зараз',
    comingUp: 'Далі', recentRuns: 'Останні запуски', byProject: 'За проєктами', generalTasks: 'Загальні таски за розкладом',
    generalSkills: 'Загальні скіли', projectTasks: 'Таски цього проєкту', projectSkills: 'Скіли цього проєкту',
    generalAlso: 'Ще {n} загальних тасок охоплюють цей проєкт.', lastRun: 'востаннє {t}', nextRun: 'далі {t}', neverRan: 'ще не запускалась',
    general: 'Загальне', retired: 'Не використовується', schedule: 'Розклад', manualRun: 'Вручну', took: 'тривало {d}', runsAndSkills: 'Запуски і скіли',
    failedTasks: 'тасок впали минулого разу', runsSince: 'запусків від півночі', activeTasks: 'активних тасок за розкладом', skillsSub: 'скілів у реєстрі',
    visibleProjects: 'Проєкти на дошці', visibleHint: 'Приховані проєкти лишаються в Notion і відкриваються за посиланням; їх немає на Головній, у плитках і швидкій задачі.',
    language: 'Мова', theme: 'Тема', themeSystem: 'Системна', themeDark: 'Темна', themeLight: 'Світла',
    swapTurn: 'Поміняти, чия черга', swapTurnHint: 'Увімкни, якщо Awaiting Reply і Need Follow-up для тебе означають навпаки.',
    swipeLeft: 'Свайп вліво', swipeLeftHint: 'Задача: на завтра. Тред: Need Follow-up.', keys: 'Клавіші', about: 'Про застосунок',
    keysHelp: 'Клавіші', kMove: 'Вниз / вгору', kSelect: 'Виділити рядок', kReplied: 'Тред: Replied', kStatus: 'Змінити статус',
    kDone: 'Задача: Done', kOpen: 'Відкрити в Notion', kNew: 'Нова задача', kHelp: 'Ця довідка', kClose: 'Закрити',
    pullRefresh: 'Потягни, щоб оновити', releaseRefresh: 'Відпусти, щоб оновити',
    listOverdue: 'Прострочені задачі', listMine: 'Чекають на тебе', listCritical: 'Критичні ризики', listToday: 'На сьогодні',
  },
};

// ---------- settings (per device) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const settings = Object.assign({ lang: null, theme: 'system', hidden: [], swapTurn: false, swipeLeft: false }, store.get('ct.settings', {}));
function saveSettings() { store.set('ct.settings', settings); }

const state = { cfg: null, ov: null, sections: new Map(), auto: null, offlineAt: null, filters: {}, focusIdx: -1 };

const $ = (sel, root = document) => root.querySelector(sel);
const t = (k, vars) => {
  let s = (I18N[settings.lang] || I18N.en)[k] ?? I18N.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
};

// Element builder: h('div.cls', {attrs}, ...children). Text is always escaped.
function h(tag, attrs, ...kids) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv); }
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false || kid === '') continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// ---------- icons (inline SVG, stroke = currentColor) ----------
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  plus: 'M12 5v14M5 12h14',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20.9 10H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  refresh: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chev: 'M9 6l6 6-6 6',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  dot: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  circle: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
  chat: 'M4 5h16v11H8l-4 4z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  cal: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  scale: 'M12 4v16M5 8h14M5 8l-3 7h6zM19 8l-3 7h6z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  x: 'M6 6l12 12M18 6L6 18',
  help: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.5',
  play: 'M8 5l11 7-11 7z',
  skill: 'M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  user: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c1-4 4.5-6 8-6s7 2 8 6',
};
function icon(name, filled = false) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', ICONS[name] || ICONS.dot);
  p.setAttribute('fill', filled ? 'currentColor' : 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  s.append(p);
  return s;
}

// ---------- API ----------
class ApiError extends Error {}
async function api(path, { method = 'GET', body } = {}) {
  if (method !== 'GET' && state.offlineAt) throw new ApiError(t('offline', { t: fmtTime(state.offlineAt) }));
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-CT-Request': '1' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch (e) { throw new ApiError(e.message || 'Network error'); }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(data.error || `${res.status} ${res.statusText}`);
  if (method === 'GET') setSync(res.headers.get('X-CT-Cached-At'));
  return data;
}
function setSync(cachedAt) {
  state.offlineAt = cachedAt || null;
  const el = $('#sync-state');
  el.replaceChildren(h('i'), cachedAt ? t('offline', { t: fmtTime(cachedAt) }) : t('synced', { t: fmtTime(new Date().toISOString()) }));
  el.classList.toggle('stale', Boolean(cachedAt));
}

// ---------- dates ----------
const tz = () => state.cfg?.timezone || 'UTC';
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const todayStr = () => ymd(new Date());
const dayOf = (iso) => (iso.length > 10 ? ymd(new Date(iso)) : iso.slice(0, 10));
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dayDiff(iso) {
  if (!iso) return null;
  return Math.round((Date.parse(dayOf(iso) + 'T00:00:00Z') - Date.parse(todayStr() + 'T00:00:00Z')) / 86400000);
}
// Working days (Mon to Fri, config timezone, no holidays) from iso to today.
function workingDaysSince(iso) {
  if (!iso) return 0;
  let d = dayOf(iso);
  const end = todayStr();
  let n = 0;
  for (let i = 0; d < end && i < 800; i++) {
    d = addDays(d, 1);
    const wd = new Date(d + 'T00:00:00Z').getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}
function rel(iso) {
  const n = dayDiff(iso);
  if (n === null) return '';
  if (n === 0) {
    if (iso.length > 10) {
      const mins = Math.round((Date.parse(iso) - Date.now()) / 60000);
      if (Math.abs(mins) < 2) return t('now');
      if (Math.abs(mins) < 60) return mins < 0 ? t('mAgo', { n: -mins }) : t('inH', { n: 1 });
      const hrs = Math.round(mins / 60);
      return hrs < 0 ? t('hAgo', { n: -hrs }) : t('inH', { n: hrs });
    }
    return t('todayW').toLowerCase();
  }
  if (n === -1) return t('yesterday');
  if (n === 1) return t('tomorrow').toLowerCase();
  return n < 0 ? t('daysAgo', { n: -n }) : t('inDays', { n });
}
const locale = () => (settings.lang === 'uk' ? 'uk-UA' : 'en-GB');
function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const opts = { day: 'numeric', month: 'short', timeZone: tz() };
  if (withTime && iso.length > 10) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat(locale(), opts).format(iso.length > 10 ? new Date(iso) : new Date(iso + 'T12:00:00Z'));
}
const fmtTime = (iso) => new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', timeZone: tz() }).format(new Date(iso));
function duration(a, b) {
  if (!a || !b) return '';
  const s = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
  return s < 90 ? `${s}s` : s < 5400 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`;
}

// ---------- domain rules ----------
const allProjects = () => state.cfg?.projects || [];
const visibleProjects = () => allProjects().filter((p) => !settings.hidden.includes(p.slug));
const isVisible = (slug) => slug && !settings.hidden.includes(slug);
const projectOf = (slug) => allProjects().find((p) => p.slug === slug);
const HOLD = 'On Hold';
const CLOSED_TASK = ['Done', "Won't Do"];

function turnOf(th) {
  const cfg = state.cfg?.turn || { mine: ['Awaiting Reply'], theirs: ['Need Follow-up'], ai: ['AI Review'] };
  let mine = cfg.mine; let theirs = cfg.theirs;
  if (settings.swapTurn) [mine, theirs] = [theirs, mine];
  if (mine.includes(th.status)) return 'mine';
  if (theirs.includes(th.status)) return 'theirs';
  if ((cfg.ai || []).includes(th.status)) return 'ai';
  return 'none';
}
const threadAge = (th) => workingDaysSince(th.lastReply || th.reportedAt || th.edited);
const isOverdue = (x) => x.due && dayOf(x.due) < todayStr();
const isDueToday = (x) => x.due && dayOf(x.due) === todayStr();
const activeTasks = (list) => list.filter((x) => x.status !== HOLD && !CLOSED_TASK.includes(x.status));

// Health is a rule, not a score (design handoff, section 3.4).
function projectFacts(slug, ov = state.ov) {
  const tasks = activeTasks((ov?.tasks || []).filter((x) => x.project === slug));
  const threads = (ov?.threads || []).filter((x) => x.project === slug);
  const risks = (ov?.risks || []).filter((x) => x.project === slug);
  const overdue = tasks.filter(isOverdue);
  const mine = threads.filter((x) => turnOf(x) === 'mine');
  return {
    tasks, threads, risks, overdue, mine,
    overdueHigh: overdue.filter((x) => x.priority === 'High'),
    today: tasks.filter(isDueToday),
    mineOld: mine.filter((x) => threadAge(x) > 2),
    crit: risks.filter((x) => x.severity === 'Critical'),
    high: risks.filter((x) => x.severity === 'High'),
  };
}
function health(slug) {
  const f = projectFacts(slug);
  const red = [['rCrit', f.crit], ['rOverdueHigh', f.overdueHigh], ['rOldTurn', f.mineOld]].filter(([, a]) => a.length);
  const amber = [['rOverdue', f.overdue], ['rToday', f.today], ['rHigh', f.high], ['rTurn', f.mine]].filter(([, a]) => a.length);
  const level = red.length ? 'red' : amber.length ? 'amber' : 'green';
  const why = [...red, ...amber].slice(0, 2).map(([k, a]) => t(k, { n: a.length }));
  return { level, why: why.length ? why.join(' · ') : t('rNone'), facts: f };
}
const HEALTH_RANK = { red: 0, amber: 1, green: 2 };
function healthPill(level) {
  const map = { red: ['alert', 'needsYou'], amber: ['circle', 'watch'], green: ['check', 'onTrack'] };
  const [ic, label] = map[level];
  return h(`span.health.${level}`, icon(ic), t(label));
}

// "Start here": urgent items across the given projects, most urgent first.
function startItems(slugs) {
  const out = [];
  for (const slug of slugs) {
    const f = projectFacts(slug);
    f.crit.forEach((x) => out.push({ s: 0, kind: 'risk', x }));
    f.overdueHigh.forEach((x) => out.push({ s: 1, kind: 'task', x, k: x.due }));
    f.mineOld.forEach((x) => out.push({ s: 2, kind: 'thread', x, k: x.lastReply || '' }));
    f.overdue.filter((x) => x.priority !== 'High').forEach((x) => out.push({ s: 3, kind: 'task', x, k: x.due }));
    f.today.forEach((x) => out.push({ s: 4, kind: 'task', x, k: x.priority === 'High' ? '0' : '1' }));
    f.mine.filter((x) => threadAge(x) <= 2).forEach((x) => out.push({ s: 5, kind: 'thread', x, k: x.lastReply || '' }));
    f.high.forEach((x) => out.push({ s: 6, kind: 'risk', x }));
  }
  return out.sort((a, b) => a.s - b.s || String(a.k || '').localeCompare(String(b.k || '')));
}

// ---------- shared bits ----------
function oc(map, value) {
  const c = (state.cfg?.colors?.[map] || {})[value];
  return 'o-' + (c && /^[a-z]+$/.test(c) ? c : 'default');
}
function pill(text, cls = 'o-default', attrs) {
  if (!text) return null;
  return attrs ? h(`button.pill.${cls}`, { type: 'button', ...attrs }, text) : h(`span.pill.${cls}`, text);
}
function projChip(slug) {
  const p = projectOf(slug);
  if (!p) return null;
  return h('a.proj', { href: `#/p/${p.slug}`, style: { '--pc': p.color || '' } }, p.name);
}
function dueMeta(x) {
  if (!x.due) return null;
  const n = dayDiff(x.due);
  return h(n < 0 ? 'span.late' : n === 0 ? 'span.today' : 'span', { title: x.due }, `${fmtDate(x.due)} · ${rel(x.due)}`);
}
function sevLabel(sev) {
  if (!sev) return null;
  const cls = String(sev).toLowerCase();
  const ic = cls === 'critical' ? icon('alert', true) : cls === 'high' ? icon('alert') : cls === 'medium' ? icon('circle') : icon('dot', true);
  return h(`span.sev.${cls}`, ic, sev);
}
function turnPill(th) {
  const tn = turnOf(th);
  const age = threadAge(th);
  if (tn === 'mine') return h('span.turn.mine', icon('user'), `${t('yourTurn')} · ${t('dAge', { n: age })}`);
  if (tn === 'theirs') return h('span.turn.theirs', icon('clock'), `${t('theirTurn')} · ${t('dAge', { n: age })}`);
  if (tn === 'ai') return h('span.turn.ai', t('aiReview'));
  return null;
}
function sechead(title, count, extra) {
  return h('div.sechead', h('h2.t-section', title), count !== undefined && count !== null ? h('span.count', String(count)) : null, h('span.spacer'), extra || null);
}
function list(rows, { emptyText, scroll = false } = {}) {
  const items = rows.filter(Boolean);
  return h(`div.list${scroll ? '.scrollbox' : ''}`, items.length ? items : h('div.empty', emptyText || t('empty')));
}
function errorsBanner(errors) {
  if (!errors?.length) return null;
  return h('div.banner.error', icon('alert'), h('div', h('b', t('sourceErrors')), ': ', errors.map((e) => `${e.source} (${e.error})`).join('; ')));
}
function offlineBanner() {
  return state.offlineAt ? h('div.banner.warn', icon('clock'), t('offlineBanner', { t: fmtTime(state.offlineAt) })) : null;
}
function skeleton(n = 4) {
  return h('div.list', { style: { 'margin-top': '14px' } }, Array.from({ length: n }, (_, i) => h('div.skrow', h('div.sk', { style: { width: `${60 - i * 7}%` } }), h('div.sk', { style: { width: '35%' } }))));
}

// ---------- toast with undo (6 s) ----------
let toastTimer;
function toast(msg, { undo, error = false } = {}) {
  const wrap = $('#toastwrap');
  const bar = undo ? h('i.bar') : null;
  const el = h(`div.toast${error ? '.error' : ''}`, h('span', msg),
    undo ? h('button.u', { type: 'button', onclick: () => { wrap.replaceChildren(); clearTimeout(toastTimer); undo(); } }, t('undo')) : null, bar);
  wrap.replaceChildren(el);
  const ms = undo ? 6000 : error ? 5000 : 2500;
  if (bar) requestAnimationFrame(() => { bar.style.transition = `transform ${ms}ms linear`; bar.style.transform = 'scaleX(0)'; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => wrap.replaceChildren(), ms);
}

// ---------- data loading ----------
function invalidate() { state.ov = null; state.sections.clear(); state.auto = null; }
async function loadOverview(fresh = false) {
  if (!state.ov || fresh) state.ov = await api('/api/overview' + (fresh ? '?fresh=1' : ''));
  return state.ov;
}
async function loadSection(slug, section, all = false, fresh = false) {
  const key = `${slug}/${section}/${all}`;
  if (!state.sections.has(key) || fresh) state.sections.set(key, await api(`/api/p/${slug}/${section}?${all ? 'all=1&' : ''}${fresh ? 'fresh=1' : ''}`));
  return state.sections.get(key);
}
async function loadAutomation(fresh = false) {
  if (!state.cfg.automation) return { configured: false, items: [], runs: [] };
  if (!state.auto || fresh) state.auto = await api('/api/automation' + (fresh ? '?fresh=1' : ''));
  return state.auto;
}
// Apply a change to every cached copy of a record, so lists stay consistent.
function patchCached(id, changes) {
  const touch = (arr) => (arr || []).forEach((x) => { if (x.id === id) Object.assign(x, changes); });
  if (state.ov) ['tasks', 'threads', 'risks', 'decisions', 'done'].forEach((k) => touch(state.ov[k]));
  for (const v of state.sections.values()) Object.values(v || {}).forEach((a) => Array.isArray(a) && touch(a));
}

// ---------- row machinery: states, swipe, long-press, keys ----------
// Each row element carries ._ct = { open, status, done?, replied?, left? }.
async function mutate(rowEl, rebuild, run, { okMsg, undo } = {}) {
  const act = rowEl.querySelector('.act');
  const prevAct = act ? [...act.childNodes] : [];
  rowEl.classList.remove('is-error');
  rowEl.querySelector('.rowerr')?.remove();
  rowEl.classList.add('is-saving');
  act?.replaceChildren(h('span.saving', h('i.spinner'), t('save') + '…'));
  try {
    await run();
    const fresh = rebuild();
    (rowEl.closest('.swipewrap') || rowEl).replaceWith(fresh);
    if (okMsg) toast(okMsg, { undo });
  } catch (e) {
    rowEl.classList.remove('is-saving');
    rowEl.classList.add('is-error');
    act?.replaceChildren(...prevAct);
    rowEl.append(h('div.rowerr', icon('alert'), e.message, h('button.btn.sm', { type: 'button', onclick: () => mutate(rowEl, rebuild, run, { okMsg, undo }) }, t('retry'))));
  }
}
async function patchRecord(kind, obj, body) {
  const res = await api(`/api/${kind}/${obj.id}`, { method: 'PATCH', body });
  Object.assign(obj, body);
  patchCached(obj.id, body);
  if (res.warning) toast(res.warning, { error: true });
  return res;
}

function withGestures(row, { right, left, rightLabel, leftLabel }) {
  const wrap = h('div.swipewrap', h('div.swipebg',
    h('div.l', icon('check'), rightLabel || ''),
    h('div.r', leftLabel || '', icon('clock'))), row);
  let sx = 0; let sy = 0; let dx = 0; let tracking = false; let decided = false; let horiz = false; let lp;
  const reset = () => { row.style.transform = ''; wrap.classList.remove('dragging'); };
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('button, a, input, select')) return;
    sx = e.clientX; sy = e.clientY; dx = 0; tracking = true; decided = false; horiz = false;
    lp = setTimeout(() => { tracking = false; row._ct?.status?.(); }, 550);
  });
  row.addEventListener('pointermove', (e) => {
    if (!tracking) return;
    const mx = e.clientX - sx; const my = e.clientY - sy;
    if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearTimeout(lp);
    if (!decided && (Math.abs(mx) > 10 || Math.abs(my) > 10)) { decided = true; horiz = Math.abs(mx) > Math.abs(my); }
    if (!horiz) return;
    dx = mx;
    if (dx < 0 && !(settings.swipeLeft && left)) dx = Math.max(dx, -20);
    if (dx > 0 && !right) dx = Math.min(dx, 20);
    wrap.classList.add('dragging');
    row.style.transform = `translateX(${dx}px)`;
  });
  const end = () => {
    clearTimeout(lp);
    if (!tracking) return;
    tracking = false;
    const w = row.offsetWidth || 320;
    reset();
    if (horiz && dx > Math.min(110, w * 0.3) && right) right();
    else if (horiz && dx < -Math.min(110, w * 0.3) && settings.swipeLeft && left) left();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', () => { clearTimeout(lp); tracking = false; reset(); });
  row.addEventListener('contextmenu', (e) => { if (row._ct?.status) { e.preventDefault(); row._ct.status(); } });
  return wrap;
}

// ---------- option sheet ----------
let sheetCleanup = null;
function closeSheet() {
  $('#sheet-root').replaceChildren();
  sheetCleanup?.(); sheetCleanup = null;
}
function openSheet(title, body, { foot } = {}) {
  closeSheet();
  const sheet = h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div.grab'),
    h('div.sheethead', h('h2.t-title', title), h('span.spacer'), h('button.iconbtn', { type: 'button', 'aria-label': t('close'), onclick: closeSheet }, icon('x'))),
    body, foot || null);
  const scrim = h('div.scrim', { onclick: (e) => { if (e.target === scrim) closeSheet(); } }, sheet);
  $('#sheet-root').replaceChildren(scrim);
  setTimeout(() => sheet.querySelector('input, textarea, .opt.sel, .opt, button')?.focus(), 30);
  return sheet;
}
function optionSheet(title, groups) {
  // groups: [{ label, options: [{value, label, cls, hint}], current, onPick }]
  openSheet(title, h('div', groups.map((g) => [
    g.label ? h('div.t-label', { style: { margin: '6px 6px 4px' } }, g.label) : null,
    h('div.optlist', g.options.map((o) => h(`button.opt${o.value === g.current ? '.sel' : ''}`, {
      type: 'button', onclick: () => { closeSheet(); if (o.value !== g.current) g.onPick(o.value); },
    }, o.cls ? h(`span.pill.${o.cls}`, o.label) : h('span', o.label), o.value === g.current ? h('span.hint', '✓') : (o.hint ? h('span.hint', o.hint) : null)))),
  ])));
}

// ---------- rows ----------
function taskRow(task, { showProject = true } = {}) {
  const done = CLOSED_TASK.includes(task.status);
  const rebuild = () => taskRow(task, { showProject });
  const setStatus = (row, next, okMsg) => {
    const prev = task.status;
    mutate(row, rebuild, () => patchRecord('tasks', task, { status: next }), {
      okMsg: okMsg || t('statusSet', { s: next }),
      undo: () => { const r = document.querySelector(`[data-id="${task.id}"]`); r && mutate(r, rebuild, () => patchRecord('tasks', task, { status: prev })); },
    });
  };
  const setDue = (row, due, okMsg) => {
    const prev = task.due || null;
    mutate(row, rebuild, () => patchRecord('tasks', task, { due }), {
      okMsg: okMsg || t('saved'),
      undo: () => { const r = document.querySelector(`[data-id="${task.id}"]`); r && mutate(r, rebuild, () => patchRecord('tasks', task, { due: prev })); },
    });
  };
  const row = h(`div.row${done ? '.is-done' : ''}`, { 'data-row': '', 'data-id': task.id, tabindex: '-1' });
  const statusSheet = () => {
    const o = state.cfg.options;
    const td = todayStr();
    optionSheet(task.title, [
      { label: t('status'), current: task.status, onPick: (v) => setStatus(row, v), options: o.taskStatuses.map((s) => ({ value: s, label: s, cls: oc('taskStatus', s) })) },
      { label: t('due'), current: task.due ? dayOf(task.due) : '', onPick: (v) => setDue(row, v || null), options: [
        { value: td, label: t('todayW') }, { value: addDays(td, 1), label: t('tomorrow') }, { value: addDays(td, 7), label: t('nextWeek') }, { value: '', label: t('noDue') }] },
      { label: t('priority'), current: task.priority || '', onPick: (v) => mutate(row, rebuild, () => patchRecord('tasks', task, { priority: v || null }), { okMsg: t('saved') }), options: [...o.priorities.map((p) => ({ value: p, label: p, cls: oc('priority', p) })), { value: '', label: '-' }] },
    ]);
  };
  const doneFn = () => setStatus(row, done ? 'To Do' : 'Done', done ? null : t('markedDone'));
  row._ct = {
    open: () => window.open(task.url, '_blank', 'noopener'), status: statusSheet, done: doneFn,
    left: () => setDue(row, addDays(todayStr(), 1), t('movedTomorrow')),
  };
  row.append(
    h(`button.check${done ? '.on' : ''}`, { type: 'button', 'aria-label': t('done'), onclick: doneFn }, h('span', icon('check'))),
    h('div.main',
      h('a.ttl', { href: task.url, target: '_blank', rel: 'noopener' }, task.title),
      h('div.meta',
        showProject ? projChip(task.project) : null,
        dueMeta(task),
        task.priority ? pill(task.priority, oc('priority', task.priority)) : null,
        pill(task.status, oc('taskStatus', task.status), { onclick: statusSheet, 'aria-label': `${t('status')}: ${task.status}` }),
        task.jira ? h('span', task.jira) : null,
        task.source && !['manual', 'inbox'].includes(task.source) ? h('span', task.source) : null)),
    h('div.act'));
  return withGestures(row, { right: done ? null : doneFn, left: done ? null : row._ct.left, rightLabel: t('done'), leftLabel: t('tomorrow') });
}

function threadRow(th, { showProject = true } = {}) {
  const rebuild = () => threadRow(th, { showProject });
  const row = h('div.row', { 'data-row': '', 'data-id': th.id, tabindex: '-1' });
  const setStatus = (next, okMsg) => {
    const prev = th.status;
    mutate(row, rebuild, async () => { await patchRecord('threads', th, { status: next }); th.manualAt = new Date().toISOString(); th.icon = null; }, {
      okMsg: okMsg || t('statusSet', { s: next }),
      undo: () => { const r = document.querySelector(`[data-id="${th.id}"]`); r && mutate(r, rebuild, () => patchRecord('threads', th, { status: prev })); },
    });
  };
  const statusSheet = () => optionSheet(th.title, [{
    label: t('status'), current: th.status, onPick: (v) => setStatus(v),
    options: state.cfg.options.threadStatuses.map((s) => ({ value: s, label: s, cls: oc('threadStatus', s) })),
  }]);
  const canReply = !['Replied', 'Closed'].includes(th.status);
  const replied = () => setStatus('Replied', t('markedReplied'));
  row._ct = { open: () => window.open(th.url, '_blank', 'noopener'), status: statusSheet, replied: canReply ? replied : null, left: () => setStatus('Need Follow-up', t('markedFollow')) };
  const tn = turnOf(th);
  row.append(
    h(`span.lead${tn === 'mine' ? '' : tn === 'ai' ? '.warn' : '.calm'}`, { title: th.status }, th.icon || icon('chat')),
    h('div.main',
      h('a.ttl', { href: th.url, target: '_blank', rel: 'noopener' }, th.title),
      th.description ? h('div.prev', th.description) : null,
      h('div.meta',
        turnPill(th),
        pill(th.status, oc('threadStatus', th.status), { onclick: statusSheet, 'aria-label': `${t('status')}: ${th.status}` }),
        showProject ? projChip(th.project) : null,
        (th.types || []).filter((x) => !(x === 'Slack' && th.slackLink) && !(x === 'Email' && th.emailLink)).map((x) => h('span', x)),
        th.manualAt ? h('span', t('manual')) : null,
        th.hasDraft ? h('span', t('draft')) : null,
        th.jiraKey ? h('span', th.jiraKey) : null,
        th.slackLink ? h('a', { href: th.slackLink, target: '_blank', rel: 'noopener' }, t('slack')) : null,
        th.emailLink ? h('a', { href: th.emailLink, target: '_blank', rel: 'noopener' }, t('email')) : null)),
    h('div.act', canReply ? h('button.btn.sm', { type: 'button', onclick: replied }, icon('check'), t('replied')) : null));
  return withGestures(row, { right: canReply ? replied : null, left: row._ct.left, rightLabel: t('replied'), leftLabel: 'Need Follow-up' });
}

function riskRow(r, { showProject = true } = {}) {
  const rebuild = () => riskRow(r, { showProject });
  const row = h('div.row', { 'data-row': '', 'data-id': r.id, tabindex: '-1' });
  const set = (body) => mutate(row, rebuild, () => patchRecord('risks', r, body), { okMsg: t('saved') });
  const statusSheet = () => optionSheet(r.title, [
    { label: t('status'), current: r.status, onPick: (v) => set({ status: v }), options: state.cfg.options.riskStatuses.map((s) => ({ value: s, label: s, cls: oc('riskStatus', s) })) },
    { label: t('severity'), current: r.severity, onPick: (v) => set({ severity: v }), options: state.cfg.options.severities.map((s) => ({ value: s, label: s, cls: oc('severity', s) })) },
  ]);
  row._ct = { open: () => window.open(r.url, '_blank', 'noopener'), status: statusSheet };
  const lvl = r.severity === 'Critical' ? '.bad' : r.severity === 'High' ? '.warn' : '.calm';
  row.append(
    h(`span.lead${lvl}`, icon('shield')),
    h('div.main',
      h('a.ttl', { href: r.url, target: '_blank', rel: 'noopener' }, r.title),
      r.summary ? h('div.prev', r.summary) : null,
      h('div.meta', sevLabel(r.severity),
        pill(r.status, oc('riskStatus', r.status), { onclick: statusSheet, 'aria-label': `${t('status')}: ${r.status}` }),
        showProject ? projChip(r.project) : null,
        r.kind && r.kind !== 'Risk' ? h('span', r.kind) : null,
        r.owner ? h('span', r.owner) : null,
        r.lastUpdated ? h('span', `${t('updated')} ${rel(r.lastUpdated)}`) : null)),
    h('div.act'));
  return withGestures(row, {});
}

function decisionRow(d, { showProject = true } = {}) {
  const rebuild = () => decisionRow(d, { showProject });
  const row = h('div.row', { 'data-row': '', 'data-id': d.id, tabindex: '-1' });
  const statusSheet = () => optionSheet(d.title, [{
    label: t('status'), current: d.status,
    onPick: (v) => mutate(row, rebuild, () => patchRecord('decisions', d, { status: v }), { okMsg: t('saved') }),
    options: state.cfg.options.decisionStatuses.map((s) => ({ value: s, label: s, cls: oc('decisionStatus', s) })),
  }]);
  row._ct = { open: () => window.open(d.url, '_blank', 'noopener'), status: statusSheet };
  row.append(
    h('span.lead.calm', icon('scale')),
    h('div.main',
      h('a.ttl', { href: d.url, target: '_blank', rel: 'noopener' }, d.title),
      d.context ? h('div.prev', d.context) : null,
      h('div.meta',
        showProject ? projChip(d.project) : null,
        d.date ? h('span', fmtDate(d.date)) : null,
        d.area ? pill(d.area, oc('area', d.area)) : null,
        d.door ? h('span', d.door) : null,
        d.statedBy ? h('span', d.statedBy) : null,
        pill(d.status, oc('decisionStatus', d.status), { onclick: statusSheet }))),
    h('div.act'));
  return withGestures(row, {});
}

function meetingRow(m, { showProject = true } = {}) {
  const row = h('div.row', { 'data-row': '', 'data-id': m.id, tabindex: '-1' });
  row._ct = { open: () => window.open(m.url, '_blank', 'noopener') };
  row.append(h('span.lead.calm', icon('cal')),
    h('div.main',
      h('a.ttl', { href: m.url, target: '_blank', rel: 'noopener' }, m.title),
      m.summary ? h('div.prev', m.summary) : null,
      h('div.meta', showProject ? projChip(m.project) : null, m.date ? h('span', `${fmtDate(m.date, true)} · ${rel(m.date)}`) : null, (m.types || []).map((x) => h('span', x)))),
    h('div.act'));
  return row;
}

function reportRow(r, { showProject = true } = {}) {
  const row = h('div.row', { 'data-row': '', 'data-id': r.id, tabindex: '-1' });
  row._ct = { open: () => window.open(r.url, '_blank', 'noopener') };
  row.append(h('span.lead.calm', icon('doc')),
    h('div.main',
      h('a.ttl', { href: r.url, target: '_blank', rel: 'noopener' }, r.title),
      r.summary ? h('div.prev', r.summary) : null,
      h('div.meta', showProject ? projChip(r.project) : null, r.date ? h('span', rel(r.date)) : null, r.type ? h('span', r.type) : null,
        r.skill ? h('span', r.skill) : null, r.visibility === 'External' ? pill('External', 'o-orange') : null)),
    h('div.act'));
  return row;
}

function itemRow(it, opts) {
  return it.kind === 'task' ? taskRow(it.x, opts) : it.kind === 'thread' ? threadRow(it.x, opts) : riskRow(it.x, opts);
}

// ---------- automation rows ----------
const RESULT_CLS = { Done: 'o-green', Failed: 'o-red', Running: 'o-blue', Abandoned: 'o-orange' };
const isBad = (r) => r === 'Failed' || r === 'Abandoned';
function autoTaskRow(a) {
  const row = h('div.row', { 'data-row': '', tabindex: '-1' });
  row._ct = { open: () => a.url && a.url !== '#' && window.open(a.url, '_blank', 'noopener') };
  row.append(
    h(`span.lead${isBad(a.lastResult) ? '.bad' : a.state === 'Manual' ? '.calm' : ''}`, icon(a.state === 'Manual' ? 'play' : 'clock')),
    h('div.main',
      h(a.url && a.url !== '#' ? 'a.ttl' : 'span.ttl', a.url && a.url !== '#' ? { href: a.url, target: '_blank', rel: 'noopener' } : {}, a.name),
      a.summary ? h('div.desc', a.summary) : null,
      h('div.meta',
        a.schedule ? h('span', a.schedule === 'Manual' ? t('manualRun') : a.schedule) : null,
        a.project ? projChip(a.project) : h('span', t('general')),
        a.lastRun ? h('span', t('lastRun', { t: rel(a.lastRun) })) : h('span', t('neverRan')),
        a.lastResult ? pill(a.lastResult, RESULT_CLS[a.lastResult] || 'o-default') : null,
        a.nextRun && Date.parse(a.nextRun) > Date.now() ? h('span', t('nextRun', { t: `${fmtDate(a.nextRun, true)}` })) : null,
        a.state && !['Active', 'Manual'].includes(a.state) ? pill(a.state, 'o-yellow') : null)),
    h('div.act'));
  return row;
}
function skillRow(s) {
  const row = h('div.row', { 'data-row': '', tabindex: '-1' });
  row._ct = { open: () => s.url && s.url !== '#' && window.open(s.url, '_blank', 'noopener') };
  row.append(h(`span.lead${s.state === 'Retired' ? '.calm' : ''}`, icon('skill')),
    h('div.main',
      h(s.url && s.url !== '#' ? 'a.ttl' : 'span.ttl', s.url && s.url !== '#' ? { href: s.url, target: '_blank', rel: 'noopener' } : {}, s.name),
      s.summary ? h('div.desc', s.summary) : null,
      h('div.meta', s.project ? projChip(s.project) : h('span', t('general')),
        s.lastRun ? h('span', t('lastRun', { t: rel(s.lastRun) })) : null,
        s.state === 'Retired' ? pill(t('retired'), 'o-gray') : null)),
    h('div.act'));
  return row;
}
function runRow(r) {
  const row = h('div.row', { 'data-row': '', tabindex: '-1' });
  row._ct = { open: () => r.url && r.url !== '#' && window.open(r.url, '_blank', 'noopener') };
  const lvl = isBad(r.result) ? '.bad' : r.result === 'Running' ? '' : '.ok';
  row.append(h(`span.lead${lvl}`, r.result === 'Running' ? h('i.spinner') : icon(isBad(r.result) ? 'alert' : 'check')),
    h('div.main',
      h(r.url && r.url !== '#' ? 'a.ttl' : 'span.ttl', r.url && r.url !== '#' ? { href: r.url, target: '_blank', rel: 'noopener' } : {}, r.name),
      r.summary ? h('div.desc', r.summary) : null,
      h('div.meta',
        pill(r.result, RESULT_CLS[r.result] || 'o-default'),
        r.started ? h('span', `${fmtDate(r.started, true)} · ${rel(r.started)}`) : null,
        h('span', r.trigger === 'Manual' ? t('manualRun') : t('schedule')),
        r.finished ? h('span', t('took', { d: duration(r.started, r.finished) })) : null,
        r.project ? projChip(r.project) : null,
        r.link ? h('a', { href: r.link, target: '_blank', rel: 'noopener' }, t('openInNotion')) : null)),
    h('div.act'));
  return row;
}

// ---------- forms: quick task, add sheet ----------
function projectPicker(initial, onChange) {
  let value = initial && isVisible(initial) ? initial : (initial && projectOf(initial) ? initial : null);
  const projs = visibleProjects();
  if (value && !projs.some((p) => p.slug === value)) projs.push(projectOf(value));
  const wrap = h('div.chips', { role: 'radiogroup', 'aria-label': t('project') });
  const paint = () => wrap.replaceChildren(...projs.map((p) => h('button.fchip', {
    type: 'button', role: 'radio', 'aria-pressed': String(p.slug === value), 'aria-checked': String(p.slug === value),
    onclick: () => { value = p.slug; paint(); onChange?.(value); },
  }, h('i.sw', { style: { '--pc': p.color || '' } }), p.name)));
  paint();
  return { node: wrap, get: () => value };
}
function duePicker() {
  let value = '';
  const td = todayStr();
  const date = h('input.input', { type: 'date', 'aria-label': t('pickDate') });
  const opts = [['', t('noDue')], [td, t('todayW')], [addDays(td, 1), t('tomorrow')], [addDays(td, 7), t('nextWeek')]];
  const wrap = h('div.chips');
  const paint = () => wrap.replaceChildren(...opts.map(([v, l]) => h('button.fchip', {
    type: 'button', 'aria-pressed': String(v === value && date.value === v), onclick: () => { value = v; date.value = v; paint(); },
  }, l)), date);
  date.addEventListener('change', () => { value = date.value; paint(); });
  paint();
  return { node: wrap, get: () => value || null };
}
function taskForm({ slug, compact = false, onDone } = {}) {
  const title = h('input.input', { type: 'text', maxlength: 300, placeholder: t('whatToDo'), 'aria-label': t('title'), autocomplete: 'off' });
  const desc = h('textarea.input', { maxlength: 2000, placeholder: t('description'), 'aria-label': t('description') });
  const descWrap = h('div', { hidden: compact ? true : null }, desc);
  const showDesc = compact ? h('button.btn.ghost.sm', { type: 'button', onclick: () => { descWrap.hidden = false; showDesc.remove(); desc.focus(); } }, '+ ', t('addDescription')) : null;
  const proj = projectPicker(slug);
  const due = duePicker();
  const hint = h('div.hint');
  const btn = h('button.btn.primary', { type: 'submit' }, icon('plus'), t('create'));
  const extra = h('div.qa', showDesc, descWrap,
    h('div.field', h('span.lbl', t('project')), proj.node),
    h('div.field', h('span.lbl', t('due')), due.node),
    h('div.rowx', hint, h('span.spacer'), btn));
  const form = h('form.qa', { onsubmit: async (e) => {
    e.preventDefault();
    hint.className = 'hint'; hint.textContent = '';
    if (!title.value.trim()) { title.focus(); return; }
    if (!proj.get()) { hint.className = 'hint err'; hint.textContent = t('projectRequired'); return; }
    btn.disabled = true;
    try {
      await api('/api/tasks', { method: 'POST', body: { title: title.value.trim(), description: desc.value.trim() || undefined, project: proj.get(), due: due.get() || undefined } });
      toast(t('created'));
      title.value = ''; desc.value = '';
      if (compact) extra.hidden = true;
      invalidate();
      onDone?.();
      render();
    } catch (err) { hint.className = 'hint err'; hint.textContent = err.message; }
    finally { btn.disabled = false; }
  } },
  title, extra);
  // Compact (Home): only the title line until it gets focus or text.
  if (compact) {
    extra.hidden = true;
    title.addEventListener('focus', () => { extra.hidden = false; });
  }
  return form;
}
function decisionForm({ slug, onDone } = {}) {
  const o = state.cfg.options;
  const title = h('textarea.input', { maxlength: 500, placeholder: t('decision'), 'aria-label': t('decision') });
  const proj = projectPicker(slug);
  const area = h('select.input', { 'aria-label': t('area') }, h('option', { value: '' }, `${t('area')}: -`), o.decisionAreas.map((x) => h('option', { value: x }, x)));
  const door = h('select.input', { 'aria-label': t('door') }, h('option', { value: '' }, `${t('door')}: -`), o.doors.map((x) => h('option', { value: x }, x)));
  const ctx = h('textarea.input', { placeholder: t('context'), 'aria-label': t('context') });
  const by = h('input.input', { type: 'text', maxlength: 200, placeholder: t('statedBy'), 'aria-label': t('statedBy') });
  const hint = h('div.hint');
  const btn = h('button.btn.primary', { type: 'submit' }, icon('plus'), t('create'));
  return h('form.qa', { onsubmit: async (e) => {
    e.preventDefault();
    hint.className = 'hint'; hint.textContent = '';
    if (!title.value.trim()) { title.focus(); return; }
    if (!proj.get()) { hint.className = 'hint err'; hint.textContent = t('projectRequired'); return; }
    btn.disabled = true;
    try {
      await api('/api/decisions', { method: 'POST', body: { title: title.value.trim(), project: proj.get(), area: area.value || undefined, door: door.value || undefined, context: ctx.value.trim() || undefined, statedBy: by.value.trim() || undefined } });
      toast(t('created')); invalidate(); onDone?.(); render();
    } catch (err) { hint.className = 'hint err'; hint.textContent = err.message; }
    finally { btn.disabled = false; }
  } },
  title, h('div.field', h('span.lbl', t('project')), proj.node), h('div.rowx', area, door), ctx, by, h('div.rowx', hint, h('span.spacer'), btn));
}
function openAdd(kind = 'task') {
  const r = route();
  const slug = r.view === 'project' ? r.slug : null;
  const body = h('div');
  const seg = h('div.chips');
  const paint = (k) => {
    seg.replaceChildren(...[['task', t('newTask')], ['decision', t('newDecision')]].map(([v, l]) => h('button.fchip', { type: 'button', 'aria-pressed': String(v === k), onclick: () => paint(v) }, l)));
    body.replaceChildren(seg, k === 'task' ? taskForm({ slug, onDone: closeSheet }) : decisionForm({ slug, onDone: closeSheet }));
    setTimeout(() => body.querySelector('input, textarea')?.focus(), 20);
  };
  openSheet(t('add'), body);
  paint(kind);
}

// ---------- views: Home ----------
function tile(cls, n, label, sub, href) {
  return h(`a.tile.${n ? cls : 'calm'}`, { href }, h('b', String(n)), h('span', label), h('small', sub));
}
async function viewHome() {
  const ov = await loadOverview();
  const slugs = visibleProjects().map((p) => p.slug);
  const facts = slugs.map((s) => projectFacts(s));
  const sum = (k) => facts.reduce((a, f) => a + f[k].length, 0);
  const items = startItems(slugs);
  const dateLine = new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz() }).format(new Date());
  const projectsSorted = visibleProjects().map((p) => ({ p, hl: health(p.slug) }))
    .sort((a, b) => HEALTH_RANK[a.hl.level] - HEALTH_RANK[b.hl.level] || a.p.name.localeCompare(b.p.name));
  const main = h('div.stack',
    h('div.tiles',
      tile('bad', sum('overdue'), t('overdue'), t('tileOverdueSub'), '#/list/overdue'),
      tile('mine', sum('mine'), t('yourTurn'), t('tileTurnSub'), '#/list/mine'),
      tile('bad', sum('crit'), t('criticalRisk'), t('tileCritSub'), '#/list/critical'),
      tile('warn', sum('today'), t('dueToday'), t('tileTodaySub'), '#/list/today')),
    h('div.phone-only', { style: { 'margin-top': '14px' } }, h('div.panel', taskForm({ compact: true }))),
    sechead(t('startHere'), items.length, items.length > 5 ? h('span.t-meta', t('startHereHint')) : null),
    items.length ? list(items.map((it) => itemRow(it)), { scroll: items.length > 5 })
      : h('div.list', h('div.empty', h('b', t('allClear')), t('allClearSub'))),
    sechead(t('projects'), projectsSorted.length),
    list(projectsSorted.map(({ p, hl }) => prow(p, hl))));
  const auto = state.cfg.automation ? await autoSideCard() : null;
  return [
    h('div.pagehead', h('div', h('h1.t-display', dateLine), h('div.sub', `${slugs.length} ${t('projects').toLowerCase()}`))),
    offlineBanner(), errorsBanner(ov.errors),
    h('div.cols.two',
      h('div.stack', main),
      h('div.stack.laptop-only', h('div', { 'data-qa-laptop': '' }), auto)),
  ];
}
function prow(p, hl) {
  const f = hl.facts;
  return h('a.prow', { href: `#/p/${p.slug}`, style: { '--pc': p.color || '' } },
    h('i.sw'),
    h('div',
      h('div.l1', h('span.nm', p.name), healthPill(hl.level)),
      h('div.rs', hl.why),
      h('div.minis',
        h('span', h('b', String(f.tasks.length)), t('open')),
        h(f.overdue.length ? 'span.hot' : 'span', h('b', String(f.overdue.length)), t('overdue').toLowerCase()),
        h('span', h('b', String(f.mine.length)), t('yourTurn').toLowerCase()),
        h(f.crit.length ? 'span.hot' : 'span', h('b', String(f.risks.length)), t('risksShort')))),
    h('span.chev', icon('chev')));
}
async function autoSideCard() {
  try {
    const a = await loadAutomation();
    if (!a.configured) return null;
    const bad = a.items.filter((x) => x.kind === 'task' && isBad(x.lastResult) && (!x.project || isVisible(x.project)));
    const running = a.runs.filter((r) => r.result === 'Running');
    if (!bad.length && !running.length) return null;
    return h('section', sechead(t('needsALook'), bad.length + running.length, h('a.btn.ghost.sm', { href: '#/auto' }, t('seeAll'))),
      list([...running.map(runRow), ...bad.map(autoTaskRow)]));
  } catch { return null; }
}

// Cross-project list behind each Home tile.
async function viewList(kind) {
  await loadOverview();
  const slugs = visibleProjects().map((p) => p.slug);
  const facts = slugs.map((s) => projectFacts(s));
  const pick = { overdue: ['listOverdue', 'overdue', 'task'], mine: ['listMine', 'mine', 'thread'], critical: ['listCritical', 'crit', 'risk'], today: ['listToday', 'today', 'task'] }[kind] || ['listOverdue', 'overdue', 'task'];
  const rows = facts.flatMap((f) => f[pick[1]]).map((x) => itemRow({ kind: pick[2], x }));
  return [h('div.pagehead', h('a.iconbtn', { href: '#/', 'aria-label': t('home') }, h('span', { style: { display: 'inline-flex', transform: 'scaleX(-1)' } }, icon('chev'))), h('h1.t-display', t(pick[0])), h('span.count.t-meta', String(rows.length))),
    offlineBanner(), list(rows)];
}

async function viewProjects() {
  await loadOverview();
  const rows = allProjects().map((p) => ({ p, hl: health(p.slug) }))
    .sort((a, b) => (isVisible(a.p.slug) ? 0 : 1) - (isVisible(b.p.slug) ? 0 : 1) || HEALTH_RANK[a.hl.level] - HEALTH_RANK[b.hl.level]);
  return [h('div.pagehead', h('h1.t-display', t('projects'))), offlineBanner(), list(rows.map(({ p, hl }) => prow(p, hl)))];
}

// ---------- views: Project ----------
const TABS = ['overview', 'tasks', 'threads', 'risks', 'decisions', 'meetings', 'reports', 'automation', 'state'];
async function viewProject(slug, tab, sub) {
  const p = projectOf(slug);
  if (!p) return [h('div.banner.error', icon('alert'), `Unknown project: ${slug}`)];
  tab = TABS.includes(tab) ? tab : 'overview';
  await loadOverview();
  const hl = health(slug);
  const f = hl.facts;
  const counts = { tasks: f.tasks.length, threads: f.mine.length, risks: f.risks.length };
  const tabs = TABS.filter((x) => (x !== 'state' || p.hasCurrentState) && (x !== 'automation' || state.cfg.automation));
  const head = [
    h('div.pagehead', h('i', { style: { width: '14px', height: '14px', 'border-radius': '4px', background: p.color || 'var(--text-3)', display: 'inline-block' } }),
      h('h1.t-display', p.name), healthPill(hl.level), h('div.sub', hl.why)),
    h('nav.tabs', tabs.map((x) => h('a', { href: `#/p/${slug}/${x}`, 'aria-current': x === tab ? 'page' : null }, t(x), counts[x] ? h('b', String(counts[x])) : null))),
    offlineBanner(),
  ];
  const body = await TAB_VIEWS[tab](slug, p, sub);
  return [...head, ...[body].flat()];
}
function mixBar(tasks) {
  const by = {};
  tasks.forEach((x) => { by[x.status || '(none)'] = (by[x.status || '(none)'] || 0) + 1; });
  const order = state.cfg.options.taskStatuses;
  const entries = Object.entries(by).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  const total = tasks.length;
  if (!total) return null;
  return h('div.panel', { style: { 'margin-top': '14px' } },
    h('div.t-label', { style: { 'margin-bottom': '8px' } }, t('mix')),
    h('div.mix', { role: 'img', 'aria-label': entries.map(([k, v]) => `${k}: ${v}`).join(', ') },
      entries.map(([k, v]) => h(`i.${oc('taskStatus', k)}`, { style: { width: `${(v / total) * 100}%` }, title: `${k}: ${v}` }))),
    h('div.mixlegend', entries.map(([k, v]) => h(`span.${oc('taskStatus', k)}`, `${k} ${v}`))));
}
function fchips(key, opts, current) {
  return h('div.chips.scroll', opts.map(([v, label, n]) => h('button.fchip', {
    type: 'button', 'aria-pressed': String(v === current), onclick: () => { state.filters[key] = v; render(); },
  }, label, n !== undefined ? h('b', String(n)) : null)));
}
const TAB_VIEWS = {
  async overview(slug) {
    const ov = state.ov;
    const f = projectFacts(slug);
    const mine = (arr) => (arr || []).filter((x) => x.project === slug);
    const items = startItems([slug]);
    const crit = f.crit.length;
    return [
      errorsBanner(ov.errors),
      h('div.tiles', { style: { 'margin-top': '14px' } },
        tile('bad', f.overdue.length, t('overdue'), t('tileOverdueSub'), `#/p/${slug}/tasks/overdue`),
        tile('mine', f.mine.length, t('yourTurn'), t('tileTurnSub'), `#/p/${slug}/threads/mine`),
        h(`a.tile.${crit ? 'bad' : f.risks.length ? 'warn' : 'calm'}`, { href: `#/p/${slug}/risks` }, h('b', String(f.risks.length)), h('span', t('openRisks')), h('small', crit ? t('rCrit', { n: crit }) : '')),
        tile('warn', f.today.length, t('dueToday'), t('tileTodaySub'), `#/p/${slug}/tasks/today`)),
      mixBar(f.tasks),
      h('div.cols.two',
        h('div.stack',
          sechead(t('needsYouHere'), items.length),
          items.length ? list(items.map((it) => itemRow(it, { showProject: false })), { scroll: items.length > 5 }) : h('div.list', h('div.empty', h('b', t('allClear')), t('allClearSub'))),
          sechead(t('openRisks'), f.risks.length, h('a.btn.ghost.sm', { href: `#/p/${slug}/risks` }, t('seeAll'))),
          list(f.risks.slice(0, 5).map((x) => riskRow(x, { showProject: false })))),
        h('div.stack',
          sechead(t('recentDecisions'), null, h('a.btn.ghost.sm', { href: `#/p/${slug}/decisions` }, t('seeAll'))),
          list(mine(ov.decisions).slice(0, 5).map((x) => decisionRow(x, { showProject: false }))),
          sechead(t('latestMeetings'), null, h('a.btn.ghost.sm', { href: `#/p/${slug}/meetings` }, t('seeAll'))),
          list(mine(ov.meetings).slice(0, 3).map((x) => meetingRow(x, { showProject: false }))),
          sechead(t('latestReports'), null, h('a.btn.ghost.sm', { href: `#/p/${slug}/reports` }, t('seeAll'))),
          list(mine(ov.reports).slice(0, 3).map((x) => reportRow(x, { showProject: false }))))),
    ];
  },

  async tasks(slug, p, sub) {
    const ov = state.ov;
    const all = (ov.tasks || []).filter((x) => x.project === slug);
    const open = activeTasks(all);
    const week = addDays(todayStr(), 7);
    const sets = {
      open, overdue: open.filter(isOverdue), today: open.filter(isDueToday),
      week: open.filter((x) => x.due && dayOf(x.due) <= week), high: open.filter((x) => x.priority === 'High'),
      hold: all.filter((x) => x.status === HOLD), done: (ov.done || []).filter((x) => x.project === slug),
    };
    const f = state.filters.tasks || sub || 'open';
    const rows = sets[f] || sets.open;
    return [
      h('div.toolbar', h('div', { style: { flex: '1', 'min-width': '0' } },
        fchips('tasks', [['open', t('allOpen'), sets.open.length], ['overdue', t('overdue'), sets.overdue.length], ['today', t('dueToday'), sets.today.length],
          ['week', t('thisWeek'), sets.week.length], ['high', t('high'), sets.high.length], ['hold', t('onHold'), sets.hold.length], ['done', t('done7'), sets.done.length]], f)),
      h('button.btn.primary.laptop-only', { type: 'button', onclick: () => openAdd('task') }, icon('plus'), t('newTask'))),
      list(rows.map((x) => taskRow(x, { showProject: false })), { emptyText: f === 'open' ? t('empty') : t('emptyFilter') }),
    ];
  },

  async threads(slug, p, sub) {
    const f = state.filters.threads || sub || 'mine';
    const d = await loadSection(slug, 'threads', f === 'closed');
    const src = f === 'closed' ? d.closed : d.open;
    const by = {
      mine: (x) => turnOf(x) === 'mine', theirs: (x) => turnOf(x) === 'theirs', ai: (x) => turnOf(x) === 'ai',
      replied: (x) => x.status === 'Replied', spectator: (x) => x.status === 'Spectator Mode', open: () => true, closed: () => true,
    };
    const n = (k) => d.open.filter(by[k]).length;
    const rows = src.filter(by[f] || by.mine).sort((a, b) => threadAge(b) - threadAge(a));
    return [
      state.cfg.threadManualStatus ? null : h('div.banner.warn', icon('alert'), t('manualWarn')),
      h('div.toolbar', h('div', { style: { flex: '1', 'min-width': '0' } }, fchips('threads', [
        ['mine', t('yourTurn'), n('mine')], ['theirs', t('theirTurn'), n('theirs')], ['ai', t('aiReview'), n('ai')],
        ['replied', 'Replied', n('replied')], ['spectator', 'Spectator', n('spectator')], ['open', t('allOpen'), d.open.length], ['closed', t('closedWeek')]], f))),
      list(rows.map((x) => threadRow(x, { showProject: false })), { emptyText: t('emptyFilter') }),
    ];
  },

  async risks(slug) {
    const all = state.filters.risksAll === true;
    const d = await loadSection(slug, 'risks', all);
    return [
      h('div.toolbar', fchips('risksAll', [[false, t('active')], [true, t('all')]], all)),
      list(d.items.map((x) => riskRow(x, { showProject: false }))),
    ];
  },

  async decisions(slug) {
    const all = state.filters.decisionsAll === true;
    const f = state.filters.decisions || 'active';
    const d = await loadSection(slug, 'decisions', all);
    const rows = f === 'active' ? d.items.filter((x) => x.status === 'Active') : d.items;
    return [
      h('div.toolbar', fchips('decisions', [['active', t('active')], ['all', t('all')]], f),
        all ? null : h('button.btn.sm', { type: 'button', onclick: () => { state.filters.decisionsAll = true; render(); } }, t('showOlder')),
        h('span.spacer'), h('button.btn.primary.laptop-only', { type: 'button', onclick: () => openAdd('decision') }, icon('plus'), t('newDecision'))),
      list(rows.map((x) => decisionRow(x, { showProject: false }))),
    ];
  },

  async meetings(slug) {
    const all = state.filters.meetingsAll === true;
    const d = await loadSection(slug, 'meetings', all);
    return [
      h('div.toolbar', all ? null : h('button.btn.sm', { type: 'button', onclick: () => { state.filters.meetingsAll = true; render(); } }, t('showOlder'))),
      list(d.items.map((x) => meetingRow(x, { showProject: false }))),
    ];
  },

  async reports(slug) {
    const all = state.filters.reportsAll === true;
    const d = await loadSection(slug, 'reports', all);
    return [
      h('div.toolbar', all ? null : h('button.btn.sm', { type: 'button', onclick: () => { state.filters.reportsAll = true; render(); } }, t('showOlder'))),
      list(d.items.map((x) => reportRow(x, { showProject: false }))),
    ];
  },

  async automation(slug) {
    return automationBody(await loadAutomation(), slug);
  },

  async state(slug) {
    const d = await loadSection(slug, 'state');
    if (d.missing) return [h('div.list', { style: { 'margin-top': '14px' } }, h('div.empty', t('noState')))];
    return [
      h('div.toolbar', h('span.t-meta', t('lastEdited', { t: fmtDate(d.edited, true) })), h('span.spacer'),
        h('a.btn.sm', { href: d.url, target: '_blank', rel: 'noopener' }, t('openInNotion'))),
      h('div.panel.doc', renderBlocks(d.blocks)),
    ];
  },
};

// ---------- views: Automation (read-only) ----------
function automationBody(a, slug) {
  if (!a.configured) return [h('div.banner', icon('bolt'), t('autoNotConfigured'))];
  const inScope = (x) => (slug ? x.project === slug : (!x.project || isVisible(x.project)));
  const tasks = a.items.filter((x) => x.kind === 'task' && inScope(x));
  const skills = a.items.filter((x) => x.kind === 'skill' && inScope(x) && x.state !== 'Retired');
  const runs = a.runs.filter((r) => (slug ? r.project === slug : (!r.project || isVisible(r.project))));
  const bad = tasks.filter((x) => isBad(x.lastResult));
  const running = runs.filter((r) => r.result === 'Running');
  const td = todayStr();
  const ranToday = runs.filter((r) => r.started && dayOf(r.started) === td);
  const upcoming = tasks.filter((x) => x.nextRun && Date.parse(x.nextRun) > Date.now() && Date.parse(x.nextRun) < Date.now() + 7 * 86400000)
    .sort((x, y) => x.nextRun.localeCompare(y.nextRun));
  const scheduled = tasks.filter((x) => x.state === 'Active');
  const out = [
    h('div.banner', icon('bolt'), t('autoReadOnly')),
    h('div.tiles',
      h(`div.tile.${bad.length ? 'bad' : 'calm'}`, h('b', String(bad.length)), h('span', t('needsALook')), h('small', t('failedTasks'))),
      h(`div.tile.${ranToday.length ? 'mine' : 'calm'}`, h('b', String(ranToday.length)), h('span', t('ranToday')), h('small', t('runsSince'))),
      h('div.tile.calm', h('b', String(scheduled.length)), h('span', t('scheduled')), h('small', t('activeTasks'))),
      h('div.tile.calm', h('b', String(skills.length)), h('span', t('skills')), h('small', t('skillsSub')))),
  ];
  if (bad.length) out.push(sechead(t('needsALook'), bad.length), list(bad.map(autoTaskRow)));
  if (running.length) out.push(sechead(t('runningNow'), running.length), list(running.map(runRow)));
  const left = h('div.stack',
    sechead(t('comingUp'), upcoming.length), list(upcoming.slice(0, 12).map(autoTaskRow)),
    sechead(t('recentRuns'), runs.length), list(runs.slice(0, 25).map(runRow), { scroll: runs.length > 6 }));
  let right;
  if (slug) {
    const general = a.items.filter((x) => x.kind === 'task' && !x.project).length;
    right = h('div.stack',
      sechead(t('projectTasks'), tasks.length), list(tasks.map(autoTaskRow)),
      general ? h('a.more', { href: '#/auto' }, t('generalAlso', { n: general })) : null,
      sechead(t('projectSkills'), skills.length), list(skills.map(skillRow)));
  } else {
    const byProj = visibleProjects().map((p) => {
      const pt = a.items.filter((x) => x.project === p.slug);
      const pb = pt.filter((x) => isBad(x.lastResult)).length;
      return h('a.prow', { href: `#/p/${p.slug}/automation`, style: { '--pc': p.color || '' } }, h('i.sw'),
        h('div', h('div.l1', h('span.nm', p.name), pb ? h('span.health.red', icon('alert'), String(pb)) : null),
          h('div.minis', h('span', h('b', String(pt.filter((x) => x.kind === 'task').length)), t('scheduled').toLowerCase()),
            h('span', h('b', String(pt.filter((x) => x.kind === 'skill' && x.state !== 'Retired').length)), t('skills').toLowerCase()))),
        h('span.chev', icon('chev')));
    });
    right = h('div.stack',
      sechead(t('byProject')), list(byProj),
      sechead(t('generalTasks'), tasks.filter((x) => !x.project).length), list(tasks.filter((x) => !x.project).map(autoTaskRow)),
      sechead(t('generalSkills'), skills.filter((x) => !x.project).length), list(skills.filter((x) => !x.project).map(skillRow), { scroll: true }));
  }
  out.push(h('div.cols.two', left, right));
  return out;
}
async function viewAutomation() {
  const a = await loadAutomation();
  return [h('div.pagehead', h('h1.t-display', t('automation'))), offlineBanner(), ...automationBody(a, null)];
}

// ---------- views: Settings ----------
function viewSettings() {
  const sw = (checked, onchange) => h('input.switch', { type: 'checkbox', checked: checked || null, onchange });
  const setrow = (label, hint, control) => h('label.setrow', h('div.l', label, hint ? h('small', hint) : null), control);
  const seg = (key, opts) => h('div.chips', opts.map(([v, l]) => h('button.fchip', { type: 'button', 'aria-pressed': String(settings[key] === v), onclick: () => { settings[key] = v; saveSettings(); applyPrefs(); render(); } }, l)));
  return [
    h('div.pagehead', h('h1.t-display', t('settings'))),
    sechead(t('visibleProjects')),
    h('p.t-meta', { style: { margin: '-4px 0 10px' } }, t('visibleHint')),
    list(allProjects().map((p) => setrow(h('span.proj', { style: { '--pc': p.color || '' } }, p.name), null,
      sw(!settings.hidden.includes(p.slug), (e) => {
        settings.hidden = e.target.checked ? settings.hidden.filter((x) => x !== p.slug) : [...new Set([...settings.hidden, p.slug])];
        saveSettings(); renderNav();
      })))),
    sechead(t('language')), seg('lang', [['en', 'English'], ['uk', 'Українська']]),
    sechead(t('theme')), seg('theme', [['system', t('themeSystem')], ['dark', t('themeDark')], ['light', t('themeLight')]]),
    sechead(t('threads')),
    list([
      setrow(t('swapTurn'), `${t('swapTurnHint')} (${(state.cfg.turn?.mine || []).join(', ')} = ${t('yourTurn')})`, sw(settings.swapTurn, (e) => { settings.swapTurn = e.target.checked; saveSettings(); })),
      setrow(t('swipeLeft'), t('swipeLeftHint'), sw(settings.swipeLeft, (e) => { settings.swipeLeft = e.target.checked; saveSettings(); })),
    ]),
    sechead(t('keys')),
    h('div.panel', helpGrid()),
  ];
}
function helpGrid() {
  const k = (keys, label) => [h('span', keys.map((x) => h('span.kbd', x)).reduce((a, b) => (a.length ? [...a, ' ', b] : [b]), [])), h('span', label)];
  return h('div.helpgrid', k(['J', 'K'], t('kMove')), k(['X'], t('kSelect')), k(['D'], t('kDone')), k(['R'], t('kReplied')), k(['S'], t('kStatus')),
    k(['O'], t('kOpen')), k(['N'], t('kNew')), k(['?'], t('kHelp')), k(['Esc'], t('kClose')));
}

// ---------- Current State blocks ----------
function renderRich(rich) {
  return (rich || []).map((r) => {
    let el = r.href ? h('a', { href: r.href, target: '_blank', rel: 'noopener' }, r.text) : document.createTextNode(r.text || '');
    if (r.c) el = h('code', el);
    if (r.b) el = h('strong', el);
    if (r.i) el = h('em', el);
    if (r.s) el = h('s', el);
    return el;
  });
}
function renderBlocks(blocks) {
  const out = [];
  let lst = null; let lt = null;
  for (const b of blocks || []) {
    if (['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(b.type)) {
      const tag = b.type === 'numbered_list_item' ? 'ol' : 'ul';
      if (!lst || lt !== tag) { lst = h(tag); lt = tag; out.push(lst); }
      const li = b.type === 'to_do' ? h('li.todo', h('input', { type: 'checkbox', disabled: true, checked: b.checked || null }), ' ', renderRich(b.rich)) : h('li', renderRich(b.rich));
      if (b.children) li.append(...renderBlocks(b.children));
      lst.append(li);
      continue;
    }
    lst = null; lt = null;
    const kids = b.children ? renderBlocks(b.children) : [];
    switch (b.type) {
      case 'heading_1': out.push(h('h1', renderRich(b.rich)), ...kids); break;
      case 'heading_2': out.push(h('h2', renderRich(b.rich)), ...kids); break;
      case 'heading_3': out.push(h('h3', renderRich(b.rich)), ...kids); break;
      case 'paragraph': out.push(h('p', renderRich(b.rich)), ...kids); break;
      case 'quote': out.push(h('blockquote', renderRich(b.rich), kids)); break;
      case 'callout': out.push(h('div.callout', b.icon ? h('span', b.icon) : null, h('div', renderRich(b.rich), kids))); break;
      case 'toggle': out.push(h('details', h('summary', renderRich(b.rich)), kids)); break;
      case 'code': out.push(h('pre', h('code', (b.rich || []).map((r) => r.text).join('')))); break;
      case 'divider': out.push(h('hr')); break;
      case 'group': out.push(...kids); break;
      case 'child_page': case 'child_database': out.push(h('p.unsupported', `▸ ${b.title}`)); break;
      default: out.push(h('p.unsupported', `[${b.label}]`));
    }
  }
  return out;
}

// ---------- navigation ----------
function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'p' && parts[1]) return { view: 'project', slug: parts[1], tab: parts[2] || 'overview', sub: parts[3] };
  if (parts[0] === 'list') return { view: 'list', kind: parts[1] };
  if (parts[0] === 'projects') return { view: 'projects' };
  if (parts[0] === 'auto') return { view: 'auto' };
  if (parts[0] === 'settings') return { view: 'settings' };
  return { view: 'home' };
}
function failedCount() {
  const a = state.auto;
  if (!a?.configured) return 0;
  return a.items.filter((x) => x.kind === 'task' && isBad(x.lastResult) && (!x.project || isVisible(x.project))).length;
}
function renderNav() {
  const r = route();
  const cur = (cond) => (cond ? 'page' : null);
  const fails = failedCount();
  $('#bnav').replaceChildren(
    h('a', { href: '#/', 'aria-current': cur(r.view === 'home' || r.view === 'list') }, icon('home'), t('home')),
    h('a', { href: '#/projects', 'aria-current': cur(r.view === 'projects' || r.view === 'project') }, icon('folder'), t('projects')),
    h('button', { type: 'button', 'aria-label': t('add'), onclick: () => openAdd('task') }, h('span.fab', icon('plus'))),
    state.cfg.automation ? h('a', { href: '#/auto', 'aria-current': cur(r.view === 'auto') }, icon('bolt'), t('auto'), fails ? h('span.badge', String(fails)) : null) : h('span'),
    h('a', { href: '#/settings', 'aria-current': cur(r.view === 'settings') }, icon('gear'), t('settings')));
  const projs = visibleProjects().map((p) => ({ p, hl: state.ov ? health(p.slug) : null }))
    .sort((a, b) => (a.hl && b.hl ? HEALTH_RANK[a.hl.level] - HEALTH_RANK[b.hl.level] : 0));
  $('#side').replaceChildren(...[
    h('a.brand', { href: '#/' }, h('span.mark', '🗼'), h('span.brandname', state.cfg.title)),
    h('a.navi', { href: '#/', 'aria-current': cur(r.view === 'home' || r.view === 'list') }, icon('home'), h('span.l', t('home'))),
    h('button.navi', { type: 'button', style: { border: '0', background: 'none', cursor: 'pointer', 'text-align': 'left', width: '100%' }, onclick: () => openAdd('task') }, icon('plus'), h('span.l', t('add')), h('span.n', h('span.kbd', 'N'))),
    h('div.group.t-label', t('projects')),
    projs.map(({ p, hl }) => h('a.navi', { href: `#/p/${p.slug}`, 'aria-current': cur(r.slug === p.slug) },
      h(`i.hdot${hl ? '.' + hl.level : ''}`, { title: hl ? t({ red: 'needsYou', amber: 'watch', green: 'onTrack' }[hl.level]) : '' }),
      h('span.l', p.name), hl && hl.facts.tasks.length ? h('span.n', String(hl.facts.tasks.length)) : null)),
    state.cfg.automation ? [h('div.group.t-label', t('automation')),
      h('a.navi', { href: '#/auto', 'aria-current': cur(r.view === 'auto') }, icon('bolt'), h('span.l', t('runsAndSkills')), fails ? h('span.n.bad', String(fails)) : null)] : null,
    h('span.spacer'),
    h('a.navi', { href: '#/settings', 'aria-current': cur(r.view === 'settings') }, icon('gear'), h('span.l', t('settings'))),
    h('button.navi', { type: 'button', style: { border: '0', background: 'none', cursor: 'pointer', width: '100%' }, onclick: openHelp }, icon('help'), h('span.l', t('keysHelp')), h('span.n', h('span.kbd', '?'))),
  ].flat(Infinity).filter(Boolean));
}
function openHelp() { openSheet(t('keysHelp'), helpGrid()); }

let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const r = route();
  renderNav();
  const app = $('#app');
  const page = h('div.page');
  if (!app.querySelector('.page') || app.dataset.view !== `${r.view}${r.slug || ''}${r.tab || ''}`) {
    app.replaceChildren(h('div.page', skeleton()));
  }
  try {
    let nodes;
    if (r.view === 'project') nodes = await viewProject(r.slug, r.tab, r.sub);
    else if (r.view === 'list') nodes = await viewList(r.kind);
    else if (r.view === 'projects') nodes = await viewProjects();
    else if (r.view === 'auto') nodes = await viewAutomation();
    else if (r.view === 'settings') nodes = viewSettings();
    else nodes = await viewHome();
    if (seq !== renderSeq) return;
    page.append(...nodes.flat(Infinity).filter(Boolean));
    // Laptop: the quick-add widget sits in the side column of Home.
    const slot = page.querySelector('[data-qa-laptop]');
    if (slot) slot.replaceWith(h('section', sechead(t('quickAdd')), h('div.panel', taskForm({ compact: true }))));
    app.replaceChildren(page);
    app.dataset.view = `${r.view}${r.slug || ''}${r.tab || ''}`;
    state.focusIdx = -1;
    renderNav();
    if (!state.ov) loadOverview().then(renderNav).catch(() => {});
  } catch (e) {
    if (seq !== renderSeq) return;
    app.replaceChildren(h('div.page', h('div.banner.error', { style: { 'margin-top': '14px' } }, icon('alert'),
      h('div', h('b', t('errorTitle')), ': ', e.message, ' ', h('button.btn.sm', { type: 'button', onclick: refresh }, t('retry'))))));
  }
}

async function refresh() {
  const btn = $('#btn-refresh');
  btn.classList.add('spin');
  try {
    invalidate();
    await loadOverview(true).catch(() => {});
    if (state.cfg.automation) await loadAutomation(true).catch(() => {});
    await render();
  } finally { btn.classList.remove('spin'); }
}

// ---------- keyboard (laptop) ----------
function rowsOnPage() { return [...document.querySelectorAll('#app [data-row]')]; }
function focusRow(i) {
  const rows = rowsOnPage();
  if (!rows.length) return;
  state.focusIdx = Math.max(0, Math.min(rows.length - 1, i));
  rows.forEach((r) => r.classList.remove('is-focus'));
  const el = rows[state.focusIdx];
  el.classList.add('is-focus');
  el.scrollIntoView({ block: 'nearest' });
}
function focused() { return rowsOnPage()[state.focusIdx] || null; }
function onKey(e) {
  if (e.key === 'Escape') { closeSheet(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  if ($('#sheet-root').childElementCount) return;
  const k = e.key.toLowerCase();
  const row = focused();
  const sel = [...document.querySelectorAll('#app [data-row].is-selected')];
  const targets = sel.length ? sel : row ? [row] : [];
  const run = (name) => targets.forEach((r) => r._ct?.[name]?.());
  if (k === 'j') focusRow(state.focusIdx + 1);
  else if (k === 'k') focusRow(state.focusIdx - 1);
  else if (k === 'x' && row) row.classList.toggle('is-selected');
  else if (k === 'd') run('done');
  else if (k === 'r') run('replied');
  else if (k === 's' && row) row._ct?.status?.();
  else if (k === 'o' && row) row._ct?.open?.();
  else if (k === 'n') openAdd('task');
  else if (e.key === '?') openHelp();
  else return;
  e.preventDefault();
}

// ---------- pull to refresh (phone, 64 px) ----------
function setupPull() {
  const ptr = $('#ptr');
  let y0 = null; let dy = 0;
  window.addEventListener('touchstart', (e) => { y0 = window.scrollY <= 0 && !$('#sheet-root').childElementCount ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, (e.touches[0].clientY - y0) / 2);
    ptr.style.height = `${Math.min(dy, 80)}px`;
    ptr.replaceChildren(icon('refresh'), dy >= 64 ? t('releaseRefresh') : t('pullRefresh'));
  }, { passive: true });
  window.addEventListener('touchend', () => {
    if (y0 === null) return;
    const go = dy >= 64;
    y0 = null; ptr.style.height = '0px';
    if (go) refresh();
  });
}

// ---------- prefs ----------
function applyPrefs() {
  const root = document.documentElement;
  if (settings.theme === 'dark' || settings.theme === 'light') root.dataset.theme = settings.theme;
  else delete root.dataset.theme;
  root.lang = settings.lang;
  $('#btn-refresh').setAttribute('aria-label', t('refresh'));
  $('#btn-settings').setAttribute('aria-label', t('settings'));
}

async function boot() {
  $('#btn-refresh').replaceChildren(icon('refresh'));
  $('#btn-settings').replaceChildren(icon('gear'));
  applyPrefs();
  try {
    state.cfg = await api('/api/config');
  } catch (e) {
    $('#app').replaceChildren(h('div.page', h('div.banner.error', { style: { 'margin-top': '14px' } }, icon('alert'), h('div', h('b', t('errorTitle')), ': ', e.message))));
    return;
  }
  settings.lang = settings.lang || (state.cfg.locale === 'uk' ? 'uk' : 'en');
  settings.hidden = settings.hidden.filter((s) => allProjects().some((p) => p.slug === s));
  $('#app-title').textContent = state.cfg.title;
  document.title = state.cfg.title;
  applyPrefs();
  $('#btn-refresh').addEventListener('click', refresh);
  window.addEventListener('hashchange', () => { state.filters = {}; closeSheet(); render(); window.scrollTo(0, 0); });
  document.addEventListener('keydown', onKey);
  setupPull();
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) refresh();
  });
  await render();
  if (state.cfg.automation && !state.auto) loadAutomation().then(renderNav).catch(() => {});
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA install is optional */ });
}
boot();

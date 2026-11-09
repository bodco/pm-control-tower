// English and Ukrainian strings. Ukrainian runs about 20 percent longer, so
// layouts never rely on a label's width. Plural keys hold one/few/many/other.

const EN = {
  // navigation and common
  navToday: 'Today', navInbox: 'Inbox', projects: 'Projects', navMore: 'More', navAutomation: 'Automation', navSettings: 'Settings',
  add: 'Add', save: 'Save', close: 'Close', retry: 'Retry', undo: 'Undo', loading: 'Loading', details: 'Details', actions: 'Actions',
  all: 'All', other: 'Other', filter: 'Filter', and: 'and', look: 'Look', review: 'Review', gotIt: 'Got it',
  cmdHint: 'jump, search, add', nItems: '{n} items', turnCount: 'Your turn: {n}', autoFailedDot: 'A scheduled task failed',
  pullRefresh: 'Pull to refresh', releaseRefresh: 'Release to refresh',
  // dates
  dToday: 'today', dTomorrow: 'tomorrow', dYesterday: 'yesterday', dAge: '{n}d', dLate: '{n}d late', dIn: 'in {n}d', dInMin: 'in {n} min', dInH: 'in {n}h',
  updatedAt: 'Updated {t}',
  // states
  offlineBanner: 'Offline, actions will sync', notionError: 'Notion error', conflict: 'Changed in Notion, action not applied',
  offlineNoCache: 'Offline, and nothing is saved on this device yet. Connect once to load your projects.',
  notSaved: 'Not saved', queuedOffline: 'Saved offline, will sync', pendingSync: 'Waiting to sync',
  emptyList: 'Nothing here.', emptyFilter: 'Nothing matches this filter.', nothingHere: 'Nothing needs you here.',
  noDataYet: 'No data yet', firstCollection: 'Run the first collection in Cowork, then pull to refresh.',
  // the page sentence
  nothingNeedsYou: 'Nothing needs you',
  needYou: { one: '{what} needs you', other: '{what} need you' },
  pReplies: { one: '{n} reply', other: '{n} replies' },
  pTasks: { one: '{n} task', other: '{n} tasks' },
  pRisks: { one: '{n} risk', other: '{n} risks' },
  // metrics
  filterQueue: 'Filter the queue',
  mNeeds: 'Needs you', mOverdue: 'Overdue', mTurn: 'Your turn', mCritical: 'Critical risk', mToday: 'Due today',
  fNeeds: 'Your-turn threads, overdue and due-today tasks, Critical risks and risks due within 7 days. Stale threads are not counted.',
  fOverdue: 'Open tasks (not On Hold) with a due date before today.',
  fTurn: 'Threads waiting on your reply, without stale ones (no activity for 30+ days).',
  fCritical: 'Active risks with severity Critical.',
  fToday: 'Open tasks (not On Hold) due today.',
  // home
  needsYou: 'Needs you', fullQueue: 'Full queue', nextCall: 'Next call', openMeeting: 'Open meeting',
  raiseThread: '{title}: waiting {d}', raiseRisk: '{title} ({sev})',
  emptyQueue: 'Nothing needs you.', emptyNext: 'Next: {what}, {when}',
  sortInbox: { one: 'Sort Inbox ({n})', other: 'Sort Inbox ({n})' },
  pMore: { one: '{n} more', other: '{n} more' },
  pNudge: { one: 'to nudge, their turn for 5+ days', other: 'to nudge, their turn for 5+ days' },
  pStale: { one: 'stale thread, no activity for 30+ days', other: 'stale threads, no activity for 30+ days' },
  pStaleLong: { one: '{n} stale thread with no activity for 30+ days. It is not counted anywhere.', other: '{n} stale threads with no activity for 30+ days. They are not counted anywhere.' },
  pQuietProjects: { one: 'quiet project, nothing needs you', other: 'quiet projects, nothing needs you' },
  pMoreFailed: { one: '+{n} more failed', other: '+{n} more failed' },
  nudgeLede: 'Their turn for 5 days or longer. Send a nudge in Slack or mail; the collector picks it up.',
  keysHint: 'Hover shows actions. Keys: J K move, E done, R replied, S snooze, Enter open, ? all keys.',
  failedAt: 'failed {t}.',
  // health
  hRed: 'Needs you', hAmber: 'Watch', hGreen: 'On track', rNone: 'Nothing overdue, nothing waiting on you',
  rTurnWaits: { one: 'reply waits {n} day', other: 'reply waits {n} days' },
  rTurn: { one: '{n} reply to write', other: '{n} replies to write' },
  rCrit: { one: '{n} critical risk', other: '{n} critical risks' },
  rOverdue: { one: '{n} overdue', other: '{n} overdue' },
  rToday: { one: '{n} due today', other: '{n} due today' },
  rHigh: { one: '{n} high risk', other: '{n} high risks' },
  // projects
  pProjects: { one: '{n} project on the board', other: '{n} projects on the board' },
  noProjects: 'No projects on the board. Turn them on in Settings.', hiddenProjects: 'Hidden', unknownProject: 'Unknown project: {s}',
  projectMenu: 'Project menu', projectSections: 'Project sections', currentState: 'Current state', projectAutomation: 'Automation of this project',
  tab_overview: 'Overview', tab_work: 'Work', tab_log: 'Log', tab_risks: 'Risks', tab_state: 'Current state',
  yourMove: 'Your move', risksToWatch: 'Risks to watch', allRisks: 'All risks', latest: 'Latest', everything: 'Everything in this project',
  logLong: 'Log: meetings, decisions, reports', stateUpdated: 'Current state, updated {d}',
  pScheduled: { one: '{n} scheduled run', other: '{n} scheduled runs' },
  pFailed: { one: '{n} failed', other: '{n} failed' },
  tasks: 'Tasks', threads: 'Threads', meetings: 'Meetings', decisions: 'Decisions', reports: 'Reports',
  fOpen: 'Open', fDoneWeek: 'Done this week', fClosedWeek: 'Closed this week',
  reviewOne: 'Review one by one', closeOlder: 'Close all older than {n}d', hintReplied: 'nobody confirmed yet',
  upcoming: 'Coming up', earlier: 'Earlier',
  riskFieldsMissing: 'Risks have no "Trigger Date" yet, so they are sorted by severity.', noRisks: 'No active risks.',
  noState: 'No Current State page in the config for this project.',
  // rows
  high: 'High', quiet: 'quiet', external: 'External', noProject: 'No project',
  notReviewed: 'not reviewed {n}d', yourTurn: 'Your turn', theirTurn: 'Their turn',
  kTask: 'Task', kThread: 'Thread', kRisk: 'Risk', kDecision: 'Decision', kMeeting: 'Meeting', kReport: 'Report',
  aDone: 'Done', aReopen: 'Reopen', aReplied: 'Replied', aReviewed: 'Reviewed', aSnooze: 'Snooze', aOpenSource: 'Open source', aMore: 'More',
  aAsk: 'Ask Claude', askCopied: 'Copied. Paste it into Claude and add your decision.', askFailed: 'Could not copy', kAsk: 'Ask Claude', aStatus: 'Status', aMakeTask: 'Make a task', aRoute: 'Route to Tasks',
  openSlack: 'Open in Slack', openMail: 'Open in Mail', openNotion: 'Open in Notion',
  fStatus: 'Status', fDue: 'Due', fPriority: 'Priority', fSource: 'Source', fSeverity: 'Severity', fLikelihood: 'Likelihood', fOwner: 'Owner',
  fTrigger: 'Trigger', fReviewed: 'Reviewed', fMitigation: 'Mitigation', fArea: 'Area', fDoor: 'Door', fStatedBy: 'Stated by',
  fProject: 'Project', fProjectReq: 'Project, required',
  // toasts
  tDone: 'Marked done', tReopened: 'Reopened', tSnoozed: 'Snoozed to {d}', tReplied: 'Marked as replied', tReviewed: 'Marked as reviewed',
  tStatus: 'Status: {s}', tSaved: 'Saved', tCreated: 'Created', tRouted: 'Moved to Tasks', tClosed: 'Closed', tKept: 'Kept for context',
  tRelevant: 'Back in the queue', tClosedN: { one: 'Closed {n} thread', other: 'Closed {n} threads' },
  // snooze
  sToday: 'Today', sTomorrow: 'Tomorrow', sMonday: 'Monday', sNextWeek: 'Next week', sPickDate: 'Pick a date', fBody: 'Text', sSetDate: 'Snooze',
  // stale review
  staleTitle: 'Stale threads', reviewProgress: '{i} of {n}', lastActivity: 'last activity {d}', reviewDone: 'Review finished',
  rvClose: 'Close', rvKeep: 'Keep for context', rvRelevant: 'Still relevant', rvSkip: 'Skip',
  rvHint: '"Still relevant" puts it back in the queue and restarts the 30-day clock.',
  // quick add
  qaTitle: 'Add', qaPlaceholder: 'Note, task or decision', qaNote: 'Note', qaTask: 'Task', qaDecision: 'Decision', qaKind: 'Kind',
  qaEnter: 'Enter saves', projectRequired: 'Pick the project: the dashboard never guesses it.',
  routeTitle: 'Route to Tasks',
  // palette
  pkTitle: 'Search and jump', pkPlaceholder: 'Jump to a project, find an item, add', pkProject: 'Project',
  pkAddNote: 'Add an Inbox note', pkAddTask: 'Add a task', pkAddDecision: 'Add a decision',
  // inbox
  pInbox: { one: '{n} note to sort', other: '{n} notes to sort' }, inboxEmpty: 'Inbox is empty',
  inboxLede: 'Route each note to a project as a task, or leave it here.', inboxOff: 'The Inbox database is not in the config.',
  // automation
  autoEyebrow: 'Cowork runs and skills', autoTitle: '{runs} today', autoTitleBad: '{runs} today, {n} needs a look',
  pRuns: { one: '{n} run', other: '{n} runs' },
  autoLede: 'Read-only. Everything runs from Cowork and produces drafts only; nothing is sent to the client.',
  autoOff: 'Automation is not connected. Add automation_db and runs_db to the config (DEVELOPMENT.md, Automation bridge).',
  needsALook: 'Needs a look', schedule: 'Schedule', skills: 'Skills', findSkill: 'Find a skill',
  colTask: 'Task', colRuns: 'Runs', colNext: 'Next', colLast: 'Last run', generalAll: 'General, for all projects',
  failed: 'failed', neverRan: 'never ran', paused: 'paused', nextAt: 'next {t}', anyProject: 'any project',
  pMoreSkills: { one: '{n} more, use the search', other: '{n} more, use the search' },
  // settings
  language: 'Language', theme: 'Theme', themeSystem: 'System', themeDark: 'Dark', themeLight: 'Light',
  visibleProjects: 'Projects on the board', visibleHint: 'Hidden projects stay in Notion and open by link; they are left out of Today, the numbers and quick add.',
  swapTurn: 'Swap whose turn', swapTurnHint: 'Turn on if the statuses read the other way round for you (now {s} = your turn).',
  keys: 'Keyboard shortcuts', about: 'About', aboutText: 'PM Control Tower dashboard. Reads your Control Tower Notion databases; writes only the changes you make here.',
  kMove: 'Move down / up', kOpen: 'Open details', kDone: 'Task done', kReplied: 'Thread replied, risk reviewed', kSnooze: 'Snooze a task',
  kAdd: 'Add', kFilter: 'Filter the list', kPalette: 'Search and jump', kHelp: 'All keys', kClose: 'Close',
};

const UK = {
  navToday: 'Сьогодні', navInbox: 'Inbox', projects: 'Проєкти', navMore: 'Ще', navAutomation: 'Автоматизація', navSettings: 'Налаштування',
  add: 'Додати', save: 'Зберегти', close: 'Закрити', retry: 'Ще раз', undo: 'Відмінити', loading: 'Завантаження', details: 'Деталі', actions: 'Дії',
  all: 'Усе', other: 'Інше', filter: 'Фільтр', and: 'і', look: 'Глянути', review: 'Розібрати', gotIt: 'Зрозуміло',
  cmdHint: 'перехід, пошук, додати', nItems: '{n} шт.', turnCount: 'Твоя черга: {n}', autoFailedDot: 'Таска за розкладом впала',
  pullRefresh: 'Потягни, щоб оновити', releaseRefresh: 'Відпусти, щоб оновити',
  dToday: 'сьогодні', dTomorrow: 'завтра', dYesterday: 'вчора', dAge: '{n} д', dLate: 'прострочено {n} д', dIn: 'за {n} д', dInMin: 'за {n} хв', dInH: 'за {n} год',
  updatedAt: 'Оновлено {t}',
  offlineBanner: 'Немає зʼєднання, дії синхронізуються пізніше', notionError: 'Помилка Notion', conflict: 'Змінено в Notion, дію не застосовано',
  offlineNoCache: 'Немає зʼєднання, а на цьому пристрої ще нічого не збережено. Підключись один раз, щоб завантажити проєкти.',
  notSaved: 'Не збережено', queuedOffline: 'Збережено офлайн, синхронізується пізніше', pendingSync: 'Чекає на синхронізацію',
  emptyList: 'Тут порожньо.', emptyFilter: 'Під цей фільтр нічого немає.', nothingHere: 'Тут нічого не чекає на тебе.',
  noDataYet: 'Даних ще немає', firstCollection: 'Запусти перший збір у Cowork, потім потягни, щоб оновити.',
  nothingNeedsYou: 'Нічого не чекає на тебе',
  needYou: { one: '{what} чекає на тебе', other: '{what} чекають на тебе' },
  pReplies: { one: '{n} відповідь', few: '{n} відповіді', many: '{n} відповідей', other: '{n} відповіді' },
  pTasks: { one: '{n} задача', few: '{n} задачі', many: '{n} задач', other: '{n} задачі' },
  pRisks: { one: '{n} ризик', few: '{n} ризики', many: '{n} ризиків', other: '{n} ризику' },
  filterQueue: 'Фільтр черги',
  mNeeds: 'Потрібен ти', mOverdue: 'Прострочено', mTurn: 'Твоя черга', mCritical: 'Критичні ризики', mToday: 'На сьогодні',
  fNeeds: 'Треди, де твоя черга, прострочені задачі й задачі на сьогодні, Critical-ризики і ризики, що спрацюють за 7 днів. Застарілі треди не рахуються.',
  fOverdue: 'Відкриті задачі (не On Hold) з дедлайном до сьогодні.',
  fTurn: 'Треди, що чекають на твою відповідь, без застарілих (без активності 30+ днів).',
  fCritical: 'Активні ризики із severity Critical.',
  fToday: 'Відкриті задачі (не On Hold) з дедлайном сьогодні.',
  needsYou: 'Потрібен ти', fullQueue: 'Уся черга', nextCall: 'Наступний дзвінок', openMeeting: 'Відкрити мітинг',
  raiseThread: '{title}: чекає {d}', raiseRisk: '{title} ({sev})',
  emptyQueue: 'Нічого не чекає на тебе.', emptyNext: 'Далі: {what}, {when}',
  sortInbox: { one: 'Розібрати Inbox ({n})', few: 'Розібрати Inbox ({n})', many: 'Розібрати Inbox ({n})', other: 'Розібрати Inbox ({n})' },
  pMore: { one: 'ще {n}', few: 'ще {n}', many: 'ще {n}', other: 'ще {n}' },
  pNudge: { one: 'нагадати, їхня черга 5+ днів', few: 'нагадати, їхня черга 5+ днів', many: 'нагадати, їхня черга 5+ днів', other: 'нагадати, їхня черга 5+ днів' },
  pStale: { one: 'застарілий тред, без активності 30+ днів', few: 'застарілі треди, без активності 30+ днів', many: 'застарілих тредів, без активності 30+ днів', other: 'застарілого треду, без активності 30+ днів' },
  pStaleLong: { one: '{n} застарілий тред без активності 30+ днів. Він ніде не рахується.', few: '{n} застарілі треди без активності 30+ днів. Вони ніде не рахуються.', many: '{n} застарілих тредів без активності 30+ днів. Вони ніде не рахуються.', other: '{n} застарілого треду без активності 30+ днів. Вони ніде не рахуються.' },
  pQuietProjects: { one: 'тихий проєкт, нічого не чекає', few: 'тихі проєкти, нічого не чекає', many: 'тихих проєктів, нічого не чекає', other: 'тихого проєкту, нічого не чекає' },
  pMoreFailed: { one: 'і ще {n} збій', few: 'і ще {n} збої', many: 'і ще {n} збоїв', other: 'і ще {n} збою' },
  nudgeLede: 'Їхня черга 5 днів і довше. Нагадай у Slack чи пошті; колектор це підхопить.',
  keysHint: 'Дії видно при наведенні. Клавіші: J K рух, E done, R replied, S відкласти, Enter відкрити, ? усі клавіші.',
  failedAt: 'впала {t}.',
  hRed: 'Потрібен ти', hAmber: 'Під наглядом', hGreen: 'Все гаразд', rNone: 'Немає прострочок і нічого не чекає на тебе',
  rTurnWaits: { one: 'відповідь чекає {n} день', few: 'відповідь чекає {n} дні', many: 'відповідь чекає {n} днів', other: 'відповідь чекає {n} дня' },
  rTurn: { one: '{n} відповідь написати', few: '{n} відповіді написати', many: '{n} відповідей написати', other: '{n} відповіді написати' },
  rCrit: { one: '{n} критичний ризик', few: '{n} критичні ризики', many: '{n} критичних ризиків', other: '{n} критичного ризику' },
  rOverdue: { one: '{n} прострочена', few: '{n} прострочені', many: '{n} прострочених', other: '{n} простроченої' },
  rToday: { one: '{n} на сьогодні', few: '{n} на сьогодні', many: '{n} на сьогодні', other: '{n} на сьогодні' },
  rHigh: { one: '{n} високий ризик', few: '{n} високі ризики', many: '{n} високих ризиків', other: '{n} високого ризику' },
  pProjects: { one: '{n} проєкт на дошці', few: '{n} проєкти на дошці', many: '{n} проєктів на дошці', other: '{n} проєкту на дошці' },
  noProjects: 'На дошці немає проєктів. Увімкни їх у Налаштуваннях.', hiddenProjects: 'Приховані', unknownProject: 'Невідомий проєкт: {s}',
  projectMenu: 'Меню проєкту', projectSections: 'Розділи проєкту', currentState: 'Current state', projectAutomation: 'Автоматизація цього проєкту',
  tab_overview: 'Огляд', tab_work: 'Робота', tab_log: 'Журнал', tab_risks: 'Ризики', tab_state: 'Current state',
  yourMove: 'Твій хід', risksToWatch: 'Ризики під наглядом', allRisks: 'Усі ризики', latest: 'Свіже', everything: 'Усе в цьому проєкті',
  logLong: 'Журнал: мітинги, рішення, звіти', stateUpdated: 'Current state, оновлено {d}',
  pScheduled: { one: '{n} запуск за розкладом', few: '{n} запуски за розкладом', many: '{n} запусків за розкладом', other: '{n} запуску за розкладом' },
  pFailed: { one: '{n} впав', few: '{n} впали', many: '{n} впали', other: '{n} впали' },
  tasks: 'Задачі', threads: 'Треди', meetings: 'Мітинги', decisions: 'Рішення', reports: 'Звіти',
  fOpen: 'Відкриті', fDoneWeek: 'Зроблені за тиждень', fClosedWeek: 'Закриті за тиждень',
  reviewOne: 'Розібрати по одному', closeOlder: 'Закрити всі старші {n} д', hintReplied: 'ніхто ще не підтвердив',
  upcoming: 'Попереду', earlier: 'Раніше',
  riskFieldsMissing: 'У ризиків ще немає "Trigger Date", тому вони відсортовані за severity.', noRisks: 'Активних ризиків немає.',
  noState: 'У конфігу немає сторінки Current State для цього проєкту.',
  high: 'High', quiet: 'тихо', external: 'Для клієнта', noProject: 'Без проєкту',
  notReviewed: 'без перегляду {n} д', yourTurn: 'Твоя черга', theirTurn: 'Їхня черга',
  kTask: 'Задача', kThread: 'Тред', kRisk: 'Ризик', kDecision: 'Рішення', kMeeting: 'Мітинг', kReport: 'Звіт',
  aDone: 'Done', aReopen: 'Відкрити знову', aReplied: 'Replied', aReviewed: 'Переглянуто', aSnooze: 'Відкласти', aOpenSource: 'Відкрити джерело', aMore: 'Ще',
  aAsk: 'Спитати Claude', askCopied: 'Скопійовано. Встав у Claude і допиши рішення.', askFailed: 'Не вдалося скопіювати', kAsk: 'Спитати Claude', aStatus: 'Статус', aMakeTask: 'Зробити задачею', aRoute: 'У задачі',
  openSlack: 'Відкрити в Slack', openMail: 'Відкрити в пошті', openNotion: 'Відкрити в Notion',
  fStatus: 'Статус', fDue: 'Дедлайн', fPriority: 'Пріоритет', fSource: 'Джерело', fSeverity: 'Severity', fLikelihood: 'Ймовірність', fOwner: 'Власник',
  fTrigger: 'Спрацювання', fReviewed: 'Переглянуто', fMitigation: 'Мітигація', fArea: 'Сфера', fDoor: 'Door', fStatedBy: 'Хто сказав',
  fProject: 'Проєкт', fProjectReq: 'Проєкт, обовʼязково',
  tDone: 'Позначено Done', tReopened: 'Відкрито знову', tSnoozed: 'Відкладено на {d}', tReplied: 'Позначено Replied', tReviewed: 'Позначено як переглянутий',
  tStatus: 'Статус: {s}', tSaved: 'Збережено', tCreated: 'Створено', tRouted: 'Перенесено в задачі', tClosed: 'Закрито', tKept: 'Залишено для контексту',
  tRelevant: 'Повернуто в чергу', tClosedN: { one: 'Закрито {n} тред', few: 'Закрито {n} треди', many: 'Закрито {n} тредів', other: 'Закрито {n} треду' },
  sToday: 'Сьогодні', sTomorrow: 'Завтра', sMonday: 'Понеділок', sNextWeek: 'Наступний тиждень', sPickDate: 'Вибрати дату', fBody: 'Текст', sSetDate: 'Відкласти',
  staleTitle: 'Застарілі треди', reviewProgress: '{i} з {n}', lastActivity: 'остання активність {d}', reviewDone: 'Розбір завершено',
  rvClose: 'Закрити', rvKeep: 'Лишити для контексту', rvRelevant: 'Ще актуальний', rvSkip: 'Пропустити',
  rvHint: '"Ще актуальний" повертає тред у чергу і перезапускає 30-денний таймер.',
  qaTitle: 'Додати', qaPlaceholder: 'Нотатка, задача чи рішення', qaNote: 'Нотатка', qaTask: 'Задача', qaDecision: 'Рішення', qaKind: 'Тип',
  qaEnter: 'Enter зберігає', projectRequired: 'Обери проєкт: дашборд ніколи його не вгадує.',
  routeTitle: 'У задачі',
  pkTitle: 'Пошук і перехід', pkPlaceholder: 'Перейти до проєкту, знайти, додати', pkProject: 'Проєкт',
  pkAddNote: 'Додати нотатку в Inbox', pkAddTask: 'Додати задачу', pkAddDecision: 'Додати рішення',
  pInbox: { one: '{n} нотатка до розбору', few: '{n} нотатки до розбору', many: '{n} нотаток до розбору', other: '{n} нотатки до розбору' }, inboxEmpty: 'Inbox порожній',
  inboxLede: 'Перенеси кожну нотатку в проєкт як задачу або лиши тут.', inboxOff: 'Бази Inbox немає в конфігу.',
  autoEyebrow: 'Запуски і скіли Cowork', autoTitle: '{runs} сьогодні', autoTitleBad: '{runs} сьогодні, {n} треба глянути',
  pRuns: { one: '{n} запуск', few: '{n} запуски', many: '{n} запусків', other: '{n} запуску' },
  autoLede: 'Лише перегляд. Усе запускається з Cowork і створює тільки драфти; клієнту нічого не відправляється.',
  autoOff: 'Автоматизацію не підключено. Додай automation_db і runs_db у конфіг (DEVELOPMENT.md, Automation bridge).',
  needsALook: 'Варто глянути', schedule: 'Розклад', skills: 'Скіли', findSkill: 'Знайти скіл',
  colTask: 'Таска', colRuns: 'Коли', colNext: 'Далі', colLast: 'Останній запуск', generalAll: 'Загальні, для всіх проєктів',
  failed: 'впала', neverRan: 'ще не запускалась', paused: 'на паузі', nextAt: 'далі {t}', anyProject: 'будь-який проєкт',
  pMoreSkills: { one: 'ще {n}, скористайся пошуком', few: 'ще {n}, скористайся пошуком', many: 'ще {n}, скористайся пошуком', other: 'ще {n}, скористайся пошуком' },
  language: 'Мова', theme: 'Тема', themeSystem: 'Системна', themeDark: 'Темна', themeLight: 'Світла',
  visibleProjects: 'Проєкти на дошці', visibleHint: 'Приховані проєкти лишаються в Notion і відкриваються за посиланням; їх немає в Сьогодні, у числах і швидкому додаванні.',
  swapTurn: 'Поміняти, чия черга', swapTurnHint: 'Увімкни, якщо статуси для тебе означають навпаки (зараз {s} = твоя черга).',
  keys: 'Клавіші', about: 'Про застосунок', aboutText: 'Дашборд PM Control Tower. Читає твої бази Control Tower у Notion; записує лише зміни, які ти робиш тут.',
  kMove: 'Вниз / вгору', kOpen: 'Відкрити деталі', kDone: 'Задача: Done', kReplied: 'Тред: Replied, ризик: переглянуто', kSnooze: 'Відкласти задачу',
  kAdd: 'Додати', kFilter: 'Фільтр списку', kPalette: 'Пошук і перехід', kHelp: 'Усі клавіші', kClose: 'Закрити',
};

export const I18N = { en: EN, uk: UK };
let lang = 'en';
export function setLang(l) { lang = I18N[l] ? l : 'en'; }
export function getLang() { return lang; }
const fill = (s, vars) => {
  let out = s;
  for (const [a, b] of Object.entries(vars || {})) out = out.split(`{${a}}`).join(String(b));
  return out;
};
export function t(k, vars) {
  let s = I18N[lang][k] ?? I18N.en[k] ?? k;
  if (typeof s === 'object') s = s.other;
  return fill(s, vars);
}
export function tn(k, n, vars = {}) {
  const forms = I18N[lang][k] ?? I18N.en[k];
  if (!forms) return k;
  if (typeof forms === 'string') return fill(forms, { n, ...vars });
  const cat = new Intl.PluralRules(lang === 'uk' ? 'uk' : 'en').select(n);
  return fill(forms[cat] ?? forms.other, { n, ...vars });
}

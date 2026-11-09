// Property names of the PM Control Tower Notion databases.
// They match docs/en/02-notion-control-tower.md verbatim. A deployment can
// override any name through `schema` in config/dashboard.config.json.

export const DEFAULT_SCHEMA = {
  tasks: {
    title: 'Task name',
    status: 'Status',
    priority: 'Priority',
    effort: 'Effort level',
    type: 'Type',
    source: 'Source',
    due: 'Due date',
    description: 'Description',
    jira: 'Jira Issue Key',
    project: 'Project',
    workspace: 'Workspace',
    inbox: 'Inbox',
    doneValue: 'Done',
    // Statuses that end a task. Only the ones that exist in the live schema are used.
    closedStatuses: ['Done', "Won't Do"],
    holdValue: 'On Hold',
    statuses: ['To Do', 'In progress', 'Under Review', 'Done', 'On Hold'],
    priorities: ['High', 'Medium', 'Low'],
  },
  threads: {
    title: 'Thread Name',
    status: 'Status',
    type: 'Type',
    description: 'Description',
    emailLink: 'Email Link',
    slackLink: 'Slack Link',
    reportedAt: 'Reported at',
    lastReply: 'Last Reply Date',
    jiraKey: 'Jira Key',
    project: 'Project',
    // Date property that marks a status set by a human. Collectors keep a
    // manual status until a new message arrives (projects/_standards.md s11).
    manualStatusAt: 'Manual Status At',
    // Written by the collectors only. The dashboard never writes it; `npm run doctor`
    // checks that it exists.
    collectorStatus: 'Collector Status',
    statuses: ['Awaiting Reply', 'Need Follow-up', 'Replied', 'Spectator Mode', 'AI Review', 'Closed'],
    // The page icon follows the status. Closed has no icon.
    icons: {
      'Awaiting Reply': '🔴',
      'Need Follow-up': '⏳',
      'Replied': '💬',
      'Spectator Mode': '👀',
      'AI Review': '🤖',
      'Closed': null,
    },
  },
  meetings: {
    title: 'Meeting Name',
    date: 'Date',
    type: 'Meeting type',
    summary: 'Summary',
    project: 'Project',
  },
  decisions: {
    title: 'Decision',
    date: 'Date',
    area: 'Area',
    context: 'Context',
    source: 'Source',
    status: 'Status',
    door: 'Door',
    statedBy: 'Stated by',
    tradeoff: 'Trade-off',
    project: 'Project',
    workspace: 'Workspace',
    statuses: ['Active', 'Superseded', 'Cancelled'],
    areas: ['Access', 'Scope', 'Process', 'Tech', 'Team', 'Client'],
    doors: ['One-way', 'Two-way'],
  },
  risks: {
    title: 'Name',
    status: 'Status',
    severity: 'Severity',
    likelihood: 'Likelihood',
    category: 'Category',
    kind: 'Kind',
    owner: 'Owner',
    summary: 'Summary',
    mitigation: 'Mitigation',
    lastUpdated: 'Last Updated',
    firstSeen: 'First Seen',
    // Optional dates (dashboard v2). Without them the dashboard hides
    // "in 2d", "not reviewed 15d" and the Reviewed action.
    triggerDate: 'Trigger Date',
    lastReviewed: 'Last Reviewed',
    visibility: 'Visibility',
    project: 'Project',
    statuses: ['AI Review', 'Open', 'Monitoring', 'Mitigated', 'Closed', 'Realized'],
    activeStatuses: ['Open', 'Monitoring', 'Realized', 'AI Review'],
    severities: ['Critical', 'High', 'Medium', 'Low'],
  },
  reports: {
    title: 'Report Name',
    date: 'Date',
    type: 'Type',
    skill: 'Skill',
    visibility: 'Visibility',
    summary: 'Summary',
    project: 'Project',
  },
  // Projects database: the list of projects the dashboard discovers.
  projects: {
    title: 'Project name',
    slug: 'Slug',
    status: 'Status',
    // Select: Auto / On / Off. Written by the dashboard Settings page.
    dashboard: 'Dashboard',
    workspace: 'Workspace',
    currentState: 'Current State',
    // Discovered (not in the config) projects are shown while Status is one of these.
    activeStatuses: ['In progress'],
    modes: ['Auto', 'On', 'Off'],
  },
  inbox: {
    title: 'Inbox Name',
    status: 'Status',
    notes: 'Notes',
    type: 'Type',
    due: 'Due Date',
    project: 'Project',
    tasks: 'Tasks Tracker',
    newValue: 'New',
    routedValue: 'Routed',
  },
};

export function mergeSchema(overrides = {}) {
  const out = {};
  for (const [db, props] of Object.entries(DEFAULT_SCHEMA)) {
    out[db] = { ...props, ...(overrides[db] || {}) };
  }
  return out;
}

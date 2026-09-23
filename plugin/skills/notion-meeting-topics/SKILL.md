---
name: notion-meeting-topics
description: Generates a detailed bilingual (EN/UA) meeting report from a Notion meeting page and appends it directly to that page. Trigger this skill whenever the user sends a message matching any of these patterns - "міт [Notion link]", "мітінг [Notion link]", "meeting [Notion link]", or any short message containing a Notion meeting page URL combined with a word that implies meeting analysis, review, or report. Also trigger when the user says "розбери мітінг", "проаналізуй мітінг", "meeting report", "meeting summary" followed by or accompanied by a Notion URL. When triggered, execute immediately - do not ask for confirmation, do not explain what you are about to do, just start working. The output is always appended to the same Notion page, never as a child page.
---

# Meeting Topics Report Generator

## CRITICAL: Execution Rules

**DO NOT ask for confirmation. DO NOT explain what you are about to do. DO NOT generate prompts for the user to copy.**

When this skill triggers, immediately start executing step by step using available tools.

The ONLY questions allowed: if no Notion URL is provided, ask for it; if the meeting page has no `Project` relation and the project is not named in the request, ask which project (Default Project Rule).

---

## Step 0: Project config (always first)

1. Determine the project: from the request if named; otherwise from the `Project` relation of the meeting page (Step 1). If both are empty, ask, listing the configs in `projects/`. See the Default Project Rule in `projects/SKILL.md`.
2. Read `../projects/{project_slug}.md` (fallback: Glob `**/projects/{project_slug}.md`) and `projects/SKILL.md` for the cross-cutting rules.
3. Take from the config: `{config.default_language}` (the internal half of the report), `{config.client_language}` (the summary that could be shared with the client), the Transcript Alias Map (transcripts garble names; map them to real people before writing), the Team tables (who is ours, who is the client's).
4. Writes allowed without asking (the 5-minute rule in `projects/SKILL.md`): appending the report to the meeting page or creating a child page under it. Nothing else.

If the config file doesn't exist, tell the user: "Project config not found. Available projects: [list files in projects/]" and stop.

---

## Step 1: Fetch the Meeting Page

Use Notion MCP `notion-fetch` to retrieve the meeting page by its URL.

```
notion-fetch(id: "<meeting_page_url>")
```

Extract from the result:
- The page title (for the report header)
- The meeting date (from properties or title)
- The AI-generated summary (from `<summary>` section)
- The page ID (for later update)
- The `Project` relation (used in Step 0 when the project was not named)

---

## Step 2: Fetch the Transcript

The first fetch usually includes the summary but says "Transcript omitted". You MUST fetch the transcript explicitly:

```
notion-fetch(id: "<meeting_page_url>#<meeting_notes_block_id>", include_transcript: true)
```

The `meeting_notes_block_id` is found in the `readOnlyViewMeetingNoteUrl` attribute of the `<meeting-notes>` tag from Step 1.

If the transcript is not available, proceed with the summary only but note this limitation in the report.

---

## Step 3: Analyze and Generate the Report

Using BOTH the transcript and the summary, generate a comprehensive bilingual report.

### Report Structure

For EACH topic discussed, create a section with:

1. **Section header** - numbered, bilingual (client_language / default_language, by default EN / UA)
2. **EN:** paragraph - detailed description in `{config.client_language}`
3. **UA:** paragraph - detailed description in `{config.default_language}`
4. **Proposals / Пропозиції** (if any were made during discussion)
5. **Decision / Рішення** or **Action / Дія** - what was decided or what action items came out

### What to Extract

From the transcript, identify:
- Task status updates and progress reports
- Feature discussions (how to implement, architecture decisions)
- Bug reports and fixes
- Blockers and issues
- Resource conflicts
- Timeline concerns
- Deployment plans
- Documentation updates
- Infrastructure and security topics
- Any notable side topics (equipment issues, personal updates, etc.)

### At the End of the Report

Add a "Summary of Key Decisions / Підсумок ключових рішень" section with a numbered list of all decisions and action items.

### Writing Rules

- Write in professional but accessible tone
- Never use em dashes or en dashes. Use short hyphens, commas, or restructure sentences
- Be specific: include names (as resolved through the Transcript Alias Map), dates, technical details
- If a proposal was discussed but no decision made, note it as "Open / Відкрито"
- If conflicting opinions were expressed, capture both sides

---

## Step 4: Append the Report to the Notion Page

**CRITICAL: Append to the SAME page. NOT as a child page. NOT replace content.**

Use `notion-update-page` with the `update_content` command to append the report AFTER the existing content.

### How to Append

1. First, identify the last meaningful content block on the page from the Step 1 fetch result
2. Use `update_content` with `old_str` matching that last block, and `new_str` containing that same block PLUS the new report content appended after it

```
notion-update-page(
  page_id: "<page_id>",
  command: "update_content",
  content_updates: [{
    old_str: "<last existing content block>",
    new_str: "<last existing content block>\n\n---\n\n# Meeting Report / Звіт з мітінгу\n\n<full report content>"
  }]
)
```

### Important: Handling Meeting Notes Pages

Meeting pages with Notion AI meeting notes have a `<meeting-notes>` block that contains `<summary>`, `<notes>`, and `<transcript>` sub-blocks. The report should be appended AFTER the meeting-notes block, not inside it.

If the page content is mostly the meeting-notes block with nothing else after it, target the last recognizable text block in the summary or notes section as the anchor point for appending.

If `update_content` fails (e.g., the old_str match is not found because the content is inside a meeting-notes block that the API doesn't allow editing), fall back to creating a child page under the meeting page:

```
notion-create-pages(
  parent: { page_id: "<page_id>" },
  pages: [{ properties: { title: "Meeting Report - <date>" }, content: "<full report>" }]
)
```

Always try `update_content` first. Only fall back to child page if update fails.

### Notion Markdown Formatting Rules

- Use `#` for H1, `##` for H2, `###` for H3
- Use `**bold**` for emphasis
- Use `- ` for bullet lists
- Use `---` for horizontal dividers
- Use standard Markdown, no HTML tags
- Separate sections with `---` dividers for visual clarity

---

## Step 5: Confirm

After successful update, respond briefly:

> Звіт додано на сторінку мітінгу: [Meeting Title](page_url)

The confirmation opens with the Data Completeness header from `projects/SKILL.md` when a source was missing (e.g. `Джерела: Notion page OK · Transcript FAILED (not available, report from summary only)`); when everything was available, the header is the single line `Джерела: Notion page OK · Transcript OK`.

Do not repeat the full report in chat. The user can see it on the Notion page.

---

## Edge Cases

- **No transcript available**: Generate report from summary only. Add a note at the top: "Report generated from AI summary only - transcript was not available / Звіт згенеровано лише з AI-саммарі - транскрипт недоступний."
- **Very short meeting**: Still generate the report, even if it's brief.
- **Mixed-language meeting**: meetings may mix languages. Always output the report in the two languages from the config regardless of the meeting language.
- **Multiple topics with same theme**: Group related discussions under one section rather than creating tiny sections.
- **Page has no editable content (only meeting-notes block)**: Fall back to child page creation as described in Step 4.
- **update_content fails for any reason**: Fall back to child page, then inform the user that append was not possible and a child page was created instead.

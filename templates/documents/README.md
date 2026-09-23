# templates/documents/

Sample document template for Control Tower. Guide: `docs/en/15-document-templates.md`
(Ukrainian: `docs/uk/15-document-templates.md`).

- A template is a `.md` file named after a template key: `client-report.weekly.md`,
  `change-request.cr.md`. The full list of keys is in
  `plugin/skills/projects/_templates.md`.
- Files starting with `_` are never picked up by the lookup, so
  `_example.client-report.weekly.md` stays inactive even if this folder is set as
  `templates_root`. Copy it without the underscore to activate it.
- Put only the documents you want to change. Every key without a file keeps the
  skill's built-in format.
- Your real templates belong outside this repository (a company folder, a Notion page),
  so plugin and repository updates never overwrite them.

Приклад шаблону документа для Control Tower. Інструкція українською:
`docs/uk/15-document-templates.md`. Файли з `_` на початку назви неактивні; реальні
шаблони тримайте поза репозиторієм.

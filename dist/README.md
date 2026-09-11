# dist/ - the plugin, ready to hand over

[Українською](README.uk.md)

`pm-control-tower.plugin` is the assembled bundle you can hand to a colleague:
they send it to themselves in a Claude chat and press the install button.

The plugin sources live in `../plugin/`. This file is just a zip of that folder.

## Rebuilding after changes

```bash
cd plugin && zip -qr ../dist/pm-control-tower.plugin . -x "*.DS_Store" && cd ..
```

## What is inside

21 project-agnostic skills, anonymized: no client names, no people's names, no
real Notion database IDs, no local paths. Plus `.mcp.json` with the Jira and
Confluence blocks (without secret values), `SETUP.md`, `CONNECTORS.md`, `README.md`.

## The main warning

**Do not install this plugin for yourself.** The skill names in it match yours,
the plugin version overrides the local one, and the skills will look for project
configs in the plugin folder, where only a template sits. Confirmed in practice.

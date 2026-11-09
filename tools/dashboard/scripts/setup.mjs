// Creates the git-ignored local files from the committed examples.
import { existsSync, copyFileSync } from 'node:fs';

const pairs = [
  ['config/dashboard.config.example.json', 'config/dashboard.config.json'],
  ['wrangler.example.toml', 'wrangler.toml'],
];
for (const [from, to] of pairs) {
  if (existsSync(to)) console.log(`keep   ${to} (already exists)`);
  else { copyFileSync(from, to); console.log(`create ${to}`); }
}
console.log('\nNext (docs/en/20-dashboard-install.md):');
console.log('  1. fill in config/dashboard.config.json and wrangler.toml');
console.log('  2. NOTION_TOKEN=<your integration token> npm run doctor');
console.log('  3. npx wrangler login && npx wrangler secret put NOTION_TOKEN');
console.log('  4. npm run deploy');

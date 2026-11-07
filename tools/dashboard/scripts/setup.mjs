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
console.log('\nNext: fill in config/dashboard.config.json and wrangler.toml, then run');
console.log('  npx wrangler secret put NOTION_TOKEN');
console.log('  npm run deploy');

// WCAG AA check of the token pairs the UI uses, in both themes. Reads the
// values from public/styles.css, so a token change is re-checked.
//   node test/contrast.mjs
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
function block(sel) {
  const i = css.indexOf(sel);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,8})/gi)].map((m) => [m[1], m[2]]));
}
const dark = block(':root {');
const light = { ...dark, ...block(':root[data-theme="light"]') };
const lum = (hex) => {
  const v = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// [foreground, backgrounds, minimum]: 4.5 text, 3 large text / UI parts
const TEXT = ['text', 'text-2', 'text-3', 'danger', 'warn'];
const BGS = ['bg', 'surface', 'hover'];
// On --raised the sheet uses its own text-3 and danger (checked below); text and text-2 too:
const RAISED = ['text', 'text-2', 'warn'];
const pairs = [
  ['text-3-raised', 'raised', 4.5], ['danger-raised', 'raised', 4.5],
  ...TEXT.flatMap((f) => BGS.map((b) => [f, b, 4.5])),
  ...RAISED.map((f) => [f, 'raised', 4.5]),
  ['ok', 'surface', 3], ['ok', 'bg', 3],
  ['on-accent', 'accent', 4.5], ['accent', 'bg', 3], ['accent', 'surface', 3], ['accent', 'raised', 3],
  ...['o-gray', 'o-brown', 'o-orange', 'o-yellow', 'o-green', 'o-blue', 'o-purple', 'o-pink', 'o-red'].map((o) => [o, 'surface', 3]),
];
let bad = 0;
for (const [name, t] of [['dark', dark], ['light', light]]) {
  for (const [f, b, min] of pairs) {
    const r = ratio(t[f], t[b]);
    const ok = r >= min;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(5)} ${f.padEnd(10)} on ${b.padEnd(8)} ${r.toFixed(2)} (min ${min})`);
  }
}
// The toast is dark in the light theme too: its Undo link and text.
for (const [f, b] of [['#ff9f43', '#3a3a3c'], ['#ff9f43', '#1d1d1f'], ['#f5f5f7', '#1d1d1f']]) {
  const r = ratio(f, b); if (r < 4.5) bad++;
  console.log(`${r >= 4.5 ? 'ok  ' : 'FAIL'} toast ${f} on ${b} ${r.toFixed(2)}`);
}
console.log(bad ? `\n${bad} pairs below AA` : '\nall pairs pass AA');
process.exitCode = bad ? 1 : 0;

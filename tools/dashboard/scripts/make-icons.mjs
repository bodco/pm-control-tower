// Renders the PWA icons: the 🗼 emoji centered on #1e1e20, about 80 percent of
// the safe area. Needs Playwright with Chromium and a color emoji font:
//   node scripts/make-icons.mjs
// The emoji looks the way the local emoji font draws it.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/icons/', import.meta.url));
const ICONS = [
  ['icon-192.png', 192, 0.64], ['icon-512.png', 512, 0.64], ['icon-maskable-512.png', 512, 0.64],
  ['apple-touch-icon.png', 180, 0.66], ['favicon-32.png', 32, 0.9], ['favicon-16.png', 16, 0.95],
];
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, size, k] of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:#1e1e20;display:flex;align-items:center;justify-content:center;overflow:hidden">
    <span style="font-size:${Math.round(size * k * 0.86)}px;line-height:1;font-family:'Apple Color Emoji','Noto Color Emoji','Segoe UI Emoji',sans-serif">🗼</span></body></html>`);
  await page.screenshot({ path: OUT + name, omitBackground: false });
  console.log(name, size);
}
await browser.close();

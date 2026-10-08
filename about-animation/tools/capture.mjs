#!/usr/bin/env node
/**
 * Capture the real About page's opening at chosen moments, from the site's
 * built output (npm run build in ../brandongreene-site first).
 *
 *   TIMES=4.5,6,9 node tools/capture.mjs            1600x900 → frames/live-<t>.png
 *   TIMES=4.5 node tools/capture.mjs --phone         390x844
 *   TIMES=4.5 SCALE=1 node tools/capture.mjs         faster, softer
 *
 * The page is told it's being captured (window.__orbitCapture), which forces
 * the live path past the GPU check (this machine renders in software) and
 * holds the clock; each moment is then reached with the page's own seek().
 * OUT=<dir> and PREFIX=<name> redirect the files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = '/home/user/brandongreene-site';
const req = createRequire(`${SITE}/package.json`);
const { chromium } = req('playwright');
const sharp = req('sharp');
const { serveDist } = await import(`${SITE}/scripts/lib/serve.mjs`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phone = process.argv.includes('--phone');
const view = phone ? { width: 390, height: 844 } : { width: 1600, height: 968 };
const scale = Number(process.env.SCALE ?? (phone ? 3 : 2));
const out = process.env.OUT ?? path.join(ROOT, 'frames');
const prefix = process.env.PREFIX ?? (phone ? 'live-phone' : 'live');
const times = (process.env.TIMES ?? '11.6').split(',').map(Number);
fs.mkdirSync(out, { recursive: true });

process.chdir(SITE);
const { server, port } = await serveDist('dist', 4398 + Math.floor(Math.random() * 400));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-watchdog'],
});
const page = await browser.newPage({ viewport: view, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.log('ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}] ${m.text()}`); });
await page.addInitScript(() => { window.__orbitCapture = true; });
await page.goto(`http://localhost:${port}/about/`, { waitUntil: 'load' });
await page.waitForSelector('[data-orbit][data-captured]', { timeout: 300_000 });
await page.evaluate(() => document.fonts.ready);
const stage = page.locator('[data-orbit-stage]');
for (const t of times) {
  const t0 = Date.now();
  await page.evaluate((tt) => document.querySelector('[data-orbit]').__orbit.seek(tt), t);
  // Let CSS transitions on the labels finish, as they would have by this moment.
  await page.waitForTimeout(900);
  const png = await stage.screenshot({ type: 'png', timeout: 300_000 });
  const meta = await sharp(png).metadata();
  const file = path.join(out, `${prefix}-${t.toFixed(2)}.png`);
  await sharp(png).resize(Math.round(meta.width / scale), Math.round(meta.height / scale), { kernel: 'lanczos3' }).png().toFile(file);
  console.log(`${t.toFixed(2)}: ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(ROOT, file)}`);
}
await browser.close();
server.close();

#!/usr/bin/env node
/**
 * Render style frames. Each sketch is sketches/<name>.html (plus an optional
 * sketches/<name>.ts, bundled with esbuild against the site's node_modules so
 * it can import three.js and the site's own intro code).
 *
 *   node tools/render.mjs a-ad c-print        # renders frames/<name>.png
 *   node tools/render.mjs --phone b-scan      # 390x844 phone frame
 *
 * Chromium renders at 2x and the result is downsampled, which is the
 * anti-aliasing. In this container that is software WebGL (SwiftShader):
 * slow, but a still doesn't care. A sketch signals it has finished drawing by
 * setting window.__done = true.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = '/home/user/brandongreene-site';
// Tools come from the site's own node_modules; nothing is installed here.
const req = createRequire(`${SITE}/package.json`);
const { chromium } = req('playwright');
const esbuild = req('esbuild');
const sharp = req('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SK = path.join(ROOT, 'sketches');
const OUT = path.join(ROOT, 'frames');
fs.mkdirSync(path.join(SK, 'out'), { recursive: true });

const args = process.argv.slice(2);
const phone = args.includes('--phone');
const names = args.filter((a) => !a.startsWith('--'));
const view = phone ? { width: 390, height: 844 } : { width: 1600, height: 900 };
const SCALE = phone ? 3 : 2;

// Bundle every sketch that has a .ts next to its .html.
for (const n of names) {
  const ts = path.join(SK, `${n}.ts`);
  if (!fs.existsSync(ts)) continue;
  await esbuild.build({
    entryPoints: [ts], bundle: true, format: 'esm', outfile: path.join(SK, 'out', `${n}.js`),
    nodePaths: [`${SITE}/node_modules`], logLevel: 'warning', target: 'es2022',
  });
}

// /fonts and /site come from the site itself, so the frames use its real type
// and its real calibration-object points.
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/fonts/') ? path.join(SITE, 'public', url)
    : url.startsWith('/site/') ? path.join(SITE, 'public', url.slice(5))
    : path.join(SK, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-watchdog'],
});
for (const n of names) {
  const t0 = Date.now();
  const page = await browser.newPage({ viewport: view, deviceScaleFactor: SCALE });
  page.on('console', (m) => console.log(`  [${n}] ${m.text()}`));
  // A script error means the sketch will never finish: fail at once.
  let fail;
  const failed = new Promise((_, rej) => { fail = rej; });
  page.on('pageerror', (e) => fail(new Error(`${n}: ${e.message}`)));
  await page.goto(`http://localhost:${port}/${n}.html${phone ? '?phone' : ''}`, { waitUntil: 'commit', timeout: 600_000 });
  await Promise.race([failed, page.waitForFunction(() => window.__done === true, null, { timeout: Number(process.env.TIMEOUT ?? 600) * 1000 })]);
  await page.evaluate(() => document.fonts.ready);
  // A sketch that exposes window.__seek(t) is rendered at each of TIMES
  // (comma-separated score seconds) into frames/<name>-<t>.png.
  const times = process.env.TIMES && (await page.evaluate(() => typeof window.__seek === 'function'))
    ? process.env.TIMES.split(',').map(Number) : [null];
  for (const t of times) {
    if (t !== null) await page.evaluate((tt) => window.__seek(tt), t);
    const png = await page.screenshot({ type: 'png', timeout: 300_000 });
    const tag = t === null ? '' : `-${t.toFixed(2)}`;
    const file = path.join(OUT, `${n}${phone ? '-phone' : ''}${tag}.png`);
    await sharp(png).resize(view.width, view.height, { kernel: 'lanczos3' }).png().toFile(file);
    console.log(`${n}${tag}: ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(ROOT, file)}`);
  }
  await page.close();
}
await browser.close();
server.close();

#!/usr/bin/env node
// render.cjs — renders frames of src/index.html via headless Chromium.
// usage: node tools/render.cjs [--start 0] [--end 599] [--step 1] [--out out/frames] [--shutter 1] [--workers 2] [--scale 1] [--frames 10,20,30] [--jpg] [--scene sceneN] [--times 0.5,1.2]
//   --scene renders that scene alone at LOCAL time (frames/times are relative to the scene start); --times gives seconds instead of frame numbers
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(fs.existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : 'playwright');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : null).filter(Boolean));
const ROOT = path.resolve(__dirname, '..'); const OUT = path.resolve(ROOT, args.out || 'out/frames');
const START = +(args.start || 0), END = +(args.end || 599), STEP = +(args.step || 1), SHUTTER = +(args.shutter || 1), WORKERS = +(args.workers || 2), SCALE = +(args.scale || 1), JPG = args.jpg === 'true';
const SCENE = args.scene || null;
const FRAMES = args.times ? args.times.split(',').map(x => Math.round(+x * 60)) : args.frames ? args.frames.split(',').map(Number) : Array.from({ length: Math.floor((END - START) / STEP) + 1 }, (_, i) => START + i * STEP);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port; const url = `http://127.0.0.1:${port}/src/index.html?render=1`;
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--enable-unsafe-swiftshader'] });
  const queue = FRAMES.slice(); let done = 0; const t0 = Date.now(); const errors = [];
  const pad = n => String(n).padStart(4, '0');
  async function worker(id) {
    const page = await browser.newPage({ viewport: { width: Math.round(1920 * SCALE), height: Math.round(1080 * SCALE) }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(`[w${id}] pageerror: ${e.message}`)); page.on('console', m => { if (m.type() === 'error') errors.push(`[w${id}] console: ${m.text()}`); });
    await page.goto(url, { waitUntil: 'load' }); await page.evaluate(() => window.__ready);
    if (SCALE !== 1) await page.evaluate(s => { document.getElementById('stage').style.width = (1920 * s) + 'px'; document.getElementById('stage').style.height = (1080 * s) + 'px'; }, SCALE);
    const el = await page.$('#stage');
    while (queue.length) {
      const f = queue.shift(); const t = f / 60;
      try { await page.evaluate(([t, sh, sc]) => sc ? window.__renderScene(sc, t, sh) : window.__render(t, sh), [t, SHUTTER, SCENE]); await el.screenshot({ path: path.join(OUT, `frame_${pad(f)}.${JPG ? 'jpg' : 'png'}`), type: JPG ? 'jpeg' : 'png', quality: JPG ? 92 : undefined, omitBackground: false }); }
      catch (e) { errors.push(`frame ${f}: ${e.message}`); }
      done++; if (done % 25 === 0 || done === FRAMES.length) process.stdout.write(`\r${done}/${FRAMES.length} frames  ${((Date.now() - t0) / 1000).toFixed(1)}s  ETA ${(((Date.now() - t0) / done) * (FRAMES.length - done) / 1000).toFixed(0)}s   `);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: Math.min(WORKERS, FRAMES.length) }, (_, i) => worker(i)));
  console.log(`\nrendered ${FRAMES.length} frames to ${OUT} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (errors.length) { console.error(`ERRORS (${errors.length}):\n` + [...new Set(errors)].slice(0, 20).join('\n')); }
  await browser.close(); server.close(); process.exit(errors.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });

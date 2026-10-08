#!/usr/bin/env node
/**
 * Render the opening film frame by frame from the site's film scene
 * (src/scripts/orbit/film/scene.ts), straight from the canvas, then encode a
 * master. This is the software-rendering path for machines without a GPU; on
 * a Mac, the site's own `npm run render:film` (Remotion) renders the same film.
 *
 *   node tools/film.mjs 16x9                  1920x1080, drawn at 1.5x and scaled down
 *   node tools/film.mjs 9x16                  1080x1920, drawn at 1.25x
 *   FROM=40 TO=60 node tools/film.mjs 16x9    a range of frames (for re-renders)
 *   ENCODE=1 FROM=0 TO=-1 node tools/film.mjs 16x9   just re-encode the master
 *   PREVIEW=1 FRAMES=0,30,81 node ...         just those frames
 *   PREVIEW=1 STEP=2 node tools/film.mjs 16x9 a quick look: half size, 1x, every 2nd frame,
 *                                             into film/<cut>-preview/ and <cut>-preview.mp4
 *
 *   WEB=1 node tools/film.mjs 16x9 ...       also encode the page's files from the frames
 *                                             (as video/render.mjs does) into the site's
 *                                             public/about/orbit/: mp4, webm, poster
 *
 * Frames go to film/<cut>/f0000.png; the master to film/<cut>-master.mp4.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = '/home/user/brandongreene-site';
const req = createRequire(`${SITE}/package.json`);
const { chromium } = req('playwright');
const esbuild = req('esbuild');
const sharp = req('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cut = process.argv[2] ?? '16x9';
const PREVIEW = !!process.env.PREVIEW;
const STEP = Number(process.env.STEP ?? 1);
const [W, H, DPR] = (cut === '9x16' ? [1080, 1920, 1.25] : [1920, 1080, 1.5]).map((v, i) => (PREVIEW ? (i < 2 ? v / 2 : 1) : v));
const FPS = 30;
const VIDEO_END = 3.8; // SCORE.videoEnd in src/scripts/orbit/score.ts
const total = Math.ceil(VIDEO_END * FPS);
const from = Number(process.env.FROM ?? 0);
const to = Math.min(total - 1, Number(process.env.TO ?? total - 1));
const name = PREVIEW ? `${cut}-preview` : cut;
const dir = path.join(ROOT, 'film', name);
fs.mkdirSync(dir, { recursive: true });

if (to >= from) {
  // A page with just the film's canvas.
  const work = path.join(ROOT, 'film', `.page-${name}`);
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(path.join(work, 'entry.ts'), `
import { createFilm } from '${SITE}/src/scripts/orbit/film/scene';
const canvas = document.querySelector('canvas')!;
const film = createFilm(canvas, ${W}, ${H}, ${DPR});
(window as any).__frame = (t: number) => {
  film.render(t);
  const gl = canvas.getContext('webgl2')!;
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  return canvas.toDataURL('image/png');
};
(window as any).__ready = true;
`);
  fs.writeFileSync(path.join(work, 'index.html'), `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#05060A}canvas{display:block;width:${W}px;height:${H}px}</style><canvas></canvas><script type="module" src="entry.js"></script>`);
  await esbuild.build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, format: 'esm', outfile: path.join(work, 'entry.js'), nodePaths: [`${SITE}/node_modules`], logLevel: 'warning', target: 'es2022' });

  const server = http.createServer((q, r) => {
    const f = path.join(work, decodeURIComponent(q.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.writeHead(404).end();
    r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' });
    fs.createReadStream(f).pipe(r);
  }).listen(0);
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-watchdog'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', (e) => console.log('ERROR', e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`, { waitUntil: 'commit', timeout: 600_000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 600_000 });
  const t0 = Date.now();
  // FRAMES=0,30,81 renders just those frames (for look tests).
  const list = process.env.FRAMES ? process.env.FRAMES.split(',').map(Number) : Array.from({ length: Math.floor((to - from) / STEP) + 1 }, (_, i) => from + i * STEP);
  for (const [i, f] of list.entries()) {
    const url = await page.evaluate((t) => window.__frame(t), f / FPS);
    await sharp(Buffer.from(url.split(',')[1], 'base64')).resize(W, H, { kernel: 'lanczos3' }).png()
      .toFile(path.join(dir, `f${String(f).padStart(4, '0')}.png`));
    const done = i + 1, left = list.length - done;
    const each = (Date.now() - t0) / done;
    console.log(`${cut}: frame ${f}/${total - 1}, ${(each / 1000).toFixed(1)} s each, ~${((each * left) / 60000).toFixed(0)} min left`);
  }
  await browser.close();
  server.close();
}

if (((from === 0 && to === total - 1) && !process.env.FRAMES) || process.env.ENCODE) {
  const out = path.join(ROOT, 'film', `${name}${PREVIEW ? '' : '-master'}.mp4`);
  // Frames are numbered by their time, so a stepped preview is read as a sequence of those numbers.
  const list = path.join(dir, 'frames.txt');
  const frames = fs.readdirSync(dir).filter((f) => /^f\d{4}\.png$/.test(f)).sort();
  fs.writeFileSync(list, frames.map((f) => `file '${f}'\nduration ${STEP / FPS}`).join('\n') + '\n');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-r', String(FPS),
    '-c:v', 'libx264', '-crf', '8', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out]);
  console.log(`master → ${path.relative(ROOT, out)}`);
}

if (process.env.WEB) {
  // The page's files, with the same settings as video/render.mjs.
  const base = path.join(SITE, 'public/about/orbit', `opening-${cut}`);
  const input = ['-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png')];
  const color = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
  const vf = ['-vf', `scale=${PREVIEW ? `${W * 2}:${H * 2}` : `${W}:${H}`}:flags=lanczos:out_color_matrix=bt709:out_range=tv`];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, ...vf, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
    '-pix_fmt', 'yuv420p', ...color, '-movflags', '+faststart', `${base}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, ...vf, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', ...color, `${base}.webm`]);
  const first = path.join(dir, 'f0000.png');
  await sharp(first).resize(PREVIEW ? W * 2 : W, PREVIEW ? H * 2 : H).webp({ quality: 80 }).toFile(`${base}.webp`);
  await sharp(first).resize(PREVIEW ? W * 2 : W, PREVIEW ? H * 2 : H).avif({ quality: 52, effort: 6 }).toFile(`${base}.avif`);
  const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
  console.log(`web: mp4 ${kb(`${base}.mp4`)} · webm ${kb(`${base}.webm`)} · poster ${kb(`${base}.webp`)} / ${kb(`${base}.avif`)}${PREVIEW ? ' (from the PREVIEW frames: for review only)' : ''}`);
}

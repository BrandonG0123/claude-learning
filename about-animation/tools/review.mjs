#!/usr/bin/env node
/**
 * Record the real About page's whole opening as a visitor would see it, frame
 * by frame, with its sound: the film, the live scene over it, the labels and
 * their transitions, then the settled page. For watching and critiquing, on a
 * machine too slow to play it live.
 *
 *   node tools/review.mjs                 1600x900 stage → film/review-wide.mp4
 *   node tools/review.mjs --phone         390x844 → film/review-phone.mp4
 *   FPS=15 FROM=3 TO=6 node tools/review.mjs   a quicker or shorter look
 *
 * Needs the site built (npm run build in ../brandongreene-site), with the film
 * in public/about/orbit/ (or a preview of it there, for a review).
 *
 * The page's clock is held (window.__orbitCapture) and stepped one frame at a
 * time with its own seek(t, dt). Headless Chromium here won't repaint a paused
 * video after a seek, so the film's own frames (film/<cut>/ or, failing that,
 * film/<cut>-preview/) are shown in the video's place, in the same box and
 * with the same CSS. CSS transitions are paused and stepped by the
 * same amount, so labels fade in time with the score however long a frame
 * takes to draw. The sound is the page's own score, rendered offline.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = '/home/user/brandongreene-site';
const req = createRequire(`${SITE}/package.json`);
const { chromium } = req('playwright');
const { serveDist } = await import(`${SITE}/scripts/lib/serve.mjs`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phone = process.argv.includes('--phone');
const view = phone ? { width: 390, height: 844 } : { width: 1600, height: 968 };
const scale = Number(process.env.SCALE ?? (phone ? 2 : 1));
const FPS = Number(process.env.FPS ?? 30);
const FROM = Number(process.env.FROM ?? 0);
const TO = Number(process.env.TO ?? 12.4);
const name = process.env.NAME ?? `review-${phone ? 'phone' : 'wide'}`;
const dir = path.join(ROOT, 'film', name);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

process.chdir(SITE);
const { server, port } = await serveDist('dist', 4398 + Math.floor(Math.random() * 400));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-watchdog', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: view, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.log('ERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log(`[${m.type()}] ${m.text()}`); });
await page.addInitScript(() => { window.__orbitCapture = { film: true }; });
await page.goto(`http://localhost:${port}/about/`, { waitUntil: 'load' });
await page.waitForSelector('[data-orbit][data-captured]', { timeout: 300_000 });
await page.evaluate(() => document.fonts.ready);
const stage = page.locator('[data-orbit-stage]');

// The film's frames, standing in for the video element.
const cut = phone ? '9x16' : '16x9';
const filmDir = [path.join(ROOT, 'film', cut), path.join(ROOT, 'film', `${cut}-preview`)]
  .find((d) => fs.existsSync(path.join(d, 'f0113.png')));
if (!filmDir) throw new Error(`no film frames for ${cut}: render them with tools/film.mjs first`);
console.log(`film frames from ${path.relative(ROOT, filmDir)}`);
await page.evaluate(() => {
  const v = document.querySelector('[data-orbit-film]');
  const img = document.createElement('img');
  img.className = 'orbit__film';
  // Astro scopes the component's CSS by attribute: carry it over.
  for (const a of v.attributes) if (a.name.startsWith('data-astro-cid')) img.setAttribute(a.name, a.value);
  img.dataset.reviewFilm = '';
  img.alt = '';
  v.after(img);
  v.style.display = 'none';
  // As when the film is playing: the poster is gone under it.
  document.querySelector('[data-orbit]').classList.add('orbit--running');
});
const sharp = req('sharp');
const filmFrame = async (t) => {
  const f = Math.min(113, Math.max(0, Math.round(t * 30)));
  const jpg = await sharp(path.join(filmDir, `f${String(f).padStart(4, '0')}.png`)).jpeg({ quality: 92 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString('base64')}`;
};

// The soundtrack first (it doesn't depend on the frames).
const wav = path.join(dir, 'sound.wav');
const audio = await page.evaluate(async (d) => {
  const s = await document.querySelector('[data-orbit]').__orbit.soundtrack(d);
  return { sampleRate: s.sampleRate, l: Array.from(s.channels[0]), r: Array.from(s.channels[1]) };
}, TO - FROM + 0.5);
{
  const n = audio.l.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(audio.sampleRate, 24);
  buf.writeUInt32LE(audio.sampleRate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, audio.l[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, audio.r[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(wav, buf);
}

const frames = Math.round((TO - FROM) * FPS);
const t0 = Date.now();
for (let f = 0; f <= frames; f++) {
  const t = FROM + f / FPS;
  const src = t < 3.8 ? await filmFrame(t) : null;
  await page.evaluate(async ({ t, dt, src }) => {
    if (src) {
      const img = document.querySelector('[data-review-film]');
      img.src = src;
      await img.decode();
    }
    // Step every running CSS transition by one frame, then the score.
    for (const a of document.getAnimations()) {
      if (a.playState === 'running') { a.pause(); a.currentTime = 0; }
      else if (a.playState === 'paused') a.currentTime = (a.currentTime ?? 0) + dt * 1000;
    }
    await document.querySelector('[data-orbit]').__orbit.seek(t, dt);
    for (const a of document.getAnimations()) if (a.playState === 'running') { a.pause(); a.currentTime = 0; }
  }, { t, dt: f === 0 ? 1 : 1 / FPS, src });
  await stage.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`), timeout: 300_000 });
  if (f % 10 === 0) {
    const each = (Date.now() - t0) / (f + 1);
    console.log(`${name}: ${t.toFixed(2)} s (${f}/${frames}), ${(each / 1000).toFixed(1)} s a frame, ~${((each * (frames - f)) / 60000).toFixed(0)} min left`);
  }
}
await browser.close();
server.close();

const out = path.join(ROOT, 'film', `${name}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-i', wav,
  '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
  '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]);
console.log(`→ ${path.relative(ROOT, out)}`);

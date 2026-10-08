#!/usr/bin/env node
/**
 * Render the About opening's sound offline (the page's own score, as it would
 * play) to a WAV, and print its loudness: film/sound.wav.
 *
 *   node tools/sound.mjs [seconds]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = '/home/user/brandongreene-site';
const req = createRequire(`${SITE}/package.json`);
const { chromium } = req('playwright');
const { serveDist } = await import(`${SITE}/scripts/lib/serve.mjs`);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dur = Number(process.argv[2] ?? 12.5);

process.chdir(SITE);
const { server, port } = await serveDist('dist', 4398 + Math.floor(Math.random() * 400));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => { window.__orbitCapture = true; });
await page.goto(`http://localhost:${port}/about/`, { waitUntil: 'load' });
await page.waitForSelector('[data-orbit][data-captured]', { timeout: 300_000 });
const a = await page.evaluate(async (d) => {
  const s = await document.querySelector('[data-orbit]').__orbit.soundtrack(d);
  return { sampleRate: s.sampleRate, l: Array.from(s.channels[0]), r: Array.from(s.channels[1]) };
}, dur);
await browser.close();
server.close();

const n = a.l.length, buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(a.sampleRate, 24);
buf.writeUInt32LE(a.sampleRate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, a.l[i])) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, a.r[i])) * 32767), 46 + i * 4);
}
const out = path.join(ROOT, 'film', 'sound.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
// ffmpeg's EBU R128 meter writes its summary to stderr.
const meter = spawnSync('ffmpeg', ['-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const pick = (k) => meter.match(new RegExp(`${k}:\\s+(-?[\\d.]+)`, 'g'))?.pop()?.split(/\s+/).pop();
console.log(`→ ${path.relative(ROOT, out)}: ${pick('I')} LUFS integrated, peak ${pick('Peak')} dBFS`);

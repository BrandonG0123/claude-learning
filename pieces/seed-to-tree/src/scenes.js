
// =====================================================================
//  SEED TO TREE — scenes. 9:16 world coords (1080x1920), on 2s (TT), events with ev / popS.
//  The hero is the spark: the life asleep in the acorn. Its rays tell time: 5 asleep, 6 at the sprout, 8 in the
//  sapling, 12 as the crown's heart. Orange is the spark's and nobody else's.
//  Each scene: a full-bleed world, the spark acting, 3+ details of background life, a tag and one caption.
// =====================================================================
const CU = () => TIMELINE.cues;
function wall(c, p, key) { cut(rect(-30, -30, W + 60, H + 60, 0), c, { key: 'wall' + (key ?? c), shadow: false, tear: 0, pat: p, grain: 0.8, shade: false }); }
// tags and captions go through DEFER (screen space, after the camera), popped / written on at their own cue
function tagAt(str, t0) { const f = () => tag(str, 70 + (handW(str, 80) + 72) / 2, SAFE.top + 90, 80, { rot: -0.04, s: popS(t0) }); if (DEFER) DEFER.push(f); else f(); }
function capAt(str, t0, d = 0.6) { const f = () => tag(str, CX, H - SAFE.bottom - 60, 50, { rot: 0.012, tape: false, frac: ev(t0, d) }); if (DEFER) DEFER.push(f); else f(); }
// ---- shared props
function cloud(x, y, s, key, c = '#ffffff') {
  cut(ellipsePts(x, y, 90 * s, 34 * s, 0, 22), c, { key: key + 'a', sb: 6 });
  cut(ellipsePts(x - 30 * s, y - 18 * s, 44 * s, 30 * s, 0, 18), c, { key: key + 'b', sb: 4 });
  cut(ellipsePts(x + 26 * s, y - 22 * s, 52 * s, 36 * s, 0, 18), c, { key: key + 'c', sb: 4 });
}
function birdFly(x, y, s, key, c = PAL.ink) { const f = Math.sin(TT * 9 + key.length) * 10 * s; ink([[x - 30 * s, y - f], [x, y + 6 * s], [x + 30 * s, y - f]], { w: 4 * s, color: c, amt: 0.4, key: key + 'w' }); }
function birdSit(x, y, s, key, c = '#5a6a86') {
  cut(ellipsePts(x, y - 22 * s, 26 * s, 22 * s, 0, 20), c, { key: key + 'b', sb: 4 });
  dot(x + 10 * s, y - 30 * s, 3.5 * s);
  cut([[x + 22 * s, y - 28 * s], [x + 36 * s, y - 24 * s], [x + 22 * s, y - 20 * s]], PAL.yellow, { key: key + 'k', shadow: false });
  ink([[x - 8 * s, y - 2 * s], [x - 8 * s, y + 10 * s]], { w: 3 * s, color: PAL.ink, key: key + 'l1' }); ink([[x + 6 * s, y - 2 * s], [x + 6 * s, y + 10 * s]], { w: 3 * s, color: PAL.ink, key: key + 'l2' });
}
function snail(sx, sy, key) {
  cut(ellipsePts(sx, sy - 26, 34, 30, 0, 24), PAL.mustard, { key: key + 's', pat: pat.stripes('rgba(120,70,20,0.35)', 4, 14, 0.8) });
  cut(capsulePts(sx - 30, sy - 6, sx + 46, sy - 10, 18), '#c9a27a', { key: key + 'b', sb: 3 });
  ink([[sx + 40, sy - 18], [sx + 54, sy - 44]], { w: 3, color: PAL.ink, key: key + 'a1' }); ink([[sx + 46, sy - 16], [sx + 66, sy - 36]], { w: 3, color: PAL.ink, key: key + 'a2' });
  dot(sx + 56, sy - 46, 3.5); dot(sx + 68, sy - 38, 3.5);
}
// an acorn: centre (x, y), r = half its height. The body, an optional kernel window (the cross-section), the cap, a stalk.
function acornBody(x, y, r) { return ellipsePts(x, y + r * 0.15, r * 0.72, r * 0.85, 0, 48); }
function acorn(x, y, r, key, o = {}) {
  cut(acornBody(x, y, r), o.body ?? '#a9743f', { key: key + 'b', crayon: '#7a4a22', crAl: 0.35 });
  if (o.kernel) cut(ellipsePts(x, y + r * 0.26, r * 0.5, r * 0.6, 0, 30), '#efdcb4', { key: key + 'k', shadow: false, grain: 0.5 });
  if (o.inside) o.inside();
  cut([[x - r * 0.84, y - r * 0.3], [x - r * 0.72, y - r * 0.74], [x, y - r * 0.96], [x + r * 0.72, y - r * 0.74], [x + r * 0.84, y - r * 0.3], [x + r * 0.62, y - r * 0.16], [x - r * 0.62, y - r * 0.16]], '#6e4323', { key: key + 'c', pat: pat.dots('rgba(255,235,200,0.35)', Math.max(2, r * 0.045), Math.max(8, r * 0.16)), sb: 6 });
  cut(capsulePts(x, y - r * 0.9, x + r * 0.1, y - r * 1.28, r * 0.13), '#5a3a22', { key: key + 's', sb: 3 });
}

// ---- beat 1, day 1: underground. A cross-section: a strip of rainy sky, the turf, the soil with the acorn asleep in it.
const SEED = [470, 1000, 185];   // the acorn (bridge 1's A)
function sceneSeed() {
  const cu = CU(), [ax, ay, ar] = SEED;
  wall('#5a3620', (bb) => { pat.dots('rgba(255,220,180,0.10)', 5, 64)(bb); }, 'soil');
  // the rainy sky
  cut([[-30, -30], [W + 30, -30], [W + 30, 470], [900, 500], [700, 480], [500, 505], [300, 485], [100, 500], [-30, 480]], '#b9d3e2', { key: 'sky1', shadow: false, tear: 0, pat: pat.stripes('rgba(255,255,255,0.10)', 20, 90) });
  cloud(230, 150 + Math.sin(TT * 0.7) * 6, 1.1, 'cl1a', '#dde9f0'); cloud(760, 210 + Math.cos(TT * 0.5) * 6, 1.3, 'cl1b', '#d4e2ea');
  const R = RNG('rain');
  for (let i = 0; i < 30; i++) { const x = R.r(-20, W + 20), sp = R.r(900, 1500), ph = R.r(0, 600), y = -60 + mod(ph + TT * sp, 580); if (y < 460) ink([[x, y], [x - 5, y + 44]], { w: 4, color: 'rgba(255,255,255,0.8)', amt: 0.3, key: 'rd' + i }); }
  cut(ellipsePts(770, 478, 110 + Math.sin(TT * 3) * 6, 10, 0, 24), '#dcecf4', { key: 'puddle', shadow: false, grain: 0.3, shade: false });
  for (let k = 0; k < 3; k++) { const u = mod(TT * 0.9 + k / 3, 1); ink(ellipsePts(770, 478, 20 + u * 90, 3 + u * 7, 0, 24), { closed: true, w: 2, color: `rgba(255,255,255,${(0.7 * (1 - u)).toFixed(2)})`, amt: 0.3, key: 'rip' + k }); }
  // the turf and its grass
  cut([[-30, 455], [W + 30, 455], [W + 30, 540], [-30, 540]], PAL.green, { key: 'turf', tear: 2.0, sy: 4, pat: pat.stripes('rgba(255,255,255,0.14)', 4, 18, 0.25) });
  for (let i = 0; i < 14; i++) { const x = 20 + i * 78 + (i % 3) * 9; cut([[x - 12, 466], [x + 2, 400 + (i % 2) * 16 + Math.sin(TT * 2 + i) * 4], [x + 16, 466]], PAL.greenD, { key: 'gt' + i, shadow: false, sb: 2 }); }
  // roots dangling from the turf, pebbles, a beetle, the worm
  for (let i = 0; i < 6; i++) { const x = 90 + i * 170; ink([[x, 540], [x + 10, 600 + i * 7], [x - 6, 680 + (i % 2) * 40], [x + 8, 740 + (i % 3) * 20]], { w: 5, color: '#e9d7b4', amt: 1.2, key: 'rt' + i }); }
  const P = RNG('peb'); for (let i = 0; i < 16; i++) { const x = P.r(40, 1040), y = P.r(600, 1750), rx = P.r(16, 36), ry = P.r(10, 22), a = P.r(0, 3); if (Math.hypot(x - ax, y - ay) < 330) continue; cut(ellipsePts(x, y, rx, ry, a, 14), i % 2 ? '#8b6a4c' : '#a3836a', { key: 'pb' + i, sb: 4, grain: 0.5 }); }
  { const bx = 830 + Math.sin(TT * 1.3) * 30, by = 1230; cut(ellipsePts(bx, by, 30, 22, 0.2, 16), '#2e2a3a', { key: 'btl', sb: 3 }); [-1, 1].forEach((d) => [0, 1, 2].forEach((k) => ink([[bx + (k - 1) * 14, by + d * 12], [bx + (k - 1) * 20 + Math.sin(TT * 12 + k) * 4, by + d * 30]], { w: 2.5, color: '#2e2a3a', key: 'bl' + d + k }))); dot(bx + 26, by - 4, 3, '#fff'); }
  for (let k = 0; k <= 8; k++) { const wx = 100 + k * 24, wy = 1285 + Math.sin(k * 0.8 + TT * 3) * 20; cut(ellipsePts(wx, wy, 22, 19, 0, 16), k === 8 ? PAL.pinkL : PAL.pink, { key: 'wm' + k, shadow: k === 0, sb: 4, grain: 0.4 }); if (k === 8) face(wx + 2, wy, 0.4, 'smile'); }
  snail(120 + Math.min(TT, 5) * 16, 456, 'sn1');
  // the acorn, cut open: the spark asleep in the kernel, it stirs at cues.wake. A root pokes out at cues.root.
  ink([[ax, ay + ar], [ax + 8, ay + ar + 80], [ax - 10, ay + ar + 150], [ax + 6, ay + ar + 230]], { w: 9, color: '#efe3c8', amt: 0.8, key: 'root', frac: ev(cu.root, 1.6) });
  ink([[ax - 2, ay + ar + 130], [ax - 40, ay + ar + 170], [ax - 56, ay + ar + 210]], { w: 5, color: '#efe3c8', amt: 0.8, key: 'root2', frac: ev(cu.root + 0.8, 0.8) });
  const awake = TT >= cu.wake;
  acorn(ax, ay, ar, 'seed', { kernel: true, inside: () => spark(ax, ay + 50, 70, { rays: 5, mood: awake ? 'wow' : 'focus', key: 'spSeed', s: 0.92 + 0.08 * popS(cu.wake) }) });
  if (!awake) { const zf = mod(TT * 16, 40); handText('z', ax + 190, ay - 60 - zf, 34, 'rgba(255,245,220,0.85)', { key: 'z1' }); handText('z', ax + 216, ay - 92 - zf, 26, 'rgba(255,245,220,0.6)', { key: 'z2' }); }
  else [[ax - 190, ay - 40], [ax + 190, ay - 70], [ax + 150, ay + 150]].forEach(([x, y], i) => sparkle(x, y, (12 + i * 2) * (0.6 + 0.4 * ((B + i) % 2)), '#fff3c4'));
  yearTag('day 1');
  capStrip('a seed waits');
}

// ---- beat 2, week 6: the surface, close up. The shell splits, a two-leaf sprout, the spark peeks out; the sun comes out.
const SHELL_R = () => ellipsePts(566, 1236, 96, 118, 0.42, 64);      // bridge 1's B: the standing half of the split shell
const LEAF_L = [350, 935, 150, 70, -0.45], LEAF_R = [590, 935, 150, 70, 0.45];
function leaf(x, y, rx, ry, a, k, key, c = PAL.green) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
  cut(ellipsePts(x, y, rx, ry, a, 40), c, { key, crayon: '#3f8a46', crAl: 0.3, pat: pat.stripes('rgba(255,255,255,0.10)', 3, 16, a + 0.4) });
  ink([[x - Math.cos(a) * rx * 0.9, y - Math.sin(a) * rx * 0.9], [x + Math.cos(a) * rx * 0.9, y + Math.sin(a) * rx * 0.9]], { w: 4, color: 'rgba(40,90,45,0.5)', amt: 0.4, key: key + 'v' });
  ctx.restore();
}
function sceneSprout() {
  const cu = CU(), sun = EZ.o3(ev(cu.sun, 0.8));
  wall('#cfe2ee', pat.stripes('rgba(255,255,255,0.12)', 24, 100), 'sky2');
  // the sun, hidden by two clouds that part at cues.sun
  cut(ellipsePts(800, 440, 96, 96, 0, 40), PAL.yellow, { key: 'sun2', crayon: '#e6b23a', sb: 14, shc: 'rgba(246,207,85,0.5)' });
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + TT * 0.15; cut(capsulePts(800 + Math.cos(a) * 120, 440 + Math.sin(a) * 120, 800 + Math.cos(a) * (150 + (i % 2) * 20), 440 + Math.sin(a) * (150 + (i % 2) * 20), 14), PAL.yellow, { key: 'sr' + i, shadow: false, grain: 0.4 }); }
  cloud(690 - 330 * sun, 430, 2.2, 'cla', '#f4f8fb'); cloud(930 + 330 * sun, 470, 1.9, 'clb', '#eef4f8'); cloud(180, 300 + Math.sin(TT * 0.6) * 8, 1.4, 'clc', '#f4f8fb');
  // the last raindrops, then a bird crosses
  const R = RNG('rain2');
  if (TT < cu.sun) for (let i = 0; i < 14; i++) { const x = R.r(-20, W + 20), sp = R.r(900, 1500), ph = R.r(0, 600), y = -60 + mod(ph + TT * sp, 1300); if (y < 1200) ink([[x, y], [x - 5, y + 40]], { w: 4, color: 'rgba(255,255,255,0.7)', amt: 0.3, key: 'rd2' + i }); }
  if (TT >= cu.bird) { const u = (TT - cu.bird) / 2.4; birdFly(-60 + u * 1200, 620 - Math.sin(u * 3) * 60, 1.4, 'bf'); }
  // the soil band, close: big tufts of grass along its edge, the snail back from the first beat
  cut([[-30, 1250], [120, 1232], [330, 1256], [560, 1236], [800, 1258], [1110, 1240], [1110, 2000], [-30, 2000]], '#6b4226', { key: 'soil2', sy: -4, pat: pat.dots('rgba(255,220,180,0.12)', 6, 70) });
  for (let i = 0; i < 9; i++) { const x = -10 + i * 135; if (Math.abs(x - 470) < 170) continue; [[-26, 0.9], [0, 1], [24, 0.8]].forEach(([dx, h], k) => cut([[x + dx - 14, 1262], [x + dx + 2 + Math.sin(TT * 1.8 + i + k) * 6, 1262 - 150 * h], [x + dx + 18, 1262]], k === 1 ? PAL.green : PAL.greenD, { key: 'tuft' + i + k, sb: 3, shadow: k === 1 })); }
  snail(150, 1246, 'sn2');
  // the sprout: the stem grows, the leaves pop, dew and a ladybird settle on them
  const g = EZ.o2(ev(5.0, 1.1));
  cut(capsulePts(470, 1250, 470, 1250 - 330 * g, 26), PAL.greenD, { key: 'stem', sb: 5 });
  leaf(...LEAF_L, popS(cu.leaves), 'leafL'); leaf(...LEAF_R, popS(cu.leaves + E8), 'leafR');
  if (TT > cu.leaves + 0.5) [[300, 905], [630, 900]].forEach(([x, y], i) => { cut(ellipsePts(x, y, 14, 18, 0, 14), 'rgba(255,255,255,0.85)', { key: 'dew' + i, shadow: false, grain: false, shade: false }); dot(x - 4, y - 6, 3, '#fff'); });
  if (TT > cu.bird) { const lx = 560 + Math.min(1, (TT - cu.bird) / 2) * 60, ly = 905; cut(ellipsePts(lx, ly, 22, 17, 0.3, 16), '#d4382c', { key: 'lady', sb: 3 }); dot(lx - 8, ly - 4, 4, '#1d1a22'); dot(lx + 6, ly + 3, 4, '#1d1a22'); dot(lx + 2, ly - 8, 3, '#1d1a22'); cut(ellipsePts(lx + 18, ly - 4, 8, 7, 0, 10), '#1d1a22', { key: 'ladyh', shadow: false }); }
  // the split shell: the left half tipped over, the right half standing (bridge 1's B), its cap still on
  cut(ellipsePts(372, 1248, 96, 118, -0.95, 48), '#a9743f', { key: 'shL', crayon: '#7a4a22', crAl: 0.35 });
  cut(ellipsePts(392, 1178, 60, 40, -0.9, 20), '#efdcb4', { key: 'shLin', shadow: false, grain: 0.5 });
  cut(SHELL_R(), '#a9743f', { key: 'shR', crayon: '#7a4a22', crAl: 0.35 });
  cut([[540, 1150], [560, 1105], [614, 1085], [670, 1100], [690, 1145], [660, 1160], [560, 1165]], '#6e4323', { key: 'capR', pat: pat.dots('rgba(255,235,200,0.35)', 5, 16), sb: 5 });
  // the spark peeks out between the halves and climbs a little
  spark(470, 1150 - 60 * EZ.o3(ev(cu.peek, 0.5)), 68, { rays: 6, mood: TT < cu.sun + 0.4 ? 'wow' : 'happy', key: 'spSprout', s: popS(cu.peek) });
  yearTag('week 6');
  capStrip('a sprout');
}

// ---- beat 3, years 1 to 5: a meadow. The sapling steps up a year per tick; the sky and the field change with the years.
const CROWN = () => ellipsePts(470, 1020, 112, 96, 0, 64);   // bridge 2's B: the sapling's first crown (year 1)
const YEAR = () => CU().years.filter((t) => TT >= t - 1e-6).length;   // 1..5
const SKY3 = ['#bfe0ee', '#8fc3dc', '#f0c48a', '#e7eef3', '#b5dcec'], FIELD3 = [PAL.green, '#4f9a52', PAL.mustard, PAL.snow, PAL.green];
function sceneSapling() {
  const cu = CU(), k = Math.max(1, YEAR()), yi = k - 1, hush = TT >= cu.hush;
  const flick = yi > 0 && TT < cu.years[yi] + 0.25 && B % 2 === 1;   // a flicker on 2s right after each tick
  wall(flick ? SKY3[yi - 1] : SKY3[yi], pat.stripes('rgba(255,255,255,0.10)', 26, 110), 'sky3');
  cloud(200, 330 + Math.sin(TT * 0.5) * 6, 1.3, 'c3a'); cloud(820, 400 + Math.cos(TT * 0.4) * 6, 1.1, 'c3b');
  if (yi === 1 || yi === 4) cut(ellipsePts(880, 360, 70, 70, 0, 36), PAL.yellow, { key: 'sun3', crayon: '#e6b23a' });
  // distant hills, a fence, the field
  cut([[-30, 1140], [200, 1080], [460, 1120], [700, 1060], [1110, 1110], [1110, 1400], [-30, 1400]], yi === 3 ? '#dfe8ee' : '#7fb37a', { key: 'hills3', sy: -4, pat: pat.stripes('rgba(255,255,255,0.12)', 4, 20, 0.3) });
  for (let i = 0; i < 7; i++) { const x = 60 + i * 160; cut(rect(x - 10, 1120, 20, 110, 4), PAL.woodL, { key: 'fp' + i, sb: 4 }); }
  cut(rect(-30, 1150, W + 60, 16, 3), PAL.woodL, { key: 'rail1', shadow: false }); cut(rect(-30, 1195, W + 60, 16, 3), PAL.woodL, { key: 'rail2', shadow: false });
  cut([[-30, 1250], [300, 1230], [600, 1260], [1110, 1240], [1110, 2000], [-30, 2000]], FIELD3[yi], { key: 'field3', sy: -4, pat: pat.stripes('rgba(255,255,255,0.14)', 4, 22, 0.3) });
  if (yi !== 3) for (let i = 0; i < 7; i++) { const x = 70 + i * 150 + (i % 2) * 30, y = 1330 + (i % 3) * 50; if (Math.abs(x - 470) < 150) continue; ink([[x, y + 50], [x, y]], { w: 5, color: PAL.greenD, key: 'fst' + i }); for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; cut(ellipsePts(x + Math.cos(a) * 18, y + Math.sin(a) * 18, 14, 10, a, 10), [PAL.pink, '#ffffff', PAL.purple][i % 3], { key: 'fpt' + i + p, sb: 3 }); } cut(ellipsePts(x, y, 9, 9, 0, 10), PAL.yellow, { key: 'fmid' + i, shadow: false }); }
  if (yi === 3) { const S = RNG('snow3'); for (let i = 0; i < 90; i++) { const x = S.r(-10, W + 10) + Math.sin(TT * 1.3 + i) * 10, r = S.r(4, 11), y = 200 + mod(S.r(0, 1500) + TT * (60 + r * 6), 1500); dot(x, y, r, 'rgba(255,255,255,0.92)'); } }
  // the stake and its tie, a watering can
  cut(rect(548, 1000, 22, 320, 4), PAL.woodD, { key: 'stake' }); cut([[520, 1090], [600, 1080], [596, 1104], [524, 1114]], PAL.pink, { key: 'tie', sb: 3 });
  { const cx = 790, cy = 1330; ink(arcPts(cx, cy - 60, 54, Math.PI, TAU, 10), { w: 10, color: PAL.teal, key: 'handle' }); cut(rect(cx - 70, cy - 60, 140, 110, 10), PAL.teal, { key: 'can', pat: pat.stripes('rgba(255,255,255,0.2)', 8, 24) }); cut(capsulePts(cx + 60, cy - 40, cx + 150, cy - 110, 18), PAL.teal, { key: 'spout', sb: 3 }); cut(ellipsePts(cx + 155, cy - 118, 24, 14, 0.6, 12), PAL.teal, { key: 'rose', sb: 3 }); }
  // the sapling: a trunk that steps up with the years, a branch and a leaf cluster per year, the crown on top
  const h = [300, 390, 470, 550, 620][yi], top = 1300 - h, tw = 14 + k * 4;
  cut([[470 - tw, 1300], [470 - tw * 0.6, top + 40], [470 + tw * 0.6, top + 40], [470 + tw, 1300]], PAL.woodD, { key: 'trunk3', crayon: '#5a3a22', crAl: 0.3 });
  for (let j = 0; j < k; j++) { const by = 1300 - 120 - j * 95, d = j % 2 ? 1 : -1, bx = 470 + d * (60 + j * 18); ink([[470, by + 20], [bx, by]], { w: 7, color: PAL.woodD, amt: 0.5, key: 'br' + j }); [[0, 0], [-22, -18], [20, -22]].forEach(([dx, dy], q) => cut(ellipsePts(bx + dx * d, by + dy, 34, 22, d * 0.5 + q * 0.4, 16), q ? PAL.green : PAL.greenD, { key: 'lf' + j + q, sb: 3 })); }
  const cr = 1 + yi * 0.22;
  cut(ellipsePts(470, top + 20 * cr, 112 * cr, 96 * cr, 0, 40), PAL.green, { key: 'crown3', crayon: '#3f8a46', crAl: 0.3, pat: pat.dots('rgba(255,255,255,0.12)', 5, 30) });
  cut(ellipsePts(410, top + 60 * cr, 70 * cr, 52 * cr, 0.3, 24), PAL.greenD, { key: 'crown3b', sb: 4 }); cut(ellipsePts(540, top + 50 * cr, 64 * cr, 50 * cr, -0.3, 24), '#7bb661', { key: 'crown3c', sb: 4 });
  // the spark sits on the first branch, patient; in the hush it looks up
  spark(372, 1300 - 120 - 56, 70, { rays: 8, mood: hush ? 'wow' : 'smile', key: 'spSap' });
  // a bird on the stake from year 3, a butterfly in the summers
  if (k >= 3) birdSit(559, 1000, 1, 'b3');
  if (yi === 1 || yi === 4) { const bx = 760 + Math.sin(TT * 1.1) * 90, by = 760 + Math.cos(TT * 1.7) * 50, f = Math.abs(Math.sin(TT * 10)); cut(ellipsePts(bx - 16 * f - 4, by, 18 * f + 4, 14, 0.3, 12), PAL.purple, { key: 'bw1', sb: 3 }); cut(ellipsePts(bx + 16 * f + 4, by, 18 * f + 4, 14, -0.3, 12), PAL.purple, { key: 'bw2', sb: 3 }); dot(bx, by, 5); }
  tagAt(`year ${k}`, cu.years[yi]);
  capStrip('a sapling, year after year');
}

// ---- beat 4, year 40: the tree, wide and low. The spark is the crown's heart. The first acorn falls, and the loop closes.
function sceneTree() {
  const cu = CU(), k = springMove(14.0, 0.93, 1, SPRING.heavy);
  wall('#8fc3dc', pat.stripes('rgba(255,255,255,0.10)', 26, 110), 'sky4');
  cloud(150, 1180 + Math.sin(TT * 0.4) * 5, 1.2, 'c4a'); cloud(960, 1120 + Math.cos(TT * 0.3) * 5, 1.0, 'c4b');
  // the hill, the ground
  cut([[-30, 1300], [250, 1250], [600, 1290], [1110, 1240], [1110, 2000], [-30, 2000]], '#7fb37a', { key: 'hill4', sy: -4, pat: pat.stripes('rgba(255,255,255,0.12)', 4, 20, 0.3) });
  cut([[-30, 1480], [300, 1460], [700, 1490], [1110, 1470], [1110, 2000], [-30, 2000]], PAL.green, { key: 'ground4', sy: -4, pat: pat.stripes('rgba(255,255,255,0.14)', 4, 22, 0.3) });
  // the trunk and its roots
  cut([[400, 1000], [330, 1300], [250, 1500], [230, 1560], [700, 1560], [690, 1500], [610, 1300], [540, 1000]], PAL.woodD, { key: 'trunk4', pat: pat.grainWood('rgba(60,30,10,0.25)'), crayon: '#5a3a22', crAl: 0.25 });
  [[-1, 120], [1, 150], [-1, 60]].forEach(([d, L], i) => cut(capsulePts(470 + d * 200, 1540, 470 + d * (200 + L), 1560 + i * 6, 30), PAL.woodD, { key: 'root4' + i, sb: 4 }));
  // the canopy: overlapping cut-paper blobs bleeding off the frame, scaled by a heavy spring from the slam
  ctx.save(); ctx.translate(470, 640); ctx.scale(k, k); ctx.translate(-470, -640);
  cut(ellipsePts(470, 640, 640, 430, 0, 64), PAL.greenD, { key: 'can0', crayon: '#2f6a38', crAl: 0.3 });
  [[150, 560, 260, 200, PAL.green], [800, 540, 280, 210, PAL.green], [470, 380, 300, 190, '#7bb661'], [300, 820, 260, 170, '#4f9a52'], [680, 860, 280, 170, PAL.green], [-20, 760, 220, 160, '#7bb661'], [980, 760, 230, 170, '#4f9a52'], [470, 650, 300, 220, '#8cc26b']]
    .forEach(([x, y, rx, ry, c], i) => cut(ellipsePts(x, y, rx, ry, (i % 3 - 1) * 0.2, 40), c, { key: 'can' + (i + 1), sb: 8, pat: i % 2 ? pat.dots('rgba(255,255,255,0.14)', 6, 36) : pat.stripes('rgba(255,255,255,0.10)', 4, 24, 0.5 + i * 0.3) }));
  // the spark: the crown's heart
  spark(470, 650, 150, { rays: 12, mood: TT < 15.0 ? 'wow' : 'happy', key: 'spTree' });
  [[250, 520], [700, 460], [760, 800], [200, 780]].forEach(([x, y], i) => sparkle(x, y, (14 + i * 3) * (0.6 + 0.4 * ((B + i) % 2)), '#fff3c4'));
  ctx.restore();
  // birds in the crown, the swing, a kid reading under the tree, the cat (asleep, of course)
  birdSit(190, 700, 1.1, 'b4a', '#5a6a86'); birdSit(300, 690, 0.9, 'b4b', '#8c7ad8');
  { const a = Math.sin(TT * 1.5) * 0.14, px = 780, py = 980, L = 400, sx = px + Math.sin(a) * L, sy = py + Math.cos(a) * L; ink([[px - 40, py], [sx - 40, sy]], { w: 5, color: '#c9b08a', amt: 0.4, key: 'rope1' }); ink([[px + 40, py], [sx + 40, sy]], { w: 5, color: '#c9b08a', amt: 0.4, key: 'rope2' }); cut(rot(rect(sx - 70, sy - 8, 140, 28, 5), sx, sy, -a), PAL.woodL, { key: 'seat', pat: pat.grainWood('rgba(120,60,20,0.25)') }); }
  person(140, 1370, 0.46, { key: 'kid', mood: 'happy', shirt: PAL.teal, skin: PAL.skin2, hair: '#2b211d', shirtPat: pat.stripes('rgba(255,255,255,0.3)', 8, 24) });
  cut(rot(rect(60, 1400, 120, 86, 6), 120, 1443, -0.12), PAL.paper, { key: 'book', pat: pat.lines('rgba(90,130,190,0.35)', 16, 10) });
  cat(820, 1500, 0.8, PAL.charcoal, 'cat4');
  // falling leaves
  const R = RNG('fall'); for (let i = 0; i < 9; i++) { const x0 = R.r(60, 1000), ph = R.r(0, 1000), sp = R.r(90, 150), y = 900 + mod(ph + TT * sp, 700); if (y > 1520) continue; cut(ellipsePts(x0 + Math.sin(TT * 2 + i) * 40, y, 22, 12, TT * 3 + i, 12), [PAL.green, PAL.mustard, '#7bb661'][i % 3], { key: 'fl' + i, sb: 3, grain: 0.3 }); }
  // the first acorn: hangs at a branch, drops at cues.drop, lands at cues.land in a puff of dust, then rests
  { const u = clamp((TT - cu.drop) / (cu.land - cu.drop)), ax0 = 660, ay0 = 1010, ay1 = 1560;
    const ay = TT < cu.drop ? ay0 + Math.sin(TT * 2) * 4 : lerp(ay0, ay1, u * u), ax = ax0 + 40 * u, ra = TT < cu.drop ? 0 : u * 4;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ra); acorn(0, 0, 52, 'acorn4'); ctx.restore();
    if (TT >= cu.land) { const w = 1 - ev(cu.land, 0.6); if (w > 0) [[-50, 0], [60, -6], [0, -30]].forEach(([dx, dy], i) => cut(ellipsePts(ax + dx * (1.6 - w), ay1 + 20 + dy * (1.6 - w), 26 * w, 14 * w, 0, 12), 'rgba(240,230,200,0.8)', { key: 'dust' + i, shadow: false, grain: false, shade: false })); } }
  tagAt('year 40', 14.0);
  if (TT < cu.title) capAt('a tree', 14.45); else capAt('slow, and then sudden.', cu.title, 0.9);
}

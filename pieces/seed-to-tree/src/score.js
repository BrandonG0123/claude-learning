  // =====================================================================
  //  SCORE BODY — runs inside buildScore() (kit/score-head.js). to = 'm' (music) or 's' (sfx). 120 BPM in D.
  //  Thin and quiet in the soil; a soft pad at the sprout; a groove that ticks the years, faster; a riser; then a
  //  hard silence 13.0–14.0; the slam at 14.0 (a stab + a sub) and a flat warm chord, the loudest stretch; it thins
  //  as the acorn falls, and the spark's motif rings on the landing into the loop.
  // =====================================================================
  const T = TIMELINE, cu = T.cues;
  const motif = (t, vel, bright = 2600, send = 0.35) => [['D4', 0], ['A4', E8]].forEach(([n, dt], i) => pluck(t + dt, nz(n), vel, 0.1 - i * 0.1, 0.6, bright, send));   // the spark: a rising fifth
  to = 'm';
  // 1 Seed (0–5): a low drone, rain plinks, one low note as the root grows, the motif muffled as the spark stirs
  drone(0.0, 4.7, nz('D2'), 0.05, { att: 1.5, rel: 0.6 });
  const RR = RNG('rainplk');
  for (let i = 0; i < 8; i++) { const t = 0.5 + i * 0.5 + RR.r(-0.04, 0.04); if (t < 4.3) pluck(t, nz(['D5', 'A5', 'Fs5', 'D6'][i % 4]), 0.05, RR.r(-0.5, 0.5), 0.3, 5200, 0.5); }
  pluck(cu.root, nz('D3'), 0.12, -0.2, 0.9, 900, 0.4);
  motif(cu.wake, 0.12, 1400, 0.3);
  // 2 Sprout (5–9.5): a soft pad in D, the motif brighter as the spark peeks out, the leaves pop, a chime for the sun, a bird
  pad(5.0, 9.4, ['D3', 'A3', 'Fs4'], 0.04, { type: 'triangle', cut: 900, att: 0.4, rel: 0.3, send: 0.4 });
  motif(cu.peek, 0.2); pluck(cu.peek + BEAT, nz('D5'), 0.16, 0.1, 0.6, 3000, 0.35);
  pluck(cu.leaves, nz('Fs5'), 0.12, -0.3, 0.4, 4200, 0.3); pluck(cu.leaves + E8, nz('A5'), 0.12, 0.3, 0.4, 4200, 0.3);
  chime(cu.sun, [nz('D6'), nz('Fs6'), nz('A6')], 0.06);
  for (let i = 0; i < 4; i++) blip(cu.bird + 0.2 + i * 0.3, 2400, 3300, 0.08, 0.05, 0.4);
  // 3 Years (9.5–13): the groove — a bass on the beats, a pad that swells, a tick and a rising note per year, a riser; every tail ends before 13.0
  pad(9.5, 12.55, ['D3', 'A3', 'D4', 'Fs4'], 0.05, { cut: 1400, att: 0.3, rel: 0.4, send: 0.15, swellTo: 0.07, swellAt: 12.2 });
  for (let t = 9.5; t < 12.5; t += BEAT) bass(t, nz(Math.round(t * 2) % 4 < 2 ? 'D2' : 'A2'), 0.18);
  cu.years.forEach((t, k) => { noiseHit(t, 0.08, 'bandpass', 2400, 3, 0.16, 0.2); pluck(t, nz(['D5', 'E5', 'Fs5', 'A5', 'B5'][k]), 0.16, 0.2, 0.4, 3600, 0); });
  riser(11.5, 12.85, 0.08);
  // 4 Hush (13–14): nothing
  // 5 Tree (14–18): the slam — a stab + a sub — then a flat warm chord (the loudest stretch), chimes and plucks for the leaves
  sub(cu.slam, 1.0);
  ['D3', 'A3', 'D4', 'Fs4', 'A4'].forEach((n, i) => pluck(cu.slam, nz(n), 0.5, -0.3 + i * 0.15, 0.5, 2400, 0.5));
  pad(cu.slam, cu.slam + 0.42, ['D3', 'A3', 'D4', 'Fs4', 'A4'], 0.3, { cut: 2600, att: 0.01, rel: 0.14, send: 0.3 });   // the stab: short and the loudest thing in the piece
  pad(14.3, 18.0, ['D3', 'A3', 'D4', 'Fs4', 'A4'], 0.1, { cut: 1800, att: 0.25, rel: 0.5, send: 0.45 });   // the flat chord after it, under the stab
  chime(14.5, [nz('D6'), nz('A6'), nz('Fs6')], 0.1); chime(15.5, [nz('Fs6'), nz('D6'), nz('A6')], 0.07);
  ['D5', 'Fs5', 'A5', 'D6', 'A5', 'Fs5'].forEach((n, i) => pluck(15.0 + i * 0.5, nz(n), 0.07, -0.4 + i * 0.16, 0.5, 3800, 0.4));
  motif(cu.title, 0.14);
  // 6 Acorn (18–20): the chord is gone; a thin low pad, a falling whistle, the motif on the landing (it rings into the loop start)
  pad(18.0, 19.9, ['D3', 'A3'], 0.03, { type: 'triangle', cut: 700, att: 0.3, rel: 0.4, send: 0.3 });
  sweep(cu.drop, cu.land, 0.02, 1800, 500, 0.2);
  motif(cu.land, 0.18, 1800, 0.5);
  to = 's';
  sweep(4.6, 4.95, 0.011, 500, 2600, 0); sweep(9.1, 9.45, 0.011, 500, 2600, 0);   // paper swishes into the morphs
  noiseHit(cu.slam, 0.5, 'lowpass', 3000, 0.8, 0.6, 0, 0.5, 300);                  // the slam's burst of leaves
  noiseHit(cu.land, 0.12, 'lowpass', 900, 0.7, 0.3);                                // the acorn's thud

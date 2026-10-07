// scene5.js — S5 GAME. SET. MATCH (f438–f599) incl. T4 part B (B layer, f438–f449) and the T5 floodlight shutdown (f591–f599).
// docs/STORYBOARD.md §4 S5 / T4 / T5. All timing keyed off gt (absolute seconds): f = gt*60 (continuous), fi = round(f) (discrete beats).
(function () {
  const TN = window.TN; const { W, H, PAL, FONTS, E, clamp, lerp, prog, hash2, rgba, lerpColor, TAU } = TN;
  TN.scenes = TN.scenes || {};
  const F = f => f / 60;

  // ---------- constants ----------
  const BASE = 600;                       // type baseline = the contact plane the ball lands on
  const HORIZON = 670;                    // the lit floor plane starts here (bottom 38 %)
  const BALL_R = 22;                      // the 44 px ball that is the period after MATCH
  const TYPE = { size: 220, family: FONTS.displayAlt, weight: 400, spacing: 4 };
  const TYPE_BOT = '#D6DCE8';             // §4 S5: glyph gradient bottom stop (storyboard literal, not a brand key)
  const RIG_X = [320, 760, 1160, 1600], RIG_Y = 40;
  const RIG_CUT = [591, 594, 594, 591];   // T5: outer pair cuts at f591, inner pair at f594
  const CONES = RIG_X.map(x => ({ x, y: RIG_Y, ang: Math.PI / 2 - ((W / 2 - x) / W) * 0.22, spread: 0.44, len: 1260 }));
  const SLAMS = [474, 492, 510];          // word hit frames (GAME. / SET. / MATCH)
  // ball contacts: [frame, squash, dust count]. f456/f468/f472 are the storyboard's bounces; the rest are the hop launches/landings around each slam
  const CONTACTS = [[456, 0.22, 12], [468, 0.12, 12], [472, 0.05, 6], [474, 0.10, 0], [480, 0.08, 6], [492, 0.10, 0], [498, 0.08, 6], [510, 0.16, 0], [516, 0.14, 8]];
  // floor camera for the faint perspective court lines (storyboard's [0,−9,1.4]→[0,4,0] leaves only the centre line inside the band; this one puts the service T, sidelines and baseline in it)
  const FLOOR_CAM = new TN.Camera().set([0, -21.5, 3.8], [0, 2, 0], 26);

  // ---------- layout (single source of truth for the period position; cached once, identical every frame) ----------
  let L = null; const mctx = TN.makeCanvas(4, 4).getContext('2d');
  function layout() {
    if (L) return L;
    const words = ['GAME.', 'SET.', 'MATCH'];
    let size = TYPE.size, sp = TYPE.spacing, gap = 37;
    const meas = () => { const o = { size, family: TYPE.family, weight: TYPE.weight, spacing: sp }; const w = words.map(s => TN.measure(mctx, s, o)); const space = TN.measure(mctx, ' ', o) + 2 * sp; return { w, space, total: w[0] + w[1] + w[2] + 2 * space + gap + 2 * BALL_R }; };
    let m = meas();
    if (m.total > 1500) { const k = (1500 - 2 * BALL_R) / (m.total - 2 * BALL_R); size *= k; sp *= k; gap *= k; m = meas(); }   // auto-fit ≤ 1500 px (ball stays 44 px)
    mctx.font = `${TYPE.weight} ${size}px ${TYPE.family}`; const cap = mctx.measureText('H').actualBoundingBoxAscent || size * 0.7;
    const left = W / 2 - m.total / 2; const x0 = left, x1 = x0 + m.w[0] + m.space, x2 = x1 + m.w[1] + m.space; const bx = x2 + m.w[2] + gap + BALL_R;
    L = { size, sp, cap, left, right: bx + BALL_R, words: [{ s: 'GAME.', x: x0, w: m.w[0] }, { s: 'SET.', x: x1, w: m.w[1] }, { s: 'MATCH', x: x2, w: m.w[2] }], ball: { x: bx, y: BASE - BALL_R } };
    TN.S4S5._period = { x: bx, y: BASE - BALL_R };
    return L;
  }
  // compute eagerly as soon as Bebas Neue is in, so scene4 and irisTravel read the same period even when a worker's first frame is a T4 frame
  if (typeof document !== 'undefined' && document.fonts && document.fonts.load) document.fonts.load('400 220px "Bebas Neue"').then(() => { try { layout(); } catch (e) { /* lazy path in render */ } });

  // ---------- ball motion (pure functions of the continuous frame f) ----------
  const para = (f, fa, fb, h) => { const m = (fa + fb) / 2, hw = (fb - fa) / 2; const u = (f - m) / hw; return h * (1 - u * u); };
  function ballH(f) {                      // height above rest in px
    if (f < 450) return 60;
    if (f < 456) return 60 * (1 - E.inQuad(prog(f, 450, 456)));          // drop from periodDrop, free fall
    if (f < 468) return para(f, 456, 468, 36);                            // first bounce, apex 36 at f462
    if (f < 472) return para(f, 468, 472, 10);                            // second bounce, apex 10 at f470, settles f472
    if (f >= 474 && f < 480) return para(f, 474, 480, 10);                // GAME. hop
    if (f >= 492 && f < 498) return para(f, 492, 498, 10);                // SET. hop
    if (f >= 510 && f < 516) return para(f, 510, 516, 24);                // MATCH hop, lands f516 for good
    return 0;
  }
  function ballSquash(f) {                 // contact squash (wide & flat), held one frame then recovering over three
    let s = 0; for (const [fc, q] of CONTACTS) { const k = f - fc; if (k >= -0.5 && k < 4) s += q * (k < 1 ? 1 : clamp(1 - (k - 1) / 3)); }
    const v = ballH(f + 0.5) - ballH(f - 0.5);                            // px/frame vertical speed → in-flight stretch
    const stretch = clamp(Math.abs(v) / 24) * 0.07 * (s > 0 ? 0 : 1);
    return clamp(s, 0, 0.3) - stretch;
  }
  function ballSpin(f) {                   // seam rotation: lively while bouncing, 10°/s once it has settled
    const t = (Math.min(f, 472) - 450) / 60; const base = 0.5 + t * 2.6;
    return f <= 472 ? base : base + ((f - 472) / 60) * (10 * Math.PI / 180);
  }

  // ---------- words ----------
  // word state for hit frame `hit`: scale 1.6 → 1.0 (inCubic over the 5 frames before the hit, continuous for the shutter), 2-frame 0.97 undershoot on the hit, alpha 0.5 → 1 by the second frame
  function wordState(f, fi, hit) {
    const ki = fi - (hit - 5); if (ki < 0) return null;
    const kf = Math.max(0, f - (hit - 5));
    const scale = kf < 5 ? 1.6 - 0.6 * E.inCubic(kf / 5) : ki < 7 ? 0.97 : 1;
    return { scale, alpha: ki === 0 ? 0.5 : 1 };
  }
  function drawWord(g, w, scale, alpha, dim) {
    const cx = w.x + w.w / 2, cy = BASE - L.cap / 2;
    g.save(); g.globalAlpha = alpha; g.translate(cx, cy); g.scale(scale, scale); g.translate(-cx, -cy);
    const o = { size: L.size, family: TYPE.family, weight: TYPE.weight, spacing: L.sp, align: 'left' };
    if (dim < 1) TN.text(g, w.s, w.x, BASE - 1, Object.assign({ color: lerpColor(PAL.ice, PAL.ink, dim) }, o));         // 1 px Flare Ice top edge (offset pass)
    const gr = g.createLinearGradient(0, BASE - L.cap, 0, BASE); gr.addColorStop(0, lerpColor(PAL.line, PAL.ink, dim)); gr.addColorStop(1, lerpColor(TYPE_BOT, PAL.ink, dim));
    TN.text(g, w.s, w.x, BASE, Object.assign({ color: gr }, o));
    g.restore();
  }
  function slamShake(fi) {                 // 6 px, 2 frames, designed (not noisy) so the stamp reads as a downward hit
    for (let i = 0; i < SLAMS.length; i++) { const k = fi - SLAMS[i]; const sgn = i % 2 ? -1 : 1; if (k === 0) return { x: -6 * sgn, y: 4, r: -0.002 * sgn }; if (k === 1) return { x: 3 * sgn, y: -2, r: 0.001 * sgn }; }
    return { x: 0, y: 0, r: 0 };
  }

  // ---------- particles ----------
  // analytic floor-dust puff: `count` specks born at t0 along x0..x1 on the floor line y, kicked upward, drag-integrated; pure function of t (same contract as TN.burst)
  function puff(ctx, t, { x0, x1, y, t0, count = 40, seed = 1, speed = [60, 300], spread = 1.3, gravity = 900, drag = 2.2, life = [0.3, 0.6], size = [1, 2.4], colors = [PAL.line, PAL.ice, PAL.mute], alpha = 0.9, op = 'screen' }) {
    if (t < t0 || t > t0 + life[1] + 0.05) return;
    ctx.save(); ctx.globalCompositeOperation = op;
    for (let i = 0; i < count; i++) {
      const age = t - t0 - hash2(i, seed) * 0.03; const Lf = lerp(life[0], life[1], hash2(i, seed + 1)); if (age < 0 || age > Lf) continue;
      const a01 = age / Lf; const ang = -Math.PI / 2 + (hash2(i, seed + 2) - 0.5) * 2 * spread; const sp = lerp(speed[0], speed[1], Math.pow(hash2(i, seed + 3), 1.4));
      const fd = (1 - Math.exp(-drag * age)) / drag; const bx = lerp(x0, x1, hash2(i, seed + 6));
      const px = bx + Math.cos(ang) * sp * fd; let py = y + Math.sin(ang) * sp * fd + 0.5 * gravity * age * age;
      const onFloor = py >= y; if (onFloor) py = y;
      const a = alpha * Math.pow(1 - a01, 1.3) * (onFloor ? 0.45 : 1); if (a <= 0.004) continue;
      ctx.globalAlpha = a; ctx.fillStyle = colors[Math.floor(hash2(i, seed + 5) * colors.length) % colors.length];
      ctx.beginPath(); ctx.arc(px, py, lerp(size[0], size[1], hash2(i, seed + 4)) * (1 - 0.5 * a01), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // floor shock ellipse (10 frames), optionally clipped to the floor side of the baseline so it never blows out over the glyphs
  function floorRing(ctx, x, y, f, f0, rMax, clipFloor) {
    const p = prog(f, f0, f0 + 10); if (p <= 0 || p >= 1) return;
    ctx.save(); if (clipFloor) { ctx.beginPath(); ctx.rect(-50, BASE - 3, W + 100, H); ctx.clip(); }
    TN.shockRing(ctx, x, y, rMax * E.outCubic(p), lerp(14, 2, p), PAL.line, 0.5 * (1 - p), 0.25);
    ctx.restore();
  }
  // 40 dust motes drifting down inside the four cones (die with their rig)
  function drawMotes(ctx, gt, rig) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = PAL.ice;
    for (let i = 0; i < 40; i++) {
      const c = i % 4; const lv = rig[c]; if (lv <= 0) continue; const cone = CONES[c];
      const v = (((hash2(i, 1) + gt * (0.012 + 0.02 * hash2(i, 3))) % 1) + 1) % 1;                       // 0 at the lamp → 1 at the floor
      const d = cone.len * v, halfW = Math.tan(cone.spread / 2) * d; const u = (hash2(i, 2) * 2 - 1) * 0.9 + Math.sin(gt * (0.5 + hash2(i, 4)) + i) * 0.08;
      const px = cone.x + Math.cos(cone.ang) * d - Math.sin(cone.ang) * halfW * u, py = cone.y + Math.sin(cone.ang) * d + Math.cos(cone.ang) * halfW * u;
      const tw = 0.6 + 0.4 * Math.sin(gt * (2 + 3 * hash2(i, 5)) + i * 1.7);
      ctx.globalAlpha = 0.32 * lv * Math.sin(Math.PI * v) * tw; ctx.beginPath(); ctx.arc(px, py, lerp(1, 2.4, hash2(i, 6)), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- lighting: rigs, beams, floor ----------
  function rigLevel(fi, gt, i) {           // 0..1 lamp brightness: 50 Hz ±2 % flicker, 1-frame 2 % dip, then the T5 cut
    const cut = RIG_CUT[i]; if (fi >= cut) return 0;
    let b = 1 + 0.02 * Math.sin(TAU * 50 * gt + i); if (fi === cut - 1) b *= 0.98; return b;
  }
  function drawRigs(ctx, rig) {
    for (let i = 0; i < 4; i++) { const b = rig[i]; if (b <= 0) continue; const x = RIG_X[i], y = RIG_Y;
      TN.glowDot(ctx, x, y, 240, PAL.ice, 0.08 * b); TN.glowDot(ctx, x, y, 64, PAL.ice, 0.38 * b); TN.glowDot(ctx, x, y, 11, PAL.white, 0.95 * b, 0.25);
      TN.lightStreak(ctx, x, y, 0, 340, 5, PAL.ice, 0.32 * b, 0.4);
    }
  }
  function drawBeams(ctx, rig) {           // soft volumetric cones: 1/3-res buffer, blurred there, composited additively
    const sc = 1 / 3, bw = Math.round(W * sc), bh = Math.round(H * sc);
    const a = TN.scratch('s5_beamsA', bw, bh); const ga = a.getContext('2d'); ga.scale(sc, sc); let any = false;
    for (let i = 0; i < 4; i++) { const b = rig[i]; if (b <= 0) continue; any = true; const c = CONES[i];
      TN.lightCone(ga, c.x, c.y, c.ang, c.spread, c.len, PAL.ice, 0.075 * b); TN.lightCone(ga, c.x, c.y, c.ang, c.spread * 0.45, c.len, PAL.ice, 0.06 * b); }
    if (!any) return;
    const bbuf = TN.scratch('s5_beams', bw, bh); const gb = bbuf.getContext('2d'); gb.filter = 'blur(3px)'; gb.drawImage(a, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(bbuf, 0, 0, bw, bh, 0, 0, W, H); ctx.restore();
  }
  function drawFloor(ctx, rig, floorOn) {
    const lit = floorOn * (rig[0] + rig[1] + rig[2] + rig[3]) / 4; if (lit <= 0) return;
    ctx.save();
    // Court Royal → Stadium Black plane from the horizon down
    const g = ctx.createLinearGradient(0, HORIZON - 14, 0, H); g.addColorStop(0, rgba(PAL.courtDeep, 0)); g.addColorStop(0.07, rgba(PAL.courtDeep, 0.42 * lit)); g.addColorStop(0.4, rgba(PAL.courtDeep, 0.22 * lit)); g.addColorStop(1, rgba(PAL.bg, 0));
    ctx.fillStyle = g; ctx.fillRect(-50, HORIZON - 14, W + 100, H - HORIZON + 64);
    // specular pools where each cone meets the floor (the brightest thing on the floor)
    for (let i = 0; i < 4; i++) { const b = rig[i] * floorOn; if (b <= 0) continue; const c = CONES[i]; const tt = (790 - c.y) / Math.sin(c.ang); const px = c.x + Math.cos(c.ang) * tt;
      ctx.save(); ctx.translate(px, 790); ctx.scale(1, 0.22); TN.glowDot(ctx, 0, 0, 360, PAL.court, 0.55 * b); TN.glowDot(ctx, 0, 0, 200, PAL.courtSheen, 0.35 * b); TN.glowDot(ctx, 0, 0, 90, PAL.ice, 0.12 * b); ctx.restore(); }
    // faint perspective court lines, only where the plane is lit, fading in below the horizon
    ctx.beginPath(); ctx.rect(-50, HORIZON - 10, W + 100, H); ctx.clip(); ctx.globalAlpha = 0.11 * lit; ctx.fillStyle = PAL.line;
    for (const [x1, y1, x2, y2, w] of TN.courtLines()) TN.fillPoly3(ctx, FLOOR_CAM, TN.lineQuad(x1, y1, x2, y2, w));
    ctx.globalAlpha = 1; const fade = ctx.createLinearGradient(0, HORIZON - 10, 0, HORIZON + 50); fade.addColorStop(0, rgba(PAL.bg, 1)); fade.addColorStop(1, rgba(PAL.bg, 0));
    ctx.fillStyle = fade; ctx.fillRect(-50, HORIZON - 10, W + 100, 60);
    ctx.restore();
  }

  // ---------- hero layer helpers ----------
  function drawBallPad(ctx, bx, h) {       // contact pad on the floor line under the ball (150 × 14, Ink), lifting as the ball rises
    const k = clamp(1 - h / 140); if (k <= 0.02) return;
    ctx.save(); ctx.translate(bx, BASE + 1); ctx.scale(1 + h / 300, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 75); g.addColorStop(0, rgba(PAL.ink, 0.5 * k)); g.addColorStop(0.5, rgba(PAL.ink, 0.28 * k)); g.addColorStop(1, rgba(PAL.ink, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 75, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawWords(g, f, fi, dim) { for (let i = 0; i < 3; i++) { const st = wordState(f, fi, SLAMS[i]); if (st) drawWord(g, L.words[i], st.scale, st.alpha, dim); } }
  function drawHeroBall(g, f, fi, by, sq) { TN.drawBall(g, L.ball.x, by, BALL_R, { colors: TN.BALL_COLORS, light: [-0.12, -1], rim: fi >= 594 ? 0 : 0.5, fuzz: 1, rot: [ballSpin(f), 0.3, 0.15], squash: sq, squashAngle: 0 }); }
  function drawReflection(ctx, hero, reflK) {           // glossy floor: the hero layer flipped about the baseline, blurred at 1/3 res, 200 px fade
    if (reflK <= 0) return;
    const sc = 1 / 3, bw = Math.round(W * sc), bh = Math.round(H * sc);
    const r = TN.scratch('s5_refl', bw, bh); const g = r.getContext('2d');
    g.save(); g.filter = 'blur(3px)'; g.translate(0, 2 * BASE * sc); g.scale(sc, -sc); g.drawImage(hero, 0, 0); g.restore();
    g.globalCompositeOperation = 'destination-in'; const fade = g.createLinearGradient(0, BASE * sc, 0, (BASE + 200) * sc); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, bw, bh);
    ctx.save(); ctx.globalAlpha = 0.22 * reflK; ctx.globalCompositeOperation = 'screen'; ctx.beginPath(); ctx.rect(0, BASE, W, 220); ctx.clip(); ctx.drawImage(r, 0, 0, bw, bh, 0, 0, W, H); ctx.restore();
  }
  function specularSweep(ctx, f, words) {              // f522–f556: diagonal Flare Ice band, source-in on the glyphs, screened onto the frame
    if (f < 521.5 || f > 557) return;
    const xc = lerp(L.left - 260, L.ball.x, (f - 522) / 28), cy = BASE - L.cap / 2;      // crosses the ball centre at f550
    const s = TN.scratch('s5_sweep'); const g = s.getContext('2d'); g.drawImage(words, 0, 0);
    g.globalCompositeOperation = 'source-in';
    const nx = Math.cos(-0.35), ny = Math.sin(-0.35);                                      // band normal: the stripe leans right
    const band = (stops) => { const gr = g.createLinearGradient(xc - nx * 150, cy - ny * 150, xc + nx * 150, cy + ny * 150); for (const [p, c] of stops) gr.addColorStop(p, c); g.fillStyle = gr; g.fillRect(0, BASE - L.cap * 1.7, W, L.cap * 2.5); };
    // glossy fringe: the glyph darkens either side of the highlight (multiply), then the Flare Ice → white core (screen)
    band([[0, rgba(PAL.mute, 0)], [0.2, rgba(PAL.mute, 0.55)], [0.42, rgba(PAL.mute, 0.1)], [0.58, rgba(PAL.mute, 0.1)], [0.8, rgba(PAL.mute, 0.55)], [1, rgba(PAL.mute, 0)]]);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(s, 0, 0); ctx.restore();
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.drawImage(words, 0, 0); g.globalCompositeOperation = 'source-in';
    band([[0, rgba(PAL.ice, 0)], [0.4, rgba(PAL.ice, 0.4)], [0.5, rgba(PAL.white, 1)], [0.6, rgba(PAL.ice, 0.4)], [1, rgba(PAL.ice, 0)]]);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(s, 0, 0); ctx.restore();
    // the light spills just past the glyph edges: 1/3-res blurred copy of the lit slice, additive
    const sc = 1 / 3, bw = Math.round(W * sc), bh = Math.round(H * sc); const hb = TN.scratch('s5_sweepGlow', bw, bh); const gg = hb.getContext('2d'); gg.filter = 'blur(5px)'; gg.drawImage(s, 0, 0, bw, bh);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(hb, 0, 0, bw, bh, 0, 0, W, H); ctx.restore();
    // the band crossing the ball reads as a rim-light flash on its limb (f548–f552)
    const k = clamp(1 - Math.abs(xc - L.ball.x) / 150); if (k <= 0) return;
    const side = xc < L.ball.x ? -1 : 1, by = ballY(f);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    TN.glowDot(ctx, L.ball.x, by, BALL_R * 2.6, PAL.ice, 0.22 * k);
    ctx.beginPath(); ctx.arc(L.ball.x, by, BALL_R, 0, TAU); ctx.clip();
    TN.glowDot(ctx, L.ball.x + side * BALL_R * 0.95, by - BALL_R * 0.25, BALL_R * 0.9, PAL.ice, 0.85 * k);
    ctx.strokeStyle = rgba(PAL.white, 0.9 * k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L.ball.x, by, BALL_R - 1, side < 0 ? Math.PI * 0.75 : -Math.PI * 0.45, side < 0 ? Math.PI * 1.55 : Math.PI * 0.35); ctx.stroke();
    ctx.restore();
  }
  const ballY = f => BASE - BALL_R - ballH(f);

  TN.scenes.scene5 = {
    render(ctx, t, gt) {
      const f = gt * 60, fi = Math.round(f); layout(); TN.S4S5._period = L.ball;
      // f599: pure black, flag honoured by postAt (grain/vignette/aberration off)
      if (fi >= 599) { TN.S5.black = true; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
      const rig = [0, 1, 2, 3].map(i => rigLevel(fi, gt, i));
      const dim = fi < 591 ? 0 : fi < 594 ? 0.5 * ((fi - 590) / 3) : 1;                   // type fill → Ink across the shutdown
      const reflK = fi < 591 ? 1 : fi < 594 ? 0.5 : 0, floorOn = fi < 594 ? 1 : 0;
      const showBall = f >= 450 - 1e-6;                                                   // before f450 the transition shows scene4's ball
      const h = ballH(f), by = BASE - BALL_R - h, sq = showBall ? ballSquash(f) : 0;
      const sh = slamShake(fi); const dx = Math.sin(TAU * 0.2 * gt), dy = 0.7 * Math.cos(TAU * 0.14 * gt);   // 1 px drift at 0.2 Hz
      ctx.save();
      ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2 + dx + sh.x, H / 2 + dy + sh.y); ctx.rotate(sh.r); ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = PAL.bg; ctx.fillRect(-40, -40, W + 80, H + 80);
      // --- environment ---
      drawBeams(ctx, rig); drawRigs(ctx, rig); drawFloor(ctx, rig, floorOn); drawMotes(ctx, gt, rig);
      // --- hero layer (words + ball) ---
      const anyWord = fi >= SLAMS[0] - 5; const heroOn = anyWord || showBall;
      if (heroOn) {
        const words = TN.scratch('s5_words'); const gw = words.getContext('2d'); if (anyWord) drawWords(gw, f, fi, dim);
        const hero = TN.scratch('s5_hero'); const gh = hero.getContext('2d'); if (anyWord) gh.drawImage(words, 0, 0); if (showBall) drawHeroBall(gh, f, fi, by, sq);
        drawReflection(ctx, hero, reflK);
        if (showBall && fi < 597) drawBallPad(ctx, L.ball.x, h);
        // floor shock ellipses: ball contacts (full) and word stamps (floor side only)
        for (const [fc, , n] of CONTACTS) if (n > 0) floorRing(ctx, L.ball.x, BASE, f, fc, fc === 456 ? 130 : fc === 516 ? 110 : 80, fc > 472);
        for (let i = 0; i < 3; i++) { const w = L.words[i]; floorRing(ctx, w.x + w.w / 2, BASE, f, SLAMS[i], w.w * 0.75, true); }
        ctx.drawImage(hero, 0, 0);
        if (fi >= 594 && fi < 597 && showBall) { ctx.save(); ctx.fillStyle = rgba(PAL.bg, 0.55); ctx.beginPath(); ctx.arc(L.ball.x, by, BALL_R * 1.12, 0, TAU); ctx.fill(); ctx.restore(); }   // rigs out: the ball loses its key until it lights itself
        if (anyWord) specularSweep(ctx, f, words);
        // dust: ball contacts (Line White specks) and the 40-particle puffs at each word's foot
        for (const [fc, , n] of CONTACTS) if (n > 0) puff(ctx, gt, { x0: L.ball.x - 8, x1: L.ball.x + 8, y: BASE, t0: F(fc), count: n, seed: fc, speed: [80, 260], spread: 1.1, life: [0.22, 0.45], size: [1, 2], colors: [PAL.line] });
        for (let i = 0; i < 3; i++) { const w = L.words[i]; puff(ctx, gt, { x0: w.x + 6, x1: w.x + w.w - 6, y: BASE, t0: F(SLAMS[i]), count: 40, seed: 100 + i, speed: [60, 320], spread: 1.25, life: [0.3, 0.6], size: [1, 2.4] }); }
      }
      // --- sub-line: rule f534–f542, tagline f536–f546, hard-cut f597 ---
      if (fi >= 534 && fi < 597) {
        const pr = E.outCubic(prog(f, 534, 542)); ctx.save(); ctx.fillStyle = PAL.ball; ctx.fillRect(W / 2 - 210 * pr, 679, 420 * pr, 2); ctx.restore();
        const pt = E.outCubic(prog(f, 536, 546)); if (pt > 0) TN.text(ctx, 'EVERY MILLIMETRE COUNTS', W / 2, 722 + 10 * (1 - pt), { size: 24, family: FONTS.mono, weight: 400, color: PAL.mute, spacing: 7.2, align: 'center', alpha: pt });
      }
      // --- T5 f597–f598: the ball's own self-glow is the last light ---
      if (fi >= 597 && showBall) TN.glowDot(ctx, L.ball.x, by, 90, PAL.ball, fi === 597 ? 0.6 : 0.2);
      ctx.restore();
    },
  };
})();

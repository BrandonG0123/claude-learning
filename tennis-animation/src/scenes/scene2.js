// scene2.js — S2 TOSS & STRIKE · f84–f155 (gt 1.400–2.583) · docs/STORYBOARD.md §4 S2, T1, T2.
// Renders sensibly over f75–f167: hidden B layer under the T1 whiteout (f75–f83), emerging as the white decays (f84–f92, own
// vertical bloom smear), the macro toss, the racket arriving along its swing arc, CONTACT at f156 (own 2-frame white flash
// .70/.35), and the outgoing layer outside the T2 shock iris through f167 (D-compression, racket deform, release streak,
// failed −80 px pan, felt-fibre burst). Every beat keys off gt: f = gt*60 (fractional for motion, rounded for discrete events).
// Deterministic: no Math.random/Date; caches are call-order independent (bokeh plate, finished wordmark plate).
(function () {
  const TN = window.TN; TN.scenes = TN.scenes || {};
  const { W, H, PAL, FONTS, E, clamp, lerp, prog, smoothstep, rgba, lerpColor, hash2, mulberry32, noise1, TAU } = TN;
  const F = f => f / 60;
  const BALL0 = { x: 820, y: 500 };               // toss position (apex region) and contact position
  const CONTACT = { x: 1000, y: 520 };             // shock-iris centre: where the string plane meets the ball
  const BOKEH_WARM = lerpColor(PAL.gold, PAL.white, 0.5); // floodlight-warm bokeh (derived from the palette: Gold → White)

  // =====================================================================================================================
  // Racket swing geometry: the head centre rides a circular arc about a pivot far below the frame (shoulder), inCubic f138→f156,
  // then follows through with a decaying angular rate. The handle always points at the pivot, so the racket rotates as a rigid body.
  // =====================================================================================================================
  const PIVOT = [1600, 2400];
  const ARC_S = [2300, 640];                        // head centre at f138 (off the right edge)
  const ARC_E = [1094, 470];                        // head centre at f156: puts the hit point (hitX −0.75, hitY 0) exactly on (1000, 520)
  const polar = p => { const dx = p[0] - PIVOT[0], dy = p[1] - PIVOT[1]; return { th: Math.atan2(dy, dx), r: Math.hypot(dx, dy) }; };
  const PS = polar(ARC_S), PE = polar(ARC_E);
  const RS = 2.2, HW = 118 * RS, HH = 170 * RS, FORE = 0.5;   // drawRacket scale, head half-size, foreshortening (face turned 30° to camera)
  const HITX = -0.75, HITY = 0;
  const FT_SWEEP = 560 / PE.r;                      // follow-through: 560 px along the arc over 14 frames, decelerating (outQuad)
  const FT_FRAMES = 14;
  const RACKET_COLORS = { frame: '#15181D', frame2: '#2A3038', accent: PAL.ball, grip: '#0A0C10', string: 'rgba(240,244,250,0.55)' };

  function racketPose(f) {
    let th, r;
    if (f <= 156) { const u = E.inCubic(prog(f, 138, 156)); th = lerp(PS.th, PE.th, u); r = lerp(PS.r, PE.r, u); }
    else { const u = clamp((f - 156) / FT_FRAMES); th = PE.th - FT_SWEEP * (1 - (1 - u) * (1 - u)); r = PE.r; }
    const x = PIVOT[0] + r * Math.cos(th), y = PIVOT[1] + r * Math.sin(th);
    const angle = Math.atan2(PIVOT[1] - y, PIVOT[0] - x) - Math.PI / 2;        // ctx.rotate(angle) maps the handle (0,1) onto the pivot direction
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const hx = x + FORE * (HITX * HW * ca - HITY * HH * sa), hy = y + (HITX * HW * sa + HITY * HH * ca); // hit point on screen
    let dx = -FORE * sa, dy = ca; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;                 // string-plane trace direction on screen
    const nx = dy, ny = -dx;                                                                           // plane normal, pointing into the racket
    return { x, y, angle, hx, hy, dx, dy, nx, ny, phi: Math.atan2(ny, nx) };
  }
  const POSE156 = racketPose(156);
  // the ball's offset from the hit point at the instant of contact, decomposed on the plane basis (so it rides the plane during the dwell)
  const C0_N = (BALL0.x - POSE156.hx) * POSE156.nx + (BALL0.y - POSE156.hy) * POSE156.ny;   // ≈ −176 (centre sits 176 px behind the plane)
  const C0_D = (BALL0.x - POSE156.hx) * POSE156.dx + (BALL0.y - POSE156.hy) * POSE156.dy;   // tangential offset
  const PEN0 = 190 + C0_N;                                                                   // initial penetration (flat chord) ≈ 14 px

  // racket deform: 0 → 1 over the dwell (f156–f160), then two damped oscillations cos(2π·11·dt)·e^(−dt/0.12)
  function racketDeform(f) {
    if (f <= 156) return 0;
    if (f <= 160) return E.outQuad(prog(f, 156, 160));
    const dt = (f - 160) / 60; return Math.cos(TAU * 11 * dt) * Math.exp(-dt / 0.12);
  }

  // =====================================================================================================================
  // Ball state: toss (rise / hang / fall), dwell on the strings (D-compression), release as a streak toward the lens.
  // =====================================================================================================================
  function ballState(f) {
    const push = E.inOutSine(prog(f, 84, 156));                 // slow push-in r 170 → 190
    const rBase = lerp(170, 190, push);
    const light = [lerp(-0.6, -0.45, push), lerp(-0.7, -0.8, push)];
    const rot = [0.42, -0.55 + 0.21 * push, 0.12];              // faked 12° orbit: seam rotates 0.21 rad across the shot
    if (f < 156) {
      const rise = f < 114 ? E.outCubic(prog(f, 84, 114)) : f < 126 ? 1 : 1 - E.inQuad(prog(f, 126, 156));
      return { x: BALL0.x, y: BALL0.y - 30 * rise, r: rBase, squash: 0, squashAngle: 0, light, rot, phase: 'toss', vx: 0, vy: f >= 126 ? 2 * prog(f, 126, 156) : 0, clip: null };
    }
    const fc = f - 156; const P = racketPose(f);
    const squashAngle = P.phi + Math.PI / 2;                    // drawBall compresses along the direction perpendicular to squashAngle → along the normal
    if (fc <= 4) {                                              // DWELL: attached to the string plane, compressing 0 → 0.38
      const k = E.outQuad(fc / 4); const s = 0.38 * k; const rx = rBase * (1 - s); const pen = PEN0 + 30 * k;
      const x = P.hx - P.nx * (rx - pen) + P.dx * C0_D, y = P.hy - P.ny * (rx - pen) + P.dy * C0_D;
      const Pp = racketPose(f - 1); const vx = P.hx - Pp.hx, vy = P.hy - Pp.hy;
      return { x, y, r: rBase, squash: s, squashAngle, light, rot, phase: 'dwell', vx, vy, clip: P, k };
    }
    // RELEASE: springs off along −n, accelerating away from the racket (the racket decelerates into its follow-through), growing toward the lens
    const P4 = racketPose(160); const k4 = 1; const rx4 = rBase * (1 - 0.38), pen4 = PEN0 + 30 * k4;
    const x4 = P4.hx - P4.nx * (rx4 - pen4) + P4.dx * C0_D, y4 = P4.hy - P4.ny * (rx4 - pen4) + P4.dy * C0_D;
    const q = (fc - 4) / 7; const dist = 57 * (fc - 4) + 203 * 7 * Math.pow(Math.max(0, q), 2.5) / 2.5; const v = 57 + 203 * Math.pow(Math.max(0, q), 1.5);
    const dt = (fc - 4) / 60; const s = clamp(0.38 * Math.cos(TAU * 9 * dt) * Math.exp(-dt / 0.06), -0.2, 0.38);
    const r = rBase + 140 * Math.pow(clamp(q), 1.2);
    return { x: x4 - P4.nx * dist, y: y4 - P4.ny * dist, r, squash: s, squashAngle: P4.phi + Math.PI / 2, light, rot, phase: 'release', vx: -P4.nx * v, vy: -P4.ny * v, clip: null, k: 1 };
  }

  // =====================================================================================================================
  // Static plates (call-order independent caches)
  // =====================================================================================================================
  // bokeh plate: 40 hexagonal floodlight discs, rendered once at 1/3 res, soft edge + 1 px cyan fringe, blurred once.
  const BOKEH = (() => {
    const rnd = mulberry32(77); const out = [];
    // two floodlight rigs as 5×3 lamp grids (continuity with S1's rigs): near-right (warm, bright) and far-left (cool, dim)
    const rig = (cx, cy, sx, sy, r, warm, a, par) => { for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) out.push({ x: cx + (i - 2) * sx + (rnd() - 0.5) * 6, y: cy + (j - 1) * sy + (rnd() - 0.5) * 5, r: r * (0.9 + 0.2 * rnd()), warm, a: a * (0.8 + 0.3 * rnd()), rot: 0.3 + rnd() * 0.2, par }); };
    rig(1430, 318, 58, 50, 31, true, 0.5, 0.32); rig(320, 352, 40, 35, 22, false, 0.3, 0.26);
    // scattered bowl lights (signage, phones, concourse) — smaller, dimmer, deeper
    for (let i = 0; i < 24; i++) out.push({ x: 60 + rnd() * 1800, y: 290 + rnd() * 540, r: 9 + rnd() * 18, warm: rnd() < 0.4, a: 0.1 + rnd() * 0.22, rot: rnd() * TAU, par: 0.22 + rnd() * 0.12 });
    return out;
  })();
  let bokehPlate = null;
  function bokehCanvas() {
    if (bokehPlate) return bokehPlate;
    const sc = 1 / 3; const c = TN.makeCanvas(Math.round(W * sc) + 40, Math.round(H * sc) + 40); const g = c.getContext('2d');
    const raw = TN.makeCanvas(c.width, c.height); const gr = raw.getContext('2d'); gr.translate(20, 20); gr.scale(sc, sc); gr.globalCompositeOperation = 'lighter';
    for (const b of BOKEH) {
      const col = b.warm ? BOKEH_WARM : PAL.ice;
      gr.save(); gr.translate(b.x, b.y); gr.rotate(b.rot);
      const hex = (rr) => { gr.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; k ? gr.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : gr.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } gr.closePath(); };
      const grad = gr.createRadialGradient(0, 0, 0, 0, 0, b.r); grad.addColorStop(0, rgba(col, b.a * 0.78)); grad.addColorStop(0.72, rgba(col, b.a * 0.9)); grad.addColorStop(1, rgba(col, b.a));
      hex(b.r); gr.fillStyle = grad; gr.fill();
      hex(b.r + 1); gr.strokeStyle = rgba(PAL.accent2, b.a * 0.5); gr.lineWidth = 2.5; gr.stroke();     // ~1 px cyan fringe (at 1/3 res)
      gr.restore();
    }
    g.filter = 'blur(3px)'; g.drawImage(raw, 0, 0); g.filter = 'none';
    bokehPlate = c; return c;
  }
  // finished ghost wordmark plate (after the reveal completes) — rendered once, half-res, blurred 1 px (= 2 px full-res)
  let wordmarkDone = null;
  function wordmarkCanvas(gt) {
    const f = gt * 60; const done = f >= 118;
    if (done && wordmarkDone) return wordmarkDone;
    const src = TN.scratch('s2_wmA', 960, 540); const g = src.getContext('2d'); g.scale(0.5, 0.5);
    TN.kinetic(g, 'MATCH POINT', 960, 660, { t: gt, t0: F(90), dur: 0.25, stagger: 1 / 60, order: 'ltr', ease: E.outQuart, anim: TN.ANIM.riseMask, size: 320, family: FONTS.displayAlt, weight: 400, color: PAL.line, align: 'center', spacing: -3 });
    const out = done ? TN.makeCanvas(960, 540) : TN.scratch('s2_wmB', 960, 540); const go = out.getContext('2d');
    go.filter = 'blur(1px)'; go.drawImage(src, 0, 0); go.filter = 'none';
    if (done) wordmarkDone = out; return out;
  }

  // =====================================================================================================================
  // Local primitives
  // =====================================================================================================================
  // ice-tinted second rim pass (crescent at the rim on `dir`), 'screen' so it never blows out the felt
  function iceRim(ctx, B, dir, alpha) {
    ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.squashAngle); ctx.scale(1 + B.squash, 1 - B.squash); ctx.rotate(-B.squashAngle);
    ctx.beginPath(); ctx.arc(0, 0, B.r, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'screen';
    const r = B.r; const g = ctx.createRadialGradient(dir[0] * r * 1.08, dir[1] * r * 1.08, r * 0.12, dir[0] * r * 1.08, dir[1] * r * 1.08, r * 0.95);
    g.addColorStop(0, rgba(PAL.ice, alpha)); g.addColorStop(0.35, rgba(PAL.ice, alpha * 0.55)); g.addColorStop(1, rgba(PAL.ice, 0));
    ctx.fillStyle = g; ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4); ctx.restore();
  }
  // terminator: multiply shade on the side away from the key (restores modelling the strong rim washes out)
  function shadeBall(ctx, B) {
    ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.squashAngle); ctx.scale(1 + B.squash, 1 - B.squash); ctx.rotate(-B.squashAngle);
    ctx.beginPath(); ctx.arc(0, 0, B.r, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'multiply';
    const ll = Math.hypot(B.light[0], B.light[1]) || 1; const lx = B.light[0] / ll, ly = B.light[1] / ll; const r = B.r;
    const g = ctx.createRadialGradient(lx * r * 0.4, ly * r * 0.4, r * 0.3, lx * r * 0.05, ly * r * 0.05, r * 1.08);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(0.78, PAL.ballMid); g.addColorStop(1, lerpColor(PAL.ballDeep, PAL.ballShadow, 0.5));
    ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
  }
  // macro felt: 320 fine, slightly curved silhouette fibres lit by the key (drawBall's own fuzz is kept short underneath)
  function macroFuzz(ctx, B, amount = 1) {
    ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(B.squashAngle); ctx.scale(1 + B.squash, 1 - B.squash); ctx.rotate(-B.squashAngle);
    ctx.lineCap = 'round'; const r = B.r; const ll = Math.hypot(B.light[0], B.light[1]) || 1; const lx = B.light[0] / ll, ly = B.light[1] / ll;
    for (let i = 0; i < 320; i++) {
      const a = hash2(i, 71) * TAU; const ca = Math.cos(a), sa = Math.sin(a);
      const len = r * (0.018 + 0.075 * Math.pow(hash2(i, 72), 2)) * amount; const w = 0.7 + 0.9 * hash2(i, 73);
      const lit = clamp(0.5 - 0.5 * (ca * lx + sa * ly));
      const col = lit > 0.6 ? PAL.ballHi : lit > 0.35 ? PAL.ball : PAL.ballDeep; const alpha = (0.1 + 0.4 * lit) * (0.45 + 0.55 * hash2(i, 74));
      const bend = (hash2(i, 75) - 0.5) * 1.4; const x0 = ca * r * 0.975, y0 = sa * r * 0.975;
      ctx.strokeStyle = rgba(col, alpha); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(ca * (r + len * 0.5), sa * (r + len * 0.5), ca * (r + len) - sa * len * bend, sa * (r + len) + ca * len * bend); ctx.stroke();
    }
    ctx.restore();
  }
  // felt fibres on the right limb leaning toward the approaching face (f146–f156)
  function leanFibres(ctx, B, leanP) {
    if (leanP <= 0) return;
    ctx.save(); ctx.translate(B.x, B.y); ctx.lineCap = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = rgba(PAL.ballHi, 0.5);
    const LEAN = 15 * Math.PI / 180 * leanP;
    for (let i = 0; i < 40; i++) {
      const a = (hash2(i, 61) - 0.5) * (Math.PI / 3); const len = B.r * (0.035 + 0.05 * hash2(i, 62)) * (1 + 0.5 * leanP);
      const d = a - Math.sign(a) * Math.min(Math.abs(a), LEAN);                       // lean toward +x (the face)
      const bx = Math.cos(a) * B.r * 0.975, by = Math.sin(a) * B.r * 0.975;
      ctx.globalAlpha = 0.5 * (0.6 + 0.4 * hash2(i, 63));
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(d) * len, by + Math.sin(d) * len); ctx.stroke();
    }
    ctx.restore();
  }
  // the six strings nearest contact, redrawn 'screen' Flare Ice over the ball (they wrap the compressed felt)
  function litStrings(ctx, P, deform, alpha) {
    if (alpha <= 0.003) return;
    ctx.save(); ctx.translate(P.x, P.y); ctx.scale(FORE, 1); ctx.rotate(P.angle); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.ellipse(0, 0, HW - 10 * RS, HH - 10 * RS, 0, 0, TAU); ctx.clip();
    ctx.strokeStyle = PAL.ice; ctx.lineWidth = 3.2 * RS; ctx.lineCap = 'round'; ctx.shadowColor = rgba(PAL.ice, 0.9); ctx.shadowBlur = 14;
    const bulge = (px, py) => { if (!deform) return [px, py]; const dx = px / HW - HITX, dy = py / HH - HITY; const d = Math.hypot(dx, dy); const k = Math.exp(-d * d * 6) * deform; return [px + dx * HW * k * 0.35, py + dy * HH * k * 0.35]; };
    for (const i of [1, 2, 3]) { const px = lerp(-HW, HW, i / 16); ctx.beginPath(); for (let j = 0; j <= 24; j++) { const py = lerp(-HH, HH, j / 24); const [bx, by] = bulge(px, py); j ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); } ctx.stroke(); }
    for (const j of [9, 10, 11]) { const py = lerp(-HH, HH, j / 19); ctx.beginPath(); for (let i = 0; i <= 24; i++) { const px = lerp(-HW, HW, i / 24); const [bx, by] = bulge(px, py); i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); } ctx.stroke(); }
    ctx.restore();
  }
  function racketAt(g, P, deform) { g.save(); g.translate(P.x, P.y); g.scale(FORE, 1); TN.drawRacket(g, 0, 0, { angle: P.angle, scale: RS, deform, hitX: HITX, hitY: HITY, colors: RACKET_COLORS }); g.restore(); }
  // lighting on the racket: key from the upper left across the string bed (multiply), plus a soft specular sheen band on the strings
  function shadeRacket(ctx, P) {
    ctx.save(); ctx.translate(P.x, P.y); ctx.scale(FORE, 1); ctx.rotate(P.angle);
    ctx.beginPath(); ctx.ellipse(0, 0, HW - 8 * RS, HH - 8 * RS, 0, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = 'multiply'; const g = ctx.createLinearGradient(-HW, -HH, HW * 0.6, HH); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(200,210,225,1)'); g.addColorStop(1, 'rgba(70,80,100,1)');
    ctx.fillStyle = g; ctx.fillRect(-HW, -HH, 2 * HW, 2 * HH);
    ctx.globalCompositeOperation = 'screen'; const sh = ctx.createLinearGradient(-HW * 0.8, -HH * 0.6, HW * 0.2, HH * 0.1); sh.addColorStop(0, rgba(PAL.ice, 0)); sh.addColorStop(0.5, rgba(PAL.ice, 0.14)); sh.addColorStop(1, rgba(PAL.ice, 0));
    ctx.fillStyle = sh; ctx.fillRect(-HW, -HH, 2 * HW, 2 * HH); ctx.restore();
  }
  // racket with in-scene motion blur: 8 sub-steps over ~0.9 frame accumulated in a half-res scratch and blurred (a smear, not echoes), then the solid pose
  function drawRacketBlurred(ctx, f, deform) {
    const cur = racketPose(f); const prev = racketPose(f - 1); const speed = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    if (speed > 6) {
      const n = 8, span = 0.9, sc = 0.5; const w = W * sc, h = H * sc;
      const A = TN.scratch('s2_rkA', w, h); const ga = A.getContext('2d'); ga.scale(sc, sc);
      for (let i = 1; i <= n; i++) { ga.globalAlpha = 1 / n; racketAt(ga, racketPose(f - span * i / n), deform); }
      const Bc = TN.scratch('s2_rkB', w, h); const gb = Bc.getContext('2d'); gb.filter = `blur(${clamp(1 + speed * 0.015, 1, 5).toFixed(1)}px)`; gb.drawImage(A, 0, 0); gb.filter = 'none';
      ctx.save(); ctx.globalAlpha = 0.75; ctx.drawImage(Bc, 0, 0, w, h, 0, 0, W, H); ctx.restore();
    }
    racketAt(ctx, cur, deform); shadeRacket(ctx, cur);
    return cur;
  }
  // RGB split of a small layer (channel copies offset ±amt px, additive)
  function rgbSplit(ctx, src, x, y, amt) {
    const w = src.width, h = src.height; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [col, dx] of [['#ff0000', -amt], ['#00ff00', 0], ['#0000ff', amt]]) {
      const s = TN.scratch('s2_ch', w, h); const g = s.getContext('2d'); g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0);
      ctx.drawImage(s, x + dx, y);
    }
    ctx.restore();
  }

  // =====================================================================================================================
  // Layers
  // =====================================================================================================================
  function drawBowl(ctx, gt, f) {
    // upper stadium bowl at night: lit toward the upper right, roof edge as a dark band, seating tiers as soft horizontal structure
    TN.bgGradient(ctx, PAL.navy, PAL.bg, { cx: 1300, cy: 300, r: 1400 });
    ctx.save();
    // broad floodlit haze in the bowl (cool), low contrast = far away
    TN.glowDot(ctx, 1320, 330, 900, PAL.navy, 0.9, 0.1);
    TN.glowDot(ctx, 1450, 300, 520, lerpColor(PAL.navy, PAL.ice, 0.18), 0.35, 0.05);
    // seating tiers: broad, very soft curved bands (far away = low contrast)
    ctx.globalCompositeOperation = 'screen';
    for (const [yy, hgt, a] of [[372, 70, 0.05], [530, 90, 0.045], [720, 110, 0.03]]) {
      const g = ctx.createLinearGradient(0, yy - hgt, 0, yy + hgt); g.addColorStop(0, rgba(PAL.mute, 0)); g.addColorStop(0.5, rgba(PAL.mute, a)); g.addColorStop(1, rgba(PAL.mute, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-40, yy - hgt + 40); ctx.quadraticCurveTo(960, yy - hgt - 50, 1960, yy - hgt + 40); ctx.lineTo(1960, yy + hgt + 40); ctx.quadraticCurveTo(960, yy + hgt - 50, -40, yy + hgt + 40); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // bokeh discs at 0.3× parallax (handheld drift ×0.3 + the faked orbit slide)
    const orbit = -18 * E.inOutSine(prog(f, 84, 156)); const plate = bokehCanvas();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9;
    ctx.drawImage(plate, 0, 0, plate.width, plate.height, -60 + orbit, -60, plate.width * 3, plate.height * 3); ctx.restore();
    // roof edge: soft dark band y 180–260 with a faint, soft rim-lit lower edge
    ctx.save(); const rg = ctx.createLinearGradient(0, 140, 0, 300); rg.addColorStop(0, rgba(PAL.bg, 0)); rg.addColorStop(0.3, rgba(PAL.bg, 0.9)); rg.addColorStop(0.7, rgba(PAL.bg, 0.9)); rg.addColorStop(1, rgba(PAL.bg, 0));
    ctx.fillStyle = rg; ctx.fillRect(-40, 140, W + 80, 160);
    ctx.globalCompositeOperation = 'screen'; const eg = ctx.createLinearGradient(0, 250, 0, 290); eg.addColorStop(0, rgba(PAL.ice, 0)); eg.addColorStop(0.4, rgba(PAL.ice, 0.07)); eg.addColorStop(1, rgba(PAL.ice, 0));
    ctx.fillStyle = eg; ctx.fillRect(-40, 250, W + 80, 40); ctx.restore();
  }

  function drawWordmark(ctx, gt) {
    const f = gt * 60; if (f < 90) return;
    const c = wordmarkCanvas(gt);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.10; ctx.drawImage(c, 0, 0, 960, 540, 0, 0, W, H); ctx.restore();
  }

  function drawBallLayer(ctx, gt, f, B, pose) {
    // ambient occlusion: the ball blocks the bowl haze on its shadow side
    ctx.save(); const ao = ctx.createRadialGradient(B.x + B.r * 0.25, B.y + B.r * 0.35, B.r * 0.6, B.x + B.r * 0.25, B.y + B.r * 0.35, B.r * 1.55);
    ao.addColorStop(0, 'rgba(0,0,0,0.5)'); ao.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ao; ctx.fillRect(B.x - B.r * 2, B.y - B.r * 2, B.r * 4, B.r * 4); ctx.restore();
    // halo
    TN.glowDot(ctx, B.x, B.y, 260 * (B.r / 180), PAL.ball, 0.15, 0.3);
    const opts = { rot: B.rot, light: B.light, squash: B.squash, squashAngle: B.squashAngle, fuzz: 0.55, rim: 0.85, colors: TN.BALL_COLORS };
    if (B.phase === 'release') {
      // streak toward the lens: 12 ghosts along the velocity + an additive Optic Yellow streak
      const v = Math.hypot(B.vx, B.vy); const ux = B.vx / (v || 1), uy = B.vy / (v || 1);
      ctx.save(); TN.lightStreak(ctx, B.x - ux * v * 0.6, B.y - uy * v * 0.6, Math.atan2(uy, ux), v * 2.4 + B.r * 2, B.r * 1.6, PAL.ball, 0.35, 0.15); ctx.restore();
      for (let i = 12; i >= 1; i--) { const q = i / 13; ctx.save(); ctx.globalAlpha = 0.22 * (1 - q) + 0.03; TN.drawBall(ctx, B.x - B.vx * q * 1.1, B.y - B.vy * q * 1.1, B.r * (1 - 0.08 * q), Object.assign({}, opts, { detail: false, fuzz: 0, rim: 0.2 })); ctx.restore(); }
    }
    ctx.save();
    if (B.clip) { // D-shaped compression: everything on the racket side of the string plane is clipped flat
      const P = B.clip; ctx.beginPath(); ctx.save(); ctx.translate(P.hx, P.hy); ctx.rotate(P.phi); ctx.rect(-6000, -6000, 6000, 12000); ctx.restore(); ctx.clip();
    }
    TN.drawBall(ctx, B.x, B.y, B.r, opts);
    shadeBall(ctx, B);
    iceRim(ctx, B, [0.72, 0.52], 0.4);                                    // cyan-tinted second rim pass (opposite the key, wrapping toward the bowl light)
    iceRim(ctx, B, [0.6, -0.7], 0.14);                                    // faint kicker from the floodlit bowl, upper right
    macroFuzz(ctx, B, 1);
    ctx.restore();
    if (f < 156) leanFibres(ctx, B, prog(f, 146, 156));
  }

  function drawChip(ctx, f, fi) {
    if (fi >= 158) return;                                                  // hard cut at f158
    const w = 760, h = 160, ox = 60, oy = 800;
    const c = TN.scratch('s2_chip', w, h); const g = c.getContext('2d'); g.translate(-ox, -oy);
    const rule = 84 * E.outCubic(prog(f, 96, 104)); if (rule > 0) { g.fillStyle = PAL.ball; g.fillRect(96, 836, 3, rule); }
    const e1 = E.outCubic(prog(f, 98, 110)); if (e1 > 0) TN.text(g, 'FIRST SERVE', 116 - 30 * (1 - e1), 860, { size: 34, family: FONTS.display, weight: 600, color: PAL.line, align: 'left', spacing: 0.08 * 34, alpha: clamp(e1 * 1.4) });
    const e2 = E.outCubic(prog(f, 104, 116)); if (e2 > 0) TN.text(g, 'FINAL · FIFTH SET · 5–4 · AD–40', 116, 896, { size: 22, family: FONTS.mono, weight: 400, color: PAL.mute, align: 'left', spacing: 0.1 * 22, alpha: e2 });
    if (fi === 156 || fi === 157) rgbSplit(ctx, c, ox, oy, fi === 156 ? 10 : 6);   // 2-frame RGB jolt on contact
    else ctx.drawImage(c, ox, oy);
  }

  // vertical bloom smear while emerging from the whiteout (f84–f92): 1/3-res copy, vertical multi-tap + blur, additive
  function bloomSmear(ctx, f) {
    const a = 0.5 * (1 - prog(f, 84, 94)); if (a <= 0.003) return;
    const w = 640, h = 360; const A = TN.scratch('s2_smA', w, h); const ga = A.getContext('2d'); ga.drawImage(ctx.canvas, 0, 0, w, h);
    const Bc = TN.scratch('s2_smB', w, h); const gb = Bc.getContext('2d'); gb.filter = 'blur(5px) brightness(1.5)'; gb.globalAlpha = 1 / 9;
    for (let k = -4; k <= 4; k++) gb.drawImage(A, 0, k * 9); gb.filter = 'none'; gb.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(Bc, 0, 0, w, h, 0, 0, W, H); ctx.restore();
  }

  // =====================================================================================================================
  // Scene
  // =====================================================================================================================
  TN.scenes.scene2 = {
    render(ctx, t, gt) {
      const f = gt * 60; const fi = Math.round(f);
      const B = ballState(f);
      // handheld drift (2 px, roll ±0.3°) and the failed −80 px pan after the ball (f158–f167, inQuad)
      const hx = (noise1(gt * 0.7, 2) - 0.5) * 4, hy = (noise1(gt * 0.7, 3) - 0.5) * 4, roll = (noise1(gt * 0.5, 4) - 0.5) * 2 * 0.3 * Math.PI / 180;
      const pan = -80 * E.inQuad(prog(f, 158, 167));
      ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2 + hx + pan, H / 2 + hy); ctx.rotate(roll); ctx.translate(-W / 2, -H / 2);
      // --- background: bowl, bokeh, roof ---
      drawBowl(ctx, gt, f);
      // --- ghost wordmark (behind the ball) ---
      drawWordmark(ctx, gt);
      // --- racket (behind the ball; its lit strings come back in front after the ball) ---
      const deform = racketDeform(f); let pose = null;
      if (f >= 138) pose = drawRacketBlurred(ctx, f, deform);
      // --- hero ball ---
      drawBallLayer(ctx, gt, f, B, pose);
      if (pose && f >= 156) litStrings(ctx, pose, deform, 0.8 * (1 - prog(f, 156, 167)));
      // --- felt-fibre burst from the contact point (stateless) ---
      if (f >= 156) TN.burst(ctx, gt, { x: CONTACT.x, y: CONTACT.y, t0: F(156), window: 0.03, count: 90, seed: 212, life: [0.3, 0.6], speed: [400, 1400], angle: Math.PI, spread: 120 * Math.PI / 180, gravity: 320, drag: 1.2, size: [1, 3], colors: [PAL.ballHi, PAL.white, PAL.ballMid], shape: 'streak', alpha: 0.9, stretch: 1.2 });
      // --- near-lens motes ---
      TN.motes(ctx, gt, { count: 30, seed: 19, color: PAL.ice, alpha: 0.3, size: [2, 5], drift: [8, -4], area: [0, 120, W, 840], twinkle: 0.8 });
      // --- lower-left chip ---
      drawChip(ctx, f, fi);
      ctx.restore();
      // --- emergence from the whiteout: Flare Ice bleach + vertical bloom smear ---
      if (f < 96) {
        bloomSmear(ctx, f);
        const bleach = 0.55 * (1 - E.outCubic(prog(f, 84, 96))); if (bleach > 0.003) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = bleach; ctx.fillStyle = PAL.ice; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      }
      // --- CONTACT flash: 2 frames, .70 then .35 (drawn by the scene; the shock iris composites over it) ---
      if (fi === 156) TN.flash(ctx, 0.70, PAL.white); else if (fi === 157) TN.flash(ctx, 0.35, PAL.white);
    },
  };
})();

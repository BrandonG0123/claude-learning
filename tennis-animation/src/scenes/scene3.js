// scene3.js — S3 FLIGHT · FREEZE · SWOOP · f156–f305 (gt 2.600–5.083), rendered sensibly through f311 (outgoing layer under T3).
// Spec: docs/STORYBOARD.md §4 S3 + §5. Every beat keys off gt (absolute seconds): f = gt*60. Freezes are clamped clocks.
(function () {
  const TN = window.TN; TN.scenes = TN.scenes || {};
  const { W, H, PAL, FONTS, COURT, E, clamp, lerp, prog, smoothstep, rgba, lerpColor, hash2, mulberry32, TAU, Camera, v3, fillPoly3, projectSegment } = TN;
  const F = f => f / 60;

  // ---------- physics: real time (g = 9.81, T_f = 0.38 s) remapped by R(p) = 0.25p + 0.75p² ----------
  const P0 = [0.35, -11.70, 2.90], P1 = [1.45, 6.4555, 0], TF = 0.38;
  const V0 = TN.solveVelocity(P0, P1, TF);                       // (2.89, 47.78, −5.77) m/s
  const MARK = [1.45, 6.482, 0];                                  // mark centre: near edge 6.422 = 3 mm inside the line's outer edge
  const CONTACT = [P1[0], P1[1], 0];
  const DIR = (() => { const l = Math.hypot(V0[0], V0[1]); return [V0[0] / l, V0[1] / l]; })();
  const T0 = F(156), T_BOUNCE = F(273), FILM = 1.95;
  const Rfn = p => 0.25 * p + 0.75 * p * p;
  const filmP = gt => clamp((gt - T0) / FILM);
  const tauAt = gt => TF * Rfn(filmP(gt));
  const pos = gt => TN.ballistic(P0, V0, tauAt(gt));
  const pathFn = u => TN.ballistic(P0, V0, u * TF);
  const groundFn = u => { const p = pathFn(u); return [p[0], p[1], 0]; };
  const ballVel = gt => v3.mul(v3.sub(pos(gt), pos(gt - 1 / 60)), 60); // film-time velocity (m/s)
  const SPIN = 1200 * Math.PI / 180;                              // rad per real second

  // ---------- camera: trailing three-quarter orbit (f156–f273), hold (f273–f276), swoop to 87° (f276–f300), hold ----------
  // launch keyframe tuned so the ball emerges inside the shock iris (within 250 px of (1000,520)); the rest is the spec lerp.
  const CAM = { az0: 0.30, az1: 1.05, el0: 0.12, el1: 0.55, d0: 2.4, d1: 9.0, fov0: 50, fov1: 40, roll1: -3 * Math.PI / 180, off0: [0, 0.6, -0.2], off1: [0, 1.2, -0.25], lag: 0.08 };
  const SW = { az: 0, el: 1.5184, d: 7, fov: 30 };                // 87.0°, never higher (Camera.set up-vector flip at 0.999)
  function flightParams(gt) {
    const f = gt * 60; const q = E.inOutSine(prog(f, 156, 273));
    const lagged = pos(gt - CAM.lag); const off = v3.lerp(CAM.off0, CAM.off1, q);
    let tgt = v3.add(lagged, off);
    tgt = v3.lerp(tgt, MARK, smoothstep(255, 273, f));          // the operator anticipates the bounce: the mark lands at frame centre
    return { tgt, az: lerp(CAM.az0, CAM.az1, q), el: lerp(CAM.el0, CAM.el1, q), d: lerp(CAM.d0, CAM.d1, q), fov: lerp(CAM.fov0, CAM.fov1, q), roll: lerp(0, CAM.roll1, q) };
  }
  function cameraAt(gt) {
    const f = gt * 60;
    if (f <= 276) { const c = flightParams(Math.min(gt, T_BOUNCE)); return Camera.orbit(c.tgt, c.az, c.el, c.d, c.fov, c.roll); }
    const s = E.inOutCubic(prog(f, 276, 300)); const a = flightParams(T_BOUNCE);
    return Camera.orbit(MARK, lerp(a.az, SW.az, s), Math.min(lerp(a.el, SW.el, s), 1.5184), lerp(a.d, SW.d, s), lerp(a.fov, SW.fov, s), lerp(a.roll, 0, s));
  }
  // handoff to scene4: px per metre of the final camera at the mark and its screen position (computed once, deterministic)
  (() => { const c = Camera.orbit(MARK, SW.az, SW.el, SW.d, SW.fov, 0); const m = c.project(MARK); TN.S3_END = { scaleAtMark: m.scale, markScreen: { x: m.x, y: m.y } }; })();

  // ---------- static world ----------
  const RIGS = [[-9, 16, 11], [9, 16, 11], [-10, 6, 8], [10, 6, 8]];
  const RIG_I = [0.6, 0.55, 0.7, 0.65];
  const STANDS = [
    [[-20, 14, 2], [20, 14, 2], [20, 18, 12], [-20, 18, 12]],
    [[-20, -14, 2], [20, -14, 2], [20, -18, 12], [-20, -18, 12]],
    [[-12, -14, 2], [-12, 14, 2], [-16, 14, 12], [-16, -14, 12]],
    [[12, -14, 2], [12, 14, 2], [16, 14, 12], [16, -14, 12]],
  ];
  const SPECK_COLS = [rgba(PAL.ice, 0.25), rgba(PAL.ice, 0.45), rgba(PAL.white, 0.6), rgba(PAL.mute, 0.5)];
  const SPECKS = (() => { // 2,400 seeded stand specks (call-order independent cache)
    const rnd = mulberry32(31); const out = [];
    for (let i = 0; i < 2400; i++) { const Q = STANDS[i % 4]; const u = rnd(), v = rnd(); const A = Q[0], B = Q[1], D = Q[3]; out.push([A[0] + (B[0] - A[0]) * u + (D[0] - A[0]) * v, A[1] + (B[1] - A[1]) * u + (D[1] - A[1]) * v, A[2] + (B[2] - A[2]) * u + (D[2] - A[2]) * v, SPECK_COLS[Math.floor(rnd() * 4)]]); }
    return out;
  })();
  const { halfL, halfWD, netH, netPostH, netPostX } = COURT;
  const COURT_QUAD = [[-halfWD, -halfL, 0], [halfWD, -halfL, 0], [halfWD, halfL, 0], [-halfWD, halfL, 0]];
  const APRON_QUAD = [[-halfWD - 8, -halfL - 8, 0], [halfWD + 8, -halfL - 8, 0], [halfWD + 8, halfL + 8, 0], [-halfWD - 8, halfL + 8, 0]];
  const NET_QUAD = [[-netPostX, 0, 0], [netPostX, 0, 0], [netPostX, 0, netH], [-netPostX, 0, netH]];
  const LIGHT = [-0.6, -0.7];
  const NET_X = P0[0] + V0[0] * 0.2463;                            // ball x at the net crossing

  // ping pieces: every court line subdivided into 0.25 m quads (widened ×1.6 so the band spills past the line edge)
  const PING = (() => {
    const out = [];
    for (const [x1, y1, x2, y2, w] of TN.courtLines()) {
      const L = Math.hypot(x2 - x1, y2 - y1); const n = Math.max(1, Math.ceil(L / 0.25));
      for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n; const cx = x1 + (x2 - x1) * (a + b) / 2, cy = y1 + (y2 - y1) * (a + b) / 2; out.push({ quad: TN.lineQuad(x1, y1, x2, y2, w * 2.2, b, a), wide: TN.lineQuad(x1, y1, x2, y2, 0.6, b, a), d: Math.hypot(cx - MARK[0], cy - MARK[1]) }); }
    }
    return out;
  })();

  // ---------- local primitives ----------
  // glowLayer: all soft glow goes through ONE 1/3-res blur (draw → blur(640×360) → upscale blit). shadowBlur per segment is ~30× slower under SwiftShader.
  function glowLayer(ctx, draw, { blur = 24, alpha = 1, op = 'lighter' } = {}) {
    const w = 640, h = 360; const A = TN.scratch('s3_glowA', w, h); const ga = A.getContext('2d'); ga.save(); ga.scale(1 / 3, 1 / 3); draw(ga); ga.restore();
    const B = TN.scratch('s3_glowB', w, h); const gb = B.getContext('2d'); gb.filter = `blur(${(blur / 3).toFixed(1)}px)`; gb.drawImage(A, 0, 0); gb.filter = 'none';
    ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.drawImage(B, 0, 0, w, h, 0, 0, W, H); ctx.restore();
  }
  // linePing: gaussian band (σ 0.35 m) at planar radius r from the mark, 'screen' over the lines, Optic Yellow → Line White toward the core
  function linePing(ctx, cam, r, env) {
    const SIG = 0.35; const live = [];
    for (const pc of PING) { const d = pc.d - r; const w = Math.exp(-d * d / (2 * SIG * SIG)); if (w >= 0.02) live.push([pc, w]); }
    if (!live.length) return;
    const pieces = (g, k, col, wide) => { for (const [pc, w] of live) { g.globalAlpha = clamp(w * env * k); g.fillStyle = col || lerpColor(PAL.ball, PAL.white, w); fillPoly3(g, cam, wide ? pc.wide : pc.quad); } };
    glowLayer(ctx, g => pieces(g, 0.9, PAL.ball, true), { blur: 64, alpha: 0.85, op: 'screen' });    // wide Optic Yellow halo (0.6 m quads) spilling onto the court
    glowLayer(ctx, g => pieces(g, 1), { blur: 20, alpha: 1, op: 'screen' });                        // tight glow
    ctx.save(); ctx.globalCompositeOperation = 'screen'; pieces(ctx, 1); ctx.restore();             // the hot core: Optic Yellow → Line White
  }
  // projected 3D polyline stroke (shadow trace etc.)
  function strokePath3(ctx, cam, fn, u0, u1, n, { color, width, op = 'source-over', dash = null }) {
    ctx.save(); ctx.globalCompositeOperation = op; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); let pen = false;
    for (let i = 0; i <= n; i++) { const p = cam.project(fn(lerp(u0, u1, i / n))); if (!p.visible) { pen = false; continue; } if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y); }
    ctx.stroke(); ctx.restore();
  }
  // burst3D: stateless analytic burst in world metres, projected per frame (so frozen dust survives camera moves and the S3→S4 cut)
  function burst3D(ctx, cam, t, o) {
    const { origin, t0 = 0, window = 1 / 60, count = 60, seed = 1 } = o; const life = o.life || [0.3, 0.6], speed = o.speed || [1, 3], size = o.size || [2, 4];
    const spread = o.spread == null ? 0.7 : o.spread, g = o.gravity == null ? 1.13 : o.gravity, k = o.drag == null ? 2.5 : o.drag; const colors = o.colors || [PAL.line]; const shape = o.shape || 'dot'; const alpha = o.alpha == null ? 1 : o.alpha;
    const dir = v3.norm(o.dir || [0, 0, 1]); const e1 = v3.norm(v3.cross(dir, Math.abs(dir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])); const e2 = v3.cross(dir, e1);
    ctx.save(); ctx.globalCompositeOperation = o.op || 'screen'; ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const birth = t0 + hash2(i, seed) * window; const age = t - birth; const L = lerp(life[0], life[1], hash2(i, seed + 1)); if (age < 0 || age > L) continue; const a01 = age / L;
      const th = Math.sqrt(hash2(i, seed + 2)) * spread, ph = hash2(i, seed + 3) * TAU, ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp0 = Math.sin(ph);
      const vx = dir[0] * ct + (e1[0] * cp + e2[0] * sp0) * st, vy = dir[1] * ct + (e1[1] * cp + e2[1] * sp0) * st, vz = dir[2] * ct + (e1[2] * cp + e2[2] * sp0) * st;
      const sp = lerp(speed[0], speed[1], Math.pow(hash2(i, seed + 4), 1.5)); const fd = k > 0 ? (1 - Math.exp(-k * age)) / k : age;
      const px = origin[0] + vx * sp * fd, py = origin[1] + vy * sp * fd; let pz = origin[2] + vz * sp * fd - 0.5 * g * age * age; if (o.floor && pz < 0.004) pz = 0.004;
      const P = cam.project([px, py, pz]); if (!P.visible) continue;
      const sz = lerp(size[0], size[1], hash2(i, seed + 5)) * clamp(P.scale / 165, 0.5, 2.5); const col = colors[Math.floor(hash2(i, seed + 6) * colors.length) % colors.length];
      const al = alpha * Math.pow(1 - a01, 1.5); if (al < 0.003) continue; ctx.globalAlpha = al; ctx.fillStyle = col; ctx.strokeStyle = col;
      if (shape === 'dot') { ctx.beginPath(); ctx.arc(P.x, P.y, sz, 0, TAU); ctx.fill(); }
      else { const dk = Math.exp(-k * age); const cvx = vx * sp * dk, cvy = vy * sp * dk, cvz = vz * sp * dk - g * age; const P2 = cam.project([px - cvx * 0.03, py - cvy * 0.03, pz - cvz * 0.03]); ctx.lineWidth = sz; ctx.beginPath(); ctx.moveTo(P2.x, P2.y); ctx.lineTo(P.x, P.y); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawGrid(ctx, cam, alpha) { // 1 m Hawk Cyan grid over the court
    ctx.save(); ctx.strokeStyle = rgba(PAL.accent2, alpha); ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -5; x <= 5; x++) { const s = projectSegment(cam, [x, -halfL, 0], [x, halfL, 0]); if (s) { ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); } }
    for (let y = -11; y <= 11; y++) { const s = projectSegment(cam, [-halfWD, y, 0], [halfWD, y, 0]); if (s) { ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); } }
    ctx.stroke(); ctx.restore();
  }
  let _cell = 0;
  function digitCells(ctx) { if (!_cell) { ctx.save(); ctx.font = TN.font(180, FONTS.oswald, 700); _cell = ctx.measureText('0').width; ctx.restore(); } return _cell; }
  // digits spin (staggered) until p → 1; non-digits are fixed
  function rollText(ctx, str, x, y, p, o) {
    const chars = [...str]; let cx = x; ctx.save(); ctx.font = TN.font(o.size, o.family, o.weight); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = o.color;
    for (let i = 0; i < chars.length; i++) { let ch = chars[i]; const w = ctx.measureText(/\d/.test(ch) ? '0' : ch).width; let a = 1; if (/\d/.test(ch)) { const local = clamp((p - i * 0.05) / (1 - i * 0.05)); if (local < 1) { ch = String(Math.floor(hash2(i, Math.floor(p * 90 + i * 13)) * 10)); a = 0.85; } } ctx.globalAlpha = a; ctx.fillText(ch, cx, y); cx += w + (o.spacing || 0); }
    ctx.restore();
  }

  // ---------- the world (3D) ----------
  function drawWorld(ctx, gt, cam, h) {
    const f = gt * 60; const lit = 1 - h;
    const ttBall = Math.min(gt, F(274)), ttFx = Math.min(gt, F(277));
    const uNow = Rfn(filmP(ttBall)); const bp = pos(ttBall); const inContact = ttBall >= T_BOUNCE - 1e-9;
    const q = E.inOutSine(prog(f, 156, 273)); const K = lerp(lerp(2.6, 3.4, q), 1.0, h); // stylised ball radius factor → physical in review mode

    // 1. night sky
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
    if (lit > 0.002) {
      const sky = cam.project([0, 16, 9]); const cx = sky.visible ? clamp(sky.x, -400, W + 400) : W / 2, cy = sky.visible ? clamp(sky.y, -400, H) : 200;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1500); grd.addColorStop(0, rgba(PAL.navy, 0.95 * lit)); grd.addColorStop(0.5, rgba(PAL.navy, 0.45 * lit)); grd.addColorStop(1, rgba(PAL.navy, 0)); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
    // 2. stands, masts, specks, rigs (photoreal only)
    if (lit > 0.002) {
      ctx.save(); ctx.globalAlpha = lit;
      for (let i = 0; i < 4; i++) { // stand quads shaded bottom → top (the bowl recedes into darkness), hazier at the far end
        const Q = STANDS[i]; const lo = cam.project([(Q[0][0] + Q[1][0]) / 2, (Q[0][1] + Q[1][1]) / 2, 2]), hi = cam.project([(Q[2][0] + Q[3][0]) / 2, (Q[2][1] + Q[3][1]) / 2, 12]);
        const base = i === 0 ? lerpColor(PAL.navy, PAL.apron, 0.4) : lerpColor(PAL.navy, PAL.apron, 0.15);
        if (lo.visible && hi.visible && Math.hypot(hi.x - lo.x, hi.y - lo.y) > 2) { const grd = ctx.createLinearGradient(lo.x, lo.y, hi.x, hi.y); grd.addColorStop(0, base); grd.addColorStop(1, PAL.bg); ctx.fillStyle = grd; } else ctx.fillStyle = base;
        fillPoly3(ctx, cam, Q);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
      for (const R of RIGS) { const s = projectSegment(cam, [R[0], R[1], 2], R); if (s) { ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke(); } }
      const fi = Math.floor(f);
      for (let i = 0; i < SPECKS.length; i++) { const S = SPECKS[i]; const p = cam.project(S); if (!p.visible || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue; ctx.fillStyle = S[3]; ctx.fillRect(p.x, p.y, 1.2, 1.2); if (hash2(i, fi) < 0.015 || hash2(i, fi - 1) < 0.015) TN.glowDot(ctx, p.x, p.y, 6, PAL.ice, 0.9); }
      for (let i = 0; i < 4; i++) {
        const p = cam.project(RIGS[i]); if (!p.visible || p.x < -400 || p.x > W + 400 || p.y < -400 || p.y > H + 400) continue; const I = RIG_I[i];
        TN.lensFlare(ctx, p.x, p.y, I, PAL.ice, { streak: false, ghosts: false });
        TN.lightStreak(ctx, p.x, p.y, 0, 1000 * I, 7, PAL.ice, 0.75 * I, 0.5);
        const sp = Math.max(1.5, p.scale * 0.12); ctx.fillStyle = PAL.white; ctx.globalAlpha = lit * 0.9;
        for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) ctx.fillRect(p.x + (a - 2) * sp - 1, p.y + (b - 1) * sp - 1, 2, 2);
        ctx.globalAlpha = lit;
      }
      ctx.restore();
    }
    // 3. court surface, gloss pools, far-end haze
    TN.drawSurface(ctx, cam, { court: lerpColor(PAL.court, PAL.navy, h), apron: lerpColor(PAL.apron, PAL.bg, h), light: 0.3 * lit, lightAt: [5, 9] });
    if (lit > 0.002) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = lit;
      for (const [gx, gy, rm, a] of [[4, 8.5, 4.5, 0.30], [-2, 1.5, 3.5, 0.14]]) { const c = cam.project([gx, gy, 0]); if (!c.visible) continue; const r = c.scale * rm; const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r); grd.addColorStop(0, rgba(PAL.courtSheen, a)); grd.addColorStop(1, rgba(PAL.courtSheen, 0)); ctx.fillStyle = grd; fillPoly3(ctx, cam, COURT_QUAD); }
      ctx.restore();
    }
    // 4. lines (Line White → Flare Ice with glow in review mode), 1 m grid
    TN.drawLines(ctx, cam, { color: lerpColor(PAL.line, PAL.ice, h) });
    if (h > 0.002) { glowLayer(ctx, g => TN.drawLines(g, cam, { color: PAL.ice }), { blur: 14, alpha: 0.75 * h, op: 'screen' }); drawGrid(ctx, cam, 0.2 * h); }
    if (lit > 0.002) { // atmospheric haze toward the far end (darker, bluer, lower contrast — over the lines too)
      const n = cam.project([0, -halfL, 0]), fa = cam.project([0, halfL, 0]);
      if (n.visible && fa.visible) { ctx.save(); ctx.globalAlpha = lit; const grd = ctx.createLinearGradient(n.x, n.y, fa.x, fa.y); grd.addColorStop(0, rgba(PAL.navy, 0)); grd.addColorStop(0.55, rgba(PAL.navy, 0.12)); grd.addColorStop(1, rgba(PAL.navy, 0.5)); ctx.fillStyle = grd; fillPoly3(ctx, cam, APRON_QUAD); ctx.restore(); }
    }
    // 5. THE PING (reads gt, never frozen): wavefront 24 m/s from the mark, dies by f297
    if (gt > T_BOUNCE && gt < F(298)) linePing(ctx, cam, 24 * (gt - T_BOUNCE), 1 - prog(gt, F(291), F(297)));
    // 6. net (+ crossing sheet, travelling tape specular)
    const netBoost = TN.window01(f, 247, 249, 254, 258) * 0.35;
    TN.drawNet(ctx, cam, { alpha: 1 - 0.4 * h, meshAlpha: 0.35 + 0.3 * h + netBoost, color: lerpColor(PAL.net, PAL.accent2, h) });
    if (f >= 247 && f < 250) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = PAL.accent2; fillPoly3(ctx, cam, NET_QUAD); ctx.restore(); }
    if (f >= 247 && f < 258) {
      const k = E.outCubic(prog(f, 247, 258));
      for (const s of [-1, 1]) { const x = clamp(NET_X + s * k * 7.5, -netPostX, netPostX); const hh = netH + (netPostH - netH) * Math.pow(Math.abs(x) / netPostX, 2); const p = cam.project([x, 0, hh]); if (p.visible) TN.glowDot(ctx, p.x, p.y, Math.max(8, p.scale * 0.08), PAL.ice, 0.8 * (1 - k)); }
    }
    // 7. trajectory support: ground shadow trace + dashed cyan, wall ribbon, height ticks
    if (uNow > 0.002) {
      strokePath3(ctx, cam, groundFn, 0, uNow, 48, { color: 'rgba(0,0,0,0.35)', width: 3 });
      TN.drawTrajectory(ctx, cam, groundFn, { progress: uNow, samples: 48, width: 0.6, glow: 0, color: PAL.accent2, alpha: 0.7, taper: false, dash: [6, 6] });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = PAL.ball; const n = 28;
      for (let i = 0; i < n; i++) { const u0 = uNow * i / n, u1 = uNow * (i + 1) / n; ctx.globalAlpha = 0.045 * ((i + 1) / n) * (1 - 0.5 * h); fillPoly3(ctx, cam, [pathFn(u0), pathFn(u1), groundFn(u1), groundFn(u0)]); }
      ctx.restore();
      TN.drawHeightTicks(ctx, cam, pathFn, { progress: uNow, every: 8, samples: 64, color: PAL.accent2, alpha: 0.45 });
    }
    // 8. bounce mark (2-frame bloom) + ground shock ring (frozen by ttFx)
    if (gt >= T_BOUNCE) {
      const bloom = gt < F(275); ctx.save(); if (bloom) { ctx.shadowColor = PAL.ball; ctx.shadowBlur = 40; }
      TN.bounceMark(ctx, cam, MARK[0], MARK[1], DIR[0], DIR[1], { length: 0.12, width: 0.07, color: PAL.ball, alpha: 1 });
      if (bloom) TN.bounceMark(ctx, cam, MARK[0], MARK[1], DIR[0], DIR[1], { length: 0.12, width: 0.07, color: PAL.ballHi, alpha: 0.8 });
      ctx.restore();
      const a = prog(ttFx, T_BOUNCE, F(285)); const mp = cam.project(CONTACT);
      if (mp.visible && a > 0) TN.shockRing(ctx, mp.x, mp.y, E.outCubic(a) * 2.5 * mp.scale, lerp(18, 2, a) * clamp(mp.scale / 165, 0.5, 2), PAL.line, 0.55 * (1 - a) * lit, Math.max(0.15, Math.abs(cam.f[2])));
    }
    // 9. ghost-ball strobe every 8 film frames (frozen copies, 25 % → 10 % over 1 s)
    for (let k = 164; k <= 272; k += 8) {
      const gk = F(k); if (gk > ttBall) break; const gp = cam.project(pos(gk)); if (!gp.visible) continue;
      ctx.save(); ctx.globalAlpha = lerp(0.16, 0.06, clamp(gt - gk)) * lit; TN.drawBall(ctx, gp.x, gp.y, gp.scale * COURT.ballR * K, { detail: false, fuzz: 0, rim: 0.3, colors: TN.BALL_COLORS, light: LIGHT }); ctx.restore();
    }
    // 10. contact shadow, the tube (+ white centre line) — the one element that never changes through the re-skin
    TN.drawGroundShadow(ctx, cam, bp[0], bp[1], bp[2], COURT.ballR * K, 0.6 * lit);
    if (uNow > 0.002) {
      glowLayer(ctx, g => TN.drawTrajectory(g, cam, pathFn, { progress: uNow, samples: 48, width: 10, glow: 0, color: PAL.ball }), { blur: 24, alpha: 0.95, op: 'lighter' });
      TN.drawTrajectory(ctx, cam, pathFn, { progress: uNow, samples: 64, width: 10, glow: 0, color: PAL.ball });
      TN.drawTrajectory(ctx, cam, pathFn, { progress: uNow, samples: 64, width: 1, glow: 0, color: PAL.line, alpha: 0.9 });
    }
    // 11. chalk burst (world metres, film-scaled gravity, frozen at ttFx) and fibre particles shed behind the ball
    if (ttFx > T_BOUNCE) burst3D(ctx, cam, ttFx, { origin: [CONTACT[0], CONTACT[1], 0.01], t0: T_BOUNCE, window: 1 / 60, count: 120, seed: 73, life: [0.35, 0.5], speed: [1.5, 5], dir: [DIR[0] * 0.8, DIR[1] * 0.8, 0.6], spread: 0.8, gravity: 9.81 * 0.34 * 0.34, drag: 2.5, size: [lerp(2, 1, h), lerp(4, 1, h)], colors: [lerpColor(PAL.line, PAL.accent2, h), lerpColor(PAL.ice, PAL.accent2, h)], floor: true });
    if (gt > T0 + 1 / 60 && lit > 0.02) {
      const kEnd = Math.floor(ttBall * 60);
      for (let k = Math.max(157, kEnd - 22); k <= kEnd; k++) { const gk = F(k); const vel = ballVel(gk); burst3D(ctx, cam, ttFx, { origin: pos(gk), t0: gk, window: 1 / 60, count: 12, seed: 900 + k, life: [0.22, 0.4], speed: [0.2, 0.9], dir: [-vel[0], -vel[1], -vel[2] + 0.3], spread: 1.3, gravity: 0.6, drag: 3, size: [1, 2], colors: [PAL.ballHi], alpha: 0.8 * lit, shape: 'streak' }); }
    }
    // 12. the ball: felt (3 seam sub-rotations) cross-fading to the review ring
    const bsp = cam.project([bp[0], bp[1], bp[2] + (inContact ? COURT.ballR * K * 0.6 : 0)]);
    if (bsp.visible && lit > 0.005) {
      const r = bsp.scale * COURT.ballR * K; const squash = inContact ? 0.4 : 0;
      const up = cam.project([bp[0], bp[1], bp[2] + 0.2]); const ang = Math.atan2(-(up.x - bsp.x), up.y - bsp.y);
      const tauNow = tauAt(ttBall), dtau = Math.max(0, tauNow - tauAt(ttBall - 1 / 60));
      ctx.save(); ctx.globalAlpha = lit; TN.glowDot(ctx, bsp.x, bsp.y, r * 2.6, PAL.ball, 0.14);
      const alphas = [1, 0.5, 1 / 3];
      for (let j = 0; j < 3; j++) { const a = (tauNow - dtau * (2 - j) / 3) * SPIN; ctx.globalAlpha = lit * alphas[j]; TN.drawBall(ctx, bsp.x, bsp.y, r, { rot: [0.4 + a * 0.35, a, 0.3], light: LIGHT, squash, squashAngle: ang, fuzz: 1, rim: 0.7, colors: TN.BALL_COLORS }); }
      ctx.restore();
    }
    if (h > 0.002) { // review ball: 1.5 px Line White ring + 12 % Optic Yellow fill + 8 px Hawk Cyan cross, physical size, on the mark
      const mp = cam.project(MARK);
      if (mp.visible) { const r = mp.scale * COURT.ballR; ctx.save(); ctx.globalAlpha = h; ctx.fillStyle = rgba(PAL.ball, 0.12); ctx.beginPath(); ctx.arc(mp.x, mp.y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.strokeStyle = PAL.accent2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mp.x - 4, mp.y + 0.5); ctx.lineTo(mp.x + 4, mp.y + 0.5); ctx.moveTo(mp.x + 0.5, mp.y - 4); ctx.lineTo(mp.x + 0.5, mp.y + 4); ctx.stroke(); ctx.restore(); }
    }
    // 13. near-lens motes in the floodlight, contact flash inside the iris (2 frames, 60 %/30 %)
    if (lit > 0.01) TN.motes(ctx, gt, { count: 30, seed: 33, color: PAL.ice, alpha: 0.18 * lit, size: [1, 2.5], drift: [-30, 10] });
    if (gt >= F(156) && gt < F(158)) TN.flash(ctx, gt < F(157) ? 0.6 : 0.3, PAL.white);
  }

  // ---------- UI ----------
  function drawUIElements(g, gt, cam) {
    const f = gt * 60; const ttBall = Math.min(gt, F(274));
    // speed readout: fixed digit cells, 0 → 211 outQuart over f168–f216, ticking every 2 frames, RGB split while counting, 2-frame 1.05 pop
    const cell = digitCells(g); const fq = Math.floor((f - 168) / 2) * 2; const cp = E.outQuart(prog(fq, 0, 48)); const value = Math.round(211 * cp); const counting = f < 216;
    const pop = (f >= 216 && f < 218) ? 1.05 : 1; const str = String(value).padStart(3, '0'); const lead = 3 - String(value).length;
    g.save(); g.translate(96, 300); g.scale(pop, pop); g.translate(-96, -300);
    for (let i = 0; i < 3; i++) {
      const cx = 96 + i * cell + cell / 2; const dim = i < lead; const o = { size: 180, family: FONTS.oswald, weight: 700, align: 'center' };
      if (counting && !dim) { g.save(); g.globalCompositeOperation = 'lighter'; TN.text(g, str[i], cx - 3, 300, Object.assign({ color: '#FF0000', alpha: 0.9 }, o)); TN.text(g, str[i], cx + 3, 300, Object.assign({ color: '#0000FF', alpha: 0.9 }, o)); g.restore(); }
      TN.text(g, str[i], cx, 300, Object.assign({ color: PAL.line, alpha: dim ? 0.12 : 1 }, o));
    }
    TN.text(g, 'KM/H', 96 + 3 * cell + 18, 300, { size: 40, family: FONTS.display, weight: 600, color: PAL.mute, align: 'left', spacing: 3.2 });
    g.fillStyle = PAL.ball; g.fillRect(96, 312, 3 * cell * cp, 2);
    g.restore();
    // SPIN readout with a rotating seam icon, digits rolling over 6 frames from f255
    if (f >= 255) {
      const p = prog(f, 255, 261); const ix = 104, iy = 342;
      g.save(); g.strokeStyle = PAL.accent2; g.lineWidth = 1.5; g.beginPath(); g.arc(ix, iy, 7.5, 0, TAU); g.stroke();
      g.translate(ix, iy); g.rotate(tauAt(ttBall) * SPIN * 0.5); g.beginPath(); g.ellipse(0, 0, 7.5, 3, 0, 0, Math.PI); g.stroke(); g.restore();
      rollText(g, 'SPIN 2,150 RPM', 122, 350, p, { size: 22, family: FONTS.mono, weight: 400, color: PAL.accent2, spacing: 1.5 });
    }
    // NET CLEARANCE callout attached to the ball by a leader (opens f247 over 4 frames, collapses f261–f265)
    if (f >= 247 && f < 265) {
      const bp = pos(ttBall); const bs = cam.project(bp); const r = bs.scale * COURT.ballR * 3.4;
      const open = E.outCubic(prog(f, 247, 251)) * (1 - E.inCubic(prog(f, 261, 265)));
      const label = 'NET CLEARANCE 28 CM'; const tw = TN.measure(g, label, { size: 22, family: FONTS.mono, weight: 700, spacing: 2 }); const bw = tw + 28, bh = 38;
      const bx = bs.x + 64, by = bs.y - 100; const sx = bs.x + r * 0.6, sy = bs.y - r * 0.6;
      g.save(); g.strokeStyle = PAL.accent2; g.fillStyle = PAL.accent2; g.lineWidth = 1; g.globalAlpha = open;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(bx, by + bh); g.stroke(); g.beginPath(); g.arc(sx, sy, 2, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.fillStyle = rgba(PAL.navy, 0.7); g.fillRect(bx, by, bw * open, bh); g.strokeStyle = PAL.accent2; g.strokeRect(bx + 0.5, by + 0.5, Math.max(0, bw * open - 1), bh - 1);
      g.beginPath(); g.rect(bx, by, bw * open, bh); g.clip(); TN.text(g, label, bx + 14, by + 27, { size: 22, family: FONTS.mono, weight: 700, color: PAL.accent2, align: 'left', spacing: 2 });
      g.restore();
    }
    // bottom-right: real flight clock (freezes Optic Yellow at the bounce) + REPLAY
    const tau = tauAt(Math.min(gt, T_BOUNCE));
    TN.text(g, `T+${tau.toFixed(3)} S`, 1824, 1000, { size: 22, family: FONTS.mono, weight: 400, color: f >= 273 ? PAL.ball : PAL.mute, align: 'right', spacing: 1 });
    TN.text(g, 'REPLAY', 1824, 1028, { size: 22, family: FONTS.display, weight: 600, color: PAL.accent2, align: 'right', spacing: 4.4 });
  }
  function drawUI(ctx, gt, cam) {
    const f = gt * 60; if (f < 168) return;
    TN.wipeText(ctx, 'ELECTRONIC LINE CALLING', 96, 92, E.outCubic(prog(f, 168, 176)), { size: 26, family: FONTS.display, weight: 600, color: PAL.mute, alpha: 0.7, spacing: 26 * 0.22, align: 'left' });
    if (f >= 281) return;
    if (f < 273) { drawUIElements(ctx, gt, cam); return; }
    // out: sliced into 6 bands offset ±12 px alternately, fading over f273–f280
    const ui = TN.scratch('s3_ui'); drawUIElements(ui.getContext('2d'), gt, cam);
    const q = prog(f, 273, 281), e = E.outCubic(q); const bh = H / 6;
    ctx.save(); ctx.globalAlpha = 1 - q;
    for (let i = 0; i < 6; i++) ctx.drawImage(ui, 0, i * bh, W, bh, (i % 2 ? 1 : -1) * 12 * e, i * bh, W, bh);
    ctx.restore();
  }

  // ---------- scene ----------
  TN.scenes.scene3 = {
    render(ctx, t, gt) {
      const f = gt * 60; const cam = cameraAt(gt); const h = smoothstep(F(280), F(297), gt);
      const zoom = f >= 258 && f < 276; // speed: faint radial zoom blur toward the ball, settling over the first freeze frames
      if (zoom) {
        const world = TN.scratch('s3_world'); drawWorld(world.getContext('2d'), gt, cam, h);
        const bs = cam.project(pos(Math.min(gt, F(274)))); TN.radialZoomBlur(ctx, world, bs.x, bs.y, 0.02 * prog(f, 258, 273) * (1 - prog(f, 273, 276)), 4, 1);
      } else drawWorld(ctx, gt, cam, h);
      drawUI(ctx, gt, cam);
    },
  };
})();

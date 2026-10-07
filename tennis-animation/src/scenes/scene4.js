// scene4.js — S4 · THE VERDICT (f306–f437; renders gt 5.000–7.483 for the T3 scanWipe and T4 irisTravel overlaps).
// docs/STORYBOARD.md §4 S4. Orthographic reflected map M (+x screen-right, +y up the court = screen-up), the 12.5× dive
// to the 3 mm overlap sliver, the dimension bracket, THE BREATH (every pulse on a clamped clock), snap-back with IN
// geometrically locked to the service line, time resuming, the ball flying into the lens, then the T4 iris ball.
// Everything is a pure function of gt (absolute seconds); f = gt*60 are the storyboard frame numbers.
(function () {
  const TN = window.TN; TN.scenes = TN.scenes || {};
  const { W, H, clamp, lerp, prog, smoothstep, E, rgba, hash2, mulberry32, TAU, COURT, courtLines, PAL, FONTS, v3 } = TN;
  const F = f => f / 60;

  // ---------- world geometry (metres; x across the court, y along it, net y = 0) ----------
  const MARK_X = 1.45, LINE_OUT = 6.425, LINE_IN = 6.375, NEAR_EDGE = 6.422, BALL_Y = 6.4555;
  const V0 = [2.89, 47.78, -5.77]; const vl = Math.hypot(V0[0], V0[1]); const DIR = [V0[0] / vl, V0[1] / vl], PERP = [-DIR[1], DIR[0]];
  const MARK_A = 0.06, MARK_B = 0.035;                                                   // skid mark semi-axes (along flight, across)
  const EXT_Y = Math.hypot(MARK_A * DIR[1], MARK_B * DIR[0]), EXT_X = Math.hypot(MARK_A * DIR[0], MARK_B * DIR[1]);
  const MARK_CY = NEAR_EDGE + EXT_Y;                                                     // centre chosen so the near extreme is exactly 3 mm inside the outer edge (≈ S3's 6.482)
  const S_DIVE = 3600, S_HOLD = 900;

  // ---------- small utils ----------
  const hex2 = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  function mixHex(a, b, t) { const A = TN.hexToRgb(a), B = TN.hexToRgb(b); return '#' + hex2(lerp(A[0], B[0], t)) + hex2(lerp(A[1], B[1], t)) + hex2(lerp(A[2], B[2], t)); }
  const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
  const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  // THE BREATH: every periodic element reads this clock, which stands still for f366–f369 and resumes without a phase jump
  const tPulse = gt => (gt < F(366) ? gt : gt < F(370) ? F(366) : gt - F(4));

  // ---------- S3 handoff: px/m of S3's final 87° camera and the screen position of the overlap point (1.45, 6.425) ----------
  function s3End() {
    const S3 = TN.S3_END; let s0 = 288, P0 = { x: 960, y: 556 };
    if (S3) {
      const sv = typeof S3.scaleAtMark === 'function' ? S3.scaleAtMark() : S3.scaleAtMark; if (sv > 0) s0 = sv;
      const mv = typeof S3.markScreen === 'function' ? S3.markScreen() : S3.markScreen;                        // S3 publishes the MARK CENTRE (1.45, 6.482)
      if (mv && isFinite(mv.x) && isFinite(mv.y)) P0 = { x: mv.x, y: mv.y + (6.482 - LINE_OUT) * s0 };
    }
    return { s0, P0 };
  }

  // ---------- reflected map ----------
  function makeMap(s, Px, Py) { return { ppm: s, px: Px, py: Py, to: (x, y) => ({ x: Px + (x - MARK_X) * s, y: Py - (y - LINE_OUT) * s }) }; }

  // ---------- the s / P table (§4 S4 camera) ----------
  const sPush = f => S_HOLD + 9 * prog(f, 376, 407);                                    // 1 %/s push-in, held after f407
  function ballState(gt) {                                                               // BALL AT LENS (f414–f437) + court tracking
    const f = gt * 60; const s = sPush(f); const c0y = 700 - (MARK_CY - LINE_OUT) * s;    // starts on the mark centre (where the review ring sits)
    const q = prog(f, 414, 437); const e = E.inQuad(q); const cx = lerp(1220, 960, e), cy = lerp(c0y, 540, e);
    const d = 60 + 3140 * Math.pow(q, 3.2);
    return { q, cx, cy, r: d / 2, tx: cx - 1220, ty: cy - c0y + 1380 * q * q };
  }
  function camState(gt) {
    const f = gt * 60; const { s0, P0 } = s3End(); let s, Px, Py;
    if (f < 312) { s = s0; Px = P0.x; Py = P0.y; }
    else if (f < 354) { const u = prog(f, 312, 354); s = s0 * Math.pow(S_DIVE / s0, E.inOutQuart(u)); const v = E.inOutSine(u); Px = lerp(P0.x, 960, v); Py = lerp(P0.y, 620, v); }
    else if (f < 370) { s = S_DIVE; Px = 960; Py = 620; }
    else if (f < 376) { const u = E.outExpo(prog(f, 370, 375)); s = lerp(S_DIVE, S_HOLD, u); Px = lerp(960, 1220, u); Py = lerp(620, 700, u); }
    else if (f < 414) { s = sPush(f); Px = 1220; Py = 700; }
    else { const b = ballState(gt); s = sPush(f); Px = 1220 + b.tx; Py = 700 + b.ty; }   // the court is tracked with the ball and rushes down-screen
    return { s, Px, Py, s0 };
  }

  // ---------- chalk dust: the SAME analytic burst S3 draws (seed 73, world metres, film-scaled), frozen at f277, released at f408 ----------
  const DUST = (() => {
    const o = { origin: [MARK_X, BALL_Y, 0.01], t0: F(273), window: 1 / 60, count: 120, seed: 73, life: [0.35, 0.5], speed: [1.5, 5], spread: 0.8, g: 9.81 * 0.34 * 0.34, k: 2.5 };
    const dir = v3.norm([DIR[0] * 0.8, DIR[1] * 0.8, 0.6]); const e1 = v3.norm(v3.cross(dir, [0, 0, 1])); const e2 = v3.cross(dir, e1); const out = [];
    for (let i = 0; i < o.count; i++) {
      const birth = o.t0 + hash2(i, o.seed) * o.window; const L = lerp(o.life[0], o.life[1], hash2(i, o.seed + 1));
      const th = Math.sqrt(hash2(i, o.seed + 2)) * o.spread, ph = hash2(i, o.seed + 3) * TAU, ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp0 = Math.sin(ph);
      const sp = lerp(o.speed[0], o.speed[1], Math.pow(hash2(i, o.seed + 4), 1.5));
      out.push({ birth, L, vx: (dir[0] * ct + (e1[0] * cp + e2[0] * sp0) * st) * sp, vy: (dir[1] * ct + (e1[1] * cp + e2[1] * sp0) * st) * sp, vz: (dir[2] * ct + (e1[2] * cp + e2[2] * sp0) * st) * sp, szr: hash2(i, o.seed + 5), col: hash2(i, o.seed + 6) });
    }
    return { P: out, g: o.g, k: o.k, origin: o.origin };
  })();

  // ---------- felt texture: 1024² cached sprite (seeded strokes + fine grain) with a gradient fallback ----------
  let feltTex = null, feltTried = false;
  function getFelt() {
    if (feltTex || feltTried) return feltTex; feltTried = true;
    try {
      const c = TN.scratch('s4_felt', 1024, 1024, false); const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      const base = g.createRadialGradient(512, 512, 0, 512, 512, 760); base.addColorStop(0, mixHex(PAL.ball, PAL.ballMid, 0.35)); base.addColorStop(1, mixHex(PAL.ballMid, PAL.ballDeep, 0.3)); g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
      const rnd = mulberry32(77); g.lineCap = 'round';
      for (let i = 0; i < 12000; i++) {
        const x = rnd() * 1024, y = rnd() * 1024, a = rnd() * TAU, l = 2 + rnd() * 2 + (rnd() < 0.12 ? 3 : 0), w = 0.7 + rnd() * 1.3, ci = rnd();
        const col = ci < 0.26 ? PAL.ballHi : ci < 0.42 ? PAL.ball : ci < 0.68 ? PAL.ballDeep : ci < 0.9 ? PAL.ballShadow : PAL.line;
        g.strokeStyle = rgba(col, (ci >= 0.42 && ci < 0.9) ? 0.6 + rnd() * 0.4 : 0.45 + rnd() * 0.5); g.lineWidth = (ci >= 0.42 && ci < 0.9) ? w * 1.25 : w; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 1.4, y + Math.sin(a) * l * 1.4); g.stroke();
      }
      for (let i = 0; i < 9000; i++) { const x = rnd() * 1024, y = rnd() * 1024, d = rnd(); g.fillStyle = rgba(d < 0.55 ? PAL.ballShadow : PAL.ballHi, 0.35 + rnd() * 0.45); const s = 0.8 + rnd() * 1.6; g.fillRect(x, y, s, s); }
      const vg = g.createRadialGradient(512, 512, 320, 512, 512, 724); vg.addColorStop(0, rgba(PAL.ballMid, 0)); vg.addColorStop(1, rgba(PAL.ballMid, 0.45)); g.fillStyle = vg; g.fillRect(0, 0, 1024, 1024);
      feltTex = c;
    } catch (e) { feltTex = null; }
    return feltTex;
  }
  // macro felt ball: texture (or gradient fallback) clipped to the disc, top key light, rim, seam groove band
  function drawFeltBall(ctx, x, y, r, { patR = r, texRot = 0, seamRot = [0.9, 0, 0.25], seamHi = 0, seamWhite = 0, alpha = 1 } = {}) {
    if (r <= 0.5) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const tex = getFelt();
    if (tex) { ctx.save(); ctx.translate(x, y); ctx.rotate(texRot); const k = patR / 512; ctx.scale(k, k); ctx.drawImage(tex, -512, -512); ctx.restore(); }
    else { const fg = ctx.createRadialGradient(x, y - r * 0.5, r * 0.05, x, y, r); fg.addColorStop(0, PAL.ballHi); fg.addColorStop(0.3, PAL.ball); fg.addColorStop(0.75, PAL.ballDeep); fg.addColorStop(1, PAL.ballShadow); ctx.fillStyle = fg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    // seam groove: the real seam curve (front half) as a soft-edged Felt Core band between raised felt ridges, with a Line White highlight edge
    const sw = Math.max(1.5, 0.1 * patR); const pts = TN.SEAM.map(p => rotZ(rotY(rotX(p, seamRot[0]), seamRot[1]), seamRot[2]));
    const path = (ox, oy) => { ctx.beginPath(); let pen = false; for (const p of pts) { if (p[2] < -0.02) { pen = false; continue; } const sx = x + ox + p[0] * patR * 0.985, sy = y + oy - p[1] * patR * 0.985; if (!pen) { ctx.moveTo(sx, sy); pen = true; } else ctx.lineTo(sx, sy); } };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(PAL.ballHi, 0.32); ctx.lineWidth = sw * 1.35; path(0, 0); ctx.stroke();
    ctx.strokeStyle = rgba(PAL.ballShadow, 0.3); ctx.lineWidth = sw; path(0, 0); ctx.stroke();
    ctx.strokeStyle = rgba(PAL.ballShadow, 0.5); ctx.lineWidth = sw * 0.7; path(0, 0); ctx.stroke();
    ctx.strokeStyle = rgba(PAL.ballShadow, 0.85); ctx.lineWidth = sw * 0.4; path(0, 0); ctx.stroke();
    ctx.strokeStyle = rgba(PAL.ballDeep, 0.8); ctx.lineWidth = sw * 0.14; path(0, sw * 0.08); ctx.stroke();
    if (seamHi > 0) { ctx.strokeStyle = rgba(PAL.line, 0.8 * seamHi); ctx.lineWidth = Math.max(1, sw * 0.03); path(0, -sw * 0.55); ctx.stroke(); }
    if (seamWhite > 0) { ctx.strokeStyle = rgba('#F7F7F0', 0.95 * seamWhite); ctx.lineWidth = Math.max(1, patR * 0.065); path(0, 0); ctx.stroke(); }   // drawBall's seam, handed over at the crossfade
    ctx.restore();
    // sphere shading: key from the top of frame ([0,-1]), terminator toward the bottom
    const sh = ctx.createRadialGradient(x, y - r * 0.6, r * 0.05, x, y, r * 1.02);
    sh.addColorStop(0, 'rgba(255,255,245,0.11)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.78, 'rgba(0,0,0,0.2)'); sh.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const rg = ctx.createRadialGradient(x, y + r * 0.75, r * 0.3, x, y + r * 0.2, r * 1.1); rg.addColorStop(0, 'rgba(255,255,235,0.32)'); rg.addColorStop(0.5, 'rgba(255,255,200,0.07)'); rg.addColorStop(1, 'rgba(255,255,200,0)'); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
    ctx.restore();
  }

  // ---------- court primitives on the reflected map ----------
  function drawLinesM(g, M, { color, alpha = 1, glow = 0, op = 'source-over', shadowOnly = false }) {
    const s = M.ppm; const OFF = shadowOnly ? 4000 : 0;
    g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = op; g.fillStyle = color; if (glow > 0) { g.shadowColor = color; g.shadowBlur = glow; g.shadowOffsetX = OFF; }
    for (const [x1, y1, x2, y2, w] of courtLines()) {
      const a = M.to(x1, y1), b = M.to(x2, y2); const ww = Math.max(2, w * s);
      let rx = Math.min(a.x, b.x), ry = Math.min(a.y, b.y), rw = Math.abs(b.x - a.x), rh = Math.abs(b.y - a.y);
      if (rw < rh) { rx -= ww / 2; rw = ww; } else { ry -= ww / 2; rh = ww; }
      if (rx > W + 300 || rx + rw < -300 || ry > H + 300 || ry + rh < -300) continue;
      const x0 = Math.max(rx, -400), x1c = Math.min(rx + rw, W + 400), y0 = Math.max(ry, -400), y1c = Math.min(ry + rh, H + 400);
      g.fillRect(x0 - OFF, y0, x1c - x0, y1c - y0);
    }
    g.restore();
  }
  // grid at `step` metres over the court; wakeY lights rows up behind the scan band's front; clipRect restricts it (e.g. to the line band)
  function drawGrid(g, M, step, alpha, wakeY, color = PAL.accent2, clipRect = null) {
    if (alpha <= 0.003) return; const s = M.ppm; if (step * s < 5) return; const { halfL, halfWD } = COURT;
    const xmin = MARK_X - M.px / s, xmax = MARK_X + (W - M.px) / s, ymin = LINE_OUT + (M.py - H) / s, ymax = LINE_OUT + M.py / s;
    const x0 = Math.max(-halfWD, xmin), x1 = Math.min(halfWD, xmax), y0 = Math.max(-halfL, ymin), y1 = Math.min(halfL, ymax); if (x0 >= x1 || y0 >= y1) return;
    const A = M.to(x0, y1), B = M.to(x1, y0);
    g.save(); g.beginPath(); g.rect(A.x, A.y, B.x - A.x, B.y - A.y); g.clip(); if (clipRect) { g.beginPath(); g.rect(clipRect[0], clipRect[1], clipRect[2], clipRect[3]); g.clip(); } g.lineWidth = 1;
    if (wakeY != null) { const gr = g.createLinearGradient(0, wakeY - 60, 0, wakeY); gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(1, rgba(color, alpha)); g.strokeStyle = gr; } else g.strokeStyle = rgba(color, alpha);
    g.beginPath(); for (let i = Math.ceil(x0 / step - 1e-6); i <= Math.floor(x1 / step + 1e-6); i++) { const sx = Math.round(M.to(i * step, 0).x) + 0.5; g.moveTo(sx, A.y); g.lineTo(sx, B.y); } g.stroke();
    for (let j = Math.ceil(y0 / step - 1e-6); j <= Math.floor(y1 / step + 1e-6); j++) { const sy = Math.round(M.to(0, j * step).y) + 0.5; const a = wakeY == null ? alpha : alpha * clamp((wakeY - sy) / 60); if (a <= 0.003) continue; g.strokeStyle = rgba(color, a); g.beginPath(); g.moveTo(A.x, sy); g.lineTo(B.x, sy); g.stroke(); }
    g.restore();
  }
  function markPath(g, M, scale = 1, from = 0, to = 1) {
    const n = 64; g.beginPath(); let first = true;
    for (let i = Math.round(from * n); i <= Math.round(to * n); i++) {
      const a = -(i / n) * TAU;                                                            // clockwise on screen from 12 o'clock
      const u = Math.cos(a) * MARK_A * scale, v = Math.sin(a) * MARK_B * scale;
      const p = M.to(MARK_X + u * DIR[0] + v * PERP[0], MARK_CY + u * DIR[1] + v * PERP[1]);
      if (first) { g.moveTo(p.x, p.y); first = false; } else g.lineTo(p.x, p.y);
    }
    if (from === 0 && to === 1) g.closePath();
  }

  // court base: surface, grids, lines, ping afterglow, scanlines, pool, trajectory tube, chalk dust (h = review amount, k = photoreal amount)
  function drawCourtBase(g, M, gt, h, k, wakeY) {
    const f = gt * 60; const s = M.ppm; const { halfL, halfWD } = COURT;
    const A = M.to(-halfWD, halfL), B = M.to(halfWD, -halfL);
    const cx0 = Math.max(A.x, -500), cy0 = Math.max(A.y, -500), cx1 = Math.min(B.x, W + 500), cy1 = Math.min(B.y, H + 500);
    g.save();
    g.fillStyle = mixHex(PAL.navy, PAL.court, k); g.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    g.beginPath(); g.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); g.clip();
    if (h > 0) { const gg = g.createLinearGradient(0, 0, 0, H); gg.addColorStop(0, rgba('#132457', 0.6 * h)); gg.addColorStop(0.55, rgba('#0B1530', 0)); gg.addColorStop(1, rgba('#06080F', 0.45 * h)); g.fillStyle = gg; g.fillRect(-500, -500, W + 1000, H + 1000); }
    if (k > 0) {                                                                           // floodlit specular pool + sheen
      const lp = M.to(4.5, 9.5); const R = 9 * s; const pg = g.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, R); pg.addColorStop(0, `rgba(255,255,255,${0.34 * k})`); pg.addColorStop(0.5, `rgba(255,255,255,${0.12 * k})`); pg.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.globalCompositeOperation = 'overlay'; g.fillStyle = pg; g.fillRect(-500, -500, W + 1000, H + 1000); g.restore();
      const sg = g.createLinearGradient(0, H, W, 0); sg.addColorStop(0.3, rgba(PAL.courtSheen, 0)); sg.addColorStop(0.62, rgba(PAL.courtSheen, 0.3 * k)); sg.addColorStop(0.9, rgba(PAL.courtSheen, 0));
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = sg; g.fillRect(-500, -500, W + 1000, H + 1000); g.restore();
    }
    const fine = smoothstep(1200, 1800, s);
    if (h > 0) { drawGrid(g, M, 1, 0.2 * h * (1 - fine), wakeY); drawGrid(g, M, 0.01, 0.09 * h * fine, null); }
    if (h > 0) { TN.scanlines(g, 0.04 * h, 4); const mc = M.to(MARK_X, MARK_CY); TN.glowDot(g, mc.x, mc.y, clamp(s * 1.4, 300, 900), PAL.accent2, 0.12 * h); }
    // lines: Flare Ice with a 'screen' glow in review mode (slightly veiled so the pure-white sliver can out-shine them), Line White once time resumes
    if (h > 0) drawLinesM(g, M, { color: PAL.ice, alpha: h, glow: 12, op: 'screen', shadowOnly: true });
    drawLinesM(g, M, { color: mixHex(PAL.ice, PAL.line, k), alpha: lerp(lerp(1, 0.45, fine), 1, k) });
    if (h > 0 && fine > 0) {                                                               // the measured band: lit painted edges, the fine grid over it, a crisp rule on the edge being measured
      const y0 = M.to(0, LINE_OUT).y, y1 = M.to(0, LINE_IN).y; const eg = g.createLinearGradient(0, y0, 0, y1);
      eg.addColorStop(0, rgba(PAL.ice, 0.5)); eg.addColorStop(0.1, rgba(PAL.ice, 0.05)); eg.addColorStop(0.9, rgba(PAL.ice, 0.05)); eg.addColorStop(1, rgba(PAL.ice, 0.35));
      g.save(); g.globalAlpha = h * fine; g.fillStyle = eg; g.fillRect(-10, y0, W + 20, y1 - y0); g.restore();
      drawGrid(g, M, 0.01, 0.2 * h * fine, null, PAL.navy, [-10, y0, W + 20, y1 - y0]);
      g.save(); g.globalAlpha = 0.9 * h * fine; g.fillStyle = PAL.white; g.fillRect(-10, Math.round(y0), W + 20, 1); g.restore();
    }
    const pa = 0.6 * (1 - prog(f, 300, 310)); if (pa > 0) drawLinesM(g, M, { color: mixHex(PAL.ball, PAL.line, 0.5), alpha: pa, glow: 24, op: 'screen', shadowOnly: true });
    // trajectory tube: the continuity element from S3, last metres entering from below and ending at the contact point
    const tubeA = (f < 370 ? 1 : 0) * (1 - smoothstep(400, 1200, s));
    if (tubeA > 0.003) {
      const end = M.to(MARK_X, BALL_Y); const Lm = H / s + 1; const st = M.to(MARK_X - DIR[0] * Lm, BALL_Y - DIR[1] * Lm);
      g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round'; g.globalAlpha = tubeA;
      g.shadowColor = rgba(PAL.ball, 0.9); g.shadowBlur = 24; g.strokeStyle = PAL.ball; g.lineWidth = 10 * Math.min(2, s / 60); g.beginPath(); g.moveTo(st.x, st.y); g.lineTo(end.x, end.y); g.stroke();
      g.shadowBlur = 0; g.strokeStyle = PAL.line; g.globalAlpha = tubeA * 0.9; g.lineWidth = 2; g.beginPath(); g.moveTo(st.x, st.y); g.lineTo(end.x, end.y); g.stroke(); g.restore();
    }
    // chalk dust: frozen cyan data points in review (identical to S3's), chalk again when time resumes
    const ttFx = f < 408 ? Math.min(gt, F(277)) : F(277) + (gt - F(408));
    g.save(); g.globalCompositeOperation = 'screen';
    for (const d of DUST.P) {
      const age = ttFx - d.birth; if (age < 0 || age > d.L) continue; const fd = (1 - Math.exp(-DUST.k * age)) / DUST.k; let z = DUST.origin[2] + d.vz * fd - 0.5 * DUST.g * age * age; if (z < 0.004) z = 0.004;
      const p = M.to(DUST.origin[0] + d.vx * fd, DUST.origin[1] + d.vy * fd); if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
      const a = Math.pow(1 - age / d.L, 1.5); if (a < 0.003) continue;
      const sz = lerp(1, lerp(0.8, 1.9, d.szr), k) * clamp(s / 165, 0.5, lerp(2.5, 1.2, k));
      g.globalAlpha = a * lerp(1, 0.85, k); g.fillStyle = k > 0 ? mixHex(d.col < 0.5 ? PAL.line : PAL.ice, PAL.accent2, h) : PAL.accent2; g.beginPath(); g.arc(p.x, p.y, sz, 0, TAU); g.fill();
    }
    g.restore();
    g.restore();
  }

  // the ball-mark: lit skid fill, re-stamp pulse, Hawk Cyan outline, ripple, the OVERLAP SLIVER, glow pulses (drawn after the IN type)
  function drawMark(g, M, gt, h, k) {
    const f = gt * 60; const s = M.ppm;
    const ps = f >= 312 ? lerp(1.3, 1, E.outBack(prog(f, 312, 320))) : 1;
    let glowA = 0, glowBlur = 0;
    if (f >= 312 && f < 314) { glowA = 1; glowBlur = 40; }
    else if (f >= 372 && f < 408) { glowA = lerp(0.3, 0.5, 0.5 + 0.5 * Math.sin(TAU * (tPulse(gt) - F(372)))); glowBlur = 20; }
    const mc = M.to(MARK_X, MARK_CY); const flash = f >= 372 && f < 374;
    g.save(); g.globalAlpha = lerp(1, 0.8, k);
    if (glowA > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.shadowColor = rgba(PAL.ball, glowA); g.shadowBlur = glowBlur; g.fillStyle = rgba(PAL.ball, glowA * 0.6); markPath(g, M, ps); g.fill(); g.restore(); }
    // body: densest where the felt first bit the court (near edge), trailing off toward the skid's far end
    const near = M.to(MARK_X, NEAR_EDGE), far = M.to(MARK_X + DIR[0] * 2 * MARK_A, MARK_CY + DIR[1] * MARK_A);
    const fg = g.createLinearGradient(near.x, near.y, far.x, far.y);
    fg.addColorStop(0, flash ? PAL.ballHi : mixHex(PAL.ballHi, PAL.ball, 0.45)); fg.addColorStop(0.45, flash ? PAL.ballHi : PAL.ball); fg.addColorStop(1, flash ? PAL.ballHi : mixHex(PAL.ball, PAL.ballMid, 0.7));
    g.fillStyle = fg; markPath(g, M, ps); g.fill();
    if (EXT_X * s > 14) {                                                                  // skid fibres along the flight direction (only when the mark is big enough to show them)
      g.save(); markPath(g, M, ps); g.clip(); g.lineCap = 'round'; const n = 46;
      for (let i = 0; i < n; i++) {
        const u = (hash2(i, 501) - 0.5) * 2 * MARK_B * 0.92 * ps, l0 = (hash2(i, 502) - 0.5) * 2 * MARK_A * ps, l1 = l0 + lerp(0.25, 0.9, hash2(i, 503)) * MARK_A * ps;
        const a = M.to(MARK_X + PERP[0] * u + DIR[0] * l0, MARK_CY + PERP[1] * u + DIR[1] * l0), b = M.to(MARK_X + PERP[0] * u + DIR[0] * l1, MARK_CY + PERP[1] * u + DIR[1] * l1);
        g.strokeStyle = rgba(hash2(i, 504) < 0.5 ? PAL.ballHi : PAL.ballDeep, 0.18 + 0.24 * hash2(i, 505)); g.lineWidth = Math.max(1, s * 0.0007 * lerp(1, 3, hash2(i, 506)));
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      }
      const eg = g.createRadialGradient(mc.x, mc.y, 0, mc.x, mc.y, EXT_Y * s * ps); eg.addColorStop(0.55, 'rgba(0,0,0,0)'); eg.addColorStop(1, rgba(PAL.ballDeep, 0.5)); g.fillStyle = eg; g.fillRect(mc.x - EXT_Y * s * 1.2, mc.y - EXT_Y * s * 1.2, EXT_Y * s * 2.4, EXT_Y * s * 2.4);
      g.restore();
    }
    // record outline (f312: draws clockwise from 12 o'clock over 8 frames, dashed → solid)
    if (h > 0 && f >= 312) {
      const p = prog(f, 312, 320); g.save(); g.strokeStyle = rgba(PAL.accent2, 0.95 * h); g.lineWidth = 2; g.lineCap = 'round'; if (p < 1) g.setLineDash([8, lerp(8, 0, p)]);
      markPath(g, M, ps, 0, p); g.stroke(); g.restore();
      const rp = prog(f, 312, 322); if (rp < 1) { g.save(); g.strokeStyle = rgba(PAL.accent2, 0.5 * (1 - rp)); g.lineWidth = 1; g.beginPath(); g.arc(mc.x, mc.y, 60 * E.outCubic(rp) + Math.max(EXT_X, EXT_Y) * s, 0, TAU); g.stroke(); g.restore(); }
    }
    // THE OVERLAP SLIVER: the part of the mark inside the line band, pure white 'lighter', 3 Hz pulse on the breath clock, with a blade glow
    const sa = prog(f, 330, 334) * (1 - prog(f, 370, 375)) * h;
    if (sa > 0.003) {
      const pulse = 0.75 + 0.25 * Math.cos(TAU * 3 * (tPulse(gt) - F(366))); const yOut = M.to(0, LINE_OUT).y, yIn = M.to(0, LINE_IN).y, yNear = M.to(0, NEAR_EDGE).y;
      const hh = yNear - yOut; const bw = 2 * EXT_X * s * Math.sqrt(Math.max(0, 1 - Math.pow(1 - hh / (EXT_Y * s), 2))) || 4;   // chord width of the blade
      g.save(); g.globalCompositeOperation = 'lighter'; TN.lightStreak(g, mc.x, yOut + hh / 2, 0, bw * 1.8, Math.max(6, hh * 1.3), PAL.white, 0.3 * sa * pulse, 0.5); g.restore();
      g.save(); markPath(g, M, 1); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = sa * pulse; g.fillStyle = '#FFFFFF'; g.fillRect(-10, yOut, W + 20, yIn - yOut); g.restore();
    }
    g.restore();
  }
  // review ball: 1.5 px Line White ring + 12 % Optic Yellow fill + 8 px Hawk Cyan centre cross (on the mark centre, exactly as S3 draws it)
  function drawRing(g, c, r, alpha) {
    if (alpha <= 0.003) return; g.save(); g.globalAlpha = alpha; g.fillStyle = rgba(PAL.ball, 0.12); g.beginPath(); g.arc(c.x, c.y, r, 0, TAU); g.fill();
    g.strokeStyle = PAL.line; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = PAL.accent2; g.lineWidth = 1; g.beginPath(); g.moveTo(c.x - 4, c.y + 0.5); g.lineTo(c.x + 4, c.y + 0.5); g.moveTo(c.x + 0.5, c.y - 4); g.lineTo(c.x + 0.5, c.y + 4); g.stroke(); g.restore();
  }

  // ---------- typography ----------
  function monoRoll(ctx, str, x, y, p, o) {                                            // fixed digit cells, odometer roll while p < 1
    const chars = [...str]; ctx.save(); ctx.font = `${o.weight || 400} ${o.size}px ${FONTS.mono}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const cw = ctx.measureText('0').width, sp = o.spacing || 0, total = chars.length * cw + sp * (chars.length - 1);
    let cx = o.align === 'right' ? x - total : o.align === 'center' ? x - total / 2 : x; ctx.fillStyle = o.color;
    for (let i = 0; i < chars.length; i++) {
      let ch = chars[i], a = 1;
      if (/\d/.test(ch)) { const lp = clamp((p - i * 0.05) / (1 - i * 0.05)); if (lp < 1) { ch = String(Math.floor(hash2(i, Math.floor(p * 90 + i * 13)) * 10)); a = 0.85; } }
      ctx.globalAlpha = a * (o.alpha == null ? 1 : o.alpha); ctx.fillText(ch, cx + (cw - ctx.measureText(ch).width) / 2, y); cx += cw + sp;
    }
    ctx.restore();
  }
  function drawIN(ctx, M, gt) {
    const f = gt * 60; if (f < 372 || f >= 414) return;
    const base = M.to(0, LINE_OUT).y, right = M.to(MARK_X - EXT_X, 0).x - 40;                                 // the geometric lock
    const o = { size: 560, family: FONTS.heavy, weight: 400, spacing: -20, align: 'right' };
    ctx.save(); ctx.font = `400 560px ${FONTS.heavy}`; const mN = ctx.measureText('N'); const rsb = Math.max(0, mN.width - mN.actualBoundingBoxRight); ctx.restore();
    const rightAdv = right + rsb;                                                            // advance edge so that the glyph's ink edge lands on the lock
    const w = TN.measure(ctx, 'IN', o); const cx = rightAdv - w / 2;
    const sc = lerp(1.6, 1, E.slam(prog(f, 372, 378))); let alpha = clamp((f - 371) / 2), scOut = 1;
    if (f >= 408) { const po = prog(f, 408, 414); scOut = lerp(1, 1.06, po); alpha *= 1 - po; }
    if (alpha <= 0.003) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, base); ctx.scale(sc * scOut, sc * scOut); ctx.translate(-cx, -base);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowOffsetY = 14; ctx.shadowBlur = 40;
    if (f < 375) TN.text(ctx, 'IN', rightAdv, base, Object.assign({}, o, { color: null, stroke: PAL.line, strokeWidth: 12 }));
    const fill = ctx.createLinearGradient(0, base - 481, 0, base); fill.addColorStop(0, PAL.ballHi); fill.addColorStop(0.3, PAL.ball); fill.addColorStop(1, mixHex(PAL.ball, PAL.ballMid, 0.35));   // lit from the top like everything else
    TN.text(ctx, 'IN', rightAdv, base, Object.assign({}, o, { color: fill }));
    ctx.restore();
  }
  function drawTag(ctx, gt) {
    const f = gt * 60; if (f < 312 || f >= 408) return;
    const decision = f >= 372; const label = decision ? 'DECISION' : 'REVIEW';
    const on = decision || (Math.floor((Math.round(tPulse(gt) * 60) - 306) / 15) % 2 === 0);   // 2 Hz square wave; integer frames so the breath frame is unambiguously ON
    const o = { size: 22, family: FONTS.display, weight: 600, spacing: 22 * 0.2, align: 'left' };
    const w = TN.measure(ctx, label, o); const bw = Math.max(110, w + 30), bh = 30, x = 96, y = 978;
    const pop = decision ? lerp(1.18, 1, E.outCubic(prog(f, 372, 376))) : 1;
    ctx.save(); ctx.translate(x, y + bh / 2); ctx.scale(pop, pop); ctx.translate(-x, -(y + bh / 2));
    if (on) { ctx.fillStyle = decision ? PAL.accent2 : PAL.accent; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 4); ctx.fill(); TN.text(ctx, label, x + (bw - w) / 2, y + 21, Object.assign({}, o, { color: decision ? PAL.bg : PAL.line })); }
    else { ctx.strokeStyle = rgba(PAL.accent, 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, bw - 1, bh - 1, 4); ctx.stroke(); TN.text(ctx, label, x + (bw - w) / 2, y + 21, Object.assign({}, o, { color: PAL.accent, alpha: 0.7 })); }
    ctx.restore();
  }
  // DIMENSION BRACKET + 3 MM (f354–f369, collapses f370–f372). Rules carry a dark halo so they read over the light band as well as the navy.
  function drawBracket(ctx, M, gt) {
    const f = gt * 60; if (f < 354 || f >= 373) return;
    const grow = f < 370 ? E.outCubic(prog(f, 354, 362)) : 1 - E.inCubic(prog(f, 370, 372)); if (grow <= 0.003) return;
    const yA = M.to(0, LINE_OUT).y + 0.5, yB = M.to(0, NEAR_EDGE).y + 0.5; const xs = M.to(MARK_X + EXT_X, 0).x + 8, xe = xs + 260 * grow; const xc = Math.round(xe) + 0.5;
    const capA = clamp((grow - 0.85) / 0.15);
    const strokes = () => {
      ctx.beginPath(); ctx.moveTo(xs, yA); ctx.lineTo(xe, yA); ctx.moveTo(xs, yB); ctx.lineTo(xe, yB); ctx.stroke();
      if (capA > 0) { ctx.save(); ctx.globalAlpha *= capA; ctx.beginPath(); ctx.moveTo(xc, yA - 22); ctx.lineTo(xc, yB + 10); ctx.moveTo(xc - 5, yA - 10); ctx.lineTo(xc + 5, yA - 10); ctx.moveTo(xc - 5, yB + 10); ctx.lineTo(xc + 5, yB + 10); ctx.stroke(); ctx.restore(); }
    };
    ctx.save(); ctx.lineCap = 'butt';
    ctx.strokeStyle = rgba(PAL.navy, 0.75); ctx.lineWidth = 3; ctx.globalAlpha = 1; strokes();
    ctx.strokeStyle = PAL.accent2; ctx.lineWidth = 1; ctx.globalAlpha = 0.95; strokes();
    const la = (f < 370 ? prog(f, 356, 358) : 1 - prog(f, 370, 372)) * capA;
    if (la > 0) { ctx.shadowColor = rgba(PAL.ice, 0.8); ctx.shadowBlur = 14; monoRoll(ctx, '3 MM', xe + 6, yA - 28, prog(f, 358, 364), { size: 44, weight: 700, color: PAL.line, align: 'right', alpha: la }); }
    ctx.restore();
  }
  function drawUI(ctx, M, S, gt) {
    const f = gt * 60; if (f >= 408) return;
    const mono = { size: 22, family: FONTS.mono, weight: 400, spacing: 2.2 };
    TN.text(ctx, 'ELECTRONIC LINE CALLING', 96, 92, { size: 26, family: FONTS.display, weight: 600, color: PAL.mute, alpha: 0.7, align: 'left', spacing: 26 * 0.22 });
    if (f >= 312) {
      TN.wipeText(ctx, 'LINE REVIEW · FIRST SERVE · SERVICE LINE', 96, 126, prog(f, 312, 318), Object.assign({}, mono, { color: PAL.mute, align: 'left' }));
      const zs = f < 354 ? S.s : f < 370 ? S_DIVE : f < 375 ? S.s : S_HOLD; const z = (zs / S.s0).toFixed(1).padStart(4, '0');
      TN.text(ctx, 'ZOOM ×' + z, 1824, 1000, Object.assign({}, mono, { color: PAL.accent2, align: 'right', alpha: prog(f, 312, 316) }));
      TN.text(ctx, 'ORTHO · 1 PX = ' + (1000 / zs).toFixed(zs > 1000 ? 2 : 1) + ' MM', 1824, 1028, Object.assign({}, mono, { color: PAL.mute, align: 'right', alpha: 0.8 * prog(f, 314, 318) }));
      drawTag(ctx, gt);
    }
    // data strip
    const rows = [['SERVE', '211 KM/H'], ['NET CLEARANCE', '28 CM'], ['BALL MARK', '65 × 120 MM']];
    rows.forEach((r, i) => { const t0 = 318 + i * 2; if (f < t0) return; const a = clamp((f - t0) / 2), y = 170 + i * 30;
      TN.text(ctx, r[0], 96, y, Object.assign({}, mono, { color: PAL.accent2, align: 'left', alpha: 0.72 * a })); monoRoll(ctx, r[1], 452, y, prog(f, t0, t0 + 6), Object.assign({}, mono, { color: PAL.accent2, align: 'right', alpha: a })); });
    // edge labels + bracket (f354–f369; collapse with the bracket)
    if (f >= 354 && f < 373) {
      const la = f < 370 ? prog(f, 354, 358) : 1 - prog(f, 370, 372); const yA = M.to(0, LINE_OUT).y; const mc = M.to(MARK_X, MARK_CY); const top = mc.y - EXT_Y * M.ppm;
      TN.text(ctx, 'SERVICE LINE · OUTER EDGE', 1824, yA - 10, Object.assign({}, mono, { color: PAL.mute, align: 'right', alpha: 0.8 * la }));
      TN.text(ctx, 'BALL MARK', mc.x, top - 16, Object.assign({}, mono, { color: PAL.mute, align: 'center', alpha: 0.8 * la }));
      drawBracket(ctx, M, gt);
    }
    if (f >= 378) { const p = prog(f, 378, 384); TN.wipeText(ctx, 'CALL CONFIRMED · MARGIN 3 MM', 960, 176, p, { size: 28, family: FONTS.display, weight: 600, color: PAL.accent2, align: 'center', spacing: 28 * 0.28 }); ctx.save(); ctx.fillStyle = PAL.accent2; ctx.fillRect(960 - 130 * p, 190, 260 * p, 2); ctx.restore(); }
  }

  // ---------- the hero ball (f408 → time resumes on the mark; f414–f437 → at the lens) ----------
  function drawHeroBall(ctx, gt) {
    const f = gt * 60; if (f < 408) return;
    const b = ballState(gt); const alpha = prog(f, 408, 413); const sq = 0.4 * (1 - prog(f, 408, 414));   // un-squash as it lifts off
    const r = b.r * (1 + sq * 0.5); const dt = gt - F(408); const rot = [0.5 + dt * 3.2, 0.3 + dt * 1.4, 0.15];
    const texMix = smoothstep(520, 640, r);
    ctx.save(); ctx.globalAlpha = alpha;
    if (texMix < 1) TN.drawBall(ctx, b.cx, b.cy, r, { colors: TN.BALL_COLORS, light: [0, -1], rim: 0.65, fuzz: 1, rot });
    if (texMix > 0) drawFeltBall(ctx, b.cx, b.cy, r, { patR: r, texRot: (gt - F(414)) * 4 * Math.PI / 180, seamRot: rot, seamHi: prog(f, 431, 437), seamWhite: 1 - smoothstep(600, 1300, r), alpha: texMix });
    ctx.restore();
  }
  function drawBallShadow(g, x, y, r, q) {                                               // contact shadow, spreading and fading as the ball climbs
    const k = 1 - q; if (k <= 0.02) return; const rr = r * (1.05 + 0.4 * q), ry = rr * 0.9; const sh = g.createRadialGradient(x, y + r * 0.22, 0, x, y + r * 0.22, rr);
    sh.addColorStop(0, `rgba(0,0,0,${0.55 * k})`); sh.addColorStop(0.6, `rgba(0,0,0,${0.3 * k})`); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.fillStyle = sh; g.beginPath(); g.ellipse(x, y + r * 0.22, rr, ry, 0, 0, TAU); g.fill(); g.restore();
  }

  // ---------- past the scene's end (T4 irisTravel): Stadium Black with exactly the published ball ----------
  function renderIrisBall(ctx, gt) {
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
    const b = TN.S4S5.ball(gt); const patR = lerp(1600, b.r, prog(gt, F(438), F(441)));   // felt scale continuous with f437
    const dt = gt - F(408); const rot = [0.5 + dt * 3.2, 0.3 + dt * 1.4, 0.15];
    drawFeltBall(ctx, b.x, b.y, b.r, { patR, texRot: (gt - F(414)) * 4 * Math.PI / 180, seamRot: rot, seamHi: 1 });
    ctx.save(); ctx.strokeStyle = PAL.ice; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0.5, b.r - 1), 0, TAU); ctx.stroke(); ctx.restore();
  }

  TN.scenes.scene4 = {
    render(ctx, t, gt) {
      const f = gt * 60;
      if (f >= 437.5) { renderIrisBall(ctx, gt); return; }
      const S = camState(gt); const M = makeMap(S.s, S.Px, S.Py);
      const k = prog(f, 408, 413), h = 1 - k;                                            // photoreal / review amounts (hawkMode = h)
      const q = prog(f, 414, 437); const wakeY = f < 312 ? E.inOutQuad(prog(gt, F(300), F(312))) * (H + 120) - 60 : null;
      const shk = TN.shake(gt, F(372), 4, 0.03, 30, 11);
      ctx.save();
      ctx.translate(W / 2 + shk.x, H / 2 + shk.y); ctx.rotate(shk.r); ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = mixHex(PAL.bg, PAL.apron, k); ctx.fillRect(-20, -20, W + 40, H + 40);
      if (q <= 0) {
        drawCourtBase(ctx, M, gt, h, k, wakeY);
        drawIN(ctx, M, gt);
        drawMark(ctx, M, gt, h, k);
        const mc = M.to(MARK_X, MARK_CY); const s = M.ppm; const ringA = (f < 408 ? 1 : 1 - prog(f, 408, 413)) * (s < 900 ? 1 : lerp(1, 0.2, smoothstep(900, S_DIVE, s)));
        drawRing(ctx, mc, COURT.ballR * s, ringA);
        drawHeroBall(ctx, gt);
      } else {
        // BALL AT LENS: the court (with the mark and the contact shadow) is tracked, streaked down-screen, darkened and finally defocused; the ball stays sharp
        const b = ballState(gt); const PAD = 48; const cs = TN.scratch('s4_court', W / 2, H / 2 + 2 * PAD); const g = cs.getContext('2d');
        g.save(); g.translate(0, PAD); g.scale(0.5, 0.5); g.fillStyle = PAL.apron; g.fillRect(-20, -2 * PAD - 20, W + 40, H + 4 * PAD + 40); drawCourtBase(g, M, gt, 0, 1, null); drawMark(g, M, gt, 0, 1); drawBallShadow(g, b.cx, b.cy, b.r, q); g.restore();
        g.fillStyle = `rgba(0,0,0,${0.55 * q})`; g.fillRect(0, 0, W / 2, H / 2 + 2 * PAD);
        const L = 120 * q; const n = clamp(Math.round(L / 12), 1, 10);
        const c2 = TN.scratch('s4_court2', W / 2, H / 2 + 2 * PAD); const g2 = c2.getContext('2d'); g2.fillStyle = '#000'; g2.fillRect(0, 0, W / 2, H / 2 + 2 * PAD);
        g2.globalCompositeOperation = 'lighter'; g2.globalAlpha = 1 / n; for (let i = 0; i < n; i++) { const off = n > 1 ? (i / (n - 1) - 0.5) * L / 2 : 0; g2.drawImage(cs, 0, off); }
        const bl = 6 * prog(f, 431, 437); ctx.save(); if (bl > 0.15) ctx.filter = `blur(${(bl / 2).toFixed(1)}px)`; ctx.drawImage(c2, 0, PAD, W / 2, H / 2, 0, 0, W, H); ctx.restore();
        drawHeroBall(ctx, gt);
      }
      // IN slam FX (f372): shock ring from the mark, chalk flecks from the sliver, exposure lift, 2-frame flash
      if (f >= 372 && f < 390) {
        const mb = M.to(MARK_X, NEAR_EDGE); const p = prog(f, 372, 384);
        if (p < 1) TN.shockRing(ctx, mb.x, mb.y, E.outCubic(p) * 900, lerp(24, 2, p), mixHex(PAL.line, PAL.ball, p), 0.9 * (1 - p * p));
        TN.burst(ctx, gt, { x: mb.x, y: mb.y, t0: F(372), window: 0.02, count: 40, seed: 372, life: [0.25, 0.5], speed: [160, 520], angle: -Math.PI / 2, spread: Math.PI * 1.1, gravity: 800, drag: 2, size: [1, 2.5], colors: [PAL.line, PAL.ice], shape: 'dot' });
      }
      drawUI(ctx, M, S, gt);
      if (f >= 372 && f < 380) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore(); }
      if (f >= 372 && f < 374) TN.flash(ctx, f < 373 ? 0.30 : 0.15, '#FFFFFF');
      ctx.restore();
    },
  };
})();

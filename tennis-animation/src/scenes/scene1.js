// scene1.js — S1 IGNITION (f0–f83, rendered through f92 under the T1 whiteout). docs/STORYBOARD.md §4 S1.
(function () {
  const TN = window.TN; const { W, H, PAL, E, clamp, lerp, prog, hash2, noise1, rgba, TAU, COURT } = TN;
  TN.scenes = TN.scenes || {};
  const F = f => f / 60;
  // floodlight rigs (world metres) and ignition frames
  const RIGS = [
    { id: 'R1', p: [-9, 16, 11], f: 12 }, { id: 'R2', p: [9, 16, 11], f: 27 },
    { id: 'R3', p: [-10, 6, 8], f: 42 }, { id: 'R4', p: [10, 6, 8], f: 42 },
  ];
  const R5 = { p: [3, 10, 9], f: 75 };
  // stands: far quad + two side quads (the "near" stand would sit around the camera, so it is omitted)
  const STANDS = [
    [[-20, 14, 2], [20, 14, 2], [20, 18, 12], [-20, 18, 12]],
    [[-12, -14, 2], [-12, 14, 2], [-16, 14, 12], [-16, -14, 12]],
    [[12, -14, 2], [12, 14, 2], [16, 14, 12], [16, -14, 12]],
  ];
  // 2,400 seeded specks as (quad index, u, v) — call-order independent cache
  const SPECKS = (() => { const r = TN.mulberry32(31); const a = []; for (let i = 0; i < 2400; i++) a.push([Math.floor(r() * 3), r(), r()]); return a; })();
  const quadPoint = (q, u, v) => { const a = q[0], b = q[1], c = q[2], d = q[3]; const p0 = [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; const p1 = [lerp(d[0], c[0], u), lerp(d[1], c[1], u), lerp(d[2], c[2], u)]; return [lerp(p0[0], p1[0], v), lerp(p0[1], p1[1], v), lerp(p0[2], p1[2], v)]; };
  // line light-trace schedule: [x1,y1,x2,y2,w,f0,f1]
  const { halfL, halfWD, halfWS, serviceFromNet, lineW, baselineW, centerMark } = COURT;
  const TRACE = [
    // baselines from the centre mark outward both ways f18–f32
    [0, -halfL, -halfWD, -halfL, baselineW, 18, 32], [0, -halfL, halfWD, -halfL, baselineW, 18, 32],
    [0, halfL, -halfWD, halfL, baselineW, 20, 34], [0, halfL, halfWD, halfL, baselineW, 20, 34],
    // sidelines near → far f28–f52 (doubles first, singles a beat later)
    [-halfWD, -halfL, -halfWD, halfL, lineW, 28, 50], [halfWD, -halfL, halfWD, halfL, lineW, 28, 50],
    [-halfWS, -halfL, -halfWS, halfL, lineW, 31, 52], [halfWS, -halfL, halfWS, halfL, lineW, 31, 52],
    // service lines + centre service line f46–f64
    [-halfWS, -serviceFromNet, halfWS, -serviceFromNet, lineW, 46, 58], [halfWS, serviceFromNet, -halfWS, serviceFromNet, lineW, 48, 60],
    [0, -serviceFromNet, 0, serviceFromNet, lineW, 52, 64],
    // centre marks f62–f66
    [0, -halfL, 0, -halfL + centerMark * 2, lineW, 62, 66], [0, halfL, 0, halfL - centerMark * 2, lineW, 62, 66],
  ];
  const courtQuad = [[-halfWD, -halfL, 0], [halfWD, -halfL, 0], [halfWD, halfL, 0], [-halfWD, halfL, 0]];
  const clipPoly3 = (ctx, cam, pts) => { ctx.beginPath(); let first = true; for (const p of pts) { const s = cam.project(p); if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y); } ctx.closePath(); ctx.clip(); };

  function rigGlow(ctx, cam, rig, f, expo) {
    const age = f - rig.f; if (age < 0) return;
    const s = cam.project(rig.p); if (!s.visible) return;
    const on = clamp(age / 4); const over = 1 + 0.4 * (age < 2 ? 1 : age < 4 ? 0.5 : 0); // overshoot for 2 frames
    // lamp grid 5×3 (0.5 m pitch) popping row by row
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      const rowOn = clamp((age - r * 1.2) / 2); if (rowOn <= 0) continue;
      const lp = cam.project([rig.p[0] + (c - 2) * 0.3, rig.p[1], rig.p[2] - (r - 1) * 0.26]);
      TN.glowDot(ctx, lp.x, lp.y, 7 * over, '#FFFFFF', 0.9 * rowOn, 0.2); TN.glowDot(ctx, lp.x, lp.y, 22 * over, PAL.ice, 0.35 * rowOn);
    }
    TN.glowDot(ctx, s.x, s.y, 170 * over * on, PAL.ice, 0.55 * on); TN.glowDot(ctx, s.x, s.y, 520 * on, PAL.ice, 0.12 * on);
    TN.lightStreak(ctx, s.x, s.y, 0, 900 * on, 6, PAL.ice, 0.8 * on, 0.5);
    // reflection pool on the glossy court: mirrored rig through the ground plane, clipped to the court (elongated, subtle)
    const m = cam.project([rig.p[0], rig.p[1], -rig.p[2]]);
    ctx.save(); clipPoly3(ctx, cam, courtQuad); ctx.translate(m.x, m.y); ctx.scale(0.8, 4.2); TN.glowDot(ctx, 0, 0, 110 * on, PAL.ice, 0.22 * on * expo); TN.glowDot(ctx, 0, 0, 30 * on, '#FFFFFF', 0.18 * on); ctx.restore();
  }
  // soft volumetric beams: all cones drawn into a 1/3-res buffer, blurred once, composited additively
  function beams(ctx, cam, f) {
    const sc = 1 / 3; const buf = TN.scratch('s1_beams', Math.round(W * sc), Math.round(H * sc)); const g = buf.getContext('2d'); g.scale(sc, sc);
    let any = false;
    for (const rig of RIGS) { const age = f - rig.f; if (age < 0) continue; any = true; const on = clamp(age / 4); const s = cam.project(rig.p); const t = cam.project([rig.p[0] * 0.15, rig.p[1] * 0.25, 0]); const ang = Math.atan2(t.y - s.y, t.x - s.x);
      TN.lightCone(g, s.x, s.y, ang, 0.62, 1500, PAL.ice, 0.10 * on); TN.lightCone(g, s.x, s.y, ang, 0.30, 1500, PAL.ice, 0.08 * on); }
    if (!any) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(10px)'; ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, W, H); ctx.restore();
  }

  TN.scenes.scene1 = {
    render(ctx, t, gt) {
      const f = gt * 60;
      // exposure steps at the ignitions
      const expo = 0.4 + 0.15 * E.outCubic(prog(f, 12, 16)) + 0.2 * E.outCubic(prog(f, 27, 31)) + 0.25 * E.outCubic(prog(f, 42, 46));
      // camera: low broadcast position behind the near baseline, slow push, handheld micro-drift + ignition shakes
      const k = E.inOutSine(prog(f, 0, 83));
      const cam = new TN.Camera().set([0, lerp(-18.5, -17.3, k), lerp(2.2, 2.0, k)], [0, 1.5, 0.5], lerp(46, 44, k));
      let dx = (noise1(gt * 0.4, 1) - 0.5) * 4, dy = (noise1(gt * 0.4, 2) - 0.5) * 4;
      for (const rf of [12, 27, 42]) if (f >= rf && f < rf + 3) { dx += (hash2(Math.floor(f), 5) - 0.5) * 4; dy += (hash2(Math.floor(f), 6) - 0.5) * 4; }
      ctx.save(); ctx.translate(dx, dy);
      // --- world ---
      TN.bgGradient(ctx, PAL.navy, PAL.bg, { cx: 960, cy: 300, r: 1500 });
      // haze layers (soft navy blobs drifting)
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let L = 0; L < 2; L++) for (let i = 0; i < 12; i++) { const x = ((hash2(i, 40 + L) * W + gt * 6 * (L ? -1 : 1)) % W + W) % W, y = hash2(i, 50 + L) * 560; TN.glowDot(ctx, x, y, 300 + 300 * hash2(i, 60 + L), PAL.navy, 0.06); }
      ctx.restore();
      // stands + specks
      ctx.save(); const sg = ctx.createLinearGradient(0, 80, 0, 560); sg.addColorStop(0, '#13214A'); sg.addColorStop(1, PAL.bg); ctx.fillStyle = sg; for (const q of STANDS) TN.fillPoly3(ctx, cam, q); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < SPECKS.length; i++) { const [qi, u, v] = SPECKS[i]; const p = cam.project(quadPoint(STANDS[qi], u, v)); if (!p.visible || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H) continue; const flash = hash2(i, Math.floor(f / 2)) < 0.015; ctx.globalAlpha = (0.18 + 0.3 * hash2(i, 3)) * expo; ctx.fillStyle = PAL.mute; ctx.fillRect(p.x, p.y, 1, 1); if (flash) TN.glowDot(ctx, p.x, p.y, 6, PAL.ice, 0.9); }
      ctx.restore();
      // rig masts
      ctx.save(); ctx.strokeStyle = '#0B1220'; ctx.lineWidth = 2; for (const r of [...RIGS, R5]) { const a = cam.project(r.p), b = cam.project([r.p[0], r.p[1], 0]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } ctx.restore();
      // court surface: exposure-driven alpha and light pools
      const lightAmt = 0.15 * E.outCubic(prog(f, 12, 16)) + 0.15 * E.outCubic(prog(f, 42, 46));
      TN.drawSurface(ctx, cam, { alpha: 0.25 + 0.75 * clamp((expo - 0.4) / 0.6), light: lightAmt, lightAt: f < 42 ? [-6, 8] : [0, -4] });
      // light-traced lines with a glowing head
      ctx.save();
      for (const [x1, y1, x2, y2, w, f0, f1] of TRACE) {
        const p = E.outQuart(prog(f, f0, f1)); if (p <= 0) continue;
        ctx.fillStyle = PAL.line; ctx.shadowColor = PAL.line; ctx.shadowBlur = 10; TN.fillPoly3(ctx, cam, TN.lineQuad(x1, y1, x2, y2, w, p));
        if (p < 1) { const h = cam.project([lerp(x1, x2, p), lerp(y1, y2, p), 0]); ctx.save(); ctx.shadowBlur = 0; TN.glowDot(ctx, h.x, h.y, 24, PAL.line, 0.9, 0.1); ctx.restore(); }
      }
      ctx.restore();
      // net fade-in + glint travelling along the tape
      const netA = prog(f, 50, 66); if (netA > 0) TN.drawNet(ctx, cam, { alpha: netA, meshAlpha: 0.35 });
      if (f >= 62 && f <= 72) { const u = prog(f, 62, 72); const gp = cam.project([lerp(-6.4, 6.4, u), 0, COURT.netH + (COURT.netPostH - COURT.netH) * Math.pow(Math.abs(lerp(-1, 1, u)), 2)]); TN.glowDot(ctx, gp.x, gp.y, 10, PAL.ice, 0.9, 0.2); }
      // specular sheen sweep across the court f60–f80
      if (f >= 60 && f <= 80) { const u = E.inOutSine(prog(f, 60, 80)); const cx = lerp(-300, W + 300, u); ctx.save(); clipPoly3(ctx, cam, courtQuad); ctx.globalCompositeOperation = 'screen'; const g = ctx.createLinearGradient(cx - 250, 0, cx + 250, 0); g.addColorStop(0, rgba(PAL.courtSheen, 0)); g.addColorStop(0.5, rgba(PAL.courtSheen, 0.18)); g.addColorStop(1, rgba(PAL.courtSheen, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      // exposure: darken the unlit world
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${(1 - expo) * 0.85})`; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.restore();
      // rigs: soft beams first, then lamps/flares/pools
      beams(ctx, cam, f);
      for (const r of RIGS) rigGlow(ctx, cam, r, f, expo);
      // motes near the lens (20 of them soft)
      TN.motes(ctx, gt, { count: 40, seed: 11, color: PAL.ice, alpha: 0.3 * expo, size: [2, 6], drift: [8, -4] });
      TN.motes(ctx, gt, { count: 20, seed: 12, color: PAL.ice, alpha: 0.18 * expo, size: [6, 12], drift: [8, -4], twinkle: 0.5 });
      ctx.restore(); // camera shake
      // --- title block ---
      const rule = E.outCubic(prog(f, 36, 46)); if (rule > 0) { ctx.save(); ctx.fillStyle = PAL.ball; ctx.fillRect(96, 95, 220 * rule, 2); ctx.restore(); }
      if (f >= 40) { const n = clamp(Math.floor(f - 40) + 1, 0, 13); TN.text(ctx, 'NIGHT SESSION'.slice(0, n), 96, 134, { size: 24, family: TN.FONTS.mono, weight: 700, color: PAL.line, align: 'left', spacing: 6 }); }
      if (f >= 52) TN.text(ctx, 'CENTRE COURT · 21:04', 96, 166, { size: 22, family: TN.FONTS.mono, weight: 400, color: PAL.mute, align: 'left', spacing: 2, alpha: E.outCubic(prog(f, 52, 62)) });
      if (f >= 40 && (((gt - 40 / 60) % 1) < 0.5)) { ctx.save(); ctx.fillStyle = PAL.accent; ctx.shadowColor = PAL.accent; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(80, 126, 3, 0, TAU); ctx.fill(); ctx.restore(); }
      // --- R5 fires into the lens f75+ (bleaching toward Flare Ice before the white) ---
      if (f >= R5.f) { const s5 = cam.project(R5.p); const inten = lerp(0.6, 6, E.outCubic(prog(f, 75, 84))); TN.lensFlare(ctx, s5.x + dx, s5.y + dy, inten, PAL.ice, { streak: false, ghosts: true }); for (let k = 0; k < 6; k++) TN.lightStreak(ctx, s5.x + dx, s5.y + dy, k * Math.PI / 6, 2200 * clamp(inten / 3), 14 + 10 * clamp(inten / 3), PAL.ice, 0.5 * clamp(inten / 2), 0.4); }
    },
  };
})();

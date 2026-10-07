// ball.js — 3D-shaded tennis ball with curved seam and felt fuzz, trails, squash, racket renderer.
(function () {
  const TN = window.TN; const { clamp, lerp, rgba, hash2, TAU, PAL } = TN;

  // seam curve on the unit sphere (classic "baseball" curve). returns array of [x,y,z]
  const SEAM = (() => { const pts = []; const n = 160; const a = 0.78, b = 0.22, c = 0.6; for (let i = 0; i <= n; i++) { const u = (i / n) * TAU; let x = a * Math.cos(u) + b * Math.cos(3 * u), y = a * Math.sin(u) - b * Math.sin(3 * u), z = c * Math.sin(2 * u); const l = Math.hypot(x, y, z); pts.push([x / l, y / l, z / l]); } return pts; })();
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }

  /**
   * drawBall(ctx, x, y, r, opts)
   *  rot: [rx, ry, rz] radians — spin the seam
   *  light: [lx, ly] direction of key light in screen space (normalised-ish), default upper-left
   *  squash: 0..0.5 flatten along `squashAngle` (impact deformation)
   *  fuzz: 0..1 amount of felt fibres at the rim
   *  rim: 0..1 strength of rim light (opposite the key)
   *  colors: override {hi, mid, deep, shadow}
   *  detail: false to skip fuzz/seam for tiny balls
   */
  function drawBall(ctx, x, y, r, o = {}) {
    const rot = o.rot || [0.4, 0.2, 0]; const light = o.light || [-0.6, -0.7]; const squash = o.squash || 0; const squashAngle = o.squashAngle || 0;
    const fuzz = o.fuzz == null ? 1 : o.fuzz; const rim = o.rim == null ? 0.6 : o.rim; const C = Object.assign({ hi: '#F4FF8A', mid: PAL.ball, deep: PAL.ballDeep, shadow: PAL.ballShadow }, o.colors || {});
    const detail = o.detail == null ? r > 6 : o.detail;
    ctx.save(); ctx.translate(x, y); ctx.rotate(squashAngle); ctx.scale(1 + squash, 1 - squash); ctx.rotate(-squashAngle);
    const ll = Math.hypot(light[0], light[1]) || 1; const lx = light[0] / ll, ly = light[1] / ll;
    // fuzz halo (soft) — drawn first so the body sits on it
    if (detail && fuzz > 0) {
      ctx.save(); ctx.globalAlpha = 0.55 * fuzz; const g = ctx.createRadialGradient(0, 0, r * 0.92, 0, 0, r * 1.09); g.addColorStop(0, rgba(C.mid, 0.6)); g.addColorStop(1, rgba(C.mid, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, TAU); ctx.fill(); ctx.restore();
    }
    // body shading
    const g = ctx.createRadialGradient(lx * r * 0.45, ly * r * 0.45, r * 0.05, 0, 0, r);
    g.addColorStop(0, C.hi); g.addColorStop(0.28, C.mid); g.addColorStop(0.72, C.deep); g.addColorStop(1, C.shadow);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    // felt texture: fine speckle via dot pattern clipped to sphere (cheap)
    if (detail && r > 40) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); ctx.globalAlpha = 0.18;
      const n = Math.min(900, Math.floor(r * 6));
      for (let i = 0; i < n; i++) { const a = hash2(i, 11) * TAU, d = Math.sqrt(hash2(i, 12)) * r; const px = Math.cos(a) * d, py = Math.sin(a) * d; const shade = hash2(i, 13); ctx.fillStyle = shade > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'; ctx.fillRect(px, py, Math.max(1, r * 0.012), Math.max(1, r * 0.012)); }
      ctx.restore();
    }
    // seam: project rotated curve orthographically; draw back part faint, front part bright
    if (detail) {
      const pts = SEAM.map(p => rotZ(rotY(rotX(p, rot[0]), rot[1]), rot[2]));
      const drawPart = (front) => {
        ctx.beginPath(); let pen = false;
        for (let i = 0; i < pts.length; i++) { const p = pts[i]; const vis = front ? p[2] >= -0.02 : p[2] < -0.02; if (!vis) { pen = false; continue; } const sx = p[0] * r * 0.985, sy = -p[1] * r * 0.985; if (!pen) { ctx.moveTo(sx, sy); pen = true; } else ctx.lineTo(sx, sy); }
        ctx.stroke();
      };
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      // front seam: dark groove then white seam
      ctx.strokeStyle = rgba(C.shadow, 0.55); ctx.lineWidth = Math.max(1.5, r * 0.11); drawPart(true);
      ctx.strokeStyle = '#F7F7F0'; ctx.lineWidth = Math.max(1, r * 0.065); drawPart(true);
      // seam shading: multiply gradient over seam for 3D
      ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, r * 0.07); ctx.globalAlpha = 0.6; drawPart(true);
      ctx.restore();
    }
    // rim light opposite key
    if (rim > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(-lx * r * 0.75, -ly * r * 0.75, r * 0.3, -lx * r * 0.2, -ly * r * 0.2, r * 1.1);
      rg.addColorStop(0, `rgba(255,255,235,${0.55 * rim})`); rg.addColorStop(0.5, `rgba(255,255,200,${0.12 * rim})`); rg.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = rg; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
    }
    // specular
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createRadialGradient(lx * r * 0.5, ly * r * 0.5, 0, lx * r * 0.5, ly * r * 0.5, r * 0.45); sg.addColorStop(0, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
    // fuzz fibres at the rim
    if (detail && fuzz > 0 && r > 10) {
      ctx.save(); ctx.lineCap = 'round'; const n = Math.min(520, Math.floor(r * 3.2)); const macro = clamp((r - 60) / 300); // at macro scale: shorter, finer, softer fibres
      for (let i = 0; i < n; i++) { const a = hash2(i, 21) * TAU; const l = r * lerp(0.03 + 0.07 * hash2(i, 22), 0.012 + 0.03 * hash2(i, 22) ** 2, macro) * fuzz; const w = Math.max(0.6, r * lerp(0.01, 0.004, macro)); const ca = Math.cos(a), sa = Math.sin(a); const lit = clamp(0.5 + 0.5 * (ca * lx + sa * ly) * -1); ctx.strokeStyle = rgba(lit > 0.5 ? C.hi : C.mid, (0.25 + 0.5 * lit) * lerp(1, 0.55, macro)); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ca * r * 0.97, sa * r * 0.97); const bend = (hash2(i, 23) - 0.5) * 0.6; ctx.lineTo(ca * (r + l) + -sa * l * bend, sa * (r + l) + ca * l * bend); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // tapered motion trail along screen-space points (oldest first). color additive
  function drawTrail(ctx, pts, r, { color = PAL.ball, alpha = 0.6, taper = true, glow = 24 } = {}) {
    if (pts.length < 2) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow) { ctx.shadowColor = rgba(color, 0.8); ctx.shadowBlur = glow; }
    for (let i = 1; i < pts.length; i++) { const f = i / (pts.length - 1); ctx.globalAlpha = alpha * (taper ? f * f : 1); ctx.lineWidth = Math.max(1, r * 2 * (taper ? 0.3 + 0.7 * f : 1)); ctx.strokeStyle = rgba(color, 1); ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
    ctx.restore();
  }
  // speed-blurred ball: draws N ghost copies along velocity (vx,vy px/frame) with decreasing alpha, then the ball
  function drawBallBlurred(ctx, x, y, r, vx, vy, o = {}) {
    const speed = Math.hypot(vx, vy); const n = clamp(Math.round(speed / Math.max(2, r * 0.5)), 0, 14);
    for (let i = n; i >= 1; i--) { const f = i / (n + 1); ctx.save(); ctx.globalAlpha = (1 - f) * 0.35; drawBall(ctx, x - vx * f * 0.9, y - vy * f * 0.9, r, Object.assign({}, o, { detail: false, fuzz: 0, rim: 0 })); ctx.restore(); }
    drawBall(ctx, x, y, r, o);
  }

  // ---------- racket ----------
  /** drawRacket(ctx, x, y, {angle, scale, deform, colors}) — head centred at (x,y) pointing "up" (handle below) before rotation.
   *  scale 1 → head height ≈ 340 px. deform: string-bed bulge 0..1 at (hitX, hitY) in head-local units (-1..1). */
  function drawRacket(ctx, x, y, o = {}) {
    const s = o.scale == null ? 1 : o.scale; const angle = o.angle || 0; const C = Object.assign({ frame: '#15181D', frame2: '#2A3038', accent: PAL.ball, grip: '#0A0C10', string: 'rgba(240,244,250,0.85)' }, o.colors || {});
    const deform = o.deform || 0, hitX = o.hitX || 0, hitY = o.hitY || 0;
    const HW = 118 * s, HH = 170 * s; // head half-width / half-height
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    // handle + throat
    const thr = 1.35, tY = HH * thr; const handleTop = HH * 1.55, handleLen = 300 * s, hw = 18 * s;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.frame; ctx.lineWidth = 26 * s; ctx.beginPath(); ctx.moveTo(-HW * 0.55, HH * 0.78); ctx.quadraticCurveTo(-HW * 0.35, tY, 0, handleTop); ctx.quadraticCurveTo(HW * 0.35, tY, HW * 0.55, HH * 0.78); ctx.stroke();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 5 * s; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(-HW * 0.5, HH * 0.86); ctx.quadraticCurveTo(-HW * 0.3, tY, 0, handleTop); ctx.stroke(); ctx.globalAlpha = 1;
    // grip
    ctx.fillStyle = C.grip; ctx.beginPath(); ctx.roundRect(-hw, handleTop - 10 * s, hw * 2, handleLen, 8 * s); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3 * s; for (let i = 0; i < 9; i++) { const yy = handleTop + 10 * s + i * (handleLen - 30 * s) / 9; ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy + 14 * s); ctx.stroke(); }
    ctx.fillStyle = C.frame2; ctx.beginPath(); ctx.roundRect(-hw * 1.15, handleTop + handleLen - 14 * s, hw * 2.3, 20 * s, 6 * s); ctx.fill(); // butt cap
    // strings (clipped to head)
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, HW - 10 * s, HH - 10 * s, 0, 0, TAU); ctx.clip();
    ctx.strokeStyle = C.string; ctx.lineWidth = Math.max(1, 2.2 * s);
    const mains = 16, crosses = 19;
    const bulge = (px, py) => { if (!deform) return [px, py]; const dx = px / HW - hitX, dy = py / HH - hitY; const d = Math.hypot(dx, dy); const k = Math.exp(-d * d * 6) * deform; return [px + dx * HW * k * 0.35, py + dy * HH * k * 0.35]; };
    for (let i = 0; i <= mains; i++) { const px = lerp(-HW, HW, i / mains); ctx.beginPath(); for (let j = 0; j <= 24; j++) { const py = lerp(-HH, HH, j / 24); const [bx, by] = bulge(px, py); j ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); } ctx.stroke(); }
    for (let j = 0; j <= crosses; j++) { const py = lerp(-HH, HH, j / crosses); ctx.beginPath(); for (let i = 0; i <= 24; i++) { const px = lerp(-HW, HW, i / 24); const [bx, by] = bulge(px, py); i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); } ctx.stroke(); }
    ctx.restore();
    // frame
    ctx.strokeStyle = C.frame; ctx.lineWidth = 24 * s; ctx.beginPath(); ctx.ellipse(0, 0, HW, HH, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.frame2; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.ellipse(0, 0, HW, HH, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 4 * s; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.ellipse(0, 0, HW + 8 * s, HH + 8 * s, 0, -Math.PI * 0.95, -Math.PI * 0.05); ctx.stroke(); ctx.globalAlpha = 1;
    // frame highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.ellipse(0, 0, HW - 6 * s, HH - 6 * s, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ctx.restore();
  }

  Object.assign(TN, { drawBall, drawTrail, drawBallBlurred, drawRacket, SEAM });
})();

// transitions.js — every transition takes (ctx, A, B, p, params): A = outgoing frame canvas, B = incoming, p 0..1.
(function () {
  const TN = window.TN; const { W, H, clamp, lerp, rgba, hash2, E, TAU, scratch, radialZoomBlur, directionalBlur, lightStreak, flash, chromaticAberration } = TN;
  const T = {};
  T.cut = (ctx, A, B, p) => ctx.drawImage(p < 0.5 ? A : B, 0, 0);
  T.crossfade = (ctx, A, B, p) => { ctx.drawImage(A, 0, 0); ctx.save(); ctx.globalAlpha = E.inOutSine(p); ctx.drawImage(B, 0, 0); ctx.restore(); };
  // hard white (or coloured) flash: A → peak flash at `peak` → B
  T.flash = (ctx, A, B, p, { color = '#ffffff', peak = 0.45, hold = 0.08 } = {}) => {
    ctx.drawImage(p < peak ? A : B, 0, 0); const a = p < peak ? E.inQuart(p / peak) : 1 - E.outCubic(clamp((p - peak - hold) / (1 - peak - hold))); flash(ctx, a, color);
  };
  // the ball fills the frame: a disc centred (cx,cy) grows over A (yellow ring edge), then B is revealed from inside as the disc keeps growing / or the disc becomes B
  T.ballWipe = (ctx, A, B, p, { cx = W / 2, cy = H / 2, color = TN.PAL.ball, ring = true } = {}) => {
    const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    if (p < 0.5) { ctx.drawImage(A, 0, 0); const r = E.inCubic(p / 0.5) * R * 1.02; ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.restore(); }
    else { ctx.save(); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); const r = E.outCubic((p - 0.5) / 0.5) * R * 1.02; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); if (ring) { ctx.save(); ctx.strokeStyle = rgba('#ffffff', 0.9 * (1 - p)); ctx.lineWidth = 18 * (1 - (p - 0.5) / 0.5) + 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
  };
  // whip: A blurs/slides out along angle, B slides in with blur, with a light streak through the middle
  T.whip = (ctx, A, B, p, { angle = 0, dist = W * 1.1, streak = true, color = '#ffffff' } = {}) => {
    const e = E.inOutQuint(p); const dx = Math.cos(angle), dy = Math.sin(angle); const blur = Math.sin(p * Math.PI) * 180;
    const sA = scratch('_tA'); const gA = sA.getContext('2d'); gA.translate(-dx * dist * e, -dy * dist * e); gA.drawImage(A, 0, 0);
    const sB = scratch('_tB'); const gB = sB.getContext('2d'); gB.translate(dx * dist * (1 - e), dy * dist * (1 - e)); gB.drawImage(B, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    directionalBlur(ctx, sA, dx * blur, dy * blur, 8, 1); ctx.save(); ctx.globalCompositeOperation = 'source-over'; directionalBlur(ctx, sB, dx * blur, dy * blur, 8, 1); ctx.restore();
    if (streak) { const k = Math.pow(Math.sin(p * Math.PI), 2); lightStreak(ctx, W / 2 + dx * (0.5 - p) * W * 1.5, H / 2 + dy * (0.5 - p) * H * 1.5, angle, Math.hypot(W, H) * 1.2, 260 * k, color, 0.9 * k, 0.6); }
  };
  // diagonal slices: n bands at `angle` reveal B with stagger (court-line motivated)
  T.slice = (ctx, A, B, p, { n = 7, angle = -0.35, stagger = 0.5, color = TN.PAL.ball, edge = 10 } = {}) => {
    ctx.drawImage(A, 0, 0); const L = Math.hypot(W, H) * 1.2; const Hr = Math.abs(W * Math.sin(angle)) + Math.abs(H * Math.cos(angle)) + 4; const bandW = Hr / n;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(angle);
    for (let i = 0; i < n; i++) {
      const local = clamp((p - (i / n) * stagger) / (1 - stagger)); const e = E.inOutQuart(local); if (e <= 0) continue;
      const y0 = -Hr / 2 + i * bandW; const dir = i % 2 ? 1 : -1; const x0 = dir > 0 ? -L / 2 : L / 2 - L * e;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, L * e, bandW + 1); ctx.clip(); ctx.rotate(-angle); ctx.translate(-W / 2, -H / 2); ctx.drawImage(B, 0, 0); ctx.restore();
      if (e < 1 && edge) { ctx.fillStyle = color; ctx.fillRect(dir > 0 ? -L / 2 + L * e - edge : L / 2 - L * e, y0, edge, bandW + 1); }
    }
    ctx.restore();
  };
  // Hawk-Eye grid: cells flip from A to B in a wave with per-cell jitter; thin grid lines glow during the swap
  T.grid = (ctx, A, B, p, { cols = 24, rows = 14, from = 'left', color = TN.PAL.accent2, jitter = 0.25 } = {}) => {
    ctx.drawImage(A, 0, 0); const cw = W / cols, ch = H / rows; ctx.save();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = from === 'left' ? i / cols : from === 'right' ? 1 - i / cols : from === 'center' ? Math.hypot(i / cols - 0.5, j / rows - 0.5) * 1.3 : j / rows;
      const local = clamp((p - u * (1 - jitter) * 0.8 - hash2(i, j) * jitter * 0.4) / 0.25); if (local <= 0) continue;
      const x = i * cw, y = j * ch;
      if (local < 1) { const s = Math.abs(Math.cos(local * Math.PI)); ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(1, Math.max(0.02, s)); ctx.translate(-(x + cw / 2), -(y + ch / 2)); ctx.beginPath(); ctx.rect(x, y, cw + 1, ch + 1); ctx.clip(); ctx.drawImage(local < 0.5 ? A : B, 0, 0); ctx.restore(); ctx.strokeStyle = rgba(color, 0.9 * Math.sin(local * Math.PI)); ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1); }
      else { ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw + 1, ch + 1); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
    }
    ctx.restore();
  };
  // radial zoom punch: A zooms into (cx,cy) with heavy radial blur, flash, B settles back from a zoom
  T.zoomPunch = (ctx, A, B, p, { cx = W / 2, cy = H / 2, flashColor = '#ffffff', strength = 0.6 } = {}) => {
    if (p < 0.5) { const k = E.inCubic(p / 0.5); radialZoomBlur(ctx, A, cx, cy, strength * k, 14, 1); flash(ctx, k * k, flashColor); }
    else { const k = 1 - E.outCubic((p - 0.5) / 0.5); const s = scratch('_zp'); const g = s.getContext('2d'); const z = 1 + 0.25 * k; g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); g.drawImage(B, 0, 0); radialZoomBlur(ctx, s, cx, cy, strength * k * 0.6, 10, 1); flash(ctx, k, flashColor); }
  };
  // RGB glitch cut: horizontal slice displacement + chromatic split; B appears at `swap`
  T.glitch = (ctx, A, B, p, { swap = 0.5, slices = 14, seed = 3, amount = 1 } = {}) => {
    const src = p < swap ? A : B; const k = Math.sin(p * Math.PI) * amount; const f = Math.floor(p * 40);
    const s = scratch('_gl'); const g = s.getContext('2d'); g.drawImage(src, 0, 0);
    for (let i = 0; i < slices; i++) { if (hash2(i, f + seed) < 0.55) continue; const y = Math.floor(hash2(i, f + seed + 1) * H), h = 8 + Math.floor(hash2(i, f + seed + 2) * 90); const dx = (hash2(i, f + seed + 3) - 0.5) * 260 * k; g.drawImage(src, 0, y, W, h, dx, y, W, h); }
    chromaticAberration(ctx, s, 14 * k);
    // occasional inverted band
    if (hash2(f, seed + 9) > 0.7 && k > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = `rgba(255,255,255,${0.45 * k})`; const y = hash2(f, seed + 10) * H; ctx.fillRect(0, y, W, 4 + hash2(f, seed + 11) * 26); ctx.restore(); }
  };
  // net mesh wipe: small cells (like net squares) dissolve A→B with threshold noise
  T.mesh = (ctx, A, B, p, { cell = 28, seed = 4, color = '#ffffff' } = {}) => {
    ctx.drawImage(A, 0, 0); const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell); ctx.save();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const th = hash2(i, j + seed * 1000) * 0.7 + (i / cols) * 0.3; if (p < th) continue; const x = i * cell, y = j * cell; ctx.save(); ctx.beginPath(); ctx.rect(x, y, cell + 1, cell + 1); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); if (p - th < 0.08) { ctx.fillStyle = rgba(color, 0.6 * (1 - (p - th) / 0.08)); ctx.fillRect(x, y, cell, cell); } }
    ctx.restore();
  };
  // iris: circular reveal of B from (cx,cy) (or close A when reverse)
  T.iris = (ctx, A, B, p, { cx = W / 2, cy = H / 2, soft = 40, reverse = false } = {}) => {
    const R = Math.hypot(W, H) * 0.6; ctx.drawImage(reverse ? B : A, 0, 0); const r = (reverse ? 1 - E.inOutCubic(p) : E.inOutCubic(p)) * R;
    const s = scratch('_ir'); const g = s.getContext('2d'); g.drawImage(reverse ? A : B, 0, 0); g.globalCompositeOperation = 'destination-in'; const gr = g.createRadialGradient(cx, cy, Math.max(0, r - soft), cx, cy, r + soft); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); ctx.drawImage(s, 0, 0);
  };
  // push: B pushes A out along angle with easing (clean, broadcast style) and a thin accent edge
  T.push = (ctx, A, B, p, { angle = Math.PI, edge = TN.PAL.ball, edgeW = 12 } = {}) => {
    const e = E.inOutQuint(p); const dx = Math.cos(angle) * W * e, dy = Math.sin(angle) * H * e; ctx.drawImage(A, dx, dy); ctx.drawImage(B, dx - Math.cos(angle) * W, dy - Math.sin(angle) * H);
    if (edge && p > 0 && p < 1) { ctx.save(); ctx.fillStyle = edge; if (Math.abs(Math.cos(angle)) > 0.5) ctx.fillRect(dx - (Math.cos(angle) > 0 ? edgeW : 0), 0, edgeW, H); else ctx.fillRect(0, dy - (Math.sin(angle) > 0 ? edgeW : 0), W, edgeW); ctx.restore(); }
  };
  // ---- storyboard-specific transitions (docs/STORYBOARD.md §4) ----
  // T2 string-bed shockwave iris: the strike IS the cut. A ring expands from the contact point revealing B inside; A continues outside under radial zoom blur.
  T.shockIris = (ctx, A, B, p, { cx = 1000, cy = 520, rMax = 1400, zoom = 0.06, echo = true, color = TN.PAL.ball } = {}) => {
    const r = E.outCubic(p) * rMax;
    radialZoomBlur(ctx, A, cx, cy, zoom * Math.sin(p * Math.PI), 8, 1);
    if (r > 0) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
    const early = p < 2 / 12; // over the white contact flash use 'screen' so the ring does not blow out
    ctx.save(); ctx.globalCompositeOperation = early ? 'screen' : 'lighter'; ctx.shadowColor = rgba(color, 0.95); ctx.shadowBlur = 30;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = lerp(14, 3, p); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    if (echo) { const re = E.outCubic(clamp(p - 0.25)) * rMax; if (re > 1) { ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, re, 0, TAU); ctx.stroke(); } }
    ctx.restore();
  };
  // T3 scan-band wipe: a cyan band sweeps top→bottom revealing B above it.
  T.scanWipe = (ctx, A, B, p, { color = TN.PAL.accent2, bandW = 4, tail = 60 } = {}) => {
    const y = E.inOutQuad(p) * (H + 120) - 60;
    ctx.drawImage(A, 0, 0);
    if (y > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - tail, 0, y); g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, 0.35)); ctx.fillStyle = g; ctx.fillRect(0, y - tail, W, tail);
    ctx.shadowColor = rgba(color, 1); ctx.shadowBlur = 24; ctx.fillStyle = rgba(color, 1); ctx.fillRect(0, y - bandW / 2, W, bandW);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, y - 0.5, W, 1);
    ctx.restore();
  };
  // T4 part B travelling iris: a circle shrinks exponentially from r0 to r1 while moving from (x0,y0) to `to` (fn or point). A inside, B outside.
  T.irisTravel = (ctx, A, B, p, { x0 = W / 2, y0 = H / 2, r0 = 1800, r1 = 22, to = null, color = TN.PAL.ball } = {}) => {
    const dest = typeof to === 'function' ? to() : (to || TN.S4S5.periodDrop());
    const e = E.inOutCubic(p); const cx = lerp(x0, dest.x, e), cy = lerp(y0, dest.y, e); const r = r0 * Math.pow(r1 / r0, e);
    ctx.drawImage(B, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(A, 0, 0);
    if (p < 2 / 12) { ctx.fillStyle = `rgba(0,0,0,${p < 1 / 12 ? 0.15 : 0.075})`; ctx.fillRect(0, 0, W, H); } // 2-frame thump
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = rgba(color, 1); ctx.shadowBlur = 30; ctx.globalAlpha = lerp(0.8, 0.3, p); ctx.strokeStyle = rgba(color, 1); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
  };
  TN.TRANSITIONS = T;
})();

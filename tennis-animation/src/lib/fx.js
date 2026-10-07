// fx.js — offscreen canvases, glow/bloom, blurs, vignette, grain, chromatic aberration, flares, streaks, rings.
(function () {
  const TN = window.TN; const { W, H, clamp, lerp, rgba, hash2, TAU } = TN;

  const pool = new Map();
  function makeCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // named, reusable offscreen canvases (cleared on request)
  function scratch(name, w = W, h = H, clear = true) {
    let c = pool.get(name);
    if (!c || c.width !== w || c.height !== h) { c = makeCanvas(w, h); pool.set(name, c); }
    const g = c.getContext('2d');
    if (clear) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); }
    return c;
  }

  // draw fn with a soft glow (shadowBlur) — fn(ctx) does the drawing
  function withGlow(ctx, color, blur, fn, alpha = 1) {
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.globalAlpha *= alpha; fn(ctx); ctx.restore();
  }
  // additive glow pass: draw fn into scratch, blur it, composite with 'lighter'. strength = alpha, passes = repeated blur sizes
  function bloom(ctx, fn, { blur = 24, strength = 0.8, passes = 2, scale = 0.5, op = 'lighter' } = {}) {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    const src = scratch('_bloomSrc', w, h); const g = src.getContext('2d');
    g.save(); g.scale(scale, scale); fn(g); g.restore();
    ctx.save(); ctx.globalCompositeOperation = op;
    for (let i = 0; i < passes; i++) {
      ctx.filter = `blur(${(blur * (i + 1) * scale).toFixed(1)}px)`; ctx.globalAlpha = strength / (i + 1);
      ctx.drawImage(src, 0, 0, w, h, 0, 0, W, H);
    }
    ctx.restore();
  }
  // full-frame bloom of an existing canvas: bright parts only (threshold via brightness/contrast filter)
  function bloomCanvas(ctx, srcCanvas, { blur = 30, strength = 0.6, threshold = 0.6, scale = 0.33 } = {}) {
    const w = Math.round(W * scale), h = Math.round(H * scale);
    const s = scratch('_bloomC', w, h); const g = s.getContext('2d');
    // crude threshold: boost contrast, drop brightness
    const c = 1 / Math.max(0.05, 1 - threshold);
    g.filter = `brightness(${(1 - threshold) * 1.6 + 0.2}) contrast(${c.toFixed(2)}) saturate(1.2)`;
    g.drawImage(srcCanvas, 0, 0, w, h);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength; ctx.filter = `blur(${(blur * scale).toFixed(1)}px)`;
    ctx.drawImage(s, 0, 0, w, h, 0, 0, W, H); ctx.restore();
  }

  function vignette(ctx, strength = 0.55, inner = 0.55, color = '#000') {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * inner * 0.5, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(color === '#000' ? '#000000' : color, strength));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  // film grain: pre-baked noise tiles, offset per frame (deterministic by frame index)
  const grainTiles = [];
  function grainTile(i) {
    if (grainTiles[i]) return grainTiles[i];
    const S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    for (let p = 0; p < S * S; p++) { const v = Math.floor(hash2(p, i * 977 + 13) * 255); d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = v; d[p * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); grainTiles[i] = c; return c;
  }
  function grain(ctx, frame, amount = 0.08) {
    const tile = grainTile(frame % 6);
    const ox = Math.floor(hash2(frame, 1) * 256), oy = Math.floor(hash2(frame, 2) * 256);
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount;
    const pat = ctx.createPattern(tile, 'repeat'); ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
  }

  // chromatic aberration: shift R and B channels radially by `amount` px at the edges
  function chromaticAberration(ctx, src, amount = 3, cx = W / 2, cy = H / 2) {
    if (amount <= 0.05) { ctx.drawImage(src, 0, 0); return; }
    const chan = (color, dx, dy, sc) => {
      const s = scratch('_ca_' + color); const g = s.getContext('2d');
      g.save(); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx + dx, -cy + dy); g.drawImage(src, 0, 0); g.restore();
      g.globalCompositeOperation = 'multiply'; g.fillStyle = color; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0); // keep alpha
      return s;
    };
    const k = amount / (W / 2);
    const r = chan('#ff0000', 0, 0, 1 + k), gch = chan('#00ff00', 0, 0, 1), b = chan('#0000ff', 0, 0, 1 - k);
    // green channel replaces the destination (so nothing from a previous frame survives), R and B are added on top
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(gch, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(r, 0, 0); ctx.drawImage(b, 0, 0); ctx.restore();
  }

  // radial zoom blur: composite progressively scaled copies of src around (cx,cy)
  function radialZoomBlur(ctx, src, cx = W / 2, cy = H / 2, strength = 0.15, samples = 12, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 1; i <= samples; i++) {
      const s = 1 + (strength * i) / samples; ctx.globalAlpha = (alpha * 1.0) / (i + 1);
      ctx.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s); ctx.drawImage(src, 0, 0);
    }
    ctx.restore();
  }
  // directional blur by multi-sample offset
  function directionalBlur(ctx, src, dx, dy, samples = 10, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha / samples;
    for (let i = 0; i < samples; i++) { const f = i / (samples - 1) - 0.5; ctx.drawImage(src, dx * f, dy * f); }
    ctx.restore();
  }

  // bright elongated streak (lens streak / light sweep): stretched radial gradient, additive. no destination-in (it would erase the frame)
  function lightStreak(ctx, x, y, angle, length, width, color = '#ffffff', alpha = 1, core = 0.35) {
    if (alpha <= 0.002 || length <= 0 || width <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
    ctx.save(); ctx.scale(length / width, 1); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, width / 2);
    g.addColorStop(0, rgba(color, 1)); g.addColorStop(0.25, rgba(color, 0.55)); g.addColorStop(0.6, rgba(color, 0.15)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, width / 2, 0, TAU); ctx.fill(); ctx.restore();
    if (core > 0) { const cw = Math.max(1.5, width * 0.18); ctx.save(); ctx.scale(length * 0.9 / cw, 1); const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, cw / 2); g2.addColorStop(0, `rgba(255,255,255,${core})`); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, cw / 2, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  // additive soft radial light
  function glowDot(ctx, x, y, r, color, alpha = 1, inner = 0) {
    const g = ctx.createRadialGradient(x, y, r * inner, x, y, r);
    g.addColorStop(0, rgba(color, alpha)); g.addColorStop(0.35, rgba(color, alpha * 0.45)); g.addColorStop(1, rgba(color, 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  // anamorphic lens flare: hot core, horizontal blue streak, ghost rings along the axis through screen centre
  function lensFlare(ctx, x, y, intensity = 1, color = '#DFFF00', { streak = true, ghosts = true } = {}) {
    if (intensity <= 0.001) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, x, y, 140 * intensity + 20, '#ffffff', 0.9 * intensity);
    glowDot(ctx, x, y, 420 * intensity + 40, color, 0.35 * intensity);
    if (streak) lightStreak(ctx, x, y, 0, W * 1.6 * Math.min(1, intensity), 10 + 28 * intensity, '#7FD3FF', 0.7 * intensity, 0.5);
    if (ghosts) {
      const dx = W / 2 - x, dy = H / 2 - y;
      const G = [[0.35, 60, '#39E0FF', 0.18], [0.7, 24, '#ffffff', 0.25], [1.25, 110, color, 0.12], [1.6, 40, '#FF3D6E', 0.15], [2.1, 160, '#39E0FF', 0.08]];
      for (const [f, r, col, a] of G) { const gx = x + dx * f, gy = y + dy * f; ctx.globalAlpha = a * intensity; ctx.strokeStyle = rgba(col, 1); ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.arc(gx, gy, r * (0.6 + 0.6 * intensity), 0, TAU); ctx.stroke(); ctx.fillStyle = rgba(col, 0.35); ctx.fill(); }
    }
    ctx.restore();
  }
  // expanding ring (shockwave). width in px. soft edges via gradient stroke
  function shockRing(ctx, x, y, r, width, color, alpha = 1, squashY = 1) {
    if (alpha <= 0.001 || r <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, squashY); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, Math.max(0, r - width), 0, 0, r + width);
    g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r + width, 0, TAU); ctx.fill(); ctx.restore();
  }
  // speed lines radiating from (cx,cy): n lines, each with deterministic length/alpha. intensity 0..1
  function speedLines(ctx, cx, cy, intensity, { n = 60, seed = 3, color = '#ffffff', inner = 0.45, width = 3 } = {}) {
    if (intensity <= 0.001) return;
    const R = Math.hypot(W, H) * 0.75;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = hash2(i, seed) * TAU, len = (0.15 + 0.5 * hash2(i, seed + 1)) * R * intensity, start = R * inner * (0.7 + 0.6 * hash2(i, seed + 2));
      ctx.globalAlpha = intensity * (0.2 + 0.6 * hash2(i, seed + 3)); ctx.lineWidth = width * (0.5 + hash2(i, seed + 4));
      const g = ctx.createLinearGradient(cx + Math.cos(a) * start, cy + Math.sin(a) * start, cx + Math.cos(a) * (start + len), cy + Math.sin(a) * (start + len));
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.6, rgba(color, 1)); g.addColorStop(1, rgba(color, 0)); ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * start, cy + Math.sin(a) * start); ctx.lineTo(cx + Math.cos(a) * (start + len), cy + Math.sin(a) * (start + len)); ctx.stroke();
    }
    ctx.restore();
  }
  // cinematic letterbox bars for aspect `ratio` (e.g. 2.39). amount 0..1 animates them in
  function letterbox(ctx, ratio = 2.39, amount = 1, color = '#000') {
    const barH = Math.max(0, (H - W / ratio) / 2) * amount; if (barH <= 0) return;
    ctx.save(); ctx.fillStyle = color; ctx.fillRect(0, 0, W, barH); ctx.fillRect(0, H - barH, W, barH); ctx.restore();
  }
  // full-screen flash
  function flash(ctx, alpha, color = '#ffffff') { if (alpha <= 0.001) return; ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // background gradient helpers
  function bgGradient(ctx, top, bottom, { cx = W / 2, cy = H * 0.45, r = W * 0.75 } = {}) {
    ctx.save(); ctx.fillStyle = bottom; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, top); g.addColorStop(1, rgba(bottom, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // floodlight cone from (x,y) pointing down-ish: angle, spread, length
  function lightCone(ctx, x, y, angle, spread, length, color, alpha) {
    if (alpha <= 0.001) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, 0, length, 0); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(0.5, rgba(color, alpha * 0.35)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, -Math.tan(spread / 2) * length); ctx.lineTo(length, Math.tan(spread / 2) * length); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // scanlines overlay (tech look)
  function scanlines(ctx, alpha = 0.08, period = 4) {
    if (alpha <= 0.001) return;
    const s = scratch('_scan', 8, period, false); const g = s.getContext('2d'); g.clearRect(0, 0, 8, period); g.fillStyle = '#000'; g.fillRect(0, 0, 8, Math.max(1, period / 2));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(s, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // subtle hex/dot grid for tech backgrounds
  function dotGrid(ctx, spacing, color, alpha, offset = 0, r = 1.5) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    for (let y = (offset % spacing); y < H; y += spacing) for (let x = (offset % spacing); x < W; x += spacing) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  Object.assign(TN, { makeCanvas, scratch, withGlow, bloom, bloomCanvas, vignette, grain, chromaticAberration, radialZoomBlur, directionalBlur, lightStreak, glowDot, lensFlare, shockRing, speedLines, letterbox, flash, bgGradient, lightCone, scanlines, dotGrid });
})();

// particles.js — stateless, deterministic particle emitters (every particle's state is a pure function of time).
(function () {
  const TN = window.TN; const { clamp, lerp, rgba, hash2, TAU } = TN;
  /**
   * burst(ctx, t, opts): a burst emitted around t0 from (x,y).
   *  t0, window (spawn spread seconds), count, life [min,max], speed [min,max], angle (centre rad), spread (rad), gravity px/s², drag (per second fraction),
   *  size [min,max], color | colors[], shape 'dot'|'streak'|'shard', seed, alphaCurve fn(age01) default fade-out, additive
   */
  function burst(ctx, t, o) {
    const { x = 0, y = 0, t0 = 0, window = 0.05, count = 60, seed = 1 } = o; const life = o.life || [0.4, 0.9], speed = o.speed || [200, 700], size = o.size || [2, 5];
    const angle = o.angle == null ? -Math.PI / 2 : o.angle, spread = o.spread == null ? TAU : o.spread, gravity = o.gravity == null ? 900 : o.gravity, drag = o.drag == null ? 1.5 : o.drag;
    const colors = o.colors || [o.color || TN.PAL.ball]; const shape = o.shape || 'dot'; const additive = o.additive !== false; const stretch = o.stretch == null ? 1 : o.stretch;
    ctx.save(); if (additive) ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const birth = t0 + hash2(i, seed) * window; const age = t - birth; const L = lerp(life[0], life[1], hash2(i, seed + 1)); if (age < 0 || age > L) continue;
      const a01 = age / L; const ang = angle + (hash2(i, seed + 2) - 0.5) * spread; const sp = lerp(speed[0], speed[1], hash2(i, seed + 3) ** 1.5);
      // drag-integrated motion: v(t) = v0 e^{-k t}; x = v0 (1-e^{-kt})/k
      const k = drag; const f = k > 0 ? (1 - Math.exp(-k * age)) / k : age; const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      const px = x + vx * f, py = y + vy * f + 0.5 * gravity * age * age; const cvx = vx * Math.exp(-k * age), cvy = vy * Math.exp(-k * age) + gravity * age;
      const sz = lerp(size[0], size[1], hash2(i, seed + 4)) * (o.shrink ? 1 - a01 : 1); const col = colors[Math.floor(hash2(i, seed + 5) * colors.length) % colors.length];
      const alpha = (o.alphaCurve ? o.alphaCurve(a01) : (1 - a01) ** 1.5) * (o.alpha == null ? 1 : o.alpha); if (alpha <= 0.003) continue;
      ctx.globalAlpha = alpha; ctx.fillStyle = rgba(col, 1); ctx.strokeStyle = rgba(col, 1);
      if (shape === 'dot') { ctx.beginPath(); ctx.arc(px, py, sz, 0, TAU); ctx.fill(); }
      else if (shape === 'streak') { const sl = clamp(Math.hypot(cvx, cvy) / 60, 1, 40) * stretch; const nx = cvx / (Math.hypot(cvx, cvy) || 1), ny = cvy / (Math.hypot(cvx, cvy) || 1); ctx.lineWidth = sz; ctx.beginPath(); ctx.moveTo(px - nx * sl, py - ny * sl); ctx.lineTo(px, py); ctx.stroke(); }
      else if (shape === 'shard') { const rot = hash2(i, seed + 6) * TAU + age * (hash2(i, seed + 7) - 0.5) * 12; ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillRect(-sz, -sz * 0.35, sz * 2, sz * 0.7); ctx.restore(); }
      else if (shape === 'ring') { ctx.lineWidth = Math.max(1, sz * 0.4); ctx.beginPath(); ctx.arc(px, py, sz * (0.5 + a01 * 2), 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }
  /** ambient drifting motes (dust in light): continuous field, deterministic. density count over whole frame, slow drift */
  function motes(ctx, t, { count = 120, seed = 5, color = '#ffffff', alpha = 0.35, size = [1, 3], drift = [20, -10], area = [0, 0, TN.W, TN.H], twinkle = 1 } = {}) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const [ax, ay, aw, ah] = area; const period = 6 + 6 * hash2(i, seed + 8); const ph = ((t + hash2(i, seed + 9) * period) % period) / period;
      const px = ax + ((hash2(i, seed) * aw + drift[0] * t + Math.sin(t * 0.7 + i) * 12) % aw + aw) % aw, py = ay + ((hash2(i, seed + 1) * ah + drift[1] * t) % ah + ah) % ah;
      const a = alpha * Math.sin(ph * Math.PI) * lerp(1, 0.5 + 0.5 * Math.sin(t * (2 + 3 * hash2(i, seed + 2)) + i), twinkle);
      const sz = lerp(size[0], size[1], hash2(i, seed + 3)); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, sz, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  Object.assign(TN, { burst, motes });
})();

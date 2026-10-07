// text.js — typography helpers and kinetic text animators. All fonts referenced by family name (loaded in index.html).
(function () {
  const TN = window.TN; const { W, H, clamp, lerp, rgba, hash2, E, prog } = TN;
  const FONTS = { display: '"Barlow Condensed"', displayAlt: '"Bebas Neue"', heavy: '"Anton"', ui: '"Inter Display"', body: '"Inter"', mono: '"Space Mono"', oswald: '"Oswald"' };
  const font = (size, family = FONTS.display, weight = 900, style = '') => `${style} ${weight} ${size}px ${family}`.trim();

  // draw text with manual letter-spacing (px). align: 'left'|'center'|'right'. returns total width
  function text(ctx, str, x, y, { size = 100, family = FONTS.display, weight = 900, color = '#fff', align = 'center', spacing = 0, baseline = 'alphabetic', style = '', alpha = 1, stroke = null, strokeWidth = 2 } = {}) {
    ctx.save(); ctx.font = font(size, family, weight, style); ctx.textBaseline = baseline; ctx.textAlign = 'left'; ctx.globalAlpha *= alpha;
    const chars = [...str]; const widths = chars.map(c => ctx.measureText(c).width); const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (let i = 0; i < chars.length; i++) { if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.lineJoin = 'round'; ctx.strokeText(chars[i], cx, y); } if (color) { ctx.fillStyle = color; ctx.fillText(chars[i], cx, y); } cx += widths[i] + spacing; }
    ctx.restore(); return total;
  }
  function measure(ctx, str, { size = 100, family = FONTS.display, weight = 900, spacing = 0, style = '' } = {}) { ctx.save(); ctx.font = font(size, family, weight, style); const chars = [...str]; const w = chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + spacing * (chars.length - 1); ctx.restore(); return w; }

  /** per-character animated text. anim(i, n, ctx, info) is called for each char with info {x,y,w,p} where p is the char's local progress 0..1 (staggered).
   *  opts: t (time), t0 (start), dur (per-char duration), stagger (sec per char), order 'ltr'|'rtl'|'center'|'random', ... text opts
   *  default anim: slam from scale 3 → 1 with outExpo, alpha in. */
  function kinetic(ctx, str, x, y, o) {
    const { t, t0 = 0, dur = 0.35, stagger = 0.04, order = 'ltr', ease = E.outExpo, size = 100, family = FONTS.display, weight = 900, color = '#fff', align = 'center', spacing = 0, style = '', alpha = 1, baseline = 'alphabetic' } = o;
    ctx.save(); ctx.font = font(size, family, weight, style); ctx.textBaseline = baseline; ctx.textAlign = 'left';
    const chars = [...str]; const n = chars.length; const widths = chars.map(c => ctx.measureText(c).width); const total = widths.reduce((a, b) => a + b, 0) + spacing * (n - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const anim = o.anim || ((i, nn, c, info) => { const p = info.p; const s = lerp(3, 1, p); c.globalAlpha = alpha * clamp(p * 2); c.translate(info.x + info.w / 2, info.y); c.scale(s, s); c.translate(-(info.x + info.w / 2), -info.y); });
    for (let i = 0; i < n; i++) {
      let k = i; if (order === 'rtl') k = n - 1 - i; else if (order === 'center') k = Math.abs(i - (n - 1) / 2); else if (order === 'random') k = Math.floor(hash2(i, 99) * n);
      const p = ease(prog(t, t0 + k * stagger, t0 + k * stagger + dur)); if (p <= 0 && !o.drawHidden) { cx += widths[i] + spacing; continue; }
      ctx.save(); ctx.fillStyle = color; anim(i, n, ctx, { x: cx, y, w: widths[i], p, ch: chars[i], size }); if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 2; ctx.strokeText(chars[i], cx, y); } if (color) ctx.fillText(chars[i], cx, y); ctx.restore();
      cx += widths[i] + spacing;
    }
    ctx.restore(); return total;
  }
  // preset per-char anims
  const ANIM = {
    slam: (i, n, c, { x, y, w, p }) => { const s = lerp(2.6, 1, p); c.globalAlpha *= clamp(p * 3); c.translate(x + w / 2, y); c.scale(s, s); c.translate(-(x + w / 2), -y); },
    riseMask: (i, n, c, { x, y, w, p, size }) => { c.beginPath(); c.rect(x - 4, y - size * 1.05, w + 8, size * 1.35); c.clip(); c.translate(0, (1 - p) * size * 1.1); },
    dropIn: (i, n, c, { x, y, w, p, size }) => { c.globalAlpha *= clamp(p * 2); c.translate(0, -(1 - p) * size * 0.5); },
    flipX: (i, n, c, { x, y, w, p }) => { c.globalAlpha *= clamp(p * 2); c.translate(x + w / 2, y); c.scale(1, Math.max(0.02, Math.abs(Math.cos((1 - p) * Math.PI / 2)))); c.translate(-(x + w / 2), -y); },
    blurIn: (i, n, c, { p }) => { c.globalAlpha *= p; c.filter = `blur(${((1 - p) * 18).toFixed(1)}px)`; },
    trackIn: (i, n, c, { x, y, w, p }) => { c.globalAlpha *= clamp(p * 1.5); const off = (i - (n - 1) / 2) * (1 - p) * 60; c.translate(off, 0); },
    glitch: (i, n, c, { x, y, w, p }) => { if (p < 1) { const j = (hash2(i, Math.floor(p * 60)) - 0.5) * (1 - p) * 40; c.translate(j, (hash2(i + 7, Math.floor(p * 60)) - 0.5) * (1 - p) * 14); c.globalAlpha *= hash2(i, Math.floor(p * 30)) > 0.2 ? 1 : 0.2; } },
  };
  // text revealed by a horizontal wipe mask (p 0..1), optional leading highlight bar
  function wipeText(ctx, str, x, y, p, o = {}) {
    const w = measure(ctx, str, o); const left = (o.align || 'center') === 'center' ? x - w / 2 : (o.align === 'right' ? x - w : x); const size = o.size || 100;
    ctx.save(); ctx.beginPath(); ctx.rect(left - 10, y - size * 1.1, (w + 20) * clamp(p), size * 1.45); ctx.clip(); text(ctx, str, x, y, o); ctx.restore();
    if (o.bar && p > 0 && p < 1) { ctx.save(); ctx.fillStyle = o.bar; ctx.fillRect(left - 10 + (w + 20) * p - 3, y - size * 0.95, 6, size * 1.15); ctx.restore(); }
  }
  // rolling number: shows value v with digits that spin while `spin` (0..1 settles). formats with fixed decimals
  function rollingNumber(ctx, value, x, y, p, o = {}) {
    const decimals = o.decimals || 0; const target = value.toFixed(decimals); const chars = [...target]; const size = o.size || 100; const spacing = o.spacing || 0;
    ctx.save(); ctx.font = font(size, o.family || FONTS.mono, o.weight || 700); ctx.textBaseline = o.baseline || 'alphabetic'; ctx.textAlign = 'left';
    const widths = chars.map(c => ctx.measureText(/\d/.test(c) ? '0' : c).width); const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = (o.align || 'center') === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x; ctx.fillStyle = o.color || '#fff';
    for (let i = 0; i < chars.length; i++) {
      let ch = chars[i]; if (/\d/.test(ch)) { const local = clamp((p - i * 0.06) / (1 - i * 0.06)); if (local < 1) { ch = String(Math.floor(hash2(i, Math.floor(p * 90 + i * 13)) * 10)); ctx.globalAlpha = 0.85; } else ctx.globalAlpha = 1; }
      ctx.fillText(ch, cx, y); cx += widths[i] + spacing;
    }
    ctx.restore();
  }
  // label with a small colored bar/underline — broadcast lower-third style
  function tag(ctx, str, x, y, { size = 28, color = '#fff', accent = TN.PAL.ball, family = FONTS.mono, weight = 700, spacing = 4, p = 1, align = 'left' } = {}) {
    const w = measure(ctx, str, { size, family, weight, spacing }); const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.save(); ctx.fillStyle = accent; ctx.fillRect(left, y + 10, w * clamp(p), 3); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(left - 4, y - size * 1.2, (w + 8) * clamp(p * 1.4), size * 1.5); ctx.clip(); text(ctx, str, left, y, { size, color, family, weight, spacing, align: 'left' }); ctx.restore();
  }
  Object.assign(TN, { FONTS, font, text, measure, kinetic, ANIM, wipeText, rollingNumber, tag });
})();

// core.js — math, easing, deterministic randomness, colour. Everything hangs off window.TN.
(function () {
  const TN = (window.TN = window.TN || {});
  TN.W = 1920; TN.H = 1080; TN.FPS = 60; TN.DURATION = 10;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
  const remap = (v, a, b, c, d, doClamp = true) => { let t = invLerp(a, b, v); if (doClamp) t = clamp(t); return lerp(c, d, t); };
  const smoothstep = (a, b, v) => { const t = clamp(invLerp(a, b, v)); return t * t * (3 - 2 * t); };
  // progress of time t inside [a,b] → 0..1 (clamped)
  const prog = (t, a, b) => clamp(invLerp(a, b, t));
  // 0 before a, rises to 1 at b, holds, falls back to 0 between c and d
  const window01 = (t, a, b, c, d) => Math.min(prog(t, a, b), 1 - prog(t, c, d));

  const E = {
    linear: t => t,
    inSine: t => 1 - Math.cos((t * Math.PI) / 2), outSine: t => Math.sin((t * Math.PI) / 2), inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t), inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3), inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: t => t * t * t * t, outQuart: t => 1 - Math.pow(1 - t, 4), inOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inQuint: t => t ** 5, outQuint: t => 1 - Math.pow(1 - t, 5), inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)), outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: t => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    inCirc: t => 1 - Math.sqrt(1 - t * t), outCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inOutBack: (t, s = 1.70158 * 1.525) => (t < 0.5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2),
    outElastic: t => { const c4 = TAU / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
    outBounce: t => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; },
    // a sharp "slam": overshoot then settle. good for type hits
    slam: t => { t = clamp(t); return 1 - Math.pow(1 - t, 5) * Math.cos(t * 9) ; },
    // anticipation: dips negative before rising
    anticipate: t => { t = clamp(t); const s = 2.5; return t * t * ((s + 1) * t - s); },
  };
  const ease = (t, a, b, fn = E.outCubic) => fn(prog(t, a, b));
  // impulse: quick rise, exponential decay (for flashes / shakes). k controls sharpness
  const impulse = (x, k = 8) => { x = Math.max(0, x); const h = k * x; return h * Math.exp(1 - h); };
  const decay = (t, t0, tau) => (t < t0 ? 0 : Math.exp(-(t - t0) / tau));

  // ---------- deterministic randomness ----------
  function hash(n) { let x = (n | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
  function hash2(a, b) { return hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)); }
  function hash3(a, b, c) { return hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791)); }
  function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash2(i, seed), hash2(i + 1, seed), u); }
  function fbm1(x, seed = 0, oct = 3) { let s = 0, a = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * noise1(x, seed + o * 101); n += a; x *= 2.03; a *= 0.5; } return s / n; }
  function noise2(x, y, seed = 0) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash3(xi, yi, seed), hash3(xi + 1, yi, seed), u), lerp(hash3(xi, yi + 1, seed), hash3(xi + 1, yi + 1, seed), u), v); }
  // camera shake vector (centered, -1..1) decaying from t0
  function shake(t, t0, amp, tau = 0.25, freq = 28, seed = 7) { if (t < t0) return { x: 0, y: 0, r: 0 }; const d = Math.exp(-(t - t0) / tau) * amp; const p = (t - t0) * freq; return { x: (noise1(p, seed) * 2 - 1) * d, y: (noise1(p, seed + 1) * 2 - 1) * d, r: (noise1(p, seed + 2) * 2 - 1) * d * 0.002 }; }

  // ---------- colour ----------
  function hexToRgb(hex) { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); const n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(hex, a = 1) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function lerpColor(h1, h2, t) { const a = hexToRgb(h1), b = hexToRgb(h2); return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; }

  // default palette — timeline/storyboard may override
  TN.PAL = {
    bg: '#06101F', bg2: '#0B1B33', navy: '#0A1A33',
    court: '#1F5FAE', courtDeep: '#163F78', apron: '#2B7A5A', apronDeep: '#1E5B43',
    line: '#F4F7FA', net: '#E9EEF3',
    ball: '#DFFF00', ballMid: '#C9E800', ballDeep: '#8E9F00', ballShadow: '#5A6400',
    accent: '#FF3D6E', accent2: '#39E0FF', white: '#FFFFFF', text: '#F4F7FA', mute: '#8FA3BF', gold: '#FFC857',
  };

  Object.assign(TN, { TAU, clamp, lerp, invLerp, remap, smoothstep, prog, window01, E, ease, impulse, decay, hash, hash2, hash3, mulberry32, noise1, fbm1, noise2, shake, hexToRgb, rgba, lerpColor });
})();

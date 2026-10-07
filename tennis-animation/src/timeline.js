// timeline.js — master timeline (docs/STORYBOARD.md §1, §3, §7): scenes, transition overlaps, global post stack with per-shot overrides.
(function () {
  const TN = window.TN; const { W, H, clamp, prog, lerp, E } = TN; const T = TN.TRANSITIONS; const F = f => f / 60;
  TN.scenes = TN.scenes || {};
  const inFrames = (f, a, b) => f >= a && f <= b; // inclusive frame window helper

  TN.TIMELINE = {
    scenes: [
      { name: 'scene1', start: F(0), end: F(84) },     // IGNITION
      { name: 'scene2', start: F(84), end: F(156) },   // TOSS & STRIKE
      { name: 'scene3', start: F(156), end: F(306) },  // FLIGHT · FREEZE · SWOOP
      { name: 'scene4', start: F(306), end: F(438) },  // THE VERDICT
      { name: 'scene5', start: F(438), end: F(600) },  // GAME. SET. MATCH
    ],
    transitions: [
      { from: 'scene1', to: 'scene2', start: F(75), end: F(93), type: 'flash', params: { color: '#FFFFFF', peak: 0.5, hold: 0.11 } },
      { from: 'scene2', to: 'scene3', start: F(156), end: F(168), type: 'shockIris', params: { cx: 1000, cy: 520, rMax: 1400, zoom: 0.06, echo: true } },
      { from: 'scene3', to: 'scene4', start: F(300), end: F(312), type: 'scanWipe', params: { color: TN.PAL.accent2, bandW: 4, tail: 60 } },
      { from: 'scene4', to: 'scene5', start: F(438), end: F(450), type: 'irisTravel', params: { x0: 960, y0: 540, r0: 1800, r1: 22, to: () => TN.S4S5.periodDrop() } },
    ],
    post: { vignette: 0.45, grain: 0.05, aberration: 1.5, letterbox: 0 },
    // per-shot post overrides (§3). gt in seconds.
    postAt(gt) {
      const f = Math.round(gt * 60); const o = {};
      // --- chromatic aberration ---
      let ab = 1.5;
      if (inFrames(f, 84, 155)) ab = 2.2;                                   // macro
      if (inFrames(f, 75, 83)) ab = lerp(1.5, 6, prog(f, 75, 84));          // T1 ramp up
      if (inFrames(f, 84, 92)) ab = lerp(6, 1.5, prog(f, 84, 92));          // T1 ramp down
      if (inFrames(f, 156, 158)) ab = 8;                                    // contact RGB split
      else if (inFrames(f, 159, 161)) ab = 6;
      if (inFrames(f, 258, 272)) ab = lerp(2, 4, prog(f, 258, 273));        // flight speed
      if (inFrames(f, 273, 276)) ab = 4;                                    // bounce
      if (inFrames(f, 372, 373)) ab = 6;                                    // IN
      if (inFrames(f, 474, 475) || inFrames(f, 492, 493) || inFrames(f, 510, 511)) ab = 3; // S5 word slams
      o.aberration = ab;
      // --- bloom (S2–S4 only) ---
      if (inFrames(f, 84, 437)) {
        let st = 0.35;
        if (inFrames(f, 258, 305)) st = 0.5;
        if (inFrames(f, 372, 402)) st = lerp(0.5, 0.35, prog(f, 372, 402));
        o.bloom = { blur: 30, strength: st, threshold: 0.7, scale: 0.33 };
      }
      // --- vignette ---
      let vg = 0.45;
      if (inFrames(f, 84, 155)) { vg = 0.40; if (inFrames(f, 96, 98) || inFrames(f, 114, 116) || inFrames(f, 132, 134)) vg = 0.45; } // heartbeats
      if (inFrames(f, 306, 437)) vg = lerp(0.35, 0.60, prog(f, 414, 437));
      if (inFrames(f, 438, 598)) vg = lerp(0.45, 0.60, prog(f, 546, 590));
      o.vignette = vg;
      // --- grain ---
      o.grain = inFrames(f, 306, 437) ? 0.04 : 0.05;
      // --- letterbox: in under the whiteout, out as the shock iris opens ---
      o.letterbox = f < 84 ? 0 : f < 156 ? prog(f, 84, 92) : 1 - prog(f, 156, 168);
      // --- final frame: pure black, nothing breathing ---
      if (f >= 599 || TN.S5.black) { o.grain = 0; o.vignette = 0; o.aberration = 0; o.bloom = null; o.letterbox = 0; }
      return o;
    },
  };

  function sceneAt(name) { return TN.scenes[name] || { render(ctx) { ctx.fillStyle = '#301'; ctx.fillRect(0, 0, W, H); TN.text(ctx, `missing ${name}`, W / 2, H / 2, { size: 80, color: '#fff' }); } }; }
  function renderScene(ctx, entry, t) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); sceneAt(entry.name).render(ctx, t - entry.start, t); ctx.restore(); }
  TN.renderFrame = function (ctx, t) {
    const TL = TN.TIMELINE; const frame = Math.round(t * TN.FPS); TN.S5.black = false;
    const tr = TL.transitions.find(x => t >= x.start && t < x.end);
    const body = TN.scratch('_body'); const bg = body.getContext('2d');
    if (tr) {
      const A = TN.scratch('_A'), B = TN.scratch('_B'); const ea = TL.scenes.find(s => s.name === tr.from), eb = TL.scenes.find(s => s.name === tr.to);
      renderScene(A.getContext('2d'), ea, t); renderScene(B.getContext('2d'), eb, t);
      const p = prog(t, tr.start, tr.end); (T[tr.type] || T.cut)(bg, A, B, p, tr.params || {});
    } else {
      const entry = TL.scenes.find(s => t >= s.start && t < s.end) || TL.scenes[TL.scenes.length - 1]; renderScene(bg, entry, t);
    }
    // global post
    const P = Object.assign({ vignette: 0.45, grain: 0.05, aberration: 1.5, letterbox: 0 }, TL.post || {}, (TL.postAt && TL.postAt(t)) || {});
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (P.aberration > 0.05) TN.chromaticAberration(ctx, body, P.aberration); else ctx.drawImage(body, 0, 0);
    if (P.bloom) TN.bloomCanvas(ctx, body, P.bloom);
    if (P.vignette > 0) TN.vignette(ctx, P.vignette);
    if (P.grain > 0) TN.grain(ctx, frame, P.grain);
    if (P.letterbox > 0) TN.letterbox(ctx, 2.39, P.letterbox);
    if (P.fade > 0) TN.flash(ctx, P.fade, '#000');
    if (frame >= 599 || TN.S5.black) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };
})();

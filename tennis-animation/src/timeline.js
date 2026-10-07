// timeline.js — master timeline: scenes, transition overlaps, global post stack. Scenes are TN.scenes[name] = { render(ctx, localT, globalT) }.
(function () {
  const TN = window.TN; const { W, H, clamp, prog, E } = TN; const T = TN.TRANSITIONS;
  TN.scenes = TN.scenes || {};
  // Default timeline (overridden by the storyboard build). Each entry: scene name, start, end (seconds, absolute). Transitions join consecutive scenes over [start,end].
  TN.TIMELINE = TN.TIMELINE || {
    scenes: [{ name: 'scene1', start: 0, end: 10 }],
    transitions: [],
    post: { vignette: 0.5, grain: 0.05, aberration: 1.5, letterbox: 0 },
  };
  function sceneAt(name) { return TN.scenes[name] || { render(ctx, t) { ctx.fillStyle = '#301'; ctx.fillRect(0, 0, W, H); TN.text(ctx, `missing ${name}`, W / 2, H / 2, { size: 80, color: '#fff' }); } }; }
  function renderScene(ctx, entry, t) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); sceneAt(entry.name).render(ctx, t - entry.start, t); ctx.restore(); }
  TN.renderFrame = function (ctx, t) {
    const TL = TN.TIMELINE; const frame = Math.round(t * TN.FPS);
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
    const P = Object.assign({ vignette: 0.5, grain: 0.05, aberration: 1.5, letterbox: 0 }, TL.post || {}, (TL.postAt && TL.postAt(t)) || {});
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (P.aberration > 0.05) TN.chromaticAberration(ctx, body, P.aberration); else ctx.drawImage(body, 0, 0);
    if (P.bloom) TN.bloomCanvas(ctx, body, P.bloom);
    if (P.vignette > 0) TN.vignette(ctx, P.vignette);
    if (P.grain > 0) TN.grain(ctx, frame, P.grain);
    if (P.letterbox > 0) TN.letterbox(ctx, 2.39, P.letterbox);
    if (P.fade > 0) TN.flash(ctx, P.fade, '#000');
    ctx.restore();
  };
})();

// brand.js — project palette, fonts and shared scene handoff state. Loaded after lib/*.js, before scenes.
(function () {
  const TN = window.TN; const { prog, lerp, E } = TN;
  // Palette per docs/STORYBOARD.md §2. Scenes reference TN.PAL.* only.
  Object.assign(TN.PAL, {
    bg: '#070A14',            // Stadium Black
    bg2: '#0B1530',           // (alias of navy for bgGradient callers)
    navy: '#0B1530',          // Hawk Navy — review-mode court, UI panels, stands
    apron: '#14264F',         // Apron Navy — court run-off
    apronDeep: '#0E1B3A',
    court: '#1E3F8F',         // Court Royal
    courtDeep: '#163373',
    courtSheen: '#2A58C9',    // specular pools / gloss highlight
    line: '#F4F6FA', text: '#F4F6FA', net: '#E9EEF3',
    ball: '#DFFF00',          // Optic Yellow — the single loudest hue
    ballHi: '#EFFF8A',        // felt highlight / fibre tips / rim
    ballMid: '#C6E600',
    ballDeep: '#8E9F00',
    ballShadow: '#5A6400',
    accent2: '#5FE0FF',       // Hawk Cyan — line-calling data
    ice: '#BFE9FF',           // Flare Ice — lamp cores, streaks, review lines
    mute: '#9FB3D9',          // Steel Blue — secondary text
    accent: '#FF3B6B',        // Live Red — LIVE dot / REVIEW tag only
    white: '#FFFFFF',
    ink: '#1A2240',           // dimmed type during the shutdown
    gold: '#FFC857',
  });
  // standard felt-ball colour set
  TN.BALL_COLORS = { hi: TN.PAL.ballHi, mid: TN.PAL.ball, deep: TN.PAL.ballDeep, shadow: TN.PAL.ballShadow };
  // no Inter anywhere (not on disk as a webfont): repoint the generic roles
  Object.assign(TN.FONTS, { ui: '"Barlow Condensed"', body: '"Barlow"' });

  // ---- S4 ↔ S5 handoff (single source of truth for the period position and the travelling iris ball) ----
  TN.S4S5 = {
    _period: null,                       // scene5 sets this once from measureText: {x, y} = resting centre of the 44 px ball (period after MATCH)
    period() { return this._period || { x: 1640, y: 578 }; },
    periodDrop() { const p = this.period(); return { x: p.x, y: p.y - 60 }; },
    // centre/radius of the shrinking iris ball during T4 part B (f438–f449); S4 renders exactly this ball past its end
    ball(gt) { const p = prog(gt, 438 / 60, 450 / 60); const e = E.inOutCubic(p); const d = this.periodDrop(); return { x: lerp(960, d.x, e), y: lerp(540, d.y, e), r: 1800 * Math.pow(22 / 1800, e) }; },
  };
  TN.S5 = { black: false }; // scene5 sets black=true on the final frame; postAt honours it
  TN.F = f => f / 60; // frame → seconds (write timeline times as TN.F(n), never decimals)
})();

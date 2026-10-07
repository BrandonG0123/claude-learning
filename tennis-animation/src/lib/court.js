// court.js — real-proportion court geometry (metres), perspective camera, court/net renderers, 2D top-down mapping.
(function () {
  const TN = window.TN; const { W, H, clamp, lerp, rgba, TAU } = TN;

  // ITF dimensions in metres. World frame: x across court (−5.485..5.485), y along court (−11.885..11.885, net at y=0), z up.
  const COURT = {
    length: 23.77, halfL: 11.885, widthD: 10.97, halfWD: 5.485, widthS: 8.23, halfWS: 4.115,
    serviceFromNet: 6.40, centerMark: 0.10, lineW: 0.05, baselineW: 0.10,
    netH: 0.914, netPostH: 1.07, netPostX: 6.4, ballR: 0.0335,
  };
  // line segments as rectangles [x1,y1,x2,y2,width]
  function courtLines() {
    const L = []; const { halfL, halfWD, halfWS, serviceFromNet, lineW, baselineW, centerMark } = COURT;
    L.push([-halfWD, -halfL, halfWD, -halfL, baselineW], [-halfWD, halfL, halfWD, halfL, baselineW]); // baselines
    L.push([-halfWD, -halfL, -halfWD, halfL, lineW], [halfWD, -halfL, halfWD, halfL, lineW]); // doubles sidelines
    L.push([-halfWS, -halfL, -halfWS, halfL, lineW], [halfWS, -halfL, halfWS, halfL, lineW]); // singles sidelines
    L.push([-halfWS, -serviceFromNet, halfWS, -serviceFromNet, lineW], [-halfWS, serviceFromNet, halfWS, serviceFromNet, lineW]); // service lines
    L.push([0, -serviceFromNet, 0, serviceFromNet, lineW]); // centre service line
    L.push([0, -halfL, 0, -halfL + centerMark * 2, lineW], [0, halfL, 0, halfL - centerMark * 2, lineW]); // centre marks
    return L;
  }

  // ---------- camera ----------
  class Camera {
    constructor() { this.set([0, -30, 12], [0, 0, 0], 40); }
    // eye & target in world metres, fov vertical degrees, roll radians
    set(eye, target, fovDeg = 40, roll = 0) {
      this.eye = eye; this.target = target; this.fov = fovDeg; this.roll = roll;
      const f = norm(sub(target, eye)); let up = [0, 0, 1];
      if (Math.abs(dot(f, up)) > 0.999) up = [0, 1, 0];
      let r = norm(cross(f, up)); let u = cross(r, f);
      if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const r2 = add(mul(r, c), mul(u, s)); u = sub(mul(u, c), mul(r, s)); r = r2; }
      this.f = f; this.r = r; this.u = u;
      this.focal = (H / 2) / Math.tan((fovDeg * Math.PI) / 360);
      return this;
    }
    // returns {x,y,depth,scale,visible}. scale = pixels per metre at that depth
    project(p) {
      const d = sub(p, this.eye); const z = dot(d, this.f); const x = dot(d, this.r); const y = dot(d, this.u);
      const zz = Math.max(z, 0.05); const s = this.focal / zz;
      return { x: W / 2 + x * s, y: H / 2 - y * s, depth: z, scale: s, visible: z > 0.05 };
    }
    // orbit helper: camera on a circle around target. azimuth rad (0 = looking from +y side toward −y... we use standard), elevation rad, dist m
    static orbit(target, azimuth, elevation, dist, fov = 40, roll = 0) {
      const eye = [target[0] + Math.sin(azimuth) * Math.cos(elevation) * dist, target[1] - Math.cos(azimuth) * Math.cos(elevation) * dist, target[2] + Math.sin(elevation) * dist];
      return new Camera().set(eye, target, fov, roll);
    }
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => mul(a, 1 / (len(a) || 1));
  const v3 = { sub, add, mul, dot, cross, len, norm, lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] };

  // clip a 3D segment to the camera near plane and project; returns null if fully behind
  function projectSegment(cam, a, b, near = 0.1) {
    const da = dot(sub(a, cam.eye), cam.f), db = dot(sub(b, cam.eye), cam.f);
    if (da < near && db < near) return null;
    if (da < near) { const t = (near - da) / (db - da); a = v3.lerp(a, b, t); }
    else if (db < near) { const t = (near - db) / (da - db); b = v3.lerp(b, a, t); }
    return [cam.project(a), cam.project(b)];
  }
  // fill a planar polygon given world points (with near clipping of points behind the camera — polygon assumed mostly in front)
  function fillPoly3(ctx, cam, pts, near = 0.1) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const da = dot(sub(a, cam.eye), cam.f), db = dot(sub(b, cam.eye), cam.f);
      if (da >= near) out.push(cam.project(a));
      if ((da >= near) !== (db >= near)) { const t = (near - da) / (db - da); out.push(cam.project(v3.lerp(a, b, t))); }
    }
    if (out.length < 3) return false;
    ctx.beginPath(); ctx.moveTo(out[0].x, out[0].y); for (let i = 1; i < out.length; i++) ctx.lineTo(out[i].x, out[i].y); ctx.closePath(); ctx.fill();
    return true;
  }
  // a line rectangle on the ground (z=0) from (x1,y1)->(x2,y2) with width w, optionally drawn only `prog` of its length from the start
  function lineQuad(x1, y1, x2, y2, w, prog = 1, from = 0) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * (w / 2), ny = (dx / L) * (w / 2);
    const ax = x1 + dx * from, ay = y1 + dy * from, bx = x1 + dx * prog, by = y1 + dy * prog;
    return [[ax + nx, ay + ny, 0], [bx + nx, by + ny, 0], [bx - nx, by - ny, 0], [ax - nx, ay - ny, 0]];
  }

  // ---------- renderers ----------
  // surface: court rectangle + apron. colours from palette unless given. `glow` adds a soft centre light
  function drawSurface(ctx, cam, { court = TN.PAL.court, apron = TN.PAL.apron, apronPad = 8, alpha = 1, light = 0.25, lightAt = [0, 0] } = {}) {
    const { halfL, halfWD } = COURT; const P = apronPad;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = apron; fillPoly3(ctx, cam, [[-halfWD - P, -halfL - P, 0], [halfWD + P, -halfL - P, 0], [halfWD + P, halfL + P, 0], [-halfWD - P, halfL + P, 0]]);
    ctx.fillStyle = court; fillPoly3(ctx, cam, [[-halfWD, -halfL, 0], [halfWD, -halfL, 0], [halfWD, halfL, 0], [-halfWD, halfL, 0]]);
    if (light > 0) { // soft overhead light pool, projected
      const c = cam.project([lightAt[0], lightAt[1], 0]); const r = c.scale * 9;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r); g.addColorStop(0, `rgba(255,255,255,${light})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.globalCompositeOperation = 'overlay'; fillPoly3(ctx, cam, [[-halfWD - P, -halfL - P, 0], [halfWD + P, -halfL - P, 0], [halfWD + P, halfL + P, 0], [-halfWD - P, halfL + P, 0]]);
    }
    ctx.restore();
  }
  // lines: `progress` 0..1 draws lines growing (for build-on animations), `order` = 'all' | 'sequence' (one after another)
  function drawLines(ctx, cam, { color = TN.PAL.line, alpha = 1, progress = 1, glow = 0, widthScale = 1, order = 'all' } = {}) {
    const L = courtLines(); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    if (glow > 0) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    for (let i = 0; i < L.length; i++) {
      let p = progress;
      if (order === 'sequence') { const per = 1 / L.length; p = clamp((progress - i * per) / per); }
      if (p <= 0) continue;
      const [x1, y1, x2, y2, w] = L[i];
      fillPoly3(ctx, cam, lineQuad(x1, y1, x2, y2, w * widthScale, p));
    }
    ctx.restore();
  }
  // net: posts, top band, mesh. mesh density in cells along width
  function drawNet(ctx, cam, { alpha = 1, meshAlpha = 0.35, color = TN.PAL.net, cells = 48, rows = 7, bandColor = '#ffffff', postColor = '#0b0f14' } = {}) {
    const { netH, netPostH, netPostX } = COURT; ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
    // mesh
    ctx.strokeStyle = rgba(color, meshAlpha); ctx.lineWidth = 1;
    for (let i = 0; i <= cells; i++) { const x = lerp(-netPostX, netPostX, i / cells); const h = netH + (netPostH - netH) * Math.pow(Math.abs(x) / netPostX, 2); const s = projectSegment(cam, [x, 0, 0], [x, 0, h]); if (s) { ctx.lineWidth = Math.max(0.6, s[0].scale * 0.004); ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke(); } }
    for (let j = 0; j <= rows; j++) { const f = j / rows; ctx.beginPath(); let first = true; for (let i = 0; i <= cells; i++) { const x = lerp(-netPostX, netPostX, i / cells); const h = (netH + (netPostH - netH) * Math.pow(Math.abs(x) / netPostX, 2)) * f; const p = cam.project([x, 0, h]); if (!p.visible) { first = true; continue; } if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y); } ctx.stroke(); }
    // top band (white tape)
    ctx.strokeStyle = bandColor; ctx.beginPath(); let first = true;
    for (let i = 0; i <= cells; i++) { const x = lerp(-netPostX, netPostX, i / cells); const h = netH + (netPostH - netH) * Math.pow(Math.abs(x) / netPostX, 2); const p = cam.project([x, 0, h]); if (!p.visible) { first = true; continue; } if (first) { ctx.moveTo(p.x, p.y); ctx.lineWidth = Math.max(2, p.scale * 0.06); first = false; } else ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    // centre strap
    const cs = projectSegment(cam, [0, 0, 0], [0, 0, netH]); if (cs) { ctx.lineWidth = Math.max(2, cs[0].scale * 0.05); ctx.beginPath(); ctx.moveTo(cs[0].x, cs[0].y); ctx.lineTo(cs[1].x, cs[1].y); ctx.stroke(); }
    // posts
    for (const sx of [-1, 1]) { const s = projectSegment(cam, [sx * netPostX, 0, 0], [sx * netPostX, 0, netPostH]); if (s) { ctx.strokeStyle = postColor; ctx.lineWidth = Math.max(3, s[0].scale * 0.09); ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke(); } }
    ctx.restore();
  }
  // ground shadow of a ball at world (x,y,z): soft ellipse on the ground under it, shrinking/fading with height
  function drawGroundShadow(ctx, cam, x, y, z, r = COURT.ballR, alpha = 0.6) {
    const p = cam.project([x, y, 0]); if (!p.visible) return;
    const k = clamp(1 - z / 3); const rr = p.scale * r * (1.2 + z * 0.6); const ry = rr * Math.max(0.15, Math.abs(cam.f[2])) ;
    ctx.save(); ctx.globalAlpha = alpha * k; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr); g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, ry, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  // Hawk-Eye style bounce mark: elongated ellipse (skid) on the ground
  function bounceMark(ctx, cam, x, y, dirX, dirY, { length = 0.12, width = 0.07, color = TN.PAL.ball, alpha = 1 } = {}) {
    const ang = Math.atan2(dirY, dirX); const pts = []; const n = 24;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const lx = Math.cos(a) * length / 2, ly = Math.sin(a) * width / 2; pts.push([x + lx * Math.cos(ang) - ly * Math.sin(ang), y + lx * Math.sin(ang) + ly * Math.cos(ang), 0.002]); }
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; fillPoly3(ctx, cam, pts); ctx.restore();
  }

  // ---------- 2D top-down mapping (for flat graphic scenes) ----------
  // maps world (x along width, y along length) to screen with court centred at (cx,cy), `ppm` pixels per metre, optional rotation (rad)
  function topDown(cx = W / 2, cy = H / 2, ppm = 40, rot = 0) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return { to: (x, y) => ({ x: cx + (x * c - y * s) * ppm, y: cy + (x * s + y * c) * ppm }), ppm, cx, cy, rot };
  }
  function drawLines2D(ctx, map, { color = TN.PAL.line, alpha = 1, progress = 1, order = 'all', glow = 0, widthScale = 1 } = {}) {
    const L = courtLines(); ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineCap = 'butt';
    if (glow > 0) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    for (let i = 0; i < L.length; i++) {
      let p = progress; if (order === 'sequence') { const per = 1 / L.length; p = clamp((progress - i * per) / per); } if (p <= 0) continue;
      const [x1, y1, x2, y2, w] = L[i]; const a = map.to(x1, y1), b = map.to(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
      ctx.lineWidth = Math.max(1, w * map.ppm * widthScale); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  function courtRect2D(ctx, map, { court = TN.PAL.court, apron = TN.PAL.apron, pad = 3, alpha = 1 } = {}) {
    const { halfL, halfWD } = COURT; ctx.save(); ctx.globalAlpha = alpha;
    const poly = (hx, hy, col) => { const P = [map.to(-hx, -hy), map.to(hx, -hy), map.to(hx, hy), map.to(-hx, hy)]; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(P[i].x, P[i].y); ctx.closePath(); ctx.fill(); };
    poly(halfWD + pad, halfL + pad, apron); poly(halfWD, halfL, court); ctx.restore();
  }

  // ---------- ball physics helpers ----------
  // parabolic flight from p0 with velocity v0 (m/s), gravity g; returns position at time t
  function ballistic(p0, v0, t, g = 9.81) { return [p0[0] + v0[0] * t, p0[1] + v0[1] * t, p0[2] + v0[2] * t - 0.5 * g * t * t]; }
  // solve velocity so the ball from p0 lands at p1 after time T
  function solveVelocity(p0, p1, T, g = 9.81) { return [(p1[0] - p0[0]) / T, (p1[1] - p0[1]) / T, (p1[2] - p0[2]) / T + 0.5 * g * T]; }

  // Hawk-Eye style trajectory: pathFn(u) → [x,y,z] for u in 0..1; draws the projected curve up to `progress`, glowing, tapered. `dash` for a predicted (dotted) path
  function drawTrajectory(ctx, cam, pathFn, { progress = 1, from = 0, samples = 64, color = TN.PAL.ball, width = 4, glow = 18, alpha = 1, taper = true, dash = null } = {}) {
    if (progress <= from) return; const pts = [];
    for (let i = 0; i <= samples; i++) { const u = lerp(from, progress, i / samples); const p = cam.project(pathFn(u)); if (p.visible) pts.push(p); else pts.push(null); }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter'; if (dash) ctx.setLineDash(dash);
    if (glow) { ctx.shadowColor = rgba(color, 0.9); ctx.shadowBlur = glow; }
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (!a || !b) continue; const f = i / (pts.length - 1); ctx.globalAlpha = alpha * (taper ? 0.35 + 0.65 * f : 1); ctx.lineWidth = Math.max(1, width * (taper ? 0.4 + 0.6 * f : 1) * Math.min(2, b.scale / 60)); ctx.strokeStyle = rgba(color, 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.restore();
  }
  // vertical drop-lines from the path to the ground (Hawk-Eye "height" ticks). every `every` samples
  function drawHeightTicks(ctx, cam, pathFn, { progress = 1, every = 8, samples = 64, color = TN.PAL.accent2, alpha = 0.5 } = {}) {
    ctx.save(); ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    for (let i = 0; i <= samples; i += every) { const u = i / samples; if (u > progress) break; const P = pathFn(u); const s = projectSegment(cam, P, [P[0], P[1], 0]); if (!s) continue; ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke(); }
    ctx.restore();
  }
  // full flight with one bounce: returns pathFn(u) for u∈[0,1] covering t∈[0,T] where the ball leaves p0 with v0, bounces (restitution e, friction mu) and continues. also returns bounce info.
  function flightWithBounce(p0, v0, T, { e = 0.75, mu = 0.8, g = 9.81 } = {}) {
    // time to hit ground z=0
    const a = -0.5 * g, b = v0[2], c = p0[2]; const disc = b * b - 4 * a * c; const tb = disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : Infinity;
    const pb = ballistic(p0, v0, tb, g); const vb = [v0[0] * mu, v0[1] * mu, -(v0[2] - g * tb) * e];
    const at = t => (t <= tb ? ballistic(p0, v0, t, g) : ballistic([pb[0], pb[1], 0], vb, t - tb, g));
    return { pathFn: u => at(u * T), at, tBounce: tb, pBounce: pb, vBounce: vb, T };
  }
  Object.assign(TN, { COURT, courtLines, Camera, v3, projectSegment, fillPoly3, lineQuad, drawSurface, drawLines, drawNet, drawGroundShadow, bounceMark, topDown, drawLines2D, courtRect2D, ballistic, solveVelocity, drawTrajectory, drawHeightTicks, flightWithBounce });
})();

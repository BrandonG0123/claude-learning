# Scene-builder API reference (`window.TN`)

Everything is a plain script adding to the global `TN` namespace (no modules). A scene is:

```js
(function () { const TN = window.TN; TN.scenes = TN.scenes || {};
  TN.scenes.sceneN = {
    // ctx: 1920x1080 2D context, already cleared to black. t: seconds since THIS scene started. gt: absolute time.
    render(ctx, t, gt) { /* draw the complete frame for time t */ },
  };
})();
```

Rules that keep the render deterministic (frames are rendered out of order, on several workers):
- Never use `Math.random`, `Date`, `performance.now`, or mutable module state that depends on call order. Use `TN.hash(i)`, `TN.hash2(i,j)`, `TN.noise1(x,seed)`, or `TN.mulberry32(seed)` (re-seed inside render).
- Everything you draw must be a pure function of `t`. Particles are stateless (`TN.burst`) — their position is computed from age.
- Balance every `ctx.save()` with `ctx.restore()`. Reset `globalCompositeOperation`, `filter`, `shadowBlur` by restoring, not by hand.
- Leave the canvas fully covered (no transparent pixels): start with a background (`TN.bgGradient` or a fill).
- The global post stack (chromatic aberration, vignette, grain, optional letterbox) is applied by the timeline — do not add your own vignette/grain.
- Fonts: use `TN.FONTS.*` families only. They are loaded before the first frame.
- Test a scene alone with `node tools/render.cjs --scene sceneN --times 0.0,0.5,1.0 --out /path` (times are scene-local seconds; add `--shutter 4` for motion blur; open the PNGs). Full-timeline: `--frames 120,130`.

## Constants & palette
`TN.W=1920, TN.H=1080, TN.FPS=60, TN.DURATION=10, TN.TAU`.
`TN.PAL`: `bg #06101F, bg2 #0B1B33, navy, court #1F5FAE, courtDeep, apron #2B7A5A, apronDeep, line #F4F7FA, net, ball #DFFF00, ballMid, ballDeep #8E9F00, ballShadow, accent #FF3D6E, accent2 #39E0FF, white, text, mute #8FA3BF, gold #FFC857` (the storyboard may override values; always reference `TN.PAL.x`, never hex literals for brand colours).

## core.js — math / easing / randomness / colour
- `clamp(v,a=0,b=1)`, `lerp(a,b,t)`, `invLerp(a,b,v)`, `remap(v,a,b,c,d,clamp=true)`, `smoothstep(a,b,v)`
- `prog(t,a,b)` → 0..1 progress of time t inside [a,b] (clamped). `window01(t,a,b,c,d)` → rises a→b, holds, falls c→d.
- `E.*` easings: linear, in/out/inOut × Sine/Quad/Cubic/Quart/Quint/Expo/Circ, inBack/outBack/inOutBack, outElastic, outBounce, `slam` (overshoot + settle), `anticipate`.
- `ease(t,a,b,fn=E.outCubic)` = `fn(prog(t,a,b))`. `impulse(x,k=8)` quick rise/exp decay (x≥0). `decay(t,t0,tau)` = exp(-(t-t0)/tau) after t0, else 0.
- `hash(n)`, `hash2(a,b)`, `hash3(a,b,c)` → deterministic 0..1. `mulberry32(seed)()` PRNG. `noise1(x,seed)`, `fbm1(x,seed,oct)`, `noise2(x,y,seed)`.
- `shake(t,t0,amp,tau=0.25,freq=28,seed)` → `{x,y,r}` decaying camera shake offsets (px, px, rad) starting at t0. Apply with `ctx.translate(W/2+s.x, H/2+s.y); ctx.rotate(s.r); ctx.translate(-W/2,-H/2)`.
- `hexToRgb(hex)`, `rgba(hex,a)`, `lerpColor(h1,h2,t)`.

## fx.js — glow, blur, post, flares
- `makeCanvas(w,h)`; `scratch(name,w=W,h=H,clear=true)` → named reusable offscreen canvas (cleared & state-reset). Prefix your names with your scene (`'s3_trail'`) to avoid collisions.
- `withGlow(ctx,color,blur,fn,alpha=1)` draws `fn(ctx)` with shadowBlur glow.
- `bloom(ctx, fn, {blur=24,strength=0.8,passes=2,scale=0.5,op='lighter'})` draws `fn(g)` into a half-res buffer, blurs, adds. `bloomCanvas(ctx, src, {blur,strength,threshold,scale})` blooms the bright parts of a canvas.
- `vignette(ctx,strength,inner)` (post only), `grain(ctx,frame,amount)` (post only), `letterbox(ctx,ratio=2.39,amount)`, `flash(ctx,alpha,color='#fff')`.
- `chromaticAberration(ctx, src, amount, cx, cy)` (post), `radialZoomBlur(ctx,src,cx,cy,strength=0.15,samples=12,alpha)`, `directionalBlur(ctx,src,dx,dy,samples,alpha)` — render your scene into a `scratch` and blur it for speed/impact frames.
- `lightStreak(ctx,x,y,angle,length,width,color,alpha,core)` additive anamorphic streak. `glowDot(ctx,x,y,r,color,alpha,inner)` soft additive light. `lensFlare(ctx,x,y,intensity,color,{streak,ghosts})` full flare with ghosts along the centre axis.
- `shockRing(ctx,x,y,r,width,color,alpha,squashY=1)` expanding soft ring. `speedLines(ctx,cx,cy,intensity,{n,seed,color,inner,width})` radial speed lines. `lightCone(ctx,x,y,angle,spread,length,color,alpha)` floodlight beam. `scanlines(ctx,alpha,period)`, `dotGrid(ctx,spacing,color,alpha,offset,r)`, `bgGradient(ctx,topColor,bottomColor,{cx,cy,r})` radial-lit background.

## court.js — real geometry, camera, court & net
- `COURT`: `{length 23.77, halfL 11.885, widthD 10.97, halfWD 5.485, widthS 8.23, halfWS 4.115, serviceFromNet 6.40, lineW 0.05, baselineW 0.10, netH 0.914, netPostH 1.07, netPostX 6.4, ballR 0.0335}`. World frame (metres): x across the court, y along it (net at y=0, baselines at y=±11.885), z up.
- `courtLines()` → `[x1,y1,x2,y2,width]` list (baselines, doubles & singles sidelines, service lines, centre service line, centre marks).
- `new Camera().set(eye[3], target[3], fovDeg=40, roll=0)`; `Camera.orbit(target, azimuth, elevation, dist, fov, roll)` (azimuth 0 = looking along +y from the −y baseline side; elevation rad; dist m). `cam.project([x,y,z])` → `{x,y,depth,scale,visible}` where `scale` = px per metre at that depth (ball radius on screen = `scale*COURT.ballR`, use ×2–3 for stylised size). `cam.f/r/u` basis vectors.
- `v3` helpers: `sub, add, mul, dot, cross, len, norm, lerp`.
- `projectSegment(cam,a,b)` near-clipped segment → `[pA,pB]|null`. `fillPoly3(ctx,cam,points3)` fills a projected ground polygon (near-clipped). `lineQuad(x1,y1,x2,y2,w,prog=1,from=0)` → 4 ground points for a court line (partial draw via prog).
- `drawSurface(ctx,cam,{court,apron,apronPad=8,alpha,light=0.25,lightAt=[0,0]})`, `drawLines(ctx,cam,{color,alpha,progress=1,glow=0,widthScale=1,order:'all'|'sequence'})` (progress animates lines drawing on), `drawNet(ctx,cam,{alpha,meshAlpha,color,cells,rows,bandColor,postColor})`.
- `drawGroundShadow(ctx,cam,x,y,z,r,alpha)` ball contact shadow. `bounceMark(ctx,cam,x,y,dirX,dirY,{length,width,color,alpha})` Hawk-Eye skid mark.
- Top-down 2D: `topDown(cx,cy,ppm,rot)` → map with `.to(x,y)`; `drawLines2D(ctx,map,{...same as drawLines})`, `courtRect2D(ctx,map,{court,apron,pad,alpha})`.
- Physics: `ballistic(p0,v0,t,g=9.81)` position; `solveVelocity(p0,p1,T,g)` velocity to reach p1 in T seconds. `flightWithBounce(p0,v0,T,{e=0.75,mu=0.8})` → `{pathFn(u), at(t), tBounce, pBounce, vBounce}` full flight with one ground bounce.
- Hawk-Eye: `drawTrajectory(ctx,cam,pathFn,{progress,from,samples,color,width,glow,alpha,taper,dash})` glowing projected 3D path (pathFn(u)→[x,y,z], u 0..1); `drawHeightTicks(ctx,cam,pathFn,{progress,every,samples,color,alpha})` dashed drop-lines to the ground.

## ball.js — hero objects
- `drawBall(ctx,x,y,r,{rot:[rx,ry,rz], light:[lx,ly], squash:0..0.5, squashAngle, fuzz:0..1, rim:0..1, colors:{hi,mid,deep,shadow}, detail:bool})` 3D-shaded ball with seam + felt + fibres. Spin the seam by advancing `rot` with time (`[t*20, 0.3, 0]`). Large r (>40 px) gets felt speckle; tiny balls auto-skip detail.
- `drawBallBlurred(ctx,x,y,r,vx,vy,opts)` ghosts along the velocity (px/frame) then the ball — for fast flight.
- `drawTrail(ctx, points[{x,y}], r, {color,alpha,taper,glow})` additive tapered trail (oldest first). Build points by sampling your path function at t-k·dt.
- `drawRacket(ctx,x,y,{angle,scale=1,deform:0..1,hitX,hitY,colors:{frame,frame2,accent,grip,string}})` head centred at (x,y), handle pointing down before rotation; scale 1 ≈ 340 px head height; `deform` bulges the string bed around (hitX,hitY) in −1..1 head units.

## particles.js — stateless particles
- `burst(ctx,t,{x,y,t0,window=0.05,count,seed,life:[a,b],speed:[a,b],angle,spread,gravity=900,drag=1.5,size:[a,b],color|colors[],shape:'dot'|'streak'|'shard'|'ring',alpha,alphaCurve,shrink,stretch,additive=true})` — one emission around t0; each particle's position is an analytic function of its age, so you can call it every frame with the same args.
- `motes(ctx,t,{count,seed,color,alpha,size,drift:[vx,vy],area:[x,y,w,h],twinkle})` ambient dust in light.

## text.js — typography & kinetic type
- `FONTS`: `display` "Barlow Condensed" (900/600/500), `displayAlt` "Bebas Neue", `heavy` "Anton", `ui` "Inter Display" (100–900), `body` "Inter", `mono` "Space Mono" (400/700), `oswald`.
- `text(ctx,str,x,y,{size,family,weight,color,align:'left'|'center'|'right',spacing,baseline,style,alpha,stroke,strokeWidth})` draws with manual letter-spacing; returns width. `measure(ctx,str,opts)`.
- `kinetic(ctx,str,x,y,{t,t0,dur=0.35,stagger=0.04,order:'ltr'|'rtl'|'center'|'random',ease,anim,...textOpts})` per-character animation; `anim(i,n,ctx,{x,y,w,p,ch,size})` mutates ctx before the glyph is drawn with local progress p. Presets in `ANIM`: `slam`, `riseMask` (rise from a clipped baseline), `dropIn`, `flipX`, `blurIn`, `trackIn`, `glitch`.
- `wipeText(ctx,str,x,y,p,{...textOpts,bar})` horizontal wipe reveal with optional leading bar. `rollingNumber(ctx,value,x,y,p,{decimals,size,family,color,align,spacing})` digits spin until p→1. `tag(ctx,str,x,y,{size,color,accent,family,weight,spacing,p,align})` broadcast caption with underline bar.

## transitions.js (used by the timeline, not by scenes)
`TN.TRANSITIONS[type](ctx,A,B,p,params)`: `cut, crossfade, flash{color,peak,hold}, ballWipe{cx,cy,color,ring}, whip{angle,dist,streak,color}, slice{n,angle,stagger,color,edge}, grid{cols,rows,from,color,jitter}, zoomPunch{cx,cy,flashColor,strength}, glitch{swap,slices,seed,amount}, mesh{cell,seed,color}, iris{cx,cy,soft,reverse}, push{angle,edge,edgeW}`.
A transition overlaps the two scenes: during `[start,end)` both scenes render (each with its own local time) and the transition composes them. Scenes must therefore render sensibly a little before their start and after their end (clamp or keep drawing their last state).

## timeline.js
`TN.TIMELINE = { scenes:[{name,start,end}], transitions:[{from,to,start,end,type,params}], post:{vignette,grain,aberration,letterbox,bloom?}, postAt?(t)→partial post overrides }`.

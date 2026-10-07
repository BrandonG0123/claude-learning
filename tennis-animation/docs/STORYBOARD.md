# NIGHT SESSION — MATCH POINT IN TEN SECONDS
## Final build spec · 1920×1080 · 60 fps · 600 frames (f0–f599, t = 0.000–9.983 s)

**Spine:** `broadcast` (won 2 of 3 first-place rankings; tied on points with `hawkeye`). **Grafts:** hawkeye's line PING, four-frame BREATH, ortho dive-to-the-sliver, persistent ELECTRONIC LINE CALLING header, REVIEW→DECISION tag; kinetic's "IN." with the ball-mark as the typographic full stop standing on the service line, the shutter-freeze-as-clamped-clock trick, mask-canvas wipes; cinematic's D-shaped compression against the string plane, the failed pan after the departing ball, the 2.39 letterbox that lifts as macro slow-motion becomes broadcast reality, "highest-risk scene first" build order. Everything is specified against the engine in `/home/user/claude-learning/tennis-animation` (`window.TN`, world frame x across / y along (net y=0) / z up, `render.cjs --shutter 4`, `tools/audio.py`).

### Judge critiques and how each is resolved

| Critique (judges) | Resolution in this spec |
|---|---|
| Strike at 3.300 is too late; S1/S2 too long | Strike lands at **f156 = 2.600 s**. S1 trimmed to 1.400 s (three ignition beats + lens rig), S2 to 1.200 s. Saved time goes to S4 for the dive and the BREATH. |
| S3+S4 are 7–8 sessions of work; de-scope | Chase cam replaced by a single `Camera.orbit` parameter lerp (no stateful lag); magnifier replaced by an orthographic exponential dive (pure 2D); mirror floor dropped (optional polish); felt texture reduced to a 1024² cached sprite with a gradient fallback; bowl specks capped at 2,400; swoop has a defined hard-cut fallback. |
| Chase cam risks reading as a cheap game | Flight camera is a **trailing three-quarter orbit** that swings outward to a sideline three-quarter view: sidelines, service boxes, net and stands structure every frame. Composition checkpoints are specified. |
| Scoreboard copy impossible (40–AD + TIEBREAK); 211 km/h second serve | Copy is now `FINAL · FIFTH SET · 5–4 · AD–40` (server listed first, server's match point) and `FIRST SERVE`. No tiebreak chip. |
| Centre-line-at-the-T review is not a tight call; 3 mm did not follow from geometry | The call is on the **service line**: the ball is long by everything except 3 mm of mark on the line's outer edge. Geometry is derived from the claimed number (see S3 physics). |
| Inter / Inter Display not on disk; fonts.load swallows failure | No Inter anywhere. Hero numerals in Oswald 700; `document.fonts.check()` asserted for every face before frame 0. |
| Stateful 0.08 s camera smoothing breaks out-of-order rendering | Camera target is `ball(τ(t − 0.08))`, analytic. |
| 1-frame flashes average to ~half under shutter 4 | Every hero flash is **2 frames**; alpha values below assume shutter 4. |
| Camera.set up-vector fallback flips roll at straight-down | Swoop stops at **87°** elevation (`sin 87° = 0.9986 < 0.999`). The top-down verdict shot is orthographic 2D. |
| 18 px mono data below broadcast legibility | All data text ≥ 22 px. |
| 'lighter' glows blow out over white lines | 'screen' for glows over lines/white; 'lighter' only over navy/black. |
| Slow-motion physics must be a time remap, not scaled gravity | Flight simulated in real time (g = 9.81, T = 0.38 s) and remapped by a ramp R(p); nothing is a lob. |
| Hawk-Eye trademark | On-screen text reads ELECTRONIC LINE CALLING / LINE REVIEW. Never "Hawk-Eye". |
| Photosensitivity | No full-frame flash on the rig ignitions (local bloom only); ≤ 3 flashes/s everywhere; flashes ≤ 40% except the contact frame (70%/35% over 2 frames). |

---

## 1. Concept & arc

One first serve on match point, told the way a Grand Slam night session would broadcast it: floodlights ignite over an empty glossy court, the ball hangs at the top of the toss, the racket detonates it, and we ride the Hawk-Eye-style trajectory down the court until the bounce kisses the service line by three millimetres. Time freezes on the bounce while a pulse of light runs through the court lines and the camera swoops overhead into a line-calling render that dives to the millimetre, holds its breath, and stamps IN with the ball-mark as the full stop. Then the ball flies into the lens, shrinks back to become the period after GAME. SET. MATCH, and the floodlights shut down bank by bank to black: TENSION (0–2.6) → STRIKE (2.6) → FLIGHT (2.6–4.55) → VERDICT (4.55–6.8) → BRAND (6.8–9.98).

### Master timeline

| # | Block | Frames | Seconds | TN scene / transition |
|---|---|---|---|---|
| S1 | IGNITION | f0–f83 | 0.000–1.383 | `scene1` start 0, dur 1.400, overlap_out 0.150 |
| T1 | FLOODLIGHT WHITEOUT | f75–f92 | 1.250–1.533 | `flash` (engine) — cut hidden under 100 % white at f84 |
| S2 | TOSS & STRIKE | f84–f155 | 1.400–2.583 | `scene2` start 1.400, dur 1.200, overlap_in 0.150, overlap_out 0.200 |
| T2 | STRING-BED SHOCKWAVE IRIS | f156–f167 | 2.600–2.783 | `shockIris` (new) — the cut IS the strike |
| S3 | FLIGHT · FREEZE · SWOOP | f156–f305 | 2.600–5.083 | `scene3` start 2.600, dur 2.500, overlap_out 0.100 |
| T3 | SCAN-BAND WIPE | f300–f311 | 5.000–5.183 | `scanWipe` (new) |
| S4 | THE VERDICT | f306–f437 | 5.100–7.283 | `scene4` start 5.100, dur 2.200, overlap_in 0.100, overlap_out 0.200 |
| T4 | BALL-FILLS-LENS WIPE | f414–f449 | 6.900–7.483 | Part A in-scene (S4, f414–f437); Part B `irisTravel` (new) f438–f449 |
| S5 | GAME. SET. MATCH | f438–f599 | 7.300–9.983 | `scene5` start 7.300, dur 2.683 |
| T5 | FLOODLIGHT SHUTDOWN TO BLACK | f591–f599 | 9.850–9.983 | in-scene (S5); frame 599 is pure black |

Every scene's `render(ctx, t, gt)` must key all timing off **`gt` (absolute seconds)** so the frame numbers in this document can be used directly (`f = Math.round(gt*60)`). Scene-local `t` is only for the brief template. Timeline times must be written as `frame/60` expressions, never decimal literals, so transition lookups (`t >= start && t < end`) never miss by one ulp.

---

## 2. Palette and typography

### Palette (override `TN.PAL` in a new `src/brand.js` loaded after `core.js`; scenes reference `TN.PAL.*` only)

| Name | Hex | `TN.PAL` key | Role |
|---|---|---|---|
| Stadium Black | `#070A14` | `bg` | Night sky, void behind the end card, S4 run-off in review mode. Everything emissive sits on this. |
| Hawk Navy | `#0B1530` | `navy` | Review-mode court fill (S3 swoop → S4), UI panel fills at 70 % alpha, stand silhouettes. |
| Apron Navy | `#14264F` | `apron` | Court run-off / apron surface (photoreal shots). `apronDeep` = `#0E1B3A`. |
| Court Royal | `#1E3F8F` | `court` | Hard-court surface base. `courtDeep` = `#163373` toward the far end (haze). |
| Court Sheen | `#2A58C9` | `courtSheen` (new) | Specular pools under rigs, glossy gradient highlight. |
| Line White | `#F4F6FA` | `line`, `text` | Court lines, net tape, primary display type, hero text fills. `net` = `#E9EEF3`. |
| Optic Yellow | `#DFFF00` | `ball` | The ball's lit hemisphere, trajectory tube core, IN, the mark, the felt fill, accent rules. The single loudest hue; nothing else may use it. |
| Felt Highlight | `#EFFF8A` | `ballHi` (new) | Felt fuzz tips, rim light, seam highlight, fibre particles. (`drawBall colors.hi`) |
| Felt Mid | `#C6E600` | `ballMid` | Terminator side of the ball. (`colors.mid` stays `ball`; this is the 0.72 stop) |
| Felt Deep | `#8E9F00` | `ballDeep` | Shadow hemisphere. |
| Felt Core | `#5A6400` | `ballShadow` | Deepest shadow, seam groove. |
| Hawk Cyan | `#5FE0FF` | `accent2` | Line-calling data: grid, droplines, scan band, readouts, bracket, ring-ball cross. Cool counterweight to Optic Yellow. |
| Flare Ice | `#BFE9FF` | `ice` (new) | Floodlight lamp cores, anamorphic streaks, specular sweep on type, review-mode court lines. |
| Steel Blue | `#9FB3D9` | `mute` | Secondary text: clocks, labels, sub-line, headers. |
| Live Red | `#FF3B6B` | `accent` | The 6 px LIVE dot and the blinking REVIEW tag only. Never a block, never near the ball. |
| White | `#FFFFFF` | `white` | Flash frames, ring cores, the overlap sliver. |

Ball shader call used everywhere the felt ball appears: `drawBall(ctx,x,y,r,{colors:{hi:PAL.ballHi, mid:PAL.ball, deep:PAL.ballDeep, shadow:PAL.ballShadow}, light:[-0.6,-0.7] (scene-specific), rim:0.6–0.85, fuzz:1})`.

### Typography (only faces physically in `/fonts`)

| Use | Font / weight | Size & setting |
|---|---|---|
| Hero display: ghost `MATCH POINT`, end card `GAME.` `SET.` `MATCH` | Bebas Neue 400 (`TN.FONTS.displayAlt`) | 320 px ghost (spacing −3 px); 220 px end card (spacing +4 px), auto-fit the whole line to ≤ 1500 px via `TN.measure`. Hard arrivals only: scale 1.6→1.0 cubic-in over 5 frames with a 2-frame 0.97 undershoot. Never fade a Bebas word in. |
| Verdict `IN` | Anton 400 (`TN.FONTS.heavy`) | 560 px, Optic Yellow, spacing −20 px; drop shadow black α .5 offset (0,14) blur 40; 6 px Line White ink outline for its first 3 frames. Right-aligned so the ball-mark is the full stop; baseline on the service line's outer edge. |
| Speed numerals `211` | Oswald 700 (`TN.FONTS.oswald`) | 180 px Line White, each digit in a fixed cell = `measureText('0').width` (local `digitCells()` helper); ±3 px RGB split while counting. |
| Labels / chips: `FIRST SERVE`, `KM/H`, `ELECTRONIC LINE CALLING`, `CALL CONFIRMED · MARGIN 3 MM` | Barlow Condensed SemiBold 600 (`TN.FONTS.display`, weight 600) | 26–40 px, uppercase, spacing 0.08–0.28 em. Slide-in 30 px with outCubic over 12 frames, or 6-frame clip wipe (`wipeText`). |
| Data / mono: `NIGHT SESSION`, `CENTRE COURT · 21:04`, score line, `NET CLEARANCE 28 CM`, `SPIN 2,150 RPM`, `T+0.000 S`, data strip, `ZOOM ×12.5`, `3 MM`, sub-line | Space Mono 700 for heads / 400 for values (`TN.FONTS.mono`) | 22–24 px (never below 22); `3 MM` at Bold 44 px; spacing 0.10–0.30 em on uppercase tickers. Type-on one character per frame with a 6 kHz tick; values roll via `rollingNumber` over 6 frames. |
| Reserved | Barlow 500/700 | Only if a safety caption is needed; 22 px Steel Blue. |

`src/brand.js` must also repoint `TN.FONTS.ui`/`body` to `"Barlow Condensed"`/`"Barlow"`, remove Inter from `FONT_LOADS` in `index.html` (integrator), and assert `document.fonts.check(f)` for all ten faces, throwing if any is false (a `pageerror` fails the render, which is what we want).

---

## 3. Global post-processing stack (applied by `timeline.js` to every frame, in this order)

| Pass | Baseline | Per-shot overrides via `postAt(gt)` |
|---|---|---|
| Chromatic aberration (`chromaticAberration`, 3 channel passes, radial) | 1.5 px | S2 macro 2.2 px. Spikes: ramp 1.5→6→1.5 across T1 (f75–f92); 6 px f156–f161; 4 px f273–f276 (bounce); 6 px f372–f373 (IN); 3 px for 2 frames on each S5 word slam. |
| Bloom (`bloomCanvas` on the body canvas, scale 0.33) | off | On for S2–S4 only: `{blur:30, strength:0.35, threshold:0.70}`; S3 f258–f305 strength 0.5 (trajectory + ping); S4 f372–f402 strength 0.5 decaying to 0.35. Off in S1 (draws its own flares) and S5 (white type would bloom). |
| Vignette (`vignette`) | 0.45 | S2 0.40 with heartbeat tightening to 0.45 for 3 frames at f96, f114, f132; S4 0.35 (machine view) rising to 0.60 across f414–f437; S5 0.45 → 0.60 across f546–f590. |
| Film grain (`grain`, overlay, 256 px tiles re-offset per frame) | 0.05 | S4 0.04. Grain stays on through the final fade so the black breathes until f598; f599 is flattened to pure black. |
| Letterbox 2.39:1 (`letterbox`) | 0 | Macro slow-motion only: amount = `prog(gt, 84/60, 92/60)` in (bars appear as the white decays), `1 − prog(gt, 156/60, 168/60)` out (bars lift as the iris opens onto the court). |
| Fade (`flash` black) | 0 | Not used; S5 performs the shutdown itself. |

Flash rule (shutter 4 averages the post stack across sub-samples): every stated flash is drawn for 2 consecutive frames at the stated alpha (first frame) and half alpha (second frame). Flash density never exceeds 3 per second anywhere in the cut.

---

## 4. Frame-accurate shot list

World frame reminder: metres; x across the court (−5.485…5.485), y along it (net y = 0, near baseline y = −11.885, far baseline +11.885, service lines y = ±6.40, centre service line x = 0, singles sidelines x = ±4.115), z up. `courtLines()` draws each line as a rectangle **centred** on its nominal coordinate with width 0.05 m, so the far service line occupies y ∈ [6.375, 6.425]; its **outer edge is y = 6.425**.

### Floodlight rig positions (shared by S1, S3, S5)

| Rig | World [x, y, z] | Role |
|---|---|---|
| R1 far-left | [−9, 16, 11] | ignites f12 |
| R2 far-right | [9, 16, 11] | ignites f27 |
| R3 near-left | [−10, 6, 8] | ignites f42 (with R4) |
| R4 near-right | [10, 6, 8] | ignites f42 |
| R5 lens rig | [3, 10, 9] | fires straight into the lens at f75 (S1 only) |

---

### S1 — IGNITION · f0–f83 (0.000–1.383) · `scene1` · local t = gt

**Camera.** `new Camera().set(eye, target, fov)` with eye lerping [0, −18.5, 2.2] → [0, −17.3, 2.0] (inOutSine across f0–f83), target [0, 1.5, 0.5], fov 46° → 44°. Low broadcast position behind the near baseline: far baseline lands at screen y ≈ 523, near baseline ≈ 846, horizon ≈ 545, rigs along the top edge (R1/R2 ≈ (619,97)/(1301,97), R3/R4 ≈ (423,118)/(1497,118), R5 ≈ (1097,119)). Handheld micro-drift: `noise1(gt*0.4, 1)` 2 px on x and y. No shake except 2 px for 3 frames on each ignition.

**Hero.** The stadium itself: four rigs igniting bank by bank and the empty glossy hard court whose lines draw themselves on in light.

**Beat-by-beat.**
- f0–f11 (0.000–0.183): near-black. `bgGradient(PAL.navy, PAL.bg)` at 40 % exposure; stand silhouettes (four sloped quads, Hawk Navy, via `fillPoly3`: far [−20,14,2]→[20,14,2]→[20,18,12]→[−20,18,12], mirrored near, and side quads x = ±(12→16), y −14…14, z 2→12); rig masts as 2 px `#0B1220` verticals under each rig point. Court surface at `drawSurface({alpha:0.25, light:0})`. Crowd murmur rising.
- f12 (0.200) **R1 ignites**: 15 lamps (5×3 grid, 6 px spacing at depth) pop on row by row over 4 frames; each lamp `glowDot` overshoots to 140 % radius for 2 frames then settles; one `lightStreak` (horizontal, length 900 px, width 6, Flare Ice, α .8, core .5); `lightCone` toward the court (α .12); a **reflection pool**: project the mirrored rig `[x, y, −z]`, draw the flare core there at α .35 with `filter blur(14px)` on a 1/3-res scratch, clipped to the court quad. Court exposure +25 % (`drawSurface alpha` .25 → .50, `light` .0 → .15 at `lightAt` the rig's ground point). 2 px screen shake, 3 frames. No full-frame flash.
- f27 (0.450) **R2 ignites**, same recipe; exposure → .75.
- f42 (0.700) **R3 + R4 ignite together** (the near bank); exposure → 1.0; `light` .30 pooled at [0, −4].
- f18–f66 **court lines light-trace on**: iterate `courtLines()` yourself and draw each via `fillPoly3(lineQuad(x1,y1,x2,y2,w,prog))` with a `glowDot(head, 24, PAL.line, .9)` at the moving head: baselines f18–f32 (from the centre mark outward both ways), singles + doubles sidelines f28–f52 (near → far), service lines + centre service line f46–f64, centre marks f62–f66. Easing outQuart per line.
- f50–f66: net fades in (`drawNet({alpha: prog(gt,50/60,66/60), meshAlpha:.35})`); a glint `glowDot(r 10, Flare Ice)` travels along the projected tape f62–f72.
- f60–f80: specular sheen band sweeps across the court left → right (a 500 px wide soft linear gradient, Court Sheen, 'screen', α .18, clipped to the court quad).
- f75 (1.250) **R5 fires into the lens**: `lensFlare(x5, y5, intensity)` with intensity 0.6 → 6.0 outCubic over f75–f84 (core `glowDot` reaches r ≈ 860 px, colour bloom r ≈ 2,500 px: the frame bleaches toward Flare Ice before T1's pure white takes over). 6 anamorphic `lightStreak`s at 0°/30°/60°/90°/120°/150°, the 5 ghost rings from `lensFlare` along the line to frame centre.

**FX layers.** Haze: two layers of 12 soft `glowDot`s (r 300–600, Hawk Navy at 6 %, 'screen') drifting 6 px/s. 60 near-lens `motes` (size 2–6, α .3, drift [8,−4]) with 20 of them on a `blur(3px)` 1/2-res layer. Stand specks: 2,400 seeded 1 px dots on the stand quads (seed via `mulberry32(31)` once into a module-level const array of UV pairs — allowed because it is call-order independent), 1.5 % flash per frame (2-frame Flare Ice `glowDot` r 6). Grain/vignette/CA from the global stack.

**On-screen text.**
- f36–f46 (0.600–0.767): 2 px Optic Yellow rule, 220 px long, draws left → right at (96, 96).
- f40–f53: `NIGHT SESSION` — Space Mono Bold 24 px, spacing 6 px, Line White, baseline y = 134, types on one character per frame (14 chars) with a 6 kHz tick each.
- f52–f62: `CENTRE COURT · 21:04` — Space Mono Regular 22 px, Steel Blue, baseline y = 166, alpha 0→1 outCubic.
- 6 px Live Red dot at (80, 126) blinking 1 Hz (square wave, on 0.5 s) from f40.
- Out: everything is under 100 % white from f81; text simply stops being drawn at f84 (scene swap).

**TRANSITION OUT → T1 FLOODLIGHT WHITEOUT · f75–f92 (1.250–1.533) · 18 frames · cut hidden at f84 (1.400).**
Engine `TN.TRANSITIONS.flash` with `{color:'#FFFFFF', peak:0.5, hold:0.11}` over `[75/60, 93/60)`. Mechanism: p < 0.5 (f75–f83) shows S1 (its R5 flare already bleaching the frame) under a white overlay rising with inQuart to α 1.0 at f84; f84–f86 hold 100 % white (p 0.50–0.61); at f84 the scene underneath swaps to S2 (`p ≥ peak → B`) while the frame is still pure white, so there is no visible pop; f87–f92 the white decays with outCubic to 0.003 at f92 while `postAt` ramps aberration 6 → 1.5 px and the letterbox bars rise 0 → 1 (they are drawn over the white, so they appear as the white thins). Overlap frames: f75–f83 belong to S1 (rendered as A), f84–f92 to S2 (rendered as B); both scenes are rendered for the full window. S2 additionally draws a vertical bloom smear on its first 8 frames (its own 1/3-res blur of the frame, 'lighter', α .5 → 0). Sound: the lens-rig boom at 1.250 with a 1.2 s ring-out carrying under S2.

---

### S2 — TOSS & STRIKE · f84–f155 (1.400–2.583) · `scene2` · local t = gt − 1.400

**Camera.** Macro, 100 mm equivalent, shallow DOF. Letterbox 2.39:1 is in (bars y < 138 and y > 942). Ball centre-left at (820, 500), radius 170 px → 190 px slow push-in (inOutSine over the shot). A 12° "orbit" is faked by rotating the seam (`rot[1] += 0.21 rad` across the shot) and swinging the key-light vector from [−0.6,−0.7] to [−0.45,−0.8]. Handheld drift `noise1(gt*0.7, 2)` 2 px, roll ±0.3°. Scene-local speed ramp: real time runs at 0.5× (toss) and the last 12 frames before contact at 0.15×.

**Hero.** The ball at the apex of the toss, then the racket arriving at speed from the right and detonating it at f156.

**Beat-by-beat.**
- f84–f92: emerges from the whiteout; the frame is bleached Flare Ice → settles.
- Ball: `drawBall` r 170→190, `fuzz 1`, `rim 0.85` (rim light Hawk-Cyan-tinted: draw a second rim pass with `colors.hi` = Flare Ice at α .4), key light upper-left; 220 extra silhouette fibres are what `drawBall` already draws at r > 60 (its `macro` branch). Add a 6 px outer glow halo (`glowDot` r 260, Optic Yellow, α .15, 'lighter') behind it. Motion: rises 30 px with outCubic f84–f114, hangs f114–f126 (apex suspension), begins to fall with inQuad f126–f156 (back to y = 500 at contact).
- f138 (2.300) **racket enters** from the right edge: `drawRacket` scale 2.2 (head ≈ 750 px tall), face turned 30° toward camera via `ctx.scale(0.5, 1)` about the head centre so the string bed reads as a tall ellipse, handle pointing down-right (angle +0.25 rad), colours `{frame:'#15181D', frame2:'#2A3038', accent:PAL.ball, string:'rgba(240,244,250,0.85)'}`. Head centre travels from (2300, 640) to (1180, 520) along a circular arc (centre (1600, 2400), i.e. a swing) with inCubic so it accelerates into the ball; the face plane reaches the ball's right limb at x = 1000 exactly at f156. Motion blur: 6 sub-steps along the arc per frame at α 1/6 (the `--shutter 4` accumulation adds the rest).
- f146–f156: the fibres on the ball's right limb lean 15° toward the approaching face (40 extra 2 px Felt Highlight strokes on the right 60° of the silhouette, angle biased toward +x, α .5).
- f156 (2.600) **CONTACT** = the cut and the first frame of T2 (see transition). S2 keeps rendering as the outgoing layer through f167.

**FX layers.** Background: upper stadium bowl at night, `bgGradient(PAL.navy, PAL.bg, {cx:1300, cy:300, r:1400})`; roof edge as a soft dark band at y 180–260; 40 hexagonal bokeh discs (18–30 px, Flare Ice / Floodlight-warm `#FFE7B0`, 'lighter', soft 3 px edge, 1 px cyan fringe) pre-rendered once to a 1/3-res scratch with `filter blur(22px)` and drifting at 0.3× parallax. 30 lens motes. Heartbeat vignette tightenings via `postAt` at f96, f114, f132.

**On-screen text.**
- Ghost wordmark `MATCH POINT` — Bebas Neue 320 px, Line White at 10 % alpha, spacing −3 px, centred x = 960, baseline y = 660, behind the ball. Reveal f90–f108: `kinetic` with `ANIM.riseMask`, `stagger 1/60`, `dur 0.25`. Render the wordmark to a 1/2-res scratch, `blur(2px)` once, composite at α .10 ('screen'). It stays until the shockwave ring wipes it.
- Lower-left chip at x = 96: f96–f104 a 3 px Optic Yellow vertical rule grows 0 → 84 px tall from y = 836; f98–f110 `FIRST SERVE` Barlow Condensed SemiBold 34 px, spacing 0.08 em, Line White, slides in 30 px from the left (outCubic) to (116, 860); f104–f116 `FINAL · FIFTH SET · 5–4 · AD–40` Space Mono Regular 22 px, Steel Blue, alpha in, at (116, 896). (Server listed first: AD–40 at 5–4 in the fifth is the server's match point.)
- Out: on contact (f156) every UI element gets a 2-frame 10 px RGB split jolt, then the chip hard-cuts at f158; the ghost wordmark stays in the outgoing layer and is wiped by the ring.

**TRANSITION OUT → T2 STRING-BED SHOCKWAVE IRIS · f156–f167 (2.600–2.783) · 12 frames · the cut is the strike.**
New `TN.TRANSITIONS.shockIris(ctx, A, B, p, {cx:1000, cy:520, rMax:1400, zoom:0.06, echo:true})` over `[156/60, 168/60)`:
1. Ring radius `r = E.outCubic(p) · 1400` px from the contact point (1000, 520). The ring crosses frame centre at f161 and clears the corners at f167; at f168 S3 owns the frame.
2. OUTSIDE the ring: A (S2's outgoing frame) under `radialZoomBlur(ctx, A, cx, cy, 0.06·sin(pπ), 8, 1)`; on f156–f157 a 2-frame full-frame white flash (α .70 then .35) is drawn by S2 itself; a 2-frame 10 px RGB split at f157–f158 (`chromaticAberration(…, 10)` in `postAt`).
3. INSIDE the ring: `ctx.arc(cx,cy,r) → clip → drawImage(B)`; S3 renders from its own clock (its launch frame at f156), its ball emerging within 250 px of the ring centre.
4. The ring: stroke width 14 → 3 px, `#FFFFFF` core, Optic Yellow `shadowBlur 30` ('screen' over the white flash frames, 'lighter' afterwards). An echo ring 3 frames behind (`E.outCubic(p − 0.25)·1400`, 3 px, α .5).
S2's outgoing animation during the window (cinematic's contact grafted in): f156–f160 the ball compresses 0 → 0.38 along the contact normal (horizontal, `squashAngle 0`) **with its contact side clipped flat against the string plane** (clip rect x ≤ 1000 in the racket's frame) so it reads as a D, not an ellipse; `drawRacket deform` 0 → 1.0 at `(hitX −0.75, hitY 0)` in sync, relaxing over f160–f167 with two damped oscillations (`cos(2π·11·dt)·e^(−dt/0.12)`); the 6 strings nearest contact redrawn 'screen' Flare Ice α .8 → 0. f158–f167: the ball releases toward the left/camera as a streak (`drawBallBlurred`, 12 ghosts, Optic Yellow 'lighter' streak α .35) while the whole outgoing layer pans 0 → −80 px after it with inQuad and fails to keep it. 90 felt-fibre `burst` particles (shape 'streak', colours [ballHi, white, ballMid], speed 400–1,400 px/s, drag 1.2, life 0.3–0.6 s, size 1–3, `angle` = contact normal, spread ±60°) from (1000, 520). Overlap frames f156–f167 belong to both shots: S2 outside the ring, S3 inside. Letterbox lifts 1 → 0 over f156–f168 (post). Sound: the STRIKE stack plus a 600 → 80 Hz downward sweep riding the ring; the tension riser was hard-ducked to silence at 2.550.

---

### S3 — FLIGHT · FREEZE · SWOOP · f156–f305 (2.600–5.083) · `scene3` · local t = gt − 2.600

**Physics (real time, remapped).** Launch `p0 = [0.35, −11.70, 2.90]`, landing `p1 = [1.45, 6.4555, 0]` (the ball centre at first contact: the mark's near edge at y = 6.422 is 3 mm inside the service line's outer edge y = 6.425; `ballR` 0.0335 → centre 6.4555). Real flight `T_f = 0.38 s`, `v0 = solveVelocity(p0, p1, 0.38)` = (2.89, 47.78, −5.77) m/s. Net crossing at τ = 0.245 s, z = 1.19 m → **clearance 28 cm** over the 0.914 m tape. Film progress `p = (gt − 2.600) / 1.95`; real time `τ = T_f · R(p)` with **`R(p) = 0.25p + 0.75p²`** (0.05× real time out of the strike, 0.34× at the bounce). `pos(gt) = ballistic(p0, v0, τ)`; `pathFn(u) = ballistic(p0, v0, u·T_f)`. Bounce at **f273 (4.550)**. Mark direction `dir = normalize(v0.xy)` (3.5° off +y); `bounceMark(ctx, cam, 1.45, 6.482, dirX, dirY, {length:0.12, width:0.07})` — mark centre 6.482 so its near edge sits at 6.422. The radar figure `211 KM/H` is the standard off-the-racket number and is not required to equal the parabola's mean speed.

**Camera.** `Camera.orbit(target, az, el, dist, fov)` with every parameter an inOutSine lerp across f156–f273: target = `pos(gt − 0.08) + [0, 1.2, −0.25]` (analytic lag: a point just ahead of and below the lagged ball); az **+0.35 → +1.05 rad**, el **0.12 → 0.55 rad**, dist **3.0 → 9.0 m**, fov **50 → 40°**, roll 0 → −3° (banking). The camera starts 3 m behind-right of the ball at launch (ball ≈ (900, 460) on screen, r ≈ 55 px) and swings outward to a three-quarter sideline position above the right doubles alley by the bounce (eye ≈ [8.1, 2.6, 4.7], the far service box, service line, singles sideline and net all in frame). Composition checkpoints to verify on a contact sheet: f160 ball within 250 px of (1000, 520); f200, f247, f273 ball inside x 500–1,250 / y 300–620; the net tape visible at f247. Fallback: keyframe az/el/dist/target at those four frames and interpolate. Motion blur comes from `--shutter 4`; the camera-locked ball stays sharp while court and stands streak.

**Hero.** The ball in flight inside its trajectory tube, from strike to the bounce on the service line; then the frozen bounce and the swoop.

**Beat-by-beat.**
- f156–f172: emerging from the shockwave; court lines begin to streak; trajectory tube starts at the strike point.
- f168–f216 (2.800–3.600): **speed counter** 0 → 211 (outQuart) with a tick every 2 frames; settles with a 2-frame 1.05 scale pop and underline.
- ≈f247 (4.117, τ = 0.245 s; compute the exact frame from R⁻¹): **net crossing**: the net plane lights up as a translucent Hawk Cyan sheet for 3 frames (`fillPoly3` of [−6.4,0,0]→[6.4,0,0]→[6.4,0,0.914]→[−6.4,0,0.914], 'lighter', α .35), the tape gets a travelling specular, `drawNet meshAlpha` .35 → .7 for 10 frames; `NET CLEARANCE 28 CM` callout attaches to the ball f247–f265.
- f255–f273: `SPIN 2,150 RPM` readout; the seam spins at 1,200°/s **real** (so 36–400°/s film), rendered at 3 sub-rotations per frame at α 1/3 to avoid strobing.
- f258–f273: faint radial zoom blur (4 samples, 1.00 → 1.02) and aberration 2 → 4 px for speed; the court rushes up.
- f273 (4.550) **BOUNCE**: `squash 0.40` for 2 frames; 120 chalk particles via a local `burst3D` (world-space analytic burst: speed 1–4 m/s in a 40° forward cone, gravity 9.81·0.34² film-scaled, drag 2.5, life 0.5 s, Line White / Flare Ice, 2–4 px when projected); ground shock ring (`shockRing` at the projected contact point, r 0 → 2.5 m·scale over 12 frames, width 18 → 2, Line White, `squashY = |cam.f[2]|`); the mark stamps with a 2-frame `shadowBlur 40` bloom; the ping starts.
- f274 (4.567) **FREEZE**: the ball clock clamps (`ttBall = min(gt, 274/60)`: it holds in its squash pose on the line); dust and ring clamp three frames later (`ttFx = min(gt, 277/60)`) so the puff has visible spread. Nothing physical moves again until S4's time-resume.
- f273–f297 (4.550–4.950) **THE PING** (the only thing alive in the frozen world): a wavefront `r(gt) = 24 m/s · (gt − 4.550)` expands across the court plane from the mark; every line point whose planar distance to the mark lies within a gaussian band (σ 0.35 m) of r brightens additively Optic Yellow → Line White up to 3× core alpha with `shadowBlur 24`. Implement with a local `linePing(ctx, cam, centre, r)` that subdivides each `courtLines()` segment into 0.25 m pieces and `fillPoly3`s each piece at its own alpha ('screen' over the white lines). It runs along the service line, forks at the centre service line (1.45 m) and the singles sideline (2.67 m), reaches the far baseline (5.43 m) at f287 and the net (6.46 m) at f289, and has died out by f297.
- f276–f299 (4.600–4.983) **THE SWOOP**: `Camera.orbit(mark, az, el, dist, fov)` with inOutCubic over 24 frames: az 1.05 → 0, el 0.55 → **1.5184 rad (87°, never higher)**, dist 9 → 7 m, fov 40 → 30°. The camera arcs 60° around the frozen bounce and up until it looks almost straight down at the mark, which stays pinned at frame centre (960, 540). Simultaneously `hawkMode h = smoothstep(280/60, 297/60, gt)` re-skins the world (see FX). The trajectory tube persists throughout as the one unchanged element and ends at the mark.
- f300–f305: hold the final camera (el 87°, fov 30, dist 7: scale 288 px/m at the mark, x right, +y up) under the scan band.

**FX layers.**
- Trajectory tube: `drawTrajectory(ctx, cam, pathFn, {progress:u_now, width:10, glow:24, color:PAL.ball})` plus a 2 px Line White centre line (second call, width 2, glow 0); ground shadow trace `drawTrajectory` on `u → [x,y,0]` (width 3, black α .35, no glow) with a 1 px dashed Hawk Cyan overlay (`dash:[6,6]`); `drawHeightTicks(every 8)` (one dropline per 0.05 s of real flight) Hawk Cyan α .45; a translucent wall ribbon between path and shadow (`fillPoly3` quads, 'lighter', α .08 → 0). 12 Felt Highlight fibre particles per frame shed behind the ball (`burst` with window = frame). Ghost-ball strobe: a frozen 25 %-alpha `drawBall(detail:false)` copy every 8 film frames, fading to 10 % over 1 s.
- Stadium: the four stand quads from S1 with 2,400 specks (same seeded array), 1.5 % flashing; rigs R1–R4 at their world positions via `lensFlare(intensity 0.5–0.7)` + `lightStreak` (their streaks smear under the shutter as the camera rushes); haze: `courtDeep` toward the far end via a `bgGradient`-style overlay.
- Court: `drawSurface({court:PAL.court, apron:PAL.apron, light:.3, lightAt: nearest rig ground point})`, `drawLines({color:PAL.line})`, `drawNet()`.
- hawkMode h (0 → 1 during the swoop): `drawSurface({court: lerpColor(PAL.court, PAL.navy, h), apron: lerpColor(PAL.apron, PAL.bg, h), light: .3·(1−h)})`; `drawLines({color: lerpColor(PAL.line, PAL.ice, h), glow: 12·h})`; `drawNet({alpha: 1−.4h, meshAlpha: .35+.3h, color: lerpColor(PAL.net, PAL.accent2, h)})`; stands, rigs and haze at α (1−h); background → Stadium Black; a 1 m Hawk Cyan grid over the court (projected lines, 1 px, α .2·h); the felt ball cross-fades (α 1−h) to the **review ball**: 1.5 px Line White ring + 12 % Optic Yellow fill + 8 px Hawk Cyan centre cross (α h); the frozen dust lerps white → cyan and shrinks to 1 px.
- Post: bloom .5 from f258; aberration 2 → 4 px f258–f273, 4 px f273–f276.

**On-screen text.**
- Header `ELECTRONIC LINE CALLING` — Barlow Condensed SemiBold 26 px, spacing 0.22 em, Steel Blue α .7, at (96, 92), clip-wipes in f168–f176; persists through S4.
- Speed readout, top-left, baseline y = 300: `211` Oswald 700 180 px Line White in fixed digit cells counting 0 → 211 over f168–f216 (outQuart) with a ±3 px RGB split while counting; `KM/H` Barlow Condensed SemiBold 40 px Steel Blue, spacing 0.08 em, baseline-aligned at the right of the numerals; a 2 px Optic Yellow underline grows with the count. 2-frame 1.05 pop at f216.
- `NET CLEARANCE 28 CM` — Space Mono Bold 22 px Hawk Cyan in a 1 px Hawk Cyan box on Hawk Navy 70 %, attached to the ball by a 1 px leader with a 4 px end dot; box scales from 0 width over 4 frames at f247, collapses over 4 frames at f261–f265.
- `SPIN 2,150 RPM` — Space Mono Regular 22 px Hawk Cyan under the speed readout at y = 350 with a 16 px rotating seam icon; digits `rollingNumber` over 6 frames from f255.
- Bottom-right (right-aligned 1824, 1000): `T+0.000 S` → `T+0.380 S` Space Mono Regular 22 px Steel Blue running real flight time τ, freezing in Optic Yellow at f273; beneath (y 1028) `REPLAY` Barlow Condensed SemiBold 22 px spacing 0.2 em Hawk Cyan.
- Out: at f273 every UI element except the header is sliced into 6 horizontal bands offset ±12 px alternately and fades over 8 frames (f273–f280).

**TRANSITION OUT → T3 SCAN-BAND WIPE · f300–f311 (5.000–5.183) · 12 frames · cut at f306 (5.100).**
New `TN.TRANSITIONS.scanWipe(ctx, A, B, p, {color:PAL.accent2, bandW:4, tail:60})` over `[300/60, 312/60)`: band front `y = E.inOutQuad(p)·(1080 + 120) − 60`; draw A full; clip `rect(0, 0, 1920, y)` and draw B (the orthographic S4 view, scale-matched to S3's final camera so the handoff is continuous); above the front a 60 px gradient tail (Hawk Cyan α .35 → 0, 'lighter'); the band itself a 4 px Hawk Cyan line with `shadowBlur 24` and a 2-frame 1 px white core; the 1 m grid in S4 lights up in the band's wake (S4 draws its grid at α `clamp((y − gy)/60)` per row behind the front). Overlap frames f300–f305 belong to S3 below the band and S4 above it; f306–f311 the reverse proportion. Sound: 12 data-chatter clicks following the band plus a descending 2 kHz → 200 Hz sweep.

---

### S4 — THE VERDICT · f306–f437 (5.100–7.283) · `scene4` · local t = gt − 5.100

**Camera.** Orthographic top-down 2D. Use a **reflected map** (not `topDown`, which cannot flip y): `M = { ppm: s, to: (x, y) => ({ x: P.x + (x − 1.45)·s, y: P.y − (y − 6.425)·s }) }` so +x is screen-right and +y (down the court) is screen-up, matching S3's final frame; pass `M` to `drawLines2D` / `courtRect2D` (they only use `map.to` and `map.ppm`). `P` is the screen position of the world point (1.45, 6.425) (the overlap point on the line's outer edge) and `s` is px per metre; both animate:

| Frames | s (px/m) | P | Note |
|---|---|---|---|
| f300–f311 | 288 | (960, 556) | matches S3's final camera; revealed under the scan band |
| f312–f354 (5.200–5.900) | 288 → 3,600: `s = 288 · 12.5^(E.inOutQuart(u))` | (960,556) → (960,620) inOutSine | THE DIVE (12.5×) |
| f354–f369 | 3,600 | (960, 620) | bracket, breath |
| f370–f375 (6.167–6.250) | 3,600 → 900 (outExpo) | → (1220, 700) | SNAP-BACK |
| f376–f407 | 900 → 909 (1 %/s push-in) | (1220, 700) | IN hold |
| f408–f437 | 900 | tracks the ball: P follows the ball's world x,y so the ball stays put while the court streaks down-screen | time resumes, ball at lens |

No handheld drift (a machine's view); 4 px shake for 3 frames at f372.

**Hero.** The ball-mark against the service line's outer edge — a 3 mm overlap rendered as a glowing blade — then IN. with the mark as the full stop; then the ball un-freezing and rocketing at the lens.

**Beat-by-beat.**
- f300–f311: revealed by the scan band at s = 288: the right far service box fills the frame (centre service line at screen x ≈ 542, singles sideline ≈ 1,727, service line horizontal at y = 556), Hawk Navy court, Stadium Black apron, Flare Ice lines at true width (5.08 cm·s, min 2 px) with `glow 12`, 1 m Hawk Cyan grid α .2 lighting row by row behind the band, the last 1.5 m of the trajectory tube entering from below and ending at the mark, the frozen cyan dust points, the review ball ring (r 9.6 px) on the mark, the ping's last glow fading along the lines (α .6 → 0 over f300–f310).
- f312 (5.200) **MARK RECORDED**: the mark re-stamps for the record — its Hawk Cyan 2 px outline draws clockwise from 12 o'clock over 8 frames (dashed → solid), the fill pulses scale 1.3 → 1.0 (outBack) with a 2-frame `shadowBlur 40` bloom, a 1 px optic ripple ring r 0 → 60 px α .5 → 0; the bottom-left `REVIEW` tag starts blinking; the data strip rolls in.
- f312–f354 **THE DIVE**: the service line grows from a 15 px rule to a **180 px white band**; the mark to 432 × 252 px; the ball ring (r 120 px) fades α .6 → .2 once s > 1,200 so the mark reads; the 1 m grid fades out as s passes 1,500 (≈f340) and a **1 cm fine grid** (Hawk Cyan α .06) fades in. From f330 the **OVERLAP SLIVER** layer is on: clip to the mark ellipse, fill the region inside the line band (`y_world ∈ [6.375, 6.425]`) with `#FFFFFF` 'lighter', pulsing α .5 ↔ 1.0 at 3 Hz — at full zoom the 3 mm is **10.8 px** of white-hot blade along the mark's near edge. `ZOOM ×01.0 → ×12.5` reads live bottom-right.
- f354–f366 (5.900–6.100) **DIMENSION BRACKET**: two 1 px Hawk Cyan rules — one on the line's outer edge (y = 6.425), one tangent to the mark's near edge (y = 6.422), 10.8 px apart — extend 260 px right of the mark with 10 px end caps and a 12 px bracket between them; a 1 px leader to the label `3 MM`; edge labels appear.
- f366–f369 (6.100–6.167) **THE BREATH**: every pulse freezes (sliver holds full white, REVIEW tag holds on, grid static), the mix ducks to −45 dB. Four frames of nothing.
- f370–f375 **SNAP-BACK**: s 3,600 → 900, P → (1220, 700) with outExpo; the bracket collapses in 3 frames; the mark is now 63 × 108 px standing on a 45 px white service-line band at y = 700. 
- f372 (6.200) **IN.**: `IN` slams (scale 1.6 → 1.0 over 6 frames with `E.slam`, alpha 0 → 1 over 2 frames) **right-aligned so the ball-mark is its full stop** (right edge of the N 40 px left of the mark's left extreme; the IN + mark group centred on x ≈ 960), **baseline exactly on the service line's outer edge** (screen y = 700); the mark, like a real period, overshoots the baseline — by 3 mm. 2-frame white flash α .30/.15; `shockRing` from the mark r 0 → 900 px over 12 frames (Line White → Optic Yellow, width 24 → 2); 40 chalk flecks `burst` from the sliver; 4 px shake 3 frames; mark fill flashes Felt Highlight for 2 frames; bloom .5; exposure +4 % for 8 frames with the roar. The `REVIEW` tag becomes `DECISION` in Hawk Cyan with Stadium-Black type (the only moment the red leaves the frame).
- f378–f384: `CALL CONFIRMED · MARGIN 3 MM` clip-wipes in above IN.
- f372–f407: hold under the 1 %/s push-in; the mark's outer glow pulses (Optic Yellow `shadowBlur 20`, α .3 ↔ .5 at 1 Hz).
- f408 (6.800) **TIME RESUMES**: `hawkMode` 1 → 0 over f408–f413 (court → Court Royal with a floodlit pool, lines → Line White, grids and scanlines vanish, apron → Apron Navy); IN scales 1.0 → 1.06 and fades over 6 frames; data strip, header and tags hard-cut; the frozen chalk dust resumes falling and dispersing (`ttFx` released: age continues from 4.617 + (gt − 6.800)); the review ring becomes the felt ball (`drawBall` r 30, `light [0,−1]` straight down from the lens rig).
- f414–f437 (6.900–7.283) **BALL AT LENS**: the ball rebounds straight up at the camera: diameter `d = 60 + 3140·q^3.2` px with `q = prog(gt, 414/60, 437/60)`, centre drifting (1220, 700) → (960, 540) with inQuad; beneath it the court streaks down-screen (`directionalBlur` on the court layer 0 → 120 px per frame along +y screen, i.e. the camera tracking the ball forward) and darkens; vignette 0.35 → 0.60; the last 6 frames add `blur(0 → 6px)` on everything except the ball; `drawBall` for d < 1,200 px, then the **felt texture** (see §7) clipped to the disc, scaled and rotating 4°/s, with the seam groove sweeping across the frame as a 160 px wide curved Felt Core band with a Line White highlight edge in the last 6 frames. **f437: the frame is 100 % felt.**
- f438–f449 (past the scene's end, under T4): S4 renders Stadium Black with the ball (felt texture inside its silhouette, 2 px Flare Ice rim) at the exact centre/radius T4 publishes (`TN.S4S5.ball(gt)` → `{x, y, r}`), so the composited circle is always full.

**FX layers.** Review mode: Hawk Navy court, Stadium Black apron, Flare Ice lines with 'screen' glow 12, 1 m / 1 cm Hawk Cyan grids, scanlines (`scanlines(0.04, 4)`) removed at the un-freeze, a soft Hawk Cyan radial pool under the mark (α .12), IN drop shadow, frozen dust points, ping afterglow; photoreal mode from f408: Court Royal with `drawSurface light .3`, Line White lines, falling chalk, floodlit specular; the lens-rush zoom/directional blur. Post per §3.

**On-screen text.**
- Header `ELECTRONIC LINE CALLING` persists at (96, 92) (Barlow Condensed SemiBold 26 px, spacing .22 em, Steel Blue α .7).
- (96, 126) from f312: `LINE REVIEW · FIRST SERVE · SERVICE LINE` — Space Mono Regular 22 px Steel Blue.
- Data strip, top-left from y = 170, rows 30 px apart, rows appearing 2 frames apart f318–f330 with 6-frame odometer rolls, Space Mono Regular 22 px Hawk Cyan, spacing .1 em: `SERVE          211 KM/H` · `NET CLEARANCE   28 CM` · `BALL MARK   65 × 120 MM`.
- Bottom-right (right-aligned 1824, 1000): `ZOOM ×01.0` → `×12.5` Space Mono Regular 22 px Hawk Cyan (value s/288), freezing at f354, `×03.1` after the snap-back; hard-cut at f408.
- Edge labels f354–f369: `SERVICE LINE · OUTER EDGE` Space Mono Regular 22 px Steel Blue α .8 just right of the band's outer edge; `BALL MARK` above the mark.
- `3 MM` — Space Mono Bold 44 px Line White at the bracket's right end (x ≈ 1,300, y = 606), digits roll 6 frames f358–f364 ending on a 2,093 Hz tick; collapses with the bracket at f370.
- `IN` — Anton 560 px Optic Yellow, spacing −20 px, baseline y = 700, right-aligned to (mark.left − 40); in f372–f378 as above; out f408–f413 (scale 1.06 + fade).
- `CALL CONFIRMED · MARGIN 3 MM` — Barlow Condensed SemiBold 28 px, spacing .28 em, Hawk Cyan, centred above IN at (960, 260), 6-frame left → right clip wipe with a 260 px cyan rule drawing beneath, f378–f384; out f408.
- Bottom-left (96, 1000): Live Red rounded tag 110 × 30 px with `REVIEW` Barlow Condensed SemiBold 22 px Line White, spacing .2 em, blinking 2 Hz from f312; becomes Hawk Cyan `DECISION` (Stadium Black type) at f372; out f408.

**TRANSITION OUT → T4 BALL-FILLS-LENS WIPE · f414–f449 (6.900–7.483) · 36 frames · cut at f438 (7.300).**
Part A (in-scene S4, f414–f437): the rebounding ball flies into the lens until the frame is solid felt at f437 (see beat). Part B (timeline, f438–f449, new `TN.TRANSITIONS.irisTravel(ctx, A, B, p, {x0:960, y0:540, r0:1800, r1:22, to: TN.S4S5.periodDrop})` over `[438/60, 450/60)`): draw B (S5's dark end card) full-frame; `e = E.inOutCubic(p)`, centre `lerp((960,540), periodDrop, e)`, radius `r = 1800 · (22/1800)^e` (exponential shrink: r = 199 px at p = .5); clip the circle and draw A (S4 past its end rendering exactly that ball), then stroke a 2 px Optic Yellow ring with `shadowBlur 30` at α .8 → .3 tracing the shrinking edge. At p = 1 the circle IS a 44 px shaded ball with a 2 px Flare Ice rim at `periodDrop` = the period position 60 px above its resting place (computed by S5 from `measureText`, ≈ (1640, 518)). A 2-frame 15 % darken "thump" at f438–f439 on the felt. Overlap frames f438–f449 belong to both shots: S4 inside the circle, S5 outside. Sound: Doppler whoosh rising into a muffled thump at 7.300 (one frame of the whole mix low-passed to 400 Hz), then a reversed whoosh as the circle shrinks.

---

### S5 — GAME. SET. MATCH · f438–f599 (7.300–9.983) · `scene5` · local t = gt − 7.300

**Camera.** Locked 2D title card, straight on. A dark floor plane occupies the bottom 38 % (horizon y = 670) with a Court Royal → Stadium Black gradient and faint perspective court lines at α .15 (`Camera.set([0,−9,1.4],[0,4,0],36)` for the lines, drawn once per frame). 1 px slow drift at 0.2 Hz. Optional polish (implement last): a floor reflection — draw the type+ball layer flipped below y = 670 at α .25 through a `blur(6px)` 1/3-res pass with a 200 px vertical fade.

**Hero.** The end card GAME. SET. MATCH with the real ball as the final period, lit by the same four floodlights that opened the film, which then shut down.

**Beat-by-beat.**
- f438–f449: revealed outside the shrinking felt circle: Stadium Black void; four rig glow points at the top edge (x = 320, 760, 1160, 1600; y = 40) each with a faint `lightStreak` and a soft `lightCone` (α .06) falling onto the floor; 40 motes in the cones.
- f450 (7.500): the 44 px ball (`drawBall` r 22, key from above, rim .5) is at `periodDrop` (≈ (1640, 518)) and falls 60 px with inQuad f450–f455; **first contact f456 (7.600)** on the baseline y = 600 with squash .22 (`squashAngle π/2`), apex 36 px at f462, **second contact f468 (7.800)**, apex 10 px, **settles f472 (7.867)** as the period. Each contact spawns 12 Line White dust specks on the floor and a 10-frame floor shock ellipse (`shockRing squashY .25`).
- f474 (7.900) **`GAME.`** slams; 6 px shake 2 frames; 40-particle floor dust puff at its foot; the ball hops 10 px with squash.
- f492 (8.200) **`SET.`** slams, same recipe.
- f510 (8.500) **`MATCH`** slams (the biggest hit); the ball hops 24 px and lands at f516 (8.600), settling for good.
- f522–f556 (8.700–9.267): **specular sweep** across the glyphs left → right: text drawn to an offscreen, a diagonal Flare Ice band 240 px wide composited with `source-in`, then 'screen' onto the frame; it crosses the ball as a rim-light flash when it passes (f548–f552).
- f534–f546 (8.900–9.100): sub-line rule and tagline.
- f546–f590: hold; the seam rotates 10°/s; the rigs flicker ±2 % at 50 Hz (imperceptible, alive); vignette 0.45 → 0.60.
- f591–f599: shutdown (see T5).

**FX layers.** Rig cones + streaks, floor gradient and perspective lines, soft Flare Ice key on the type (glyph fill = vertical gradient Line White → `#D6DCE8` plus a 1 px Flare Ice top edge via a second offset text pass), per-slam floor shock ring + 40 floor-dust `burst` particles (gravity 900, 'screen'), ball shadow ellipse (150 × 14 px, Ink, α .5) on the baseline, specular sweep, 40 motes. No bloom (post). Aberration spikes 3 px for 2 frames on each slam (post).

**On-screen text.**
- End card line, centred x = 960, baseline y = 600: `GAME.` `SET.` `MATCH` — Bebas Neue 220 px, spacing 4 px, fill gradient Line White → `#D6DCE8` with a 1 px Flare Ice top edge. Lay out the three words plus two spaces plus a 37 px gap plus the 44 px ball with `TN.measure`, scale the whole unit down if it exceeds 1,500 px, and centre it. The typographic periods after GAME and SET are glyphs; **the period after MATCH is the ball** (centre ≈ (1640, 578) at rest; publish as `TN.S4S5.period`, with `periodDrop` = 60 px above it). In: each word slams independently — scale 1.6 → 1.0 (inCubic over 5 frames) with a 2-frame 0.97 undershoot, alpha 0 at 1.6 → 1 by the second frame — `GAME.` f474–f479, `SET.` f492–f497, `MATCH` f510–f515. Out: the words dim with the rig shutdowns (fill → `#1A2240`) and go black at f599.
- Sub-line f534–f546: a 2 px Optic Yellow rule grows from the centre outward to 420 px at y = 680; beneath at y = 722 `EVERY MILLIMETRE COUNTS` — Space Mono Regular 24 px, spacing 0.3 em, Steel Blue, alpha in with a 10 px rise (outCubic). Hard-cut at f597.

**TRANSITION OUT → T5 FLOODLIGHT SHUTDOWN TO BLACK · f591–f599 (9.850–9.983) · 9 frames · the bookend to the opening ignition (in-scene; no next shot).**
f591 (9.850): rigs 1 + 2 (outer pair) cut to black in one frame after a 1-frame 2 % flicker; their cones and streaks vanish; the type fill lerps 50 % toward `#1A2240` over 3 frames; the floor reflection (if built) halves; a relay clunk. f594 (9.900): rigs 3 + 4 cut; type fill reaches `#1A2240`; reflection gone; the floor gradient drops to Stadium Black; crowd bed −12 dB. f597 (9.950): the rule and sub-line hard-cut. f597–f598: the only light left is the ball's own Optic Yellow self-glow (`glowDot` r 90, α .6 → .2) and a faint `#1A2240` silhouette of the words. **f599 (9.983): pure black** (`fillRect '#000'` after the post stack — the scene returns a flag via `TN.S5.black = true` that `postAt` honours by setting grain 0 and vignette 0 on this frame); all audio tails cut by a 16 ms fade.

---

## 5. Signature moment and how to make it land

**THE FROZEN BOUNCE — ping, swoop, blade, breath, IN. (f273–f378, 4.550–6.300).** The ball slams into the service line at replay speed and chalk erupts. On the next frame time stops dead: the ball holds its squash on the line, the dust hangs mid-air, the ground ring halts half-expanded. The only thing still alive is a pulse of light that leaves the mark and runs through the court's own lines — along the service line, forking at the centre line and the sideline, racing down the baseline — the court registering the ball like a circuit. While it travels, the camera swings 60° around the frozen bounce and up until it looks almost straight down, and the floodlit royal-blue world drains into a line-calling render under its lights: navy court, ice-white lines, a cyan grid, the felt ball becoming a ring, the dust becoming cyan data points — with the optic-yellow trajectory tube the one thing that never changes. A scan band sweeps the frame; the view dives 12.5× onto a single service line until the 3 mm sliver where the mark kisses the line ignites white-hot; a bracket measures it: 3 MM. Four frames of silence. Then the frame pulls back in six frames and IN stands on the service line as its baseline with the ball-mark as its full stop, overshooting the line by exactly those three millimetres, and the crowd roars.

How to make it land:
1. **Freeze by clamping clocks, nothing else.** `ttBall = min(gt, 274/60)`, `ttFx = min(gt, 277/60)`; every physical element reads a clamped clock, every data element (ping, camera, hawkMode, scan) reads `gt`. Deterministic and free.
2. **Let the ping be the only motion in the frozen frame** for its first 3 frames (f274–f276) before the camera starts moving at f276; the eye must register "stopped" before "swooping".
3. **The swoop is one `Camera.orbit` lerp**; the mark pinned at frame centre is what makes it read as a camera move rather than a cut. Stop at 87°. Verify f280, f288, f296 on a contact sheet: the far baseline must stay in frame through f288.
4. **The tube is the continuity element**: identical colour, width and glow before, during and after the re-skin and across the scan-band handoff.
5. **The sliver must be ≥ 10 px and pure white 'lighter' at 3 Hz**; if the review reads weak, push the dive to s = 4,500 (13.5 px) and let the mark crop.
6. **The breath is audio-visual**: at f366 freeze the pulse phases (pass a clamped clock to the sliver, tag and grid) and duck the entire mix to −45 dB with a 30 ms fade. Four frames of still white on a navy field. Do not cheat it to two.
7. **The IN lock is geometric, not eyeballed**: `baseline = M.to(_, 6.425).y`; `right edge of N = M.to(1.45, _).x − mark.halfWidth − 40`; `IN` is `text(align:'right')`. The mark is drawn after the type.
8. **Two frames for the IN flash, 30 % then 15 %**; the loudness jump (−45 dB → −1 dBFS) does more than any brighter frame.

Runner-up for the reel: the ball flying into the lens and shrinking back to become the full stop of MATCH (f414–f472).

---

## 6. Sound cue list

Mix at 48 kHz, stereo, synthesized in `tools/audio.py` (numpy). Levels are peak dBFS targets inside the mix; the master normalises to −1 dBFS with the STRIKE (2.600) and IN (6.200) as the two loudest events. All onsets are at exact frame times. New instruments required (see §7): `hum`, `fmping`, `karplus`, `heartbeat`, `clunk`, `comb`, plus `duck` and `lpf` automation cues and a `fade_out` parameter on `master()`.

| t (s) | frame | Cue | Synthesis recipe | Level |
|---|---|---|---|---|
| 0.000 | f0 | Crowd murmur bed in | Pink noise through two bandpasses (300 Hz and 1.8 kHz, Q .8) with a 0.15 Hz gain LFO plus sparse formant blips (bandpass 300–900 Hz, Q 6, 60–120 ms, ~4/s); −30 dB rising to −18 dB by 1.2 s; runs under the whole piece with the automation below. (`crowd` + new formant blips) | −30 → −18 |
| 0.200 | f12 | Rig 1 ignition | 40 Hz sine thump 180 ms exp decay; 3 kHz bandpass noise tick 30 ms; sawtooth hum 120 Hz low-passed 600 Hz fading in over 300 ms and sustaining (`hum`). | −8 / hum −26 |
| 0.450 | f27 | Rig 2 ignition | Same stack; hum at 123 Hz so the two hums beat. | −8 / −26 |
| 0.667 | f40 | Title type-on ticks | 14 clicks at 1/60 s (f40–f53): 6 kHz sine, 4 ms, 1 ms attack (`tick`). | −22 |
| 0.700 | f42 | Rigs 3 + 4 ignition | Same stack doubled; hums at 118 and 125 Hz; thump at 42 Hz; combined hum bed −20 dB. | −6 / −20 |
| 1.250 | f75 | Lens-rig whiteout boom | 35 Hz sub sine 400 ms exp decay (`impact` sub layer); white noise bandpassed 8 kHz Q 1 "shh" 250 ms with 10 ms attack; ring-out of 220 + 330 Hz sines decaying 1.2 s at −18 dB. All hum layers cut at 1.400. | −4 |
| 1.400 | f84 | Tension riser | White noise through a resonant bandpass sweeping 200 Hz → 6 kHz with Q 2 → 12 plus a sine riser 110 → 440 Hz, −30 → −14 dB by 2.550; **hard-ducked to silence over 2.550–2.600** (`riser` + `duck`). | −30 → −14 |
| 1.600 / 1.900 / 2.200 | f96 / f114 / f132 | Heartbeat pulses | 45 Hz sine 90 ms with a softer second pulse 120 ms later (lub-dub) (`heartbeat`). | −10 |
| 1.633 | f98 | Lower-third whoosh | Noise bandpass 1 kHz 120 ms quick rise/fall plus a 5 kHz 4 ms tick (`whoosh` short). | −24 |
| 2.300 | f138 | Racket swing whoosh | Noise bandpass swept 400 → 2,000 Hz over 300 ms rising −30 → −10 dB, ending exactly at 2.600 (`whoosh dur .3 shape .9`). | −10 |
| 2.600 | f156 | **STRIKE** | 50 Hz sine 120 ms fast decay; 800 Hz bandpass "pock" Q 4, 40 ms; FM string ping carrier 1.8 kHz, ratio 2.1, index 3 → 0, 60 ms (`fmping`); 2 ms broadband click; crowd bed gasp (−12 dB over 30 ms, recovering). | **−1** |
| 2.600 | f156 | Shockwave ring sweep | Sine sweep 600 → 80 Hz over 350 ms with a comb tail (delays 11/17/23 ms, feedback .4) (`comb`). | −8 |
| 2.800 | f168 | Speed counter ticks | One click every 2 frames 2.800–3.600, 5 kHz 3 ms rising to 7 kHz; a 1,046 Hz 80 ms settle ping at 3.600. | −26 / −18 |
| 2.800 | f168 | Flight air-rush | Noise bandpassed 300 → 1,200 Hz, centre and level rising with the speed ramp −26 → −12 dB by 4.550, plus a thin whistle (2.4 kHz sine, ±30 Hz vibrato at 7 Hz) panning with the ball's screen x; crowd bed rises to −16 dB. | −26 → −12 |
| 4.117 | f247 | Net pass | Zip: sine 3 → 6 kHz 60 ms; cord thrum: 90 Hz damped Karplus-Strong pluck 150 ms (`karplus`). | −16 / −14 |
| 4.250 | f255 | Spin readout ticks | 6 clicks at 1/60 s, 4 kHz. | −26 |
| 4.550 | f273 | **BOUNCE** | 55 Hz sub 100 ms; 500 Hz bandpass "thwock" 50 ms; chalk hiss: noise high-passed 4 kHz, 300 ms decay at −18 dB (`bounce` + hiss). Air-rush cuts dead. | −3 |
| 4.550 | f273 | THE PING | Sine 1,047 Hz with FM shimmer (modulator 7 Hz, index .3) decaying 600 ms, stereo pan sweeping centre → wide as the light runs down the lines (`fmping`, `pan 0 → pan_to ±0.8` split L/R). | −12 |
| 4.550 | f273 | Crowd roar swell | Pink noise through parallel formants 500/1,200/2,500 Hz with slow random modulation, −16 → −8 dB over 1.65 s, peaking at the IN slam (`roar`). | −16 → −8 |
| 4.567 | f274 | Time-stop | Reversed cymbal: 400 ms noise swell with exponential rise ending at 5.000; filtered descending sweep 2 kHz → 200 Hz over 400 ms; the roar swell is **frozen** (level held, modulation stopped) 4.567–6.800. | −14 |
| 4.600 | f276 | Swoop air | Soft low-passed noise sweep 300 → 900 → 300 Hz over 400 ms, panned R → centre with the camera. | −26 |
| 5.000 | f300 | Scan-band data chatter | 12 clicks at 1/60 s with random pitch 3–7 kHz following the band top → bottom (pan 0). | −24 |
| 5.200 | f312 | Mark recorded stamp | 120 Hz sine 60 ms, 2 ms attack, plus a 2 kHz click; data strip: three rows of 6 odometer clicks staggered 2 frames. | −10 / −26 |
| 5.200 | f312 | Dive riser | FM tone 110 → 440 Hz with low-pass opening 600 Hz → 6 kHz over 5.200–5.900, −20 → −10 dB; heartbeat pulses at 1.2 Hz from 5.500 (`riser` + `heartbeat`). | −20 → −10 |
| 5.900 | f354 | Dimension bracket | 1.5 kHz sine sliding to 2.2 kHz over 160 ms; `3 MM` lock = two-sine chime 1,320 + 1,760 Hz, 120 ms at 6.067. | −28 / −22 |
| 6.100 | f366 | **THE BREATH** | Every layer (riser, heartbeat, frozen roar, crowd) ducks to −45 dB with a 30 ms fade for f366–f369 (`duck`). | −45 |
| 6.167 | f370 | Snap-back | Reversed whoosh 2 kHz → 300 Hz over 100 ms. | −16 |
| 6.200 | f372 | **IN SLAM** | 45 Hz sub 300 ms; broadband noise slam 2 ms attack 80 ms decay; bright ding 1,046 + 2,093 Hz decaying 500 ms at −12 dB; roar jumps +12 dB over 120 ms to −8 dB and holds; 8 random whistle sines 2–4 kHz over the next second (`impact` + `fmping` + `roar`). | **−1** |
| 6.300 | f378 | CALL CONFIRMED ticks | Two 4 ms ticks (bandpass 3 kHz) 100 ms apart plus a 1 → 3 kHz 100 ms swish for the clip wipe. | −22 |
| 6.800 | f408 | Time resumes | Whoosh: noise sweep 200 Hz → 4 kHz over 150 ms; the frozen roar resumes modulating and decays; dust-settle hiss (high-passed noise 300 ms). | −14 / −24 |
| 6.900 | f414 | Ball-at-lens Doppler | Noise bandpass 400 → 3,000 Hz over 400 ms with level ramping −16 → −4 dB, ending in a muffled thump at 7.300: 60 Hz sine 80 ms with **the entire mix low-passed to 400 Hz for one frame** (16 ms) (`whoosh` + `lpf`). | −4 |
| 7.317 | f439 | Felt pull-back | Reversed whoosh: noise 2 kHz → 300 Hz over 180 ms ending at 7.500. | −18 |
| 7.600 / 7.800 / 7.867 | f456 / f468 / f472 | Ball lands as the period | Pock: 55 Hz sine 60 ms + 900 Hz bandpass noise 30 ms (`bounce` small) at −10, −16, −22 dB. | −10 → −22 |
| 7.900 | f474 | GAME. slam | 50 Hz sub 250 ms; noise slam 2 ms attack 60 ms decay; metallic clank: FM carrier 300 Hz, ratio 1.4, index 4 → 0 over 120 ms at −12 dB (`impact` + `fmping`); ball-hop pock −20 dB. | −3 |
| 8.200 | f492 | SET. slam | Same stack, clank carrier 340 Hz. | −3 |
| 8.500 | f510 | MATCH slam (final sting) | Biggest hit: 42 Hz sub 400 ms; noise slam; clank carrier 380 Hz; sting tail: detuned pad 220/330/440 Hz ±4 cents swelling to −16 dB and decaying 1.2 s (`sting root 110`); ball double-hop pocks at 8.517 and 8.600. | −1.5 |
| 8.700 | f522 | Specular sweep shimmer | High-passed noise at 6 kHz, triangle envelope 600 ms, panned L → R with the sweep. | −24 |
| 8.900 | f534 | Sub-line rule | Noise bandpass 1.5 kHz 120 ms plus a 5 kHz tick; roar settles to −14 dB. | −26 |
| 9.850 | f591 | Rigs 1 + 2 shutdown | Clunk: 80 Hz sine 50 ms plus a 2 ms relay click (`clunk`); hum bed (re-introduced at −30 dB from 7.600) halves; crowd −6 dB. | −8 |
| 9.900 | f594 | Rigs 3 + 4 shutdown | Clunk at 75 Hz; hum bed cut; crowd fades to silence by 9.983. | −8 |
| 9.983 | f599 | End | All remaining tails cut with a **16 ms** linear fade (`master(fade_out=0.016)`); the final frame is silent; encode with `-shortest`. | — |

---

## 7. Engineering notes

### Build order (one focused session per scene; transitions wired with the scene they touch)
1. **Framework pass (integrator, before any scene):** `src/brand.js` (PAL override incl. new keys `courtSheen`, `ballHi`, `ice`; FONTS repoint; `document.fonts.check` assertion), remove Inter from `index.html` FONT_LOADS and load `brand.js`, add `shockIris`, `scanWipe`, `irisTravel` to `transitions.js`, set `TN.TIMELINE` as below, add `TN.S4S5 = { ball(gt), period, periodDrop }` as a shared object in `brand.js` (S5 fills `period` lazily from `measureText`; S4 and `irisTravel` read it).
2. **scene3** (highest risk: flight camera, freeze, ping, swoop) → 3. **scene4** (dive, sliver, IN lock, lens rush) → 4. **scene2** (macro ball, racket, contact) → 5. **scene5** → 6. **scene1**.
7. Audio instruments in `tools/audio.py`, cues JSON, encode, contact sheets, poster-frame colour check.

### `TN.TIMELINE` (write times as `frame/60`)
```js
const F = f => f / 60;
TN.TIMELINE = {
  scenes: [
    { name: 'scene1', start: F(0),   end: F(84)  },
    { name: 'scene2', start: F(84),  end: F(156) },
    { name: 'scene3', start: F(156), end: F(306) },
    { name: 'scene4', start: F(306), end: F(438) },
    { name: 'scene5', start: F(438), end: F(600) },
  ],
  transitions: [
    { from: 'scene1', to: 'scene2', start: F(75),  end: F(93),  type: 'flash',      params: { color: '#FFFFFF', peak: 0.5, hold: 0.11 } },
    { from: 'scene2', to: 'scene3', start: F(156), end: F(168), type: 'shockIris',  params: { cx: 1000, cy: 520, rMax: 1400, zoom: 0.06, echo: true } },
    { from: 'scene3', to: 'scene4', start: F(300), end: F(312), type: 'scanWipe',   params: { color: TN.PAL.accent2, bandW: 4, tail: 60 } },
    { from: 'scene4', to: 'scene5', start: F(438), end: F(450), type: 'irisTravel', params: { x0: 960, y0: 540, r0: 1800, r1: 22, to: () => TN.S4S5.periodDrop() } },
  ],
  post: { vignette: 0.45, grain: 0.05, aberration: 1.5, letterbox: 0 },
  postAt(t) { /* §3 overrides: aberration spikes, bloom windows, letterbox in/out, vignette per shot, S4 grain 0.04, f599 black */ },
};
```

### Shared primitives → engine mapping
| Need | Engine | Scene-local additions |
|---|---|---|
| Ball with seam + felt | `drawBall` (seam = `SEAM` curve, fuzz, rim, squash), `drawBallBlurred`, `drawTrail` | brand `colors`; **review ring** (1.5 px Line White ring + 12 % fill + cyan cross); **felt texture**: one 1024² `scratch('s4_felt',1024,1024,false)` rendered on first use with `mulberry32(77)`: Optic Yellow base, ~12,000 seeded 2–4 px strokes in ballHi/ballMid/ballDeep at random angles, soft Felt Mid vignette; drawn scaled into the ball clip when d > 1,200 px. Fallback: radial gradient + `drawBall`'s speckle. **D-shaped compression**: clip rect against the string plane before `drawBall`. |
| Court in real proportions | `COURT`, `courtLines()`, `drawSurface`, `drawLines`, `drawNet`, `lineQuad`, `fillPoly3`, `bounceMark`, `drawGroundShadow`, `drawLines2D`, `courtRect2D` | **light-trace** per line (own loop over `courtLines()` + head `glowDot`); **`linePing(ctx, cam, centre, r)`** (0.25 m subdivision, gaussian band σ 0.35 m, 'screen'); **reflected 2D map** `{to, ppm}` for S4; 1 m / 1 cm grids as projected lines. |
| Perspective projection | `Camera.set / orbit / project`, `projectSegment` | Analytic lagged target `pos(gt − 0.08)`; swoop = `orbit` lerp; **never exceed el 87.4°** (`Camera.set` swaps its up-vector when `|dot(f, up)| > 0.999` and the roll pops). |
| Glow / bloom | `withGlow`, `bloom`, `bloomCanvas` (post), `glowDot`, `lensFlare`, `lightStreak`, `lightCone`, `shockRing` | 'screen' over white lines, 'lighter' over navy; all `filter blur()` on 1/3-res `scratch` canvases. |
| Particles | `burst` (stateless), `motes` | **`burst3D`**: same analytic motion in world metres (speed, cone, gravity scaled by the replay factor², drag) projected per frame via `cam.project` / the S4 map so the frozen dust survives the S3 → S4 cut; stand specks as a seeded const array. |
| Text animator | `text`, `measure`, `kinetic` + `ANIM.slam/riseMask`, `wipeText`, `rollingNumber`, `tag` | **`digitCells`** (fixed-width digits from `measureText('0')`); word-level slam (scale about the word centre); specular sweep via offscreen + `source-in`; auto-fit to 1,500 px. |
| Motion blur | `render.cjs --shutter 4` (4 sub-samples over half a frame, running average), `directionalBlur`, `radialZoomBlur` | 6 racket sub-steps in S2; 12 ghost streak on release; S4 court streak. |
| Transitions | `flash` (engine) | **`shockIris`**, **`scanWipe`**, **`irisTravel`** (mechanisms in §4; ~25 lines each). |
| Audio | `strike, bounce, whoosh, impact, riser, crowd, roar, tick, sting, drone, swell` | New: `hum(f, dur)` (saw → LPF 600), `fmping(carrier, ratio, index, dur)`, `karplus(f, dur)`, `heartbeat`, `clunk(f)`, `comb(delays, fb)`; automation cue types `duck{t0,t1,db}` and `lpf{t0,t1,fc}` applied to the mix bus after summing; `master(fade_out=0.016)`; keep `reverb` but exclude the ducked window and the final 50 ms. |

### Determinism and rendering rules
- No `Math.random`, `Date`, `performance.now`; all randomness from `hash/hash2/noise1/mulberry32` keyed by element id and frame; caches (felt texture, speck arrays) are allowed because their content does not depend on call order.
- Every element is a pure function of `gt`; freezes are clamped clocks; the camera lag is analytic.
- Balanced `save/restore`; canvas fully covered every frame; scenes must render sensibly for the stated `overlap_in`/`overlap_out` ranges (S4 renders its shrinking ball through 7.483; S2 renders its contact animation through 2.783; S3 holds its final camera through 5.183).
- Per-frame budget ≈ 250 ms per sub-sample: ≤ 2,400 specks, ≤ 400 `shadowBlur` draws, all blur passes at ≤ 1/3 res. Expect 1–3 s per frame at `--shutter 4` under SwiftShader (10–30 min with 3 workers); review with `npm run render:fast` (shutter 1, jpg), final with shutter 4.
- Verify fonts: `document.fonts.check('700 100px "Oswald"')` etc. for all faces; a false throws → `pageerror` → render exits 2.

### Risks and fallbacks
| Risk | Fallback |
|---|---|
| Swoop composition (f276–f299) does not read | Freeze at f274, 6-frame white → cyan flash at f276–f281, hard cut to the 87° top-down camera with the scan band; keep the ping. |
| Flight orbit loses the ball or the court | Keyframe az/el/dist/target at f156, f200, f247, f273 and inOutSine between them. |
| Sliver reads weak at 10.8 px | Dive to s = 4,500 (13.5 px); or add a 240 px circular magnifier inset at (1,560, 300) rendering the same map at 3× (second `drawLines2D` pass clipped to a circle). |
| Felt texture looks synthetic | Radial gradient + `drawBall` speckle + 300 seeded strokes; the seam band carries the macro read. |
| `shockIris` seam visible between S2's frame and S3's | Match S3's launch ball to within 250 px of (1000, 520) and keep the 2-frame white flash on f156–f157. |
| S3 → S4 scale mismatch under the scan band | S4's `s` at f300 must equal S3's final `cam.project(mark).scale` (≈ 288 px/m); read it at runtime from a throwaway camera rather than hard-coding. |
| 1-frame flashes too weak / too strong at shutter 4 | All flashes are 2 frames (α, α/2); the contact frame is 70/35. |
| `letterbox` draws over the T1 white at f84 | Bars animate 0 → 1 across f84–f92 via `postAt` so they appear as the white thins. |
| Optic Yellow loses ~8 % saturation in yuv420p/bt709 | Check `tennis-poster.jpg` (frame 330 by default; also render f372) before the full encode; the bloom pass and the Line White rims restore the pop. |
| `lighter` glows blow out over white lines | 'screen' for anything over lines or white; 'lighter' only over navy/black. |
| Camera roll pop at top-down | Never exceed el 87.4°; S4 is orthographic 2D. |
| Audio normalisation moves the hero levels | `master` normalises to −1 dBFS on the loudest sample; make sure STRIKE and IN are the loudest by construction (impact gain 1.0), everything else ≤ −3 dB. |
| Reverb smears THE BREATH | Apply `duck` after reverb, or render reverb per cue excluding f366–f369. |
| Measure-dependent layout (period position) differs between S5 and `irisTravel` | Single source of truth `TN.S4S5.period()` computed once from `measureText` after fonts load; both read it. |

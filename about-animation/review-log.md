# Review log: the About opening

Each round: watch it as someone seeing it for the first time, write down what
a viewer would feel or miss, fix, and watch again. Film rounds are on fast
half-size previews (`PREVIEW=1 node tools/film.mjs`); whole-page rounds are
frame-by-frame recordings of the built page with its sound
(`node tools/review.mjs`).

## Round 1: the film as first rendered

Watched the first full-size frames, then a preview of the whole 3.8 s.

- **The opening frame is a wall of yellow.** On a dark site, the first thing
  you see is a screen-filling lime macro. It's loud, not intriguing, and it's
  also the poster (the page's largest paint).
- **The flight is dull.** 0.5–1.1 s is a small, flatly lit ball on black. Key
  and rim both came from the left, so the ball had no shape and nothing said
  "fast".
- **The camera whips.** Between 0.3 and 0.5 s the ball jumps from right of
  frame to the bottom-left and back to centre. It reads as a mistake, not a move.
- **The burn edge is an orange worm.** The ember line was emitted by all 33
  felt layers at once, so it stacked into a thick glowing tube.
- **The burnt felt looks hollow.** Where felt burnt away you saw the inside of
  a shell.

## Round 2: relit, one camera move, fibres, dust, a rubber core

- Camera rewritten as one eased move (`filmCamera`): it opens on the ball's
  backlit upper-right edge, pulls back to find it low on the left, and lets it
  glide into the centre as it slows. Checked numerically: the ball's screen
  position now changes smoothly every frame (no jumps over 0.03 of the frame
  after the pull).
- Light split: warm key front-left (the live scene's side), a cool rim behind
  right, a little of the site's violet in the shadows.
- Felt fibres knocked loose by the hit drift off the ball in slow motion.
- Dust in the air catches the rim light and shows the camera moving, then
  fades before the live scene takes over.
- A rubber core under the felt: burnt areas show charred rubber, glowing just
  behind the edge.
- Ember line only on the felt itself, thin, broken up; embers flicker in the char.

Seen: the rim was far too strong (the macro blew out to neon, with a green
haze); smoke smeared the face of the ball; the char read as rust; the cyan rim
turned the felt green.

## Round 3: tuning

- Rim down from 7.5 to 3.4 and near white; sheen down. The felt is yellow again.
- Smoke starts well clear of the ball; flame extinction lowered: no smear.
- The fuzz now singes off just ahead of the felt, baring a black char band and
  the ember line, with the burning fibre tips glowing ahead of it. Checked with
  the fire switched off, to see the felt alone.
- Ignition flares (fire level and light overshoot, a burst of 180 sparks).

## Round 4: the whole film again

- **Still a wall of yellow at frame 0.** The "rim" light sat too far round
  the side, so it lit the whole face the macro looks at. Moved it right
  behind, and the opening now starts in the dark: only the rim catches the
  fuzz, and the key and the room light come up as the camera pulls out. The
  first frame (also the poster) is a dark, fuzzy edge of a ball with fibres
  drifting off it.
- **Flames hung over nothing.** As the scan took the last of the ball, the
  fire burned on in mid-air. It now dies down with the ball (3.1–3.7 s).
- **Ignition too polite.** Bigger flare of light as it catches; the ignite
  sound moved from 1.22 s to 1.12 s to land on it.
- **Burnt core had no scan line.** Where the felt had already burnt away, the
  scan's ice cut was missing; the rubber core now carries it too.
- **Fibres looked like matchsticks** at page size: finer and shorter, more of them.
- **Tall cut:** the camera now leads the ball less and pulls back further on
  a phone-shaped frame (it was cropping the ball at the side).

## Round 5: the whole page, film and live together

Recorded the built page frame by frame at 15 fps (`tools/review.mjs`).

- **Recorder bug, not a page bug:** headless Chromium here doesn't repaint a
  paused video after a seek, so the first recording showed frame 0 under
  everything. The recorder now lays the film's own frames into the video's
  box with the same (scoped) CSS. Checked the encoded film itself with ffmpeg:
  it's right.
- **The hand-off works.** From 2.7 s the live points fill in exactly where the
  film's felt is cut away, and the scan line, the ring and the ball line up.
- **Double exposure at the start (a real bug).** The film faded in over its
  poster for 0.35 s while the camera was already moving, so for a moment you
  saw two balls. The poster *is* the film's first frame, so the film now cuts
  in over it and only fades on the way out.
- **The staircase read as a pile of shards.** Twenty wedges over more than
  one and a half turns overlapped into a jumble, and unlit it was a murky
  green. Now: sixteen treads over a little more than one turn, a post at
  each tread and a handrail over them that fills with light as the steps
  light, lighter tops and darker edges so they read as solid, and unlit it's
  a faint glass outline. It reads as a spiral staircase at a glance.

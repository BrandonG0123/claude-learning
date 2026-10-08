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

## Round 6: using it, not just watching it

Hovered, tabbed and tapped through the settled page, and loaded it with
reduced motion and with JavaScript off.

- Hover opens one category at a time and closes the last; the piece lifts.
- Tab order reaches every link, including every item of every category, with
  a visible focus ring. Any key outside the intro's own controls skips it.
- **Skip and Sound were last in the tab order**, after about thirty links. They
  now come straight after the title in the page, so a screen reader or a
  keyboard reaches them first (they still sit bottom right on screen).
- **Reduced motion and no-JS tiles:** the centre tile was a wide box with its
  still in one corner and empty space beside it; the still now sits beside its
  words. The six tiles now sit in one row on a wide screen and two by two on a
  phone (they were five and one, and one per row on a phone, a long scroll).
  The stills were re-rendered with the new staircase.
- **Phone, open category:** items wrapped two to a line with nothing between
  them, so "Tournaments · twice a month High school team" read as one item.
  Each item now leads with a small ice mark.
- **Sound:** measured the offline render at −32 LUFS, peaks −13.6 dBFS: too
  quiet to hear on a laptop for something you chose to turn on. Raised to
  −26 LUFS, peaks −8 dBFS (`tools/sound.mjs`). The fire noise stopped dead at
  3.87 s; it now fades with the picture's fire.

## Round 7: honesty and the payoff

- **The burning ball wasn't labelled.** The brief says illustrations are
  labelled; the opening looks real enough to need it. A small credit,
  "Illustration · rendered, not filmed", shows from the first frame (the
  poster too), on a dark backing so it reads over the felt, and fades when the
  film ends. Bottom left on wide screens, top left on phones.
- **The climax had no answer.** When the last step lit and the chord bloomed,
  nothing else moved. Now one ripple of ice runs out from the staircase to
  the ring and fades as it reaches it (8.05–9.15 s): everything round the
  centre is reached by it.

## Round 8: other screens

Settled page captured at 360×640, 375×667, 390×844, 430×932, 768×1024,
1024×768, 1280×720, 1366×768, 1600×900 and 2560×1080.

- **iPad portrait (768 wide): the site header wrapped onto two lines** (the
  full nav needs about 780px; it only collapsed below 736px). That made the
  header 103px against a 68px allowance and pushed the intro's controls off
  the bottom. It now collapses below 50rem, on every page. This touches the
  shared header, so it's its own commit if you'd rather take it separately.
- **Small phones (360×640, 375×667): the open list ran into the buttons.** It
  now grows upward from just above the controls, and the ring squeezes
  vertically to fit between the title and that band (the staircase shrinks
  with it), with its top piece just under the title.
- **Phones: "Self-improvement" touched the Projects piece.** One size smaller
  on all phone widths; clear at 360, 390 and 430.
- 1024×768, 1280×720, 1366×768 and 2560×1080 are fine; on the ultrawide the
  film is cover-cropped top and bottom, as designed.

## Round 9: the final film, with the page

The film rendered at full quality in both cuts (wide 1920×1080 drawn at 1.5×,
tall 1080×1920 drawn at 1.25×), encoded for the page (wide: 1.6 MB H.264,
1.3 MB VP9, 30 KB AVIF poster), and the page recorded again at 30 fps with
its sound.

- The first frame at full size: the dark felt, the glowing fuzz on the edge,
  crimped fibres. It's also the poster, so it's what loads first.
- The burn at full size: the ember edge reads as glowing, the singed fuzz as
  fibre, the core as hot rubber. No smear.
- The hand-off: at 3.2 s the film's burning top and the live points below the
  line meet on the scan line with no step; at 3.8 the film fades and the
  points carry on.
- The credit shows during the film only.
- **Fixed on the way:** the film was made visible as soon as it began loading,
  before it had a frame; Safari can paint an empty video black over the
  poster. It now appears only once it's actually playing.

## Round 10: the live path, checked like the rest of the site

The site's own accessibility run only ever sees the still version (headless
browsers have no GPU, so they get the tiles). So I ran axe against the live
path directly, forced past the GPU check: desktop and phone, settled and
mid-film, in both themes.

- **0 violations** in all six runs. axe leaves the text over the canvas "to
  review" (it can't see what's behind it), so I worked those out: the muted
  items are about 6.5:1 on the void; the credit and the buttons have their own
  dark backing and stay above 6:1 even over the brightest felt.
- Reading mode (the light theme): the stage stays dark, like a screen set into
  the page, and the page below it turns light. That's consistent with the rest
  of the site.
- **Smoothness on big screens:** the canvas was capped at 2× density, which on
  a large display is over ten million pixels a frame. It now also keeps within
  a pixel budget (about 4 million, 2.6 on phones), so it stays sharp but doesn't
  ask a laptop's graphics for more than they can draw at 60 fps.

## Round 11: skip, replay and sound, by reading the code against the score

The recorder holds the clock, so it can't play Skip and Replay in real time;
I traced them instead.

- **Skip** during the film stops it (it fades in 0.35 s), lands at 9.55 s
  (just before the title, so the last moments still arrive), with the pieces
  printed, the staircase lit and the ripple already gone. The sound sees a
  jump and plays no one-shots; the fire bed is silent there. The voice, if
  playing, stops.
- **Replay** restarts the film from frame 0, brings the credit back, and turns
  the sound on unless the reader muted it before (a mute is remembered).
- Found nothing to change.

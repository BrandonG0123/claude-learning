# Log: seed-to-tree

Tools: the animate skill's `tools/` (`SKILL=<animate plugin>/plugins/animate/skills/animate`): `build.mjs`, `still.mjs`, `storyboard.mjs`, `tile.mjs`, `export.mjs --share`, `review.mjs`.
The container had no handwriting font, so Comic Neue (already in the kit's HAND stack) was installed as a system font before rendering.

## Run 1 - 2026-10-07

- Story check approved: four beats, two morphs (5.0, 9.5) + one hard cut (14.0), the day 1 / week 6 / year 1→5 / year 40 clock.
- Look check approved: 2 frames (beat 1 underground at 3.6s, beat 4 the tree at 17.9s), after three fixes from the first tile: a bigger acorn and spark, the worm moved off the caption, the kid moved off the caption.
- Storyboard approved: 4 panels (`storyboard.png`).
- Export: 480 frames in 34s (4 workers), audio + stems, `renders/final.mp4`, `renders/share.mp4`; tile across both morphs and the cut `deterministic: true`.
- Review run 1 (`review/review-run1.txt` was not saved, the folder did not exist yet): cuts PASS (14.0 on grid, Δ 40.3 at f336), morphs PASS, story arc PASS 5/5, text PASS, dead beats PASS, flat frames none. **SOUND FAIL:** the loudest 100 ms window was 16.8s (−9.1 dBFS) inside the held chord, not the slam, so "silence before it" read 0.0s. Cause (craft.md → Sound): the flat chord (pad peak 0.16) outscored the stab.
- Fix: the chord to 0.10, a 0.42s pad stab (0.30, 10 ms attack) + 5 plucks at 0.5 + the sub at 1.0 on 14.0; the years' pad 0.05→0.07, bass 0.18, riser 0.08 (so the peak act stays ≥ 1 dB under the gift); the leaf plucks 0.07. Re-rendered with `export.mjs --only-audio --share`.

## Run 2 - 2026-10-07 (delivered)

Numbers (`review/review-run2.txt`):

| check | result |
|---|---|
| cuts on the 120 BPM 8th grid | PASS: 1 cut at 14.000s = f336, err +0.0, Δ 40.3 at the cut |
| morphs centred on the grid | PASS: 2 bridges at 5.0 and 9.5s |
| story arc | PASS 5/5: gift p90 −10.2 vs next −16.7; gift ≥ peak + 1 dB (−10.2 vs −16.7); silence median −70.4 vs peak −18.1; gift held 0.25 cuts/s; goodbye −25.8 vs gift −11.7 |
| loudest 100 ms window | 14.2s, −9.5 dBFS, in the payoff act 14–18s |
| silence before it | 1.1s at ≤ −40 dBFS, ending 14.0s |
| loudness | −13.9 LUFS integrated, range 13.9 LU, true peak −1.0 dBFS |
| text | PASS: 0 cut off / overlapping, 0 in the safe zone (74 frames sampled) |
| dead beats | PASS: 0 stretches over 3s |
| flat frames | none |
| loop | last-vs-first diff 63.3 (the end returns to the opening image changed: the acorn on the ground, not in the soil) |

Per-shot PASS table (contact sheets and `review/phone.jpg` against grammar/FRAME.md + the cut-paper checklist):

| shot | key | FRAME.md | notes |
|---|---|---|---|
| 1 | seed (0–5) | PASS | the spark asleep in the cut-open acorn (a face, a mood), a cross-section world, torn edges / dots / crayon, rain, worm, snail, beetle, roots; the root grows at 3.0, the spark wakes at 4.0 |
| 2 | sprout (5–9.5) | PASS | the extreme close-up; the spark peeks out between the shell halves, leaves pop, the clouds part for the sun, a bird, a ladybird, dew, the snail again |
| 3 | years (9.5–13) | PASS | five ticks with a flicker on 2s, the sky and field step through the seasons (snow in year 4), the sapling and its crown step up, the spark on the first branch, a bird on the stake, a butterfly |
| 4 | hush (13–14) | PASS | held by design: idle life only (clouds, the butterfly, the spark's bob), silence |
| 5 | tree (14–18) | PASS | the hard cut lands on a finished frame; the spark 12 rays as the crown's heart; birds, the swing, the kid, the cat, falling leaves; "a tree" then the title at 17.0 |
| 6 | acorn (18–20) | PASS | the first acorn drops at 18.0, lands at 19.75 with a dust puff; the motif rings into the loop |

- Weakest shot: 1 (seed). Five seconds on one framing; the wake at 4.0 is only a mood change. A visible stir (the acorn rocks once, the kernel brightens) would land it better.
- Not verified: I cannot listen to the score; the balance is proven by the numbers above only. Listen to the slam at 14.0 and the stab/chord balance.
- Proposed craft line (for craft.md → Code or the README's install notes): "Linux containers often have no handwriting font; `fc-match 'Comic Neue'` before rendering, and install it (the kit's HAND stack lists it) or the tags set in a sans."

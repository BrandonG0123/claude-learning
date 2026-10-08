# About-page opening animation: exploration

Working files for the new opening of the About page on brandongreene.dev
(the site itself lives in `BrandonG0123/brandongreene-site`). Nothing here
ships; it's where directions get tried before anything is built on a branch
of the site.

- `sketches/`: one style frame per direction. A `.html` page, plus a `.ts`
  scene where it's 3D. The scenes import three.js and the site's own intro
  code (the knight, the seam curve) from a checkout of the site at
  `../brandongreene-site`.
- `frames/`: the rendered PNGs, including `baseline-*.png` from the current
  intro ("Ignition") for comparison.
- `board/`: the style board, published as an Artifact for review.
- `tools/render.mjs`: renders frames in Chromium at 2x and scales down.

```bash
# needs the site checked out next to this repo, with npm ci run in it
node tools/render.mjs a-ad b-scan c-print d-type
node tools/render.mjs --phone b-scan      # 390x844
```

In a cloud session this renders in software (SwiftShader). Frame A's fire is
the slow one, about 90 seconds.

## Round 1 directions

| | Direction | Idea |
|---|---|---|
| A | Ad cut | The ball in flight, burning, shot like a sportswear spot |
| B | Real to scan | A scanning sheet turns the real ball into points that build the knight |
| C | Toolpath | The knight mid-print: solid layers, glowing gyroid infill, ice drawing above |
| D | Kinetic type | Huge words; the ball is a flat disc that knocks each one out |

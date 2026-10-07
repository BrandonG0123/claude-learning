
// =====================================================================
//  ERAS, CAMERAS, BRIDGES — read by kit/morph.js
//  ERA_BG: each era's dominant colour (the fade to blank paper during a morph).
//  pieceCam(era, t): the tree settles out of a slight push over its first five seconds; the other worlds hold still.
//  BRIDGES: two shape morphs (0.5s half-length: a 1.0s bridge each); the sapling -> tree boundary is the one hard cut.
// =====================================================================
const ERA_BG = ['#5a3620', '#cfe2ee', '#bfe0ee', '#8fc3dc'];
function pieceCam(era, t) {
  if (era === 3) { const z = 1.1 - 0.1 * EZ.o2(seg(t, 14.0, 19.0)); return camOf({ z, p: [470, 900], to: [470, 900] }); }
  return null;
}
const BRIDGES = [
  { tc: 5.0, d: 0.5, A: () => ({ P: acornBody(...SEED), c: '#a9743f' }), B: () => ({ P: SHELL_R(), c: '#a9743f' }) },                                     // the acorn -> the split shell
  { tc: 9.5, d: 0.5, A: () => ({ P: ellipsePts(LEAF_L[0], LEAF_L[1], LEAF_L[2], LEAF_L[3], LEAF_L[4], 64), c: PAL.green }), B: () => ({ P: CROWN(), c: PAL.green }) },   // the seed-leaf -> the sapling's crown
];

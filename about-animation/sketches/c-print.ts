/**
 * Style frame C, "Toolpath": the chess knight mid-print. Below the cut it is
 * solid optic-yellow plastic with visible layer lines; the layer being laid
 * down glows, walls and gyroid infill (the same surface as the maths piece);
 * above it the rest of the knight waits as an ice hairline drawing.
 * Geometry: the site's own knight (src/scripts/intro/shapes.ts).
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { knightGeometries } from '../../../brandongreene-site/src/scripts/intro/shapes';
import { setup, finish, phone } from './common';

const { renderer, scene, camera, composer, W, H } = setup({ exposure: 0.95, bloom: [0.5, 0.3, 1.05], grade: { vignette: 0.5, grain: 0.03 } });
renderer.localClippingEnabled = true;
scene.background = new THREE.Color('#05060A');
scene.fog = new THREE.Fog('#05060A', 4.2, 9);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.12;

const geos = knightGeometries().map((g) => g.toNonIndexed());
const box = new THREE.Box3();
geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox!); });
const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
geos.forEach((g) => { g.translate(-cx, -box.min.y, -cz); g.computeVertexNormals(); });
const TOP = box.max.y - box.min.y;
const LH = TOP / 120;             // layer height
const CUT_LAYER = 90;
const CUT = (CUT_LAYER + 0.5) * LH;
const EW = LH * 0.95;             // extrusion width

// ---- slicing ------------------------------------------------------------------
type Seg = { a: THREE.Vector3; b: THREE.Vector3; n: THREE.Vector2 };
function slice(y: number): Seg[] {
  const out: Seg[] = [];
  const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const g of geos) {
    const pos = g.attributes.position;
    for (let t = 0; t < pos.count; t += 3) {
      for (let k = 0; k < 3; k++) p[k].fromBufferAttribute(pos, t + k);
      const d = p.map((v) => v.y - y);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 3; k++) {
        const j = (k + 1) % 3;
        if ((d[k] < 0) !== (d[j] < 0)) pts.push(p[k].clone().lerp(p[j], d[k] / (d[k] - d[j])));
      }
      if (pts.length !== 2) continue;
      const n = e1.subVectors(p[1], p[0]).cross(e2.subVectors(p[2], p[0]));
      const n2 = new THREE.Vector2(n.x, n.z);
      if (n2.lengthSq() < 1e-12) continue;
      out.push({ a: pts[0], b: pts[1], n: n2.normalize() });
    }
  }
  return out;
}
// Crossing-number inside test against unordered contour segments.
function inside(x: number, z: number, segs: Seg[]) {
  let c = false;
  for (const s of segs) {
    if ((s.a.z > z) !== (s.b.z > z)) {
      const xi = s.a.x + ((z - s.a.z) / (s.b.z - s.a.z)) * (s.b.x - s.a.x);
      if (xi > x) c = !c;
    }
  }
  return c;
}
function distToSegs(x: number, z: number, segs: Seg[]) {
  let best = Infinity;
  for (const s of segs) {
    const ax = s.a.x, az = s.a.z, bx = s.b.x - ax, bz = s.b.z - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz || 1)));
    best = Math.min(best, Math.hypot(x - ax - t * bx, z - az - t * bz));
  }
  return best;
}

/** Walls (inset perimeters) for one layer, as flat segment arrays. */
function walls(segs: Seg[], y: number, count: number) {
  const out: number[] = [];
  for (let k = 0; k < count; k++) {
    const o = (k + 0.5) * EW;
    for (const s of segs) out.push(s.a.x - s.n.x * o, y, s.a.z - s.n.y * o, s.b.x - s.n.x * o, y, s.b.z - s.n.y * o);
  }
  return out;
}

/** Gyroid infill at height y: marching squares on the gyroid's slice, kept inside the walls. */
function gyroidInfill(segs: Seg[], y: number, period: number, margin: number) {
  const k = (Math.PI * 2) / period;
  const f = (x: number, z: number) => Math.sin(x * k) * Math.cos(z * k) + Math.sin(y * k) * Math.cos(x * k) + Math.sin(z * k) * Math.cos(y * k);
  const minX = Math.min(...segs.map((s) => Math.min(s.a.x, s.b.x))), maxX = Math.max(...segs.map((s) => Math.max(s.a.x, s.b.x)));
  const minZ = Math.min(...segs.map((s) => Math.min(s.a.z, s.b.z))), maxZ = Math.max(...segs.map((s) => Math.max(s.a.z, s.b.z)));
  const N = 220, dx = (maxX - minX) / N, dz = (maxZ - minZ) / N;
  const out: number[] = [];
  const edgePt = (x0: number, z0: number, v0: number, x1: number, z1: number, v1: number) => {
    const t = v0 / (v0 - v1);
    return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = minX + i * dx, z0 = minZ + j * dz, x1 = x0 + dx, z1 = z0 + dz;
    const v = [f(x0, z0), f(x1, z0), f(x1, z1), f(x0, z1)];
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    const pts: number[][] = [];
    for (let e = 0; e < 4; e++) {
      const a = e, b = (e + 1) % 4;
      if ((v[a] < 0) !== (v[b] < 0)) pts.push(edgePt(c[a][0], c[a][1], v[a], c[b][0], c[b][1], v[b]));
    }
    if (pts.length < 2) continue;
    const mx = (pts[0][0] + pts[1][0]) / 2, mz = (pts[0][1] + pts[1][1]) / 2;
    if (!inside(mx, mz, segs) || distToSegs(mx, mz, segs) < margin) continue;
    out.push(pts[0][0], y, pts[0][1], pts[1][0], y, pts[1][1]);
  }
  return out;
}

const mat = (opts: ConstructorParameters<typeof LineMaterial>[0]) => {
  const m = new LineMaterial({ ...opts });
  m.resolution.set(W * devicePixelRatio, H * devicePixelRatio);
  return m;
};
function lines(pos: number[], col: (x: number, y: number, z: number) => [number, number, number], m: LineMaterial) {
  const g = new LineSegmentsGeometry();
  g.setPositions(pos);
  const c: number[] = [];
  for (let i = 0; i < pos.length; i += 3) c.push(...col(pos[i], pos[i + 1], pos[i + 2]));
  g.setColors(c);
  const l = new LineSegments2(g, m);
  l.computeLineDistances();
  return l;
}

// ---- the printed part: solid, ribbed with layer lines -------------------------
const pla = new THREE.MeshPhysicalMaterial({
  color: '#cdee2c', roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
  clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT - LH * 0.5)],
});
pla.onBeforeCompile = (s) => {
  s.uniforms.uLH = { value: LH };
  s.vertexShader = s.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  s.fragmentShader = s.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nuniform float uLH;')
    // Each layer is a rounded bead: tilt the normal up at the top of the bead and down at the bottom.
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float ph = fract(vW.y / uLH) - 0.5;
      vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      normal = normalize(normal + upV * ph * 1.6);`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      if (!gl_FrontFacing) diffuseColor.rgb *= 0.12;
      diffuseColor.rgb *= 0.92 + 0.08 * cos(6.2831 * fract(vW.y / uLH));`);
};
for (const g of geos) scene.add(new THREE.Mesh(g, pla));

// ---- the current layer -------------------------------------------------------
const cut = slice(CUT);
const nozzle = (() => {
  // The point of the outer wall nearest the camera's side, where the nozzle is now.
  let best = cut[0], score = -Infinity;
  for (const s of cut) { const sc = s.a.x * 0.6 + s.a.z * 1.0; if (sc > score) { score = sc; best = s; } }
  return new THREE.Vector3(best.a.x - best.n.x * EW * 0.5, CUT, best.a.z - best.n.y * EW * 0.5);
})();
const hot = (x: number, y: number, z: number): [number, number, number] => {
  const d = Math.hypot(x - nozzle.x, z - nozzle.z);
  const h = Math.exp(-d / 0.035);
  // Fresh plastic: white-hot at the nozzle, cooling to glowing optic yellow.
  return [0.95 + h * 1.4, 1.15 + h * 0.8, 0.2 + h * 0.9];
};
const wallMat = mat({ linewidth: EW, worldUnits: true, vertexColors: true });
scene.add(lines(walls(cut, CUT, 3), hot, wallMat));
const infillMat = mat({ linewidth: EW * 0.8, worldUnits: true, vertexColors: true });
scene.add(lines(gyroidInfill(cut, CUT, 0.11, EW * 2.6), (x, y, z) => hot(x, y, z).map((v) => v * 0.7) as [number, number, number], infillMat));
// The two layers under it show through the infill's gaps, dimmer.
for (const k of [1, 2]) {
  const yk = CUT - k * LH, sk = slice(yk);
  scene.add(lines(gyroidInfill(sk, yk, 0.11, EW * 2.6), () => [0.3 / k, 0.38 / k, 0.06 / k], mat({ linewidth: EW * 0.8, worldUnits: true, vertexColors: true })));
}

// ---- the rest of the knight, still to print: an ice drawing --------------------
const ghost: number[] = [];
for (let L = CUT_LAYER + 1; L < 120; L += 1) {
  const y = (L + 0.5) * LH;
  for (const s of slice(y)) ghost.push(s.a.x, y, s.a.z, s.b.x, y, s.b.z);
}
const ghostMat = mat({ linewidth: 1.1, vertexColors: true, transparent: true, depthWrite: false });
ghostMat.blending = THREE.AdditiveBlending;
scene.add(lines(ghost, (x, y) => {
  const k = 1 - ((y - CUT) / (TOP - CUT)) * 0.55;
  return [0.3 * 0.3 * k, 0.95 * 0.3 * k, 1.0 * 0.3 * k];
}, ghostMat));
// The head's profile, drawn crisp: the feature edges of the mesh, above the cut only.
const edges: number[] = [];
for (const g of geos) {
  const e = new THREE.EdgesGeometry(g, 25).attributes.position;
  for (let i = 0; i < e.count; i += 2) {
    const ay = e.getY(i), by = e.getY(i + 1);
    if (Math.min(ay, by) < CUT) continue;
    edges.push(e.getX(i), ay, e.getZ(i), e.getX(i + 1), by, e.getZ(i + 1));
  }
}
const edgeMat = mat({ linewidth: 1.4, vertexColors: true, transparent: true, depthWrite: false });
edgeMat.blending = THREE.AdditiveBlending;
scene.add(lines(edges, () => [0.3 * 1.1, 0.95 * 1.1, 1.0 * 1.1], edgeMat));

// ---- the printer: a brass nozzle under a heater block, and the bed -------------
const brass = new THREE.MeshStandardMaterial({ color: '#c9a25a', metalness: 1, roughness: 0.32 });
const alu = new THREE.MeshStandardMaterial({ color: '#2a2e36', metalness: 0.9, roughness: 0.45 });
const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.005, 0.05, 6), brass);
tip.position.set(nozzle.x, CUT + LH * 0.6 + 0.025, nozzle.z);
const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 6), brass);
hex.position.set(nozzle.x, CUT + LH * 0.6 + 0.065, nozzle.z);
const block = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.13), alu);
block.position.set(nozzle.x + 0.04, CUT + LH * 0.6 + 0.13, nozzle.z);
const sink = new THREE.Group();
for (let i = 0; i < 9; i++) {
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 32), alu);
  fin.position.y = i * 0.03;
  sink.add(fin);
}
sink.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 16), alu));
sink.position.set(nozzle.x, CUT + LH * 0.6 + 0.24, nozzle.z);
scene.add(tip, hex, block, sink);

// The bed: matte black, with a faint drawing-sheet grid that fades with distance.
const bedMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  vertexShader: 'varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
  fragmentShader: `varying vec3 vW;
    float grid(vec2 p, float s, float w) { vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; return 1.0 - smoothstep(0.0, w, min(g.x, g.y)); }
    void main() {
      float fade = exp(-dot(vW.xz, vW.xz) * 0.9);
      float g = grid(vW.xz, 0.1, 0.004) * 0.35 + grid(vW.xz, 0.5, 0.006) * 0.6;
      gl_FragColor = vec4(vec3(0.30, 0.95, 1.0) * g * fade * 0.07, 1.0);
    }`,
});
bedMat.blending = THREE.AdditiveBlending;
const bed = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), bedMat);
bed.rotation.x = -Math.PI / 2;
scene.add(bed);

// ---- light ------------------------------------------------------------------------
// Key grazes the side facing the camera, which is what makes layer lines show.
const key = new THREE.DirectionalLight('#f4f1ea', 2.6);
key.position.set(-3.5, 2.2, 0.9);
const rim = new THREE.DirectionalLight('#4DF3FF', 2.4);
const hotendRim = new THREE.SpotLight('#ffffff', 6, 3, 0.35, 0.6);
hotendRim.position.set(1.6, 1.9, -1.2);
scene.add(hotendRim);
hotendRim.target = tip;
rim.position.set(2.5, 1.5, -3);
const fill = new THREE.DirectionalLight('#8B5CFF', 0.35);
fill.position.set(-3, 0.5, -1);
scene.add(key, rim, fill);

// ---- camera -------------------------------------------------------------------
const target = new THREE.Vector3(0.02, TOP * 0.48, 0);
const el = THREE.MathUtils.degToRad(phone ? 22 : 21), az = THREE.MathUtils.degToRad(phone ? 18 : 16), dist = phone ? 4.6 : 3.4;
camera.position.set(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az));
camera.lookAt(target);
// Put the knight left of centre on a wide screen; the callouts take the right.
if (!phone) camera.setViewOffset(W, H, W * 0.1, 0, W, H);
camera.updateMatrixWorld();

composer.render();

// ---- overlay: drawing-sheet callouts, projected from the scene -------------------
const scr = (v: THREE.Vector3) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H]; };
const [nx, ny] = scr(nozzle);
const [tx, ty] = scr(new THREE.Vector3(0, TOP, 0));
const [bx, by] = scr(new THREE.Vector3(0, 0, 0));
const svg = document.querySelector('svg')!;
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
const labelX = phone ? W - 24 : W * 0.66;
svg.innerHTML = `
  <line x1="${bx}" y1="${by + 30}" x2="${tx}" y2="${ty - 40}" class="centre"/>
  <polyline points="${nx + 6},${ny} ${nx + 60},${ny - 46} ${labelX},${ny - 46}" class="lead"/>
  <circle cx="${nx}" cy="${ny}" r="3.5" class="dot"/>
`;
const lab = document.querySelector<HTMLElement>('[data-lab]')!;
lab.style.left = phone ? "auto" : `${labelX - 330}px`;
lab.style.right = phone ? '24px' : 'auto';
lab.style.top = `${ny - 46 - 70}px`;
await finish(renderer);

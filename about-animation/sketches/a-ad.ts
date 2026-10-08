/**
 * Style frame A, "Ad cut": the ball in flight, catching fire, shot like a
 * sportswear spot. Long lens, black studio, a cold rim against the warm fire.
 *
 *  - felt: 32 fuzz shells over a physical base (sheen), parted at the seam
 *  - fire: a raymarched volume blown back from the trailing face, with smoke
 *  - sparks: streaks along the same wind, and a few out-of-focus embers
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { seamPoint } from '../../../brandongreene-site/src/scripts/intro/shapes';
import { setup, finish, phone, rng } from './common';

const R = 0.62;
const WIND = new THREE.Vector3(1, 0.42, -0.35).normalize();        // flames stream this way
const IGN = new THREE.Vector3(0.75, -0.25, -0.55).normalize();     // where the burn started (trailing side)
const BURN = 0.4;                                                   // how far the front has spread

const { renderer, scene, camera, composer, W, H } = setup({
  exposure: 0.95, bloom: [0.6, 0.5, 1.0], grade: { vignette: 0.6, grain: 0.045, fringe: 0.0012, lift: [0.0, 0.006, 0.012] },
});
scene.background = new THREE.Color('#030407');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.12;

// ---- the seam, as an angular-distance map over the sphere (equirect) ----------
const SW = 1024, SH = 512;
const seamTex = (() => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 1400; i++) pts.push(seamPoint((i / 1400) * Math.PI * 2).normalize());
  const data = new Uint8Array(SW * SH);
  const d = new THREE.Vector3();
  for (let y = 0; y < SH; y++) {
    const lat = (0.5 - (y + 0.5) / SH) * Math.PI;
    for (let x = 0; x < SW; x++) {
      const lon = ((x + 0.5) / SW) * Math.PI * 2 - Math.PI;
      d.set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      let best = -1;
      for (const p of pts) { const c = p.x * d.x + p.y * d.y + p.z * d.z; if (c > best) best = c; }
      const ang = Math.acos(Math.min(1, best));            // radians to the seam
      data[y * SW + x] = Math.min(255, Math.round((ang / 0.12) * 255));
    }
  }
  const t = new THREE.DataTexture(data, SW, SH, THREE.RedFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
})();

// ---- burn and felt, injected into a physical material ---------------------------
const BURN_GLSL = /* glsl */ `
uniform vec3 uIgn;
uniform float uBurn;
uniform sampler2D uSeam;
float burnT(vec3 n) {
  float a = acos(clamp(dot(n, uIgn), -1.0, 1.0)) / 3.14159265;
  float w = sin(7.1 * n.x + 3.3 * n.y) * sin(5.3 * n.y - 2.1 * n.z) * sin(6.7 * n.z + 1.7 * n.x);
  float w2 = sin(17.0 * n.x - 9.0 * n.z) * sin(13.0 * n.y + 11.0 * n.x) * 0.5;
  return clamp(a * 0.9 + 0.05 + w * 0.08 + w2 * 0.03, 0.0, 1.0);
}
const float SEAM_W = 0.036;   // half-width of the seam, radians
float seamDist(vec3 n) {   // radians
  vec2 uv = vec2(atan(n.x, n.z) / 6.2831853 + 0.5, 0.5 + asin(clamp(n.y, -1.0, 1.0)) / 3.14159265);
  return texture2D(uSeam, uv).r * 0.12;
}
float h31(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
vec3 blackbody(float t) {
  return mix(mix(vec3(0.5, 0.04, 0.0), vec3(1.0, 0.38, 0.05), smoothstep(0.0, 0.5, t)), vec3(1.0, 0.92, 0.7), smoothstep(0.5, 1.0, t));
}`;
const shared = { uIgn: { value: IGN }, uBurn: { value: BURN }, uSeam: { value: seamTex } };

function feltMaterial(shell: number) {
  // shell: 0 = the base surface, (0,1] = height through the fuzz
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d2f01a'), roughness: 0.95, sheen: 1, sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#f4ffb8'), side: shell ? THREE.FrontSide : THREE.DoubleSide,
    transparent: false,
  });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, shared, { uShell: { value: shell } });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDir;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = normalize(position);');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vDir;\nuniform float uShell;\n${BURN_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 n = normalize(vDir);
        float edge = burnT(n) - uBurn - uShell * 0.02;   // fuzz goes a moment before the felt
        if (edge < 0.0) discard;
        float sd = seamDist(n);
        if (uShell > 0.0) {
          // Fibres: a random strand per tiny cell, fewer and thinner further out, curling.
          vec3 q = n * 520.0 + vec3(sin(n.y * 40.0), cos(n.z * 37.0), sin(n.x * 43.0)) * uShell * 2.2;
          float strand = h31(floor(q));
          float keep = 0.30 + uShell * 0.62;
          if (strand < keep || sd < SEAM_W + 0.006 + uShell * 0.014) discard;
          diffuseColor.rgb *= mix(0.55, 1.12, uShell);
        } else {
          // The seam: a strip of white rubber, the felt pressed down beside it.
          float rubber = 1.0 - smoothstep(SEAM_W - 0.003, SEAM_W + 0.002, sd);
          diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.6, 1.0, smoothstep(SEAM_W, SEAM_W + 0.02, sd)), vec3(0.93, 0.92, 0.88), rubber);
        }
        // Char runs ahead of the flame.
        diffuseColor.rgb *= mix(0.03, 1.0, smoothstep(0.0, 0.09, edge));
        if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.03, 0.025, 0.02);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float hot = 1.0 - smoothstep(0.0, 0.06, edge);
        totalEmissiveRadiance += blackbody(hot * 0.55) * hot * hot * 1.3;`);
  };
  m.customProgramCacheKey = () => (shell ? 'felt-shell' : 'felt-base');
  return m;
}

const ball = new THREE.Group();
const sphere = new THREE.SphereGeometry(R, 192, 128);
ball.add(new THREE.Mesh(sphere, feltMaterial(0)));
const SHELLS = 32;
for (let i = 1; i <= SHELLS; i++) {
  const m = new THREE.Mesh(sphere, feltMaterial(i / SHELLS));
  m.scale.setScalar(1 + (i / SHELLS) * 0.035);
  ball.add(m);
}
scene.add(ball);

// ---- light -----------------------------------------------------------------------
const rim = new THREE.DirectionalLight('#9ff6ff', 4.5);       // cold edge on the leading side
rim.position.set(-2.2, 1.3, -4.2);
const top = new THREE.DirectionalLight('#fff4e6', 1.6);
top.position.set(-1.8, 3.2, 2.4);
const fireLight = new THREE.PointLight('#ff7a22', 9, 3.5, 1.6);
fireLight.position.copy(IGN.clone().multiplyScalar(R * 1.35).add(WIND.clone().multiplyScalar(0.18)));
const fireLight2 = new THREE.PointLight('#ffb050', 3, 2.5, 1.6);
fireLight2.position.copy(IGN.clone().multiplyScalar(R * 1.1).add(new THREE.Vector3(0, 0.35, 0.3)));
scene.add(rim, top, fireLight, fireLight2);

// ---- huge type behind it, the way a spot would set a word ---------------------------
await document.fonts.load('800 100px Unbounded');
{
  const c = document.createElement('canvas');
  c.width = 4096; c.height = 1024;
  const g = c.getContext('2d')!;
  g.font = '800 600px Unbounded';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(238,242,247,0.05)';
  g.fillText('TENNIS', 2048, 560);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  plane.position.set(0.25, 0.12, -3.2);
  scene.add(plane);
}

// ---- sparks: streaks blown along the wind ------------------------------------------
{
  const rand = rng(7);
  const pos: number[] = [], col: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), dir = new THREE.Vector3(), n = new THREE.Vector3();
  const burnT = (v: THREE.Vector3) => {
    const a = Math.acos(Math.max(-1, Math.min(1, v.dot(IGN)))) / Math.PI;
    const w = Math.sin(7.1 * v.x + 3.3 * v.y) * Math.sin(5.3 * v.y - 2.1 * v.z) * Math.sin(6.7 * v.z + 1.7 * v.x);
    return a * 0.9 + 0.05 + w * 0.08;
  };
  let made = 0;
  while (made < 340) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    n.set(s * Math.cos(th), u, s * Math.sin(th));
    if (Math.abs(burnT(n) - BURN) > 0.08 || n.dot(WIND) < -0.1) continue;
    const d = Math.pow(rand(), 0.7) * 2.2;
    const side = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5 * d);
    p.copy(n).multiplyScalar(R).addScaledVector(WIND, d).addScaledVector(up, 0.22 * d * d).add(side);
    dir.copy(WIND).addScaledVector(up, 0.45 * d).normalize();
    const len = 0.02 + rand() * 0.07 * (1 + d);
    pos.push(p.x, p.y, p.z, p.x - dir.x * len, p.y - dir.y * len, p.z - dir.z * len);
    const heat = Math.max(0, 1 - d / 2.4) * (0.5 + rand());
    const c = [3.2 * heat + 0.4, 1.3 * heat + 0.08, 0.35 * heat];
    col.push(...c, ...c.map((v) => v * 0.15));
    made++;
  }
  const g = new LineSegmentsGeometry();
  g.setPositions(pos);
  g.setColors(col);
  const m = new LineMaterial({ linewidth: 0.0045, worldUnits: true, vertexColors: true, transparent: true, depthWrite: false });
  m.blending = THREE.AdditiveBlending;
  m.resolution.set(W * devicePixelRatio, H * devicePixelRatio);
  scene.add(new LineSegments2(g, m));
}

// ---- camera ------------------------------------------------------------------------
camera.fov = phone ? 34 : 22;
camera.position.set(phone ? -0.2 : -0.6, phone ? -0.1 : -0.35, phone ? 4.6 : 5.3);
camera.lookAt(phone ? 0.25 : 0.45, phone ? 0.35 : 0.22, 0);
if (!phone) camera.setViewOffset(W, H, -W * 0.06, 0, W, H);
camera.updateProjectionMatrix();
camera.updateMatrixWorld();

// ---- fire: a raymarched volume, at half resolution ------------------------------------
const NS = 128, PERIOD = 8;
const noiseTex = (() => {
  // Tileable gradient noise, baked into a 3D texture so the march costs one fetch per octave.
  const rand = rng(99);
  const grads: number[][] = [];
  for (let i = 0; i < PERIOD ** 3; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    grads.push([s * Math.cos(th), u, s * Math.sin(th)]);
  }
  const G = (x: number, y: number, z: number) => grads[((x % PERIOD) * PERIOD + (y % PERIOD)) * PERIOD + (z % PERIOD)];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const data = new Uint8Array(NS ** 3);
  for (let z = 0; z < NS; z++) for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
    const px = (x / NS) * PERIOD, py = (y / NS) * PERIOD, pz = (z / NS) * PERIOD;
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    const fx = px - ix, fy = py - iy, fz = pz - iz;
    let v = 0;
    for (let c = 0; c < 8; c++) {
      const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
      const g = G(ix + dx, iy + dy, iz + dz);
      const dot = g[0] * (fx - dx) + g[1] * (fy - dy) + g[2] * (fz - dz);
      const wx = dx ? fade(fx) : 1 - fade(fx), wy = dy ? fade(fy) : 1 - fade(fy), wz = dz ? fade(fz) : 1 - fade(fz);
      v += dot * wx * wy * wz;
    }
    data[(z * NS + y) * NS + x] = Math.max(0, Math.min(255, Math.round((v * 0.9 + 0.5) * 255)));
  }
  const t = new THREE.Data3DTexture(data, NS, NS, NS);
  t.format = THREE.RedFormat;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
})();

const FW = Math.round(W * devicePixelRatio), FH = Math.round(H * devicePixelRatio);
const fireRT = new THREE.WebGLRenderTarget(FW, FH, { type: THREE.HalfFloatType });
const fireMat = new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3,
  uniforms: {
    uNoise: { value: noiseTex },
    uInvProj: { value: camera.projectionMatrixInverse },
    uCamWorld: { value: camera.matrixWorld },
    uCam: { value: camera.position },
    uWind: { value: WIND }, uIgn: { value: IGN }, uBurn: { value: BURN }, uR: { value: R },
  },
  vertexShader: `out vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    precision highp sampler3D;
    uniform sampler3D uNoise;
    uniform mat4 uInvProj, uCamWorld;
    uniform vec3 uCam, uWind, uIgn;
    uniform float uBurn, uR;
    in vec2 vUv;
    out vec4 outColor;
    float n3(vec3 p) { return texture(uNoise, p / ${PERIOD.toFixed(1)}).r * 2.0 - 1.0; }
    float fbm(vec3 p) {
      float s = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { s += a * n3(p); p = p * 2.02 + vec3(3.1, 1.7, 5.3); a *= 0.5; }
      return s;
    }
    float burnT(vec3 n) {
      float a = acos(clamp(dot(n, uIgn), -1.0, 1.0)) / 3.14159265;
      float w = sin(7.1 * n.x + 3.3 * n.y) * sin(5.3 * n.y - 2.1 * n.z) * sin(6.7 * n.z + 1.7 * n.x);
      float w2 = sin(17.0 * n.x - 9.0 * n.z) * sin(13.0 * n.y + 11.0 * n.x) * 0.5;
      return clamp(a * 0.9 + 0.05 + w * 0.08 + w2 * 0.03, 0.0, 1.0);
    }
    vec3 blackbody(float t) {
      vec3 c = mix(vec3(0.3, 0.015, 0.0), vec3(1.0, 0.2, 0.01), smoothstep(0.0, 0.35, t));
      c = mix(c, vec3(1.0, 0.48, 0.05), smoothstep(0.35, 0.65, t));
      c = mix(c, vec3(1.0, 0.78, 0.25), smoothstep(0.65, 0.88, t));
      return mix(c, vec3(1.0, 0.95, 0.7), smoothstep(0.9, 1.0, t));
    }
    // Emission and extinction at p (ball at the origin).
    void sampleFire(vec3 p, out vec3 em, out float ext) {
      em = vec3(0.0); ext = 0.0;
      float along = max(dot(p, uWind), 0.0);
      // Buoyancy bends the plume up as it goes; it also spreads.
      vec3 q = p - vec3(0.0, 0.2 * along * along, 0.0);
      vec3 perp = q - uWind * dot(q, uWind);
      q = uWind * dot(q, uWind) + perp / (1.0 + along * 0.5);
      q += 0.1 * vec3(n3(p * 2.3 + 11.0), n3(p * 2.3 + 23.0), n3(p * 2.3 + 37.0)) * (0.3 + along);
      float pw = dot(q, uWind);
      float disc = pw * pw - dot(q, q) + uR * uR;
      if (disc < 0.0) return;
      float t = pw - sqrt(disc);           // how far this bit of flame has travelled
      if (t < 0.0) return;
      vec3 n = normalize(q - uWind * t);   // where on the ball it left from
      float bt = burnT(n);
      float front = exp(-pow((bt - uBurn) / 0.07, 2.0));
      float src = max(front, step(bt, uBurn) * 0.4);
      if (src < 0.02) return;
      vec3 flow = p * 4.2 - uWind * (t * 4.5);
      flow += 0.35 * vec3(n3(flow * 0.7 + 5.0), n3(flow * 0.7 + 9.0), n3(flow * 0.7 + 13.0));
      float tongues = fbm(flow) * 0.5 + 0.5;
      float th = 0.47 + t * 0.3;
      float d = smoothstep(th, th + 0.07, tongues) * src * exp(-t * 1.5);
      float temp = clamp(d * 1.1 + (0.85 - t * 1.3) * 0.5, 0.0, 1.0) * smoothstep(0.0, 0.08, t) * 0.25 + clamp(d * 1.1 + (0.85 - t * 1.3) * 0.5, 0.0, 1.0) * 0.75;
      em = blackbody(temp) * d * 9.0;
      ext = d * 9.0;
      // Smoke further downwind, faintly lit from below by the flame.
      float sm = smoothstep(0.25, 0.9, t) * smoothstep(0.5, 0.72, fbm(flow * 0.55 + 7.0) * 0.5 + 0.5) * src * exp(-t * 0.7);
      ext += sm * 4.0;
      em += vec3(0.5, 0.2, 0.07) * sm * 0.5 * exp(-t * 1.8);
    }
    float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main() {
      vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec3 rd = normalize((uCamWorld * vec4(v.xyz / v.w, 0.0)).xyz);
      vec3 ro = uCam;
      // Bounding sphere of the plume.
      vec3 c = uWind * 1.0 + vec3(0.0, 0.25, 0.0);
      float rad = 2.7;
      vec3 oc = ro - c;
      float b = dot(oc, rd), cc = dot(oc, oc) - rad * rad, h = b * b - cc;
      if (h < 0.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      float t0 = max(-b - sqrt(h), 0.0), t1 = -b + sqrt(h);
      // Stop at the ball.
      float bb = dot(ro, rd), bc = dot(ro, ro) - uR * uR * 1.07, bh = bb * bb - bc;
      if (bh > 0.0) t1 = min(t1, -bb - sqrt(bh));
      const int STEPS = 200;
      float dt = (t1 - t0) / float(STEPS);
      float t = t0 + dt * h12(gl_FragCoord.xy);
      vec3 col = vec3(0.0);
      float T = 1.0;
      for (int i = 0; i < STEPS; i++) {
        vec3 em; float ext;
        sampleFire(ro + rd * t, em, ext);
        col += T * em * dt;
        T *= exp(-ext * dt);
        if (T < 0.01) break;
        t += dt;
      }
      outColor = vec4(col, T);
    }`,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fireMat);
const fireScene = new THREE.Scene();
fireScene.add(quad);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const t0 = performance.now();
renderer.setRenderTarget(fireRT);
renderer.render(fireScene, ortho);
renderer.setRenderTarget(null);
console.log(`fire ${(performance.now() - t0).toFixed(0)} ms`);

const fireComposite = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tFire: { value: fireRT.texture } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tFire; varying vec2 vUv;
    void main() { vec4 s = texture2D(tDiffuse, vUv); vec4 f = texture2D(tFire, vUv); gl_FragColor = vec4(s.rgb * f.a + f.rgb, 1.0); }`,
});
// ShaderPass clones its uniforms, which drops render-target textures; set it after.
fireComposite.uniforms.tFire.value = fireRT.texture;
composer.insertPass(fireComposite, 1);
composer.render();
await finish(renderer);

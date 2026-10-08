/**
 * Style frame B, "Real to scan": the current intro's idea, shot properly. A
 * scanning sheet climbs the real ball; below it the felt is gone and the ball
 * is points, which peel away and stream left to build the next thing, the
 * chess knight (the site's own knight, shapes.ts).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { knight } from '../../../brandongreene-site/src/scripts/intro/shapes';
import { setup, finish, phone, rng } from './common';
import { feltBall, R } from './felt';

const { renderer, scene, camera, composer, W, H } = setup({
  exposure: 1.0, bloom: [0.55, 0.4, 1.0], grade: { vignette: 0.55, grain: 0.035, fringe: 0.0012, lift: [0, 0.004, 0.01] },
});
scene.background = new THREE.Color('#04050a');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.15;

const BALL = new THREE.Vector3(phone ? 0 : 0.8, phone ? 0.75 : 0, 0);
const KNIGHT = new THREE.Vector3(phone ? 0 : -1.3, phone ? -0.95 : 0.02, 0);
const SCAN_Y = BALL.y + 0.02;

// ---- the ball, cut by the scan ------------------------------------------------------
const ball = feltBall({
  decl: 'uniform float uScanY;',
  edge: '(vW.y - uScanY) * 1.6',
  fuzzLead: 0.0,
  charWidth: 0.035,
  charColor: 'vec3(0.05, 0.35, 0.4)',
  glow: 'totalEmissiveRadiance += vec3(0.3, 0.95, 1.0) * pow(1.0 - smoothstep(0.0, 0.05, edge), 2.0) * 2.5;',
  uniforms: { uScanY: { value: SCAN_Y } },
});
ball.position.copy(BALL);
ball.rotation.set(0.2, -0.5, 0.1);
scene.add(ball);

// ---- the points: the scanned half, peeling off toward the knight ----------------------
{
  const N = phone ? 50000 : 80000;
  const rand = rng(5);
  const kn = knight(N, 12);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  const d = new THREE.Vector3(), s = new THREE.Vector3(), t = new THREE.Vector3(), p = new THREE.Vector3();
  const ease = (x: number) => x * x * (3 - 2 * x);
  let i = 0;
  while (i < N) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    d.set(r * Math.cos(th), u, r * Math.sin(th));
    s.copy(d).multiplyScalar(R).add(BALL);
    if (s.y > SCAN_Y) continue;
    // How long ago the sheet passed this spot (0 = just now, 1 = the bottom of the ball).
    const ago = (SCAN_Y - s.y) / (SCAN_Y - (BALL.y - R));
    const k = Math.max(0, Math.min(1, ago * 2.0 - 0.35 - rand() * 0.35));
    const e = ease(k);
    t.set(kn[3 * i], kn[3 * i + 1], kn[3 * i + 2]).multiplyScalar(0.92).add(KNIGHT);
    p.copy(s).lerp(t, e);
    // An arc out toward the camera and up, with some turbulence, while in flight.
    const arc = Math.sin(Math.PI * k);
    p.x += Math.sin(i * 0.37 + k * 6) * 0.07 * arc;
    p.y += 0.32 * arc + Math.cos(i * 0.53 + k * 5) * 0.07 * arc;
    p.z += 0.45 * arc + Math.sin(i * 0.71 - k * 4) * 0.08 * arc;
    pos.set([p.x, p.y, p.z], 3 * i);
    // Fresh points are white-hot from the sheet; they cool to ice in flight.
    const fresh = Math.exp(-ago * 22);
    const c = [0.3 + fresh * 1.6, 0.95 + fresh * 0.9, 1.0 + fresh * 0.6].map((v) => v * (k > 0.98 ? 0.75 : 1));
    col.set(c, 3 * i);
    size[i] = 0.7 + rand() * 0.6 + fresh * 0.8;
    i++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: (H * devicePixelRatio) / (2 * Math.tan((26 * Math.PI) / 360)) } },
    vertexShader: `attribute float aSize; attribute vec3 color; varying vec3 vC; uniform float uPx;
      void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(0.0062 * aSize * uPx / -mv.z, 1.0, 20.0); }`,
    fragmentShader: `varying vec3 vC; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d); gl_FragColor = vec4(vC * a * 0.55, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(g, m));
}

// ---- the scanning sheet: a thin plane of light, and its ring on the ball -------------
{
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.ShaderMaterial({
    uniforms: { uC: { value: BALL } },
    vertexShader: 'varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
    fragmentShader: `varying vec3 vW; uniform vec3 uC;
      // Only a hair's depth of the sheet glows, so from the camera it reads as a line.
      void main() { float a = exp(-abs(vW.z) * 60.0) * (exp(-abs(vW.x - uC.x) * 0.9) * 0.9 + 0.12);
        gl_FragColor = vec4(vec3(0.3, 0.95, 1.0) * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(BALL.x, SCAN_Y, 0);
  scene.add(sheet);
  const rr = Math.sqrt(R * R - (SCAN_Y - BALL.y) ** 2) * 1.004, ring: number[] = [];
  for (let k = 0; k < 256; k++) {
    const a0 = (k / 256) * Math.PI * 2, a1 = ((k + 1) / 256) * Math.PI * 2;
    ring.push(BALL.x + rr * Math.cos(a0), SCAN_Y, rr * Math.sin(a0), BALL.x + rr * Math.cos(a1), SCAN_Y, rr * Math.sin(a1));
  }
  const g = new LineSegmentsGeometry();
  g.setPositions(ring);
  const m = new LineMaterial({ color: new THREE.Color(0.6, 2.4, 2.8), linewidth: 0.006, worldUnits: true, transparent: true, depthWrite: false });
  m.blending = THREE.AdditiveBlending;
  m.resolution.set(W * devicePixelRatio, H * devicePixelRatio);
  scene.add(new LineSegments2(g, m));
}

// ---- light --------------------------------------------------------------------------
const key = new THREE.DirectionalLight('#fff4e6', 2.2);
key.position.set(-1.5, 3.4, 2.6);
const rim = new THREE.DirectionalLight('#9ff6ff', 4.0);
rim.position.set(2.5, 1.2, -3.8);
scene.add(key, rim);

// ---- camera -------------------------------------------------------------------------
camera.fov = phone ? 40 : 26;
camera.position.set(phone ? 0.3 : 0.05, phone ? 0.3 : 0.42, phone ? 5.2 : 5.4);
camera.lookAt(phone ? 0 : -0.15, phone ? -0.05 : -0.02, 0);
camera.updateProjectionMatrix();
camera.updateMatrixWorld();
composer.render();

// ---- overlay ------------------------------------------------------------------------
const scr = (v: THREE.Vector3) => { const q = v.clone().project(camera); return [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H]; };
const [lx, ly] = scr(new THREE.Vector3(BALL.x + R * 1.05, SCAN_Y, 0));
const svg = document.querySelector('svg')!;
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
const end = phone ? W - 24 : W - 40;
svg.innerHTML = `<line x1="${lx + 14}" y1="${ly}" x2="${end}" y2="${ly}" class="lead"/>`;
const lab = document.querySelector<HTMLElement>('[data-lab]')!;
lab.style.top = `${ly - 30}px`;
await finish(renderer);

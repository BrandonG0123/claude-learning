/**
 * Shared by the 3D style frames: a renderer that draws into a half-float
 * buffer, then bloom, then a film grade (vignette, grain, a touch of lens
 * fringing). Stills only, so nothing here is tuned for speed.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const phone = location.search.includes('phone');

export function setup(opts: { exposure?: number; bloom?: [number, number, number]; grade?: Partial<Grade> } = {}) {
  const canvas = document.querySelector('canvas')!;
  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);

  const target = new THREE.WebGLRenderTarget(W * dpr, H * dpr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(dpr);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const [strength, radius, threshold] = opts.bloom ?? [0.6, 0.5, 0.8];
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), strength, radius, threshold);
  composer.addPass(bloom);
  const grade = new ShaderPass(gradeShader({ ...DEFAULT_GRADE, ...opts.grade }));
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return { renderer, scene, camera, composer, bloom, grade, W, H, extra: [] as ShaderPass[] };
}

interface Grade { vignette: number; grain: number; fringe: number; lift: [number, number, number]; }
const DEFAULT_GRADE: Grade = { vignette: 0.35, grain: 0.035, fringe: 0.0015, lift: [0.0, 0.0, 0.0] };

function gradeShader(g: Grade) {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uVignette: { value: g.vignette }, uGrain: { value: g.grain }, uFringe: { value: g.fringe },
      uLift: { value: new THREE.Vector3(...g.lift) },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uVignette, uGrain, uFringe; uniform vec3 uLift;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 c = vUv - 0.5;
        vec2 off = c * uFringe * length(c) * 4.0;
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        col += uLift * (1.0 - col);
        float v = 1.0 - uVignette * smoothstep(0.25, 0.95, length(c * vec2(1.15, 1.0)) * 1.25);
        col *= v;
        col += (hash(gl_FragCoord.xy) - 0.5) * uGrain;
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`,
  };
}

/** Deterministic random numbers (same as the site's shapes.ts). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function finish(renderer?: THREE.WebGLRenderer) {
  // Reading a pixel back blocks until the GPU has actually finished the frame.
  if (renderer) { const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
  await document.fonts.ready;
  // Two frames so the overlay has painted before the screenshot.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  (window as unknown as { __done: boolean }).__done = true;
}

export const NOISE_GLSL = /* glsl */ `
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
// Gradient noise, -1..1
float gnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                 mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
             mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                 mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}
float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * gnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}`;

/**
 * The photoreal tennis ball shared by the frames: a physical felt base with
 * the seam drawn into it, and fuzz shells over it that part at the seam. A
 * pluggable "edge" (GLSL, >= 0 keeps the felt) lets each frame eat the ball
 * its own way: a burn front, a scan line.
 */
import * as THREE from 'three';
import { seamPoint } from '../../../brandongreene-site/src/scripts/intro/shapes';

export const R = 0.62;

let seamCache: THREE.DataTexture | null = null;
/** Angular distance to the seam over the sphere, as an equirect map (0…0.12 rad). */
function seamTexture() {
  if (seamCache) return seamCache;
  const SW = 1024, SH = 512;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 1400; i++) pts.push(seamPoint((i / 1400) * Math.PI * 2).normalize());
  const data = new Uint8Array(SW * SH);
  for (let y = 0; y < SH; y++) {
    const lat = (0.5 - (y + 0.5) / SH) * Math.PI;
    for (let x = 0; x < SW; x++) {
      const lon = ((x + 0.5) / SW) * Math.PI * 2 - Math.PI;
      const dx = Math.cos(lat) * Math.sin(lon), dy = Math.sin(lat), dz = Math.cos(lat) * Math.cos(lon);
      let best = -1;
      for (const p of pts) { const c = p.x * dx + p.y * dy + p.z * dz; if (c > best) best = c; }
      data[y * SW + x] = Math.min(255, Math.round((Math.acos(Math.min(1, best)) / 0.12) * 255));
    }
  }
  const t = new THREE.DataTexture(data, SW, SH, THREE.RedFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return (seamCache = t);
}

const FELT_GLSL = /* glsl */ `
uniform sampler2D uSeam;
const float SEAM_W = 0.036;
float seamDist(vec3 n) {
  vec2 uv = vec2(atan(n.x, n.z) / 6.2831853 + 0.5, 0.5 + asin(clamp(n.y, -1.0, 1.0)) / 3.14159265);
  return texture2D(uSeam, uv).r * 0.12;
}
float h31(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
vec3 blackbody(float t) {
  return mix(mix(vec3(0.5, 0.04, 0.0), vec3(1.0, 0.38, 0.05), smoothstep(0.0, 0.5, t)), vec3(1.0, 0.92, 0.7), smoothstep(0.5, 1.0, t));
}`;

export interface FeltOptions {
  /** GLSL declarations (uniforms, functions) the edge needs. */
  decl?: string;
  /** GLSL expression for the edge; n = object-space direction, vW = world position. Negative is gone. */
  edge?: string;
  /** How far ahead of the felt the fuzz goes, in edge units. */
  fuzzLead?: number;
  /** Width over which the edge darkens (char) or tints. */
  charWidth?: number;
  charColor?: string;
  /** GLSL adding light at the edge: has `edge`, adds to totalEmissiveRadiance. */
  glow?: string;
  uniforms?: Record<string, THREE.IUniform>;
  shells?: number;
}

export function feltBall(o: FeltOptions = {}) {
  const uniforms = { uSeam: { value: seamTexture() }, ...(o.uniforms ?? {}) };
  const edge = o.edge ?? '1.0';
  const mat = (shell: number) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#d2f01a'), roughness: 0.95, sheen: 1, sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#f4ffb8'), side: shell ? THREE.FrontSide : THREE.DoubleSide,
    });
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms, { uShell: { value: shell } });
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vDir;\nvarying vec3 vW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = normalize(position);')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vDir;\nvarying vec3 vW;\nuniform float uShell;\n${FELT_GLSL}\n${o.decl ?? ''}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 n = normalize(vDir);
          float edge = (${edge}) - uShell * ${(o.fuzzLead ?? 0.02).toFixed(4)};
          if (edge < 0.0) discard;
          float sd = seamDist(n);
          if (uShell > 0.0) {
            vec3 q = n * 520.0 + vec3(sin(n.y * 40.0), cos(n.z * 37.0), sin(n.x * 43.0)) * uShell * 2.2;
            if (h31(floor(q)) < 0.30 + uShell * 0.62 || sd < SEAM_W + 0.006 + uShell * 0.014) discard;
            diffuseColor.rgb *= mix(0.55, 1.12, uShell);
          } else {
            float rubber = 1.0 - smoothstep(SEAM_W - 0.003, SEAM_W + 0.002, sd);
            diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.6, 1.0, smoothstep(SEAM_W, SEAM_W + 0.02, sd)), vec3(0.93, 0.92, 0.88), rubber);
          }
          diffuseColor.rgb = mix(${o.charColor ?? 'vec3(0.0)'}, diffuseColor.rgb, mix(0.03, 1.0, smoothstep(0.0, ${(o.charWidth ?? 0.09).toFixed(4)}, edge)));
          if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.03, 0.025, 0.02);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${o.glow ?? ''}`);
    };
    m.customProgramCacheKey = () => (shell ? 'felt-shell' : 'felt-base') + (o.edge ?? '');
    return m;
  };
  const group = new THREE.Group();
  const sphere = new THREE.SphereGeometry(R, 192, 128);
  group.add(new THREE.Mesh(sphere, mat(0)));
  const N = o.shells ?? 32;
  for (let i = 1; i <= N; i++) {
    const m = new THREE.Mesh(sphere, mat(i / N));
    m.scale.setScalar(1 + (i / N) * 0.035);
    group.add(m);
  }
  return group;
}

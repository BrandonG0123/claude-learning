/** Check sheet: the six printed objects and the helix, finished (top) and mid-print (bottom). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as E from '../../../brandongreene-site/src/scripts/orbit/emblems';
import { printable } from '../../../brandongreene-site/src/scripts/orbit/print';
import { setup, finish } from './common';

const { renderer, scene, camera, composer } = setup({ exposure: 1.0, bloom: [0.35, 0.3, 1.1], grade: { vignette: 0.3, grain: 0.02 } });
scene.background = new THREE.Color('#05060A');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const geos: [string, THREE.BufferGeometry, string][] = [
  ['tennis', E.tennis(), '#cfe81f'],
  ['school', E.school(), '#dfe4ec'],
  ['projects', await E.projects('/site/about/orbit/calibration.bin'), '#dfe4ec'],
  ['coding', E.coding(), '#dfe4ec'],
  ['hobbies', E.hobbies(), '#dfe4ec'],
  ['mind', E.mind(), '#dfe4ec'],
];
geos.forEach(([name, g, color], i) => {
  for (const row of [0, 1]) {
    const p = printable(row ? g.clone() : g, { color, seamColor: '#f4f2ea', layers: 46 });
    p.set(row ? 0.55 : 1, row ? 1 : 0);
    const grp = new THREE.Group();
    grp.add(p.mesh, p.ghost);
    grp.position.set((i - 2.5) * 2.35, row ? -1.25 : 1.25, 0);
    grp.rotation.y = -0.55;
    grp.rotation.x = 0.12;
    scene.add(grp);
  }
});

const key = new THREE.DirectionalLight('#fff4e6', 2.6);
key.position.set(-3, 4, 3);
const rim = new THREE.DirectionalLight('#4DF3FF', 2.2);
rim.position.set(3, 1.5, -3);
scene.add(key, rim);
camera.fov = 26;
camera.position.set(0, 0.6, 15);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();
composer.render();
await finish(renderer);

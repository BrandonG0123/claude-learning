/** Frames from the opening film, at any moment: window.__seek(t). */
import { createFilm } from '../../../brandongreene-site/src/scripts/orbit/film/scene';

const phone = location.search.includes('phone');
const canvas = document.querySelector('canvas')!;
const W = innerWidth, H = innerHeight;
const film = createFilm(canvas, W, H, devicePixelRatio);
(window as unknown as { __seek(t: number): void }).__seek = (t: number) => {
  film.render(t);
  const gl = (canvas.getContext('webgl2') as WebGL2RenderingContext);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
};
void phone;
film.render(0);
(window as unknown as { __done: boolean }).__done = true;

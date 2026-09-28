import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewport, screenToWorld, WORLD } from '../src/viewport.js';
import { createInput } from '../src/input.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('portrait camera enlarges combat while keeping the arena between HUD and controls', () => {
  const tall = createViewport(390, 844, 600);
  close(tall.visibleWidth, 600);
  close(tall.scale, .65);
  assert.ok(tall.offsetY >= 150);
  assert.ok(tall.offsetY + WORLD.height * tall.scale <= 844 - 160);
  const short = createViewport(430, 700, 600);
  close(short.offsetY, 150);
  close(short.offsetY + WORLD.height * short.scale, 700 - 160);
});

test('horizontal camera follows the player and stops at both arena boundaries', () => {
  close(createViewport(390, 844, 720).cameraX, 720);
  const left = createViewport(390, 844, 0);
  close(left.cameraX, 300);
  close(left.offsetX, 0);
  const right = createViewport(390, 844, 1200);
  close(right.cameraX, 900);
  close(right.offsetX + WORLD.width * right.scale, 390);
});

test('landscape and desktop keep the original centered fit of the complete world', () => {
  for (const [width, height] of [[1440, 1000], [844, 390], [1200, 760], [800, 1200]]) {
    const viewport = createViewport(width, height, 15);
    const scale = Math.min(width / 1200, height / 760);
    assert.equal(viewport.portrait, false);
    close(viewport.scale, scale);
    close(viewport.offsetX, (width - 1200 * scale) / 2);
    close(viewport.offsetY, (height - 760 * scale) / 2);
  }
});

test('screen-to-world mapping agrees with the camera at center and clamped edges', () => {
  for (const playerX of [0, 600, 750, 1200]) {
    const viewport = createViewport(390, 844, playerX);
    const target = { x: playerX + 35, y: 210 };
    const point = screenToWorld(viewport, target.x * viewport.scale + viewport.offsetX, target.y * viewport.scale + viewport.offsetY);
    close(point.x, target.x);
    close(point.y, target.y);
  }
});

test('a stationary mouse pointer is remapped when the player and camera move', () => {
  const originals = new Map();
  function setGlobal(name, value) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
  const target = () => ({
    listeners: new Map(), style: {},
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type) { this.listeners.delete(type); },
  });
  const canvas = target();
  canvas.getBoundingClientRect = () => ({ left: 13, top: 27, width: 390, height: 844 });
  setGlobal('window', target());
  setGlobal('document', target());
  setGlobal('navigator', { getGamepads: () => [] });
  let input;
  try {
    input = createInput(canvas, { getSettings: () => ({ manualAim: true }) });
    const viewport = createViewport(390, 844, 600);
    canvas.listeners.get('pointermove')({ pointerType: 'mouse', clientX: 13 + 280, clientY: 27 + viewport.offsetY + 380 * viewport.scale });
    const run = { state: 'playing', player: { x: 600, y: 380 } };
    close(input.sample(run).aimX, 1);
    run.player.x = 800;
    close(input.sample(run).aimX, 1);
    run.player.x = 1100;
    close(input.sample(run).aimX, -1);
  } finally {
    input?.destroy();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

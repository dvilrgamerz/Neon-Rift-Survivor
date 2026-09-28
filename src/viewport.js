export const WORLD = Object.freeze({ width: 1200, height: 760 });

/** Shared CSS-pixel camera transform; it never changes simulation coordinates. */
export function createViewport(width, height, playerX = WORLD.width / 2) {
  const portrait = width <= 600 && height > width;
  const top = portrait ? Math.min(150, height * .25) : 0;
  const bottom = portrait ? Math.min(160, height * .25) : 0;
  const availableHeight = Math.max(1, height - top - bottom);
  const scale = Math.min(width / (portrait ? 600 : WORLD.width), availableHeight / WORLD.height);
  const visibleWidth = width / scale;
  const halfWidth = Math.min(WORLD.width, visibleWidth) / 2;
  const targetX = Number.isFinite(playerX) ? playerX : WORLD.width / 2;
  const cameraX = Math.max(halfWidth, Math.min(WORLD.width - halfWidth, targetX));
  return {
    portrait, scale, cameraX, visibleWidth,
    offsetX: width / 2 - cameraX * scale,
    offsetY: top + (availableHeight - WORLD.height * scale) / 2,
  };
}

/** Coordinates are local CSS pixels within the canvas rectangle. */
export function screenToWorld(viewport, x, y) {
  return { x: (x - viewport.offsetX) / viewport.scale, y: (y - viewport.offsetY) / viewport.scale };
}

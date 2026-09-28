import { createViewport, screenToWorld } from './viewport.js';

const DEFAULT_BINDINGS = Object.freeze({ up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD', dash: 'Space', ability: 'KeyE', pause: 'Escape' });
const RESERVED_KEYS = new Set(['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Enter']);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** One input frame for every control surface. Dash and ability are edge-triggered. */
export function createInput(canvas, callbacks = {}) {
  const { onPause = () => {}, onReward = () => {}, onMenu = () => {}, onDisconnect = () => {}, getSettings = () => ({}) } = callbacks;
  const keys = new Set();
  const subscriptions = [];
  const pending = { dash: false, ability: false };
  const localBindings = {};
  const touches = new Map();
  const touchVisuals = new Map();
  const pointer = { clientX: 0, clientY: 0, active: false };
  const lastAim = { x: 1, y: 0 };
  let previousButtons = [];
  let connectedIndex = null;
  let menuActive = false;
  let menuRepeatAt = 0;
  let destroyed = false;

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    subscriptions.push(() => target.removeEventListener(type, listener, options));
  }
  function bindings() { return { ...DEFAULT_BINDINGS, ...(getSettings()?.bindings || getSettings()?.keyBindings || getSettings()?.keybindings || {}), ...localBindings }; }
  function isEditing(target) { return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]')); }
  function worldPoint(clientX, clientY, run) {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(createViewport(rect.width, rect.height, run?.player?.x), clientX - rect.left, clientY - rect.top);
  }
  function fixedMovementOrigin(rect) {
    let left=0,bottom=0;
    if(typeof getComputedStyle==='function'){
      const probe=document.createElement('div');
      probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom)';
      document.body.append(probe);const style=getComputedStyle(probe);left=parseFloat(style.paddingLeft)||0;bottom=parseFloat(style.paddingBottom)||0;probe.remove();
    }
    return {x:rect.left+Math.min(rect.width*.25,Math.max(82,left+66)),y:rect.top+rect.height-Math.min(rect.height*.3,Math.max(110,bottom+82))};
  }
  function showStick(touch) {
    let visual = touchVisuals.get(touch.id);
    if (!visual) {
      visual = document.createElement('div');
      visual.setAttribute('aria-hidden', 'true');
      const color = touch.role === 'move' ? '#64f6d2' : '#b692ff';
      visual.style.cssText = `position:fixed;left:0;top:0;width:96px;height:96px;border:1px solid ${color}66;border-radius:50%;background:${color}09;pointer-events:none;z-index:12;box-sizing:border-box;transform:translate(-50%,-50%)`;
      const knob = document.createElement('span');
      knob.style.cssText = `position:absolute;left:48px;top:48px;width:30px;height:30px;border-radius:50%;background:${color}33;border:1px solid ${color}aa;transform:translate(-50%,-50%);box-sizing:border-box`;
      visual.append(knob);
      document.body.append(visual);
      touchVisuals.set(touch.id, visual);
    }
    visual.style.left = `${touch.startX}px`;
    visual.style.top = `${touch.startY}px`;
    const dx = touch.x - touch.startX, dy = touch.y - touch.startY;
    const length = Math.hypot(dx, dy) || 1;
    const ratio = Math.min(1, 36 / length);
    visual.firstChild.style.left = `${48 + dx * ratio}px`;
    visual.firstChild.style.top = `${48 + dy * ratio}px`;
  }
  function releaseTouch(id) {
    touches.delete(id);
    touchVisuals.get(id)?.remove();
    touchVisuals.delete(id);
  }
  function reset() {
    keys.clear();
    pending.dash = false;
    pending.ability = false;
    for (const id of touches.keys()) releaseTouch(id);
  }
  function pause(reason) { reset(); onPause(reason); }

  listen(window, 'keydown', event => {
    if (isEditing(event.target)) return;
    const map = bindings();
    if (Object.values(map).includes(event.code) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === map.pause || event.code === 'Escape') { event.preventDefault(); pause('toggle'); return; }
    if (/^Digit[1-4]$/.test(event.code)) { onReward(Number(event.code.slice(-1)) - 1); return; }
    if (menuActive) {
      if (['ArrowDown', 'ArrowRight', map.down, map.right].includes(event.code)) onMenu('next');
      if (['ArrowUp', 'ArrowLeft', map.up, map.left].includes(event.code)) onMenu('prev');
      if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); onMenu('select'); }
      return;
    }
    if (event.code === map.dash) pending.dash = true;
    if (event.code === map.ability) pending.ability = true;
  });
  listen(window, 'keyup', event => keys.delete(event.code));
  listen(window, 'blur', () => pause('blur'));
  listen(document, 'visibilitychange', () => { if (document.hidden) pause('blur'); });
  listen(window, 'gamepaddisconnected', event => {
    if (getSettings()?.controller === false) return;
    if (connectedIndex === null || event.gamepad.index === connectedIndex) {
      connectedIndex = null;
      previousButtons = [];
      pause('disconnect');
      onDisconnect();
    }
  });
  listen(canvas, 'contextmenu', event => event.preventDefault());
  listen(canvas, 'pointerdown', event => {
    if (menuActive) return;
    if (event.pointerType === 'touch') {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const role = event.clientX < rect.left + rect.width / 2 ? 'move' : 'aim';
      if (role === 'aim' && !getSettings()?.manualAim) return;
      if ([...touches.values()].some(touch => touch.role === role)) return;
      const origin=role==='move'&&getSettings()?.fixedJoystick?fixedMovementOrigin(rect):{x:event.clientX,y:event.clientY};
      const touch = { id: event.pointerId, role, startX: origin.x, startY: origin.y, x: event.clientX, y: event.clientY };
      touches.set(event.pointerId, touch);
      canvas.setPointerCapture?.(event.pointerId);
      showStick(touch);
    } else {
      Object.assign(pointer, { clientX: event.clientX, clientY: event.clientY, active: true });
    }
  }, { passive: false });
  listen(canvas, 'pointermove', event => {
    const touch = touches.get(event.pointerId);
    if (touch) {
      touch.x = event.clientX; touch.y = event.clientY;
      showStick(touch);
      event.preventDefault();
    } else if (event.pointerType !== 'touch') {
      Object.assign(pointer, { clientX: event.clientX, clientY: event.clientY, active: true });
    }
  }, { passive: false });
  listen(window, 'pointerup', event => releaseTouch(event.pointerId));
  listen(window, 'pointercancel', event => releaseTouch(event.pointerId));
  listen(canvas, 'lostpointercapture', event => releaseTouch(event.pointerId));
  canvas.style.touchAction = 'none';

  function sample(run) {
    if (destroyed) return { x: 0, y: 0, aimX: 1, aimY: 0, manualAim: false, dash: false, ability: false };
    const settings = getSettings() || {};
    const map = bindings();
    let x = Number(keys.has(map.right) || keys.has('ArrowRight')) - Number(keys.has(map.left) || keys.has('ArrowLeft'));
    let y = Number(keys.has(map.down) || keys.has('ArrowDown')) - Number(keys.has(map.up) || keys.has('ArrowUp'));
    let aimX = 0, aimY = 0, aimSet = false;
    if (settings.manualAim && pointer.active && run?.player) {
      const point = worldPoint(pointer.clientX, pointer.clientY, run);
      aimX = point.x - run.player.x;
      aimY = point.y - run.player.y;
      aimSet = Math.hypot(aimX, aimY) > 3;
    }
    for (const touch of touches.values()) {
      const dx = (touch.x - touch.startX) / 38, dy = (touch.y - touch.startY) / 38;
      if (touch.role === 'move') { x = clamp(dx, -1, 1); y = clamp(dy, -1, 1); }
      else if (Math.hypot(dx, dy) > 0.15) { aimX = dx; aimY = dy; aimSet = true; pointer.active = false; }
    }
    const pads = settings.controller === false ? [] : navigator.getGamepads?.() || [];
    if (settings.controller === false) { connectedIndex = null; previousButtons = []; }
    const gamepad = [...pads].find(pad => pad && pad.connected);
    if (gamepad) {
      connectedIndex = gamepad.index;
      const pressed = index => Boolean(gamepad.buttons[index]?.pressed);
      const edge = index => pressed(index) && !previousButtons[index];
      const gx = Math.abs(gamepad.axes[0] || 0) > 0.18 ? gamepad.axes[0] : 0;
      const gy = Math.abs(gamepad.axes[1] || 0) > 0.18 ? gamepad.axes[1] : 0;
      if (Math.hypot(gx, gy) > 0.18) { x = gx; y = gy; }
      const ga = gamepad.axes[2] || 0, gb = gamepad.axes[3] || 0;
      if (Math.hypot(ga, gb) > 0.22) { aimX = ga; aimY = gb; aimSet = true; pointer.active = false; }
      if (edge(9)) pause('toggle');
      if (menuActive || (run && run.state !== 'playing' && run.state !== 'combat')) {
        const now = performance.now();
        if (edge(13) || edge(15) || ((gy > 0.5 || gx > 0.5) && now > menuRepeatAt)) { onMenu('next'); menuRepeatAt = now + 220; }
        if (edge(12) || edge(14) || ((gy < -0.5 || gx < -0.5) && now > menuRepeatAt)) { onMenu('prev'); menuRepeatAt = now + 220; }
        if (edge(0)) onMenu('select');
      } else {
        if (edge(4)) pending.dash = true;
        if (edge(5)) pending.ability = true;
      }
      previousButtons = gamepad.buttons.map(button => button.pressed);
    } else if (connectedIndex !== null && settings.controller !== false) {
      connectedIndex = null; previousButtons = [];
      pause('disconnect'); onDisconnect();
    }
    const movementLength = Math.hypot(x, y);
    if (movementLength > 1) { x /= movementLength; y /= movementLength; }
    if (aimSet) {
      const length = Math.hypot(aimX, aimY) || 1;
      lastAim.x = aimX / length; lastAim.y = aimY / length;
    }
    const frame = { x: menuActive ? 0 : x, y: menuActive ? 0 : y, aimX: lastAim.x, aimY: lastAim.y, manualAim: Boolean(settings.manualAim), dash: !menuActive && pending.dash, ability: !menuActive && pending.ability };
    if (settings.vibration && (frame.dash || frame.ability)) {
      navigator.vibrate?.(frame.ability ? 24 : 12);
      try { gamepad?.vibrationActuator?.playEffect?.('dual-rumble', { startDelay: 0, duration: frame.ability ? 70 : 40, weakMagnitude: .2, strongMagnitude: frame.ability ? .2 : .1 })?.catch?.(() => {}); } catch { /* Haptics are optional. */ }
    }
    pending.dash = false; pending.ability = false;
    return frame;
  }

  return {
    sample,
    trigger(action) { if (action === 'dash' || action === 'ability') pending[action] = true; },
    setMenuActive(active) { menuActive = Boolean(active); if (active) reset(); },
    rebind(action, key) {
      if (!(action in DEFAULT_BINDINGS)) return { ok: false, error: 'Unknown action.' };
      if (!key || (RESERVED_KEYS.has(key) && !(action === 'pause' && key === 'Escape')) || /^Arrow/.test(key)) return { ok: false, error: 'This key is reserved for navigation.' };
      const map = bindings();
      const conflict = Object.keys(map).find(other => other !== action && map[other] === key);
      if (conflict) return { ok: false, error: `Already assigned to ${conflict}.` };
      localBindings[action] = key;
      reset();
      return { ok: true, bindings: bindings() };
    },
    destroy() {
      destroyed = true;
      reset();
      for (const dispose of subscriptions) dispose();
    },
  };
}

export { DEFAULT_BINDINGS };

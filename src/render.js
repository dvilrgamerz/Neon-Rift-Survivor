import { WEAPONS } from './content.js';
import { WORLD, createViewport } from './viewport.js';
const TAU = Math.PI * 2;
const PALETTES = {
  'neon-city': { accent: '#49eaff', secondary: '#8d66ff', floor: '#0c1829', glow: '#153453' },
  'overgrown-circuit': { accent: '#90ed87', secondary: '#33cda6', floor: '#0d201c', glow: '#234d35' },
  'void-factory': { accent: '#b577ff', secondary: '#ed82bb', floor: '#1b1228', glow: '#3e2655' },
  'frozen-rift': { accent: '#71ccff', secondary: '#b7ecff', floor: '#10232d', glow: '#28526a' },
  'magma-core': { accent: '#ff7c52', secondary: '#ffc65c', floor: '#281713', glow: '#682c1d' },
  'storm-spire': { accent: '#ffe187', secondary: '#75bcff', floor: '#202027', glow: '#494933' },
  'void-cathedral': { accent: '#aa9aff', secondary: '#ed89df', floor: '#17162d', glow: '#33295b' },
  'final-rift': { accent: '#ff409a', secondary: '#8c66ff', floor: '#251025', glow: '#571b51' },
};
const OPERATOR_COLORS = { nova: '#49eaff', titan: '#ffa45c', volt: '#ffe187', ghost: '#b99aff', forge: '#ff796b', nyx: '#c492ff', echo: '#80f8c5', cryo: '#9de9ff' };
const hash = value => { const n = Math.sin(value * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
// Cosmetic history is weakly held and never enters the run or its RNG state.
const enemyFeedback = new WeakMap();

function pathPolygon(ctx, x, y, radius, sides, angle = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + i * TAU / sides;
    const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
function circle(ctx, x, y, r, fill, stroke, width = 1) {
  if (!Number.isFinite(x + y + r) || r < 0) return;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function line(ctx, x, y, x2, y2, color, width = 1) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function glow(ctx, x, y, r, color, opacity = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
  ctx.save(); ctx.globalAlpha *= opacity; ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function label(ctx, text, x, y, color = '#d5e5f3', size = 10, align = 'center') {
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(text), x, y);
}

function drawFloor(ctx, biomeId, time, quality, reducedMotion) {
  const palette = PALETTES[biomeId] || PALETTES['neon-city'];
  const t = reducedMotion ? 0 : time;
  ctx.fillStyle = '#070b13'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const floor = ctx.createRadialGradient(600, 330, 80, 600, 380, 720);
  floor.addColorStop(0, palette.floor); floor.addColorStop(1, '#080b13');
  ctx.fillStyle = floor; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  if (quality !== 'low') {
    glow(ctx, 60, 380, 400, palette.glow, 0.5);
    glow(ctx, 1140, 360, 400, palette.glow, 0.5);
  }
  ctx.strokeStyle = `${palette.accent}0c`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); }
  for (let y = 0; y <= WORLD.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); }
  ctx.stroke();
  // Each arena has unique architectural marks, kept dim below all combat cues.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = palette.accent; ctx.fillStyle = palette.glow; ctx.lineWidth = 1.4;
  if (biomeId === 'overgrown-circuit') {
    for (let i = 0; i < 16; i++) {
      const x = hash(i + 10) * 1200, y = hash(i + 45) * 760;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 100, y - 30, x - 50, y + 95, x + 30, y + 140); ctx.stroke();
      pathPolygon(ctx, x + 30, y + 140, 7 + hash(i) * 10, 3, i); ctx.fill(); ctx.stroke();
      circle(ctx, x, y, 3, palette.accent);
    }
  } else if (biomeId === 'frozen-rift') {
    for (let i = 0; i < 17; i++) {
      const x = hash(i + 6) * 1200, y = hash(i + 71) * 760;
      pathPolygon(ctx, x, y, 20 + hash(i + 12) * 50, 6, Math.PI / 6); ctx.stroke();
      for (let k = 0; k < 3; k++) line(ctx, x, y, x + Math.cos(k * TAU / 3) * 35, y + Math.sin(k * TAU / 3) * 35, palette.accent);
    }
  } else if (biomeId === 'magma-core') {
    for (let i = 0; i < 9; i++) {
      const x = i * 164 - 40, y = hash(i + 80) * 760;
      ctx.beginPath(); ctx.moveTo(x - 40, y - 100); ctx.lineTo(x + 10, y); ctx.lineTo(x - 20, y + 45); ctx.lineTo(x + 30, y + 140); ctx.stroke();
      circle(ctx, x + 10, y, 24 + Math.sin(t * 0.7 + i) * 3, null, palette.secondary);
    }
  } else if (biomeId === 'void-factory') {
    for (let y = 90; y < 760; y += 170) {
      ctx.strokeRect(60, y, 1080, 68);
      for (let x = 72; x < 1140; x += 44) {
        ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x + 12, y + 34); ctx.lineTo(x, y + 52); ctx.stroke();
      }
    }
  } else if (biomeId === 'storm-spire') {
    for (let i = 0; i < 8; i++) {
      const x = 150 + (i % 4) * 300, y = 160 + Math.floor(i / 4) * 440;
      pathPolygon(ctx, x, y, 35, 4, Math.PI / 4); ctx.stroke();
      circle(ctx, x, y, 12, null, palette.secondary); circle(ctx, x, y, 50, null, palette.accent);
      line(ctx, x, y + 60, x, y + 110, palette.accent);
    }
  } else if (biomeId === 'void-cathedral') {
    for (let i = 0; i < 6; i++) {
      const x = 120 + i * 192;
      ctx.beginPath(); ctx.moveTo(x - 60, 690); ctx.lineTo(x - 60, 215); ctx.quadraticCurveTo(x - 40, 120, x, 70); ctx.quadraticCurveTo(x + 40, 120, x + 60, 215); ctx.lineTo(x + 60, 690); ctx.stroke();
      circle(ctx, x, 310, 30, null, palette.secondary); pathPolygon(ctx, x, 310, 24, 3, -Math.PI / 2); ctx.stroke();
    }
  } else if (biomeId === 'final-rift') {
    for (let i = 0; i < 5; i++) {
      pathPolygon(ctx, 600, 380, 90 + i * 78, 6, t * 0.015 * (i % 2 ? -1 : 1) + Math.PI / 6); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      line(ctx, 600 + Math.cos(a) * 120, 380 + Math.sin(a) * 120, 600 + Math.cos(a) * 750, 380 + Math.sin(a) * 750, palette.accent);
    }
  } else {
    for (let i = 0; i < 13; i++) {
      const x = hash(i + 16) * 1120 + 40, y = hash(i + 100) * 650 + 50;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y); ctx.lineTo(x + 60, y + 25); ctx.lineTo(x + 115, y + 25); ctx.stroke();
      circle(ctx, x, y, 3, palette.accent); circle(ctx, x + 115, y + 25, 3, null, palette.accent);
    }
  }
  ctx.restore();
  // Arena boundary makes the walkable area unambiguous.
  ctx.strokeStyle = `${palette.accent}42`; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 1172, 732);
  for (const [x, y, sx, sy] of [[14, 14, 1, 1], [1186, 14, -1, 1], [14, 746, 1, -1], [1186, 746, -1, -1]]) {
    line(ctx, x, y + sy * 42, x, y, palette.accent, 3); line(ctx, x, y, x + sx * 42, y, palette.accent, 3);
  }
  label(ctx, 'RIFT // CONTAINMENT FIELD', 40, 735, `${palette.accent}55`, 9, 'left');
}

function drawHazard(ctx, hazard, highContrast, time, reducedMotion, colorblind = false) {
  const warning = (hazard.warning || 0) > 0;
  const color = warning ? '#ffd481' : hazard.type === 'safezone' ? (colorblind ? '#75d8ff' : '#80f8c5') : colorblind ? '#ffba6d' : hazard.color || '#ff638d';
  const x = hazard.x || 0, y = hazard.y || 0, radius = hazard.r || 50;
  const pulse = reducedMotion ? 1 : 0.75 + Math.sin(time * (warning ? 7 : 4)) * 0.18;
  ctx.save(); ctx.globalAlpha = pulse; ctx.lineWidth = highContrast ? 3 : 2;
  ctx.setLineDash(warning ? [9, 6] : []);
  ctx.strokeStyle = color; ctx.fillStyle = `${color}${warning ? '10' : '24'}`;
  if (hazard.type === 'line') {
    const x2 = hazard.x2 ?? x + 160, y2 = hazard.y2 ?? y;
    const angle = Math.atan2(y2 - y, x2 - x), length = Math.hypot(x2 - x, y2 - y);
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillRect(0, -(hazard.width || 24) / 2, length, hazard.width || 24);
    ctx.strokeRect(0, -(hazard.width || 24) / 2, length, hazard.width || 24);
    if (warning) for (let px = 16; px < length; px += 48) label(ctx, '!', px, 0, color, 12);
  } else if (hazard.type === 'ring') {
    circle(ctx, x, y, radius, null, color, hazard.width || 12);
    if (warning) circle(ctx, x, y, radius + 10, null, color, 1);
  } else {
    circle(ctx, x, y, radius, `${color}${warning ? '0c' : '16'}`, color, highContrast ? 3 : 2);
    ctx.setLineDash([]);
    if (hazard.type === 'silence') {
      pathPolygon(ctx, x, y, 13, 6, Math.PI / 6); ctx.stroke(); line(ctx, x - 13, y + 13, x + 13, y - 13, color, 2);
      label(ctx, 'SILENCE', x, y + 27, color, 8);
    } else if (hazard.type === 'safezone') {
      label(ctx, 'SAFE', x, y, color, 12);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; circle(ctx, x + Math.cos(a) * radius, y + Math.sin(a) * radius, 3, color); }
    } else if (warning) {
      pathPolygon(ctx, x, y, 13, 3, -Math.PI / 2); ctx.stroke(); label(ctx, '!', x, y + 1, color, 12);
      if (highContrast) label(ctx, 'DANGER', x, y + 28, color, 10);
    }
  }
  ctx.restore();
}

function drawShip(ctx, x, y, angle, color, scale = 1, active = false, time = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  // Pointed central fuselage and articulated swept-back wings.
  ctx.fillStyle = '#101b2b'; ctx.strokeStyle = color; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(21, 0); ctx.lineTo(-10, -10); ctx.lineTo(-5, 0); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(-13, -19); ctx.lineTo(-15, -7); ctx.lineTo(-8, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(-13, 19); ctx.lineTo(-15, 7); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(0, -4); ctx.lineTo(-3, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
  const flame = active ? 17 + Math.sin(time * 32) * 5 : 8;
  ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-18 - flame, 0); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; line(ctx, -12, 0, -19 - flame / 2, 0, '#e8fdff', 2);
  ctx.restore();
}

function drawEnemy(ctx, enemy, time, quality, reducedMotion, reducedFlash = false) {
  if (!(enemy.hp > 0)) return;
  const { x, y } = enemy, r = enemy.r || 12;
  const color = enemy.stun > 0 ? '#e0f3ff' : enemy.slow > 0 ? '#91dcff' : enemy.color || (enemy.type === 'boss' ? '#ff579f' : enemy.type === 'elite' ? '#ffc578' : '#fd6f92');
  const angle = enemy.angle || 0;
  const previous = enemyFeedback.get(enemy);
  const hitAt = previous && enemy.hp < previous.hp ? time : previous?.hitAt ?? -Infinity;
  enemyFeedback.set(enemy, { hp: enemy.hp, hitAt });
  const hit = !reducedMotion && !reducedFlash && time >= hitAt && time - hitAt < .11;
  ctx.save(); ctx.translate(x, y);
  // A dark separator keeps silhouettes readable when floor and enemy hues match.
  circle(ctx, 0, 0, r + 2, '#080c14d9');
  if ((quality === 'high' || quality === 'ultra') && (enemy.type === 'boss' || enemy.type === 'elite')) glow(ctx, 0, 0, r * 2.4, `${color}55`);
  if (enemy.type === 'boss') {
    const phase = enemy.phase || 1;
    const spin = reducedMotion ? 0 : time * 0.24;
    ctx.strokeStyle = `${color}77`; ctx.lineWidth = 1.4;
    pathPolygon(ctx, 0, 0, r + 15, 6, -spin); ctx.stroke();
    ctx.fillStyle = '#201229'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    const sides = /root/i.test(enemy.bossId || '') ? 5 : /cryo/i.test(enemy.bossId || '') ? 6 : /inferno/i.test(enemy.bossId || '') ? 8 : 4;
    pathPolygon(ctx, 0, 0, r, sides, spin + Math.PI / 4); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4 + phase; i++) {
      const a = i * TAU / (4 + phase) - spin;
      pathPolygon(ctx, Math.cos(a) * (r + 12), Math.sin(a) * (r + 12), 5, 3, a); ctx.fillStyle = color; ctx.fill();
    }
    circle(ctx, 0, 0, r * 0.44, '#0e111d', color, 2); circle(ctx, 0, 0, r * 0.19, color);
    if (enemy.telegraph > 0) circle(ctx, 0, 0, r + 22, null, '#ffe9a1', 3);
    label(ctx, `PHASE ${phase}`, 0, r + 34, color, 9);
  } else if (enemy.type === 'tank') {
    ctx.rotate(angle); pathPolygon(ctx, 0, 0, r, 6, Math.PI / 6); ctx.fillStyle = '#282030'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    pathPolygon(ctx, 0, 0, r * 0.56, 6, Math.PI / 6); ctx.stroke(); line(ctx, -r * 0.35, 0, r * 0.35, 0, color, 3);
  } else if (enemy.type === 'shooter') {
    ctx.rotate(angle); pathPolygon(ctx, 0, 0, r, 4, Math.PI / 4); ctx.fillStyle = '#202034'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(r * 0.35, -3, r * 0.8, 6); circle(ctx, 0, 0, 3, color);
  } else if (enemy.type === 'elite') {
    ctx.rotate(reducedMotion ? 0 : -time * 0.7); pathPolygon(ctx, 0, 0, r + 5, 5, -Math.PI / 2); ctx.strokeStyle = `${color}88`; ctx.lineWidth = 1; ctx.stroke();
    pathPolygon(ctx, 0, 0, r, 5, Math.PI / 2); ctx.fillStyle = '#312132'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); circle(ctx, 0, 0, 5, color);
  } else if (enemy.type === 'anchor') {
    pathPolygon(ctx, 0, 0, r, 3, -Math.PI / 2); ctx.fillStyle = '#1b2e24'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    line(ctx, 0, -r * 0.55, 0, r * 0.5, color, 3); circle(ctx, 0, 0, 3, '#fff');
  } else {
    ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.8, -r * 0.85); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r * 0.8, r * 0.85); ctx.closePath();
    ctx.fillStyle = '#291726'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.stroke(); circle(ctx, 1, 0, 2.4, color);
  }
  ctx.restore();
  if (hit) {
    ctx.save(); ctx.globalAlpha = (1 - (time - hitAt) / .11) * .8;
    pathPolygon(ctx, x, y, r + 3, enemy.type === 'tank' ? 6 : 4, Math.PI / 4);
    ctx.strokeStyle = '#efffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  if (enemy.marked) {
    const edge = r + 9;
    for (const [sx, sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      line(ctx, x + sx * edge, y + sy * (edge - 6), x + sx * edge, y + sy * edge, '#ffe2a8', 2);
      line(ctx, x + sx * edge, y + sy * edge, x + sx * (edge - 6), y + sy * edge, '#ffe2a8', 2);
    }
    label(ctx, 'TARGET', x, y + r + 24, '#ffe2a8', 8);
  }
  if (enemy.stun > 0) {
    line(ctx, x - 3, y - r - 16, x - 3, y - r - 10, '#e0f3ff', 2);
    line(ctx, x + 3, y - r - 16, x + 3, y - r - 10, '#e0f3ff', 2);
  } else if (enemy.slow > 0) {
    line(ctx, x - 5, y + r + 4, x, y + r + 8, '#91dcff', 1.5);
    line(ctx, x, y + r + 8, x + 5, y + r + 4, '#91dcff', 1.5);
  }
  if (enemy.type === 'boss') {
    const width=130,ratio=clamp(enemy.hp/(enemy.maxHp||enemy.hp),0,1);
    ctx.fillStyle='#070b13dd';ctx.fillRect(x-width/2-5,y-r-39,width+10,30);
    label(ctx,enemy.enraged?'ENRAGED · '+(enemy.name||'BOSS'):(enemy.name||'BOSS'),x,y-r-30,enemy.enraged?'#ffd18b':color,9);
    ctx.fillStyle='#342338';ctx.fillRect(x-width/2,y-r-20,width,5);ctx.fillStyle=color;ctx.fillRect(x-width/2,y-r-20,width*ratio,5);
    for(const threshold of [.35,.7])line(ctx,x-width/2+width*threshold,y-r-21,x-width/2+width*threshold,y-r-14,'#f2e9ff99',1);
  }
  if (enemy.brands > 0) {
    for (let i = 0; i < Math.min(3, enemy.brands); i++) circle(ctx, x - 6 + i * 6, y + r + 9, 2, '#ffc779');
  }
  if (enemy.hp < enemy.maxHp && enemy.type !== 'boss') {
    const width = Math.max(18, r * 2); ctx.fillStyle = '#040811'; ctx.fillRect(x - width / 2, y - r - 9, width, 3); ctx.fillStyle = color; ctx.fillRect(x - width / 2, y - r - 9, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 3);
  }
}

function drawBullet(ctx, bullet, time, quality) {
  const color = bullet.color || (bullet.enemy ? '#ff7796' : '#87f6e3');
  const x = bullet.x, y = bullet.y, r = bullet.r || 3;
  const weapon = bullet.weapon || '';
  ctx.save();
  if (bullet.type === 'mine' || /mine/.test(weapon)) {
    pathPolygon(ctx, x, y, r + 3, 6, time); ctx.fillStyle = `${color}22`; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); circle(ctx, x, y, 2, color);
  } else if (bullet.type === 'boomerang' || /boomerang/.test(weapon)) {
    ctx.translate(x, y); ctx.rotate(time * 10); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r - 5, 5); ctx.lineTo(0, -5); ctx.lineTo(r + 5, 5); ctx.stroke();
  } else if (/cryo|ice/.test(weapon)) {
    pathPolygon(ctx, x, y, r + 3, 4, Math.atan2(bullet.vy || 0, bullet.vx || 1)); ctx.fillStyle = color; ctx.fill();
  } else {
    const length = Math.hypot(bullet.vx || 0, bullet.vy || 0) || 1;
    const tail = bullet.enemy ? 5 : Math.min(19, length * 0.026);
    line(ctx, x - (bullet.vx || 0) / length * tail, y - (bullet.vy || 0) / length * tail, x, y, `${color}66`, r * 2);
    if ((quality === 'high' || quality === 'ultra') && !bullet.enemy) { ctx.shadowColor = color; ctx.shadowBlur = quality === 'ultra' ? 12 : 8; }
    circle(ctx, x, y, r, bullet.enemy ? color : '#ecffff', bullet.enemy ? '#ffd0dd' : color, 1);
  }
  ctx.restore();
}

function drawEffect(ctx, effect, settings) {
  const ratio = clamp((effect.life || 0) / (effect.maxLife || 0.4), 0, 1);
  const color = effect.color || '#a7eaff';
  ctx.save(); ctx.globalAlpha = ratio;
  if (effect.type === 'text') {
    const numeric = /^\d/.test(String(effect.text || ''));
    const y = effect.y - (settings.reducedMotion ? 0 : (1 - ratio) * (effect.crit ? 28 : 18));
    if (!numeric || settings.damageNumbers !== false) {
      ctx.shadowColor = '#040913'; ctx.shadowBlur = 3;
      label(ctx, effect.text || '', effect.x, y, color, effect.crit ? 19 : 12);
      if (effect.crit) label(ctx, 'CRIT', effect.x, y - 16, color, 7);
    }
  } else if (effect.type === 'beam') {
    if (effect.warning) { ctx.setLineDash([7, 6]); line(ctx, effect.x, effect.y, effect.x2 ?? effect.x, effect.y2 ?? effect.y, color, 1); ctx.restore(); return; }
    line(ctx, effect.x, effect.y, effect.x2 ?? effect.x, effect.y2 ?? effect.y, `${color}44`, 14 * ratio + 3);
    line(ctx, effect.x, effect.y, effect.x2 ?? effect.x, effect.y2 ?? effect.y, color, 4 * ratio + 1);
    if (!settings.reducedFlash) line(ctx, effect.x, effect.y, effect.x2 ?? effect.x, effect.y2 ?? effect.y, '#f4ffff', ratio + 1);
  } else if (effect.type === 'ring') {
    circle(ctx, effect.x, effect.y, effect.r || 20, `${color}08`, color, 2 * ratio + 1);
  } else if (!settings.reducedMotion && !settings.reducedFlash) {
    const r = effect.r || 10;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      line(ctx, effect.x + Math.cos(a) * r * 0.4, effect.y + Math.sin(a) * r * 0.4, effect.x + Math.cos(a) * r, effect.y + Math.sin(a) * r, color, 2);
    }
  }
  ctx.restore();
}

function drawOperatorBadge(ctx, x, y, id, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = 1.3;
  circle(ctx, 0, 0, 9, '#09111bcc', `${color}77`);
  if (id === 'titan') { pathPolygon(ctx, 0, 0, 5, 6, Math.PI / 6); ctx.stroke(); }
  else if (id === 'volt') { ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(-3, 0); ctx.lineTo(2, 0); ctx.lineTo(-2, 6); ctx.stroke(); }
  else if (id === 'ghost') { pathPolygon(ctx, 0, 0, 5, 4, 0); ctx.stroke(); }
  else if (id === 'forge') { pathPolygon(ctx, 0, 0, 5, 6, 0); ctx.stroke(); circle(ctx, 0, 0, 2, color); }
  else if (id === 'nyx') { circle(ctx, 0, 0, 5, null, color); circle(ctx, 0, 0, 2, color); }
  else if (id === 'echo') { for (let i=0;i<3;i++) circle(ctx, Math.cos(i*TAU/3)*4, Math.sin(i*TAU/3)*4, 1.6, color); }
  else { for (let i=0;i<(id==='cryo'?6:4);i++){const angle=i*TAU/(id==='cryo'?6:4);line(ctx,0,0,Math.cos(angle)*6,Math.sin(angle)*6,color,1.4);} }
  ctx.restore();
}

function drawWeaponSatellites(ctx, run) {
  const player=run.player, time=run.time||0;
  if(!player||player.downed)return;
  if(run.weapons?.guard){
    const level=run.weapons.guard,definition=WEAPONS.find(w=>w.id==='guard'),count=Math.max(2,definition?.levels?.[level-1]?.count||2),radius=(65+level*4)*(run.relics?.includes('orbit-lens')?1.25:1);
    for(let i=0;i<count;i++){const angle=time*2.5+i*TAU/count,x=player.x+Math.cos(angle)*radius,y=player.y+Math.sin(angle)*radius;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-5,-11);ctx.lineTo(5,-7);ctx.lineTo(5,11);ctx.lineTo(-5,7);ctx.closePath();ctx.fillStyle='#342d20';ctx.strokeStyle='#ffdf8b';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore();}
  }
  if(run.weapons?.['sentinel-drones']){
    const count=run.evolved?.includes('sentinel-drones')?4:2;
    for(let i=0;i<count;i++){const angle=time*1.8+i*TAU/count,x=player.x+Math.cos(angle)*65,y=player.y+Math.sin(angle)*65;pathPolygon(ctx,x,y,7,4,Math.PI/4);ctx.fillStyle='#15362e';ctx.fill();ctx.strokeStyle='#9affd8';ctx.lineWidth=1.4;ctx.stroke();line(ctx,x-11,y,x-7,y,'#9affd8',2);line(ctx,x+7,y,x+11,y,'#9affd8',2);circle(ctx,x,y,2,'#dcfff3');}
  }
}

/** Render in CSS pixels; the caller may already have applied a DPR transform. */
export function render(ctx, run, { width, height, settings = {}, now = 0 } = {}) {
  if (!ctx || !run) return;
  width ||= ctx.canvas.width; height ||= ctx.canvas.height;
  const quality = settings.performance ? 'low' : settings.quality || 'high';
  const reducedMotion = Boolean(settings.reducedMotion);
  const time = run.time || now / 1000;
  const biome = run.biome || run.config?.biome || 'neon-city';
  const palette = PALETTES[biome] || PALETTES['neon-city'];
  ctx.save();
  ctx.fillStyle = '#070b13'; ctx.fillRect(0, 0, width, height);
  const viewport = createViewport(width, height, run.player?.x);
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);
  ctx.beginPath(); ctx.rect(0, 0, WORLD.width, WORLD.height); ctx.clip();
  // Shake is cosmetic only and never changes cursor/world coordinates.
  if (settings.screenShake !== false && !reducedMotion && (run.shake || 0) > 0) {
    const intensity = Math.min(4, run.shake);
    ctx.translate(Math.sin(time * 71) * intensity, Math.cos(time * 59) * intensity);
  }
  drawFloor(ctx, biome, time, quality, reducedMotion);
  const colorblind = Boolean(settings.colorblind && settings.colorblind !== 'off');
  for (const hazard of (run.hazards || [])) drawHazard(ctx, hazard, settings.highContrast || settings.highContrastTelegraphs || colorblind, time, reducedMotion || settings.reducedFlash, colorblind);
  if(run.worldEvent?.id==='supply-drop'&&!run.worldEvent.claimed){
    const supply=run.worldEvent,color=colorblind?'#75d8ff':'#91ffd2';
    circle(ctx,supply.x,supply.y,70,`${color}08`,`${color}55`,1);
    pathPolygon(ctx,supply.x,supply.y,19,6,Math.PI/6);ctx.fillStyle='#102820';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    line(ctx,supply.x-8,supply.y,supply.x+8,supply.y,color,3);line(ctx,supply.x,supply.y-8,supply.x,supply.y+8,color,3);
    label(ctx,'SUPPLY · '+Math.ceil(supply.remaining||0)+'s',supply.x,supply.y-34,color,10);label(ctx,'HEAL + 60 SCRAP',supply.x,supply.y+33,color,8);
  }
  for (const pickup of (run.pickups || run.gems || [])) {
    const color = pickup.type === 'heal' ? '#8dffae' : pickup.type === 'scrap' ? '#ffd488' : '#70c3ff';
    pathPolygon(ctx, pickup.x, pickup.y, pickup.r || 4, 4, 0); ctx.fillStyle = color; ctx.fill();
  }
  if (run.reactor) {
    const reactor = run.reactor;
    ctx.save(); ctx.translate(reactor.x, reactor.y); ctx.strokeStyle = '#80f8c5'; ctx.lineWidth = 2;
    pathPolygon(ctx, 0, 0, (reactor.r || 25) + 9, 6, Math.PI / 6); ctx.stroke(); pathPolygon(ctx, 0, 0, reactor.r || 25, 6, reducedMotion ? 0 : time * 0.3); ctx.fillStyle = '#142d2a'; ctx.fill(); ctx.stroke();
    circle(ctx, 0, 0, 9, '#80f8c5'); label(ctx, 'REACTOR', 0, -48, '#80f8c5', 9);
    ctx.fillStyle = '#243b3b'; ctx.fillRect(-35, 43, 70, 4); ctx.fillStyle = '#80f8c5'; ctx.fillRect(-35, 43, 70 * clamp(reactor.hp / reactor.maxHp, 0, 1), 4); ctx.restore();
  }
  const suppressHitFlash = settings.reducedFlash || settings.visualEffects === false || settings.vfx === 0;
  for (const enemy of (run.enemies || [])) drawEnemy(ctx, enemy, time, quality, reducedMotion, suppressHitFlash);
  for (const bullet of (run.bullets || [])) drawBullet(ctx, bullet, time, quality);
  drawWeaponSatellites(ctx,run);
  for (const companion of run.companions || []) {
    if (companion.type === 'turret') {
      pathPolygon(ctx, companion.x, companion.y, 14, 6, Math.PI / 6); ctx.fillStyle = '#33202b'; ctx.fill(); ctx.strokeStyle = '#ffad89'; ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, companion.x, companion.y, 5, '#ffad89'); label(ctx, 'SENTRY', companion.x, companion.y + 24, '#ffad89', 8);
    } else if (companion.type === 'well') {
      circle(ctx, companion.x, companion.y, 100, '#a57aff09', '#a57aff44', 1);
      for (let i = 0; i < 3; i++) { pathPolygon(ctx, companion.x, companion.y, 13 + i * 15, 6, reducedMotion ? 0 : time * (i % 2 ? -.5 : .5)); ctx.strokeStyle = '#bd9cff99'; ctx.lineWidth = 1.5; ctx.stroke(); }
      circle(ctx, companion.x, companion.y, 10, '#0e0c19', '#c8aeff', 2);
    } else if (companion.type === 'pool') {
      circle(ctx,companion.x,companion.y,companion.r||70,'#ff7dca15','#ff7dca88',1.5);
      ctx.save();ctx.setLineDash([3,8]);circle(ctx,companion.x,companion.y,(companion.r||70)*.66,null,'#ffb0e277',1);ctx.restore();
      label(ctx,'PLASMA',companion.x,companion.y,'#ffb0e2',8);
    } else if (companion.type === 'beam-warning') {
      ctx.save();ctx.setLineDash([6,8]);line(ctx,companion.x,companion.y,companion.x2,companion.y2,'#ffe999aa',1.2);ctx.restore();
    }
  }
  for (const teammate of run.coop?.players || []) {
    if (teammate.id === run.coop.playerId) continue;
    const color = OPERATOR_COLORS[teammate.operator] || '#ffd58a';
    if (teammate.downed) {
      circle(ctx, teammate.x, teammate.y, 26, '#ffbb7312', '#ffc589', 2);
      line(ctx, teammate.x - 8, teammate.y, teammate.x + 8, teammate.y, '#ffc589', 3); line(ctx, teammate.x, teammate.y - 8, teammate.x, teammate.y + 8, '#ffc589', 3);
      if (teammate.reviveProgress > 0) { ctx.beginPath(); ctx.arc(teammate.x, teammate.y, 31, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(teammate.reviveProgress / 3, 0, 1)); ctx.strokeStyle = '#a1ffd9'; ctx.lineWidth = 3; ctx.stroke(); }
      label(ctx, 'REVIVE · STAY CLOSE', teammate.x, teammate.y + 45, '#ffc589', 9);
    } else {
      drawShip(ctx, teammate.x, teammate.y, teammate.angle || 0, color, .85, teammate.connected !== false, reducedMotion ? 0 : time);
      ctx.fillStyle = '#22303e'; ctx.fillRect(teammate.x - 19, teammate.y + 27, 38, 3); ctx.fillStyle = color; ctx.fillRect(teammate.x - 19, teammate.y + 27, 38 * clamp(teammate.hp / (teammate.maxHp || 100), 0, 1), 3);
    }
    label(ctx, `${teammate.name || teammate.operator || 'ALLY'}${teammate.connected === false ? ' · OFFLINE' : ''}`, teammate.x, teammate.y - 33, color, 9);
    drawOperatorBadge(ctx,teammate.x,teammate.y-48,teammate.operator,color);
  }
  const player = run.player;
  if (player) {
    const color = OPERATOR_COLORS[run.config?.operator || run.operator] || palette.accent;
    if (quality !== 'low' && !settings.reducedFlash) glow(ctx, player.x, player.y, 46, `${color}33`);
    const cosmetic = run.config?.cosmetic || settings.cosmetic || 'standard';
    if (cosmetic !== 'standard') {
      const signature = cosmetic.includes('gold') ? '#ffd18b' : cosmetic.includes('violet') ? '#b99aff' : cosmetic.startsWith('season-') ? '#dfa0ff' : '#8affd4';
      const angle = player.angle || 0;
      if (cosmetic.startsWith('trail-') && !reducedMotion) for (let i = 1; i <= 4; i++) circle(ctx, player.x - Math.cos(angle) * (15 + i * 11), player.y - Math.sin(angle) * (15 + i * 11), 3 - i * .4, `${signature}${['88','66','44','22'][i-1]}`);
      else { ctx.save(); ctx.setLineDash([3, 6]); circle(ctx, player.x, player.y, 36, null, `${signature}99`, 1); ctx.restore(); }
    }
    if (player.shield > 0) {
      circle(ctx, player.x, player.y, 29, `${color}06`, `${color}77`, 1.5);
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(player.x, player.y, 29, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(player.shield / (player.maxShield || player.shield), 0, 1)); ctx.stroke(); ctx.restore();
    }
    if (player.invulnerable > 0) { circle(ctx, player.x, player.y, 34, '#ffffff08', '#e1fcff', 2); }
    if (player.abilityActive > 0) {
      ctx.save(); ctx.setLineDash([6, 7]); circle(ctx, player.x, player.y, 40, null, `${color}b0`, 2); ctx.restore();
    }
    if(player.downed){
      circle(ctx,player.x,player.y,26,'#ffbb7312','#ffc589',2);line(ctx,player.x-8,player.y,player.x+8,player.y,'#ffc589',3);line(ctx,player.x,player.y-8,player.x,player.y+8,'#ffc589',3);
      if(player.reviveProgress>0){ctx.beginPath();ctx.arc(player.x,player.y,31,-Math.PI/2,-Math.PI/2+TAU*clamp(player.reviveProgress/3,0,1));ctx.strokeStyle='#a1ffd9';ctx.lineWidth=3;ctx.stroke();}
      label(ctx,'AWAITING REVIVE',player.x,player.y+52,'#ffc589',9);
    }else drawShip(ctx, player.x, player.y, player.angle || 0, color, 0.85, true, reducedMotion ? 0 : time);
    drawOperatorBadge(ctx,player.x,player.y-45,run.config?.operator||run.operator,color);
    // Tiny charge pips remain useful when eyes are centered on the player.
    for (let i = 0; i < (player.dashMax || 2); i++) {
      ctx.fillStyle = i < player.dashCharges ? color : '#314151'; ctx.fillRect(player.x - (player.dashMax || 2) * 4 + i * 8, player.y + 39, 5, 3);
    }
    if (settings.manualAim) {
      const angle = player.angle || 0;
      const x = player.x + Math.cos(angle) * 64, y = player.y + Math.sin(angle) * 64;
      circle(ctx, x, y, 7, null, `${color}77`); line(ctx, x - 10, y, x - 4, y, color); line(ctx, x + 4, y, x + 10, y, color);
    }
  }
  const effects = run.effects || [];
  const effectLimit = Math.round((settings.visualEffects === false ? 0 : quality === 'low' ? 45 : quality === 'medium' ? 100 : quality === 'ultra' ? 280 : 180) * clamp(settings.vfx ?? 1, 0, 1));
  for (let i = Math.max(0, effects.length - effectLimit); i < effects.length; i++) drawEffect(ctx, effects[i], settings);
  // Vignette closes the composition while keeping attack cues legible.
  const vignette = ctx.createRadialGradient(600, 380, 250, 600, 380, 730);
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, '#03050b99'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1200, 760);
  ctx.restore();
}

export function drawMenu(ctx, { width, height, now = 0, settings = {} } = {}) {
  width ||= ctx.canvas.width; height ||= ctx.canvas.height;
  const t = settings.reducedMotion ? 0 : now / 1000;
  ctx.save();
  const background = ctx.createLinearGradient(0, height, width, 0);
  background.addColorStop(0, '#071014'); background.addColorStop(0.5, '#0b0d18'); background.addColorStop(1, '#211333');
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  const cx = width * 0.75, cy = height * 0.43, radius = Math.min(width * 0.26, height * 0.37);
  glow(ctx, cx, cy, radius * 2.1, '#592a8644'); glow(ctx, width * 0.19, height * 0.88, height * 0.6, '#0d66551f');
  for (let i = 0; i < 95; i++) {
    const x = hash(i + 1) * width, y = hash(i + 404) * height;
    const opacity = 0.15 + hash(i + 83) * 0.35;
    circle(ctx, x, y, i % 5 === 0 ? 1.1 : 0.6, `rgba(191,202,242,${opacity})`);
  }
  // Perspective wireframe under the portal.
  ctx.save(); ctx.strokeStyle = '#9674ff13'; ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) line(ctx, cx + i * 19, height * 0.48, cx + i * 120, height, '#9674ff13');
  for (let i = 0; i < 8; i++) { const y = height * 0.51 + Math.pow(i / 7, 1.8) * height * 0.49; line(ctx, 0, y, width, y, '#9674ff13'); }
  ctx.restore();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.22);
  ctx.scale(0.83, 1);
  glow(ctx, 0, 0, radius * 1.45, '#a363ff22');
  for (let i = 0; i < 8; i++) {
    const r = radius * (0.63 + i * 0.052);
    const a = -t * 0.03 + i * 0.15;
    ctx.strokeStyle = i === 4 ? '#c090fc' : i === 6 ? '#7862ae88' : '#9f70e72e';
    ctx.lineWidth = i === 4 ? 3 : 1;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, a + 0.13, a + TAU - 0.23); ctx.stroke();
  }
  pathPolygon(ctx, 0, 0, radius * 1.13, 6, t * 0.014 + Math.PI / 6); ctx.strokeStyle = '#9c70e735'; ctx.lineWidth = 1; ctx.stroke();
  pathPolygon(ctx, 0, 0, radius * 1.03, 6, -t * 0.014); ctx.strokeStyle = '#bca0e91f'; ctx.stroke();
  const core = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 0.75);
  core.addColorStop(0, '#0d0c1b'); core.addColorStop(0.76, '#1f173a'); core.addColorStop(1, '#a475ef55');
  circle(ctx, 0, 0, radius * 0.67, core);
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * TAU + t * 0.014;
    const r = radius * 0.97;
    line(ctx, Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r + (i % 3 === 0 ? 9 : 4)), Math.sin(a) * (r + (i % 3 === 0 ? 9 : 4)), i % 3 === 0 ? '#cdb2fb88' : '#8767bd77', 1.5);
  }
  ctx.restore();
  // Hero vessel: large enough to establish identity without obscuring menu text.
  const shipX = cx - radius * 0.15, shipY = cy + radius * 0.11 + (settings.reducedMotion ? 0 : Math.sin(t * 0.7) * 5);
  const heroAngle = -0.53;
  const shipScale = Math.max(1.8, Math.min(4.7, radius / 58));
  glow(ctx, shipX, shipY, radius * 0.42, '#84ffe32d');
  drawShip(ctx, shipX, shipY, heroAngle, '#83f1d4', shipScale, true, settings.reducedMotion ? 0 : t);
  ctx.save(); ctx.translate(shipX, shipY); ctx.rotate(heroAngle);
  line(ctx, -42 * shipScale, 0, -95 * shipScale, 0, '#83f1d420', 7);
  line(ctx, -38 * shipScale, 0, -78 * shipScale, 0, '#b4ffea44', 2);
  ctx.restore();
  if (width > 900) {
    label(ctx, 'RIFT SIGNATURE', cx - radius * 0.9, cy + radius * 1.3, '#8a819c', 9, 'left');
    label(ctx, '05 / UNKNOWN', cx - radius * 0.9, cy + radius * 1.3 + 19, '#bbadd5', 11, 'left');
    line(ctx, cx - radius * 0.95, cy + radius * 1.07, cx - radius * 0.95, cy + radius * 1.3 + 28, '#68527d', 1);
  }
  const fade = ctx.createLinearGradient(0, 0, width * 0.73, 0);
  fade.addColorStop(0, '#080e18f2'); fade.addColorStop(0.56, '#080e18b0'); fade.addColorStop(1, '#080e1800');
  ctx.fillStyle = fade; ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export { PALETTES, WORLD };


/* Neon Rift Survivor V3.3 — Rift Classes & Boss Overhaul */
(() => {
  const CLASS_KEY = 'neonRiftClassV33';
  const RUN_HISTORY_LIMIT = 5;

  const classes = {
    assault: {
      name: 'ASSAULT',
      icon: '⚡',
      tagline: 'Damage / Critical',
      desc: '+18% damage, +8% critical chance.',
      apply() {
        p.damage *= 1.18;
        p.crit = Math.min(.50, p.crit + .08);
      }
    },
    vanguard: {
      name: 'VANGUARD',
      icon: '⬢',
      tagline: 'Armor / Survival',
      desc: '+35 max HP, +12% armor, +0.4 HP/sec regen.',
      apply() {
        p.max += 35;
        p.hp += 35;
        p.armor = Math.min(.60, p.armor + .12);
        p.regen += .40;
      }
    },
    velocity: {
      name: 'VELOCITY',
      icon: '➤',
      tagline: 'Speed / Cooldown',
      desc: '+18% move speed, 10% faster cooldowns and Pulse fire.',
      apply() {
        p.speed *= 1.18;
        p.cooldownMult *= .90;
        p.rate *= .90;
        p.magnet *= 1.10;
      }
    }
  };

  let selectedClass = storageGet(CLASS_KEY, 'assault');
  if (!classes[selectedClass]) selectedClass = 'assault';

  let enemyShots = [];
  let bossesDefeated = 0;
  let activeSynergies = new Set();
  let runEnded = false;
  let bossSerial = 1;

  const scoreMultipliers = {
    easy: .80,
    standard: 1.00,
    nightmare: 1.50,
    impossible: 2.25,
    custom: 1.00
  };

  const synergyDefs = [
    {
      id: 'overload-grid',
      name: 'OVERLOAD GRID',
      requires: ['arc', 'plasma'],
      desc: 'Plasma zones overload enemies with bonus Arc damage.'
    },
    {
      id: 'phase-fortress',
      name: 'PHASE FORTRESS',
      requires: ['field', 'guard'],
      desc: 'Phase Field + Orbit Guard reduces incoming damage by 18%.'
    },
    {
      id: 'precision-core',
      name: 'PRECISION CORE',
      requires: ['laser', 'crit'],
      desc: 'Prism Lance + Critical Module increases critical damage.'
    }
  ];

  function ensureClassUI() {
    const startCard = ui.start?.querySelector('.card');
    const modePanel = startCard?.querySelector('.mode-panel');
    if (!startCard || !modePanel || startCard.querySelector('#riftClasses')) return;

    const panel = document.createElement('section');
    panel.id = 'riftClasses';
    panel.className = 'class-panel';
    panel.innerHTML = `
      <div class="class-header">
        <span>RIFT CLASS</span>
        <strong id="classLabel"></strong>
      </div>
      <div class="class-grid">
        ${Object.entries(classes).map(([id, c]) => `
          <button class="class-btn" type="button" data-class="${id}" aria-label="${c.name}: ${c.desc}">
            <span class="class-icon">${c.icon}</span>
            <b>${c.name}</b>
            <small>${c.tagline}</small>
            <em>${c.desc}</em>
          </button>
        `).join('')}
      </div>
    `;
    modePanel.before(panel);

    panel.addEventListener('click', e => {
      const button = e.target.closest('.class-btn');
      if (!button) return;
      selectedClass = button.dataset.class;
      storageSet(CLASS_KEY, selectedClass);
      syncClassUI();
    });
    syncClassUI();
  }

  function ensureHudUI() {
    const top = document.querySelector('.hud .top');
    if (top && !document.querySelector('#classHud')) {
      const pill = document.createElement('div');
      pill.className = 'pill class-pill';
      pill.innerHTML = `CLASS <span id="classHud"></span>`;
      top.appendChild(pill);
    }

    if (!document.querySelector('#synergyHud')) {
      const synergies = document.createElement('div');
      synergies.id = 'synergyHud';
      synergies.className = 'synergy-hud hide';
      document.querySelector('.hud')?.appendChild(synergies);
    }

    if (!document.querySelector('#bossHud')) {
      const boss = document.createElement('div');
      boss.id = 'bossHud';
      boss.className = 'boss-hud hide';
      boss.innerHTML = `
        <div class="boss-meta"><strong id="bossName">RIFT WARDEN</strong><span id="bossPhase">PHASE I</span></div>
        <div class="boss-bar"><i id="bossBarFill"></i></div>
      `;
      document.body.appendChild(boss);
    }

    const overCard = ui.over?.querySelector('.card');
    if (overCard && !overCard.querySelector('#runSummary')) {
      const summary = document.createElement('div');
      summary.id = 'runSummary';
      summary.className = 'run-summary';
      const actions = overCard.querySelector('.gameover-actions');
      overCard.insertBefore(summary, actions || null);
    }
  }

  function syncClassUI() {
    document.querySelectorAll('.class-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.class === selectedClass);
    });
    const c = classes[selectedClass];
    const label = document.querySelector('#classLabel');
    const hud = document.querySelector('#classHud');
    if (label) label.textContent = `SELECTED: ${c.name}`;
    if (hud) hud.textContent = c.name;
  }

  ensureClassUI();
  ensureHudUI();
  syncClassUI();

  const resetBeforeV33 = reset;
  reset = function() {
    enemyShots = [];
    bossesDefeated = 0;
    activeSynergies = new Set();
    runEnded = false;
    bossSerial = 1;
    const summary = document.querySelector('#runSummary');
    if (summary) summary.innerHTML = '';
    const result = resetBeforeV33();
    classes[selectedClass].apply();
    syncClassUI();
    updateSynergies(true);
    syncBossHud();
    return result;
  };

  const playBtn = document.querySelector('#play');
  const againBtn = document.querySelector('#again');
  if (playBtn) playBtn.onclick = reset;
  if (againBtn) againBtn.onclick = reset;

  function pickArchetype() {
    const r = Math.random();
    if (t > 65 && r < .10) return 'shielded';
    if (t > 50 && r < .24) return 'splitter';
    if (t > 35 && r < .39) return 'shooter';
    if (t > 20 && r < .57) return 'charger';
    return 'chaser';
  }

  function tagEnemy(e, archetype, boss = false) {
    e.archetype = archetype;
    e.aiSpeed = e.speed;
    e.aiTimer = .9 + Math.random() * 1.8;
    e.shotCd = .7 + Math.random() * 1.2;
    e.strafeDir = Math.random() < .5 ? -1 : 1;
    e.shieldRegenDelay = 1.8;
    e.lastHp = e.hp;

    if (boss) {
      e.archetype = 'rift-warden';
      e.aiSpeed = Math.max(52, e.aiSpeed);
      e.speed = 0;
      e.bossId = bossSerial++;
      e.bossAttackCd = 1.4;
      e.bossDashCd = 2.6;
      e.bossDashTime = 0;
      e.bossWindup = 0;
      e.bossTelegraph = 0;
      e.bossPhase = 1;
      return;
    }

    if (archetype === 'chaser') return;

    e.speed = 0;
    if (archetype === 'charger') {
      e.r *= 1.08;
      e.hp *= 1.12;
      e.max = e.hp;
    } else if (archetype === 'shooter') {
      e.hp *= .90;
      e.max = e.hp;
      e.r = Math.max(10, e.r * .90);
    } else if (archetype === 'splitter') {
      e.hp *= 1.20;
      e.max = e.hp;
      e.r *= 1.12;
    } else if (archetype === 'shielded') {
      e.hp *= 1.65;
      e.max = e.hp;
      e.r *= 1.18;
    }
  }

  const spawnEnemyBeforeV33 = spawnEnemy;
  spawnEnemy = function(boss = false) {
    const before = enemies.length;
    spawnEnemyBeforeV33(boss);
    if (enemies.length <= before) return;
    for (let i = before; i < enemies.length; i++) {
      tagEnemy(enemies[i], boss ? 'rift-warden' : pickArchetype(), boss);
    }
  };

  function spawnShard(x0, y0, angleOffset = 0) {
    if (enemies.length >= MAX_ENEMIES) return;
    const angle = Math.random() * Math.PI * 2 + angleOffset;
    const hp = 18 * (1 + t / 220) * difficulty.enemyHp;
    const shard = {
      id: enemyId++,
      x: x0 + Math.cos(angle) * 10,
      y: y0 + Math.sin(angle) * 10,
      r: 8,
      hp,
      max: hp,
      speed: 0,
      aiSpeed: 150 * difficulty.enemySpeed,
      type: 2,
      contactCd: 0,
      orbitCd: 0,
      archetype: 'shard',
      aiTimer: 0,
      shotCd: 0,
      strafeDir: 1,
      shieldRegenDelay: 0,
      lastHp: hp
    };
    enemies.push(shard);
  }

  function moveToward(e, speed, dt, angleAdjust = 0) {
    const a = Math.atan2(p.y - e.y, p.x - e.x) + angleAdjust;
    e.x += Math.cos(a) * speed * dt;
    e.y += Math.sin(a) * speed * dt;
  }

  function fireEnemyShot(e, angle, speed, damage, type = 'enemy', radius = 5) {
    if (enemyShots.length > 180) return;
    enemyShots.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: radius,
      life: 5,
      damage,
      type
    });
  }

  function aimedShot(e, speed, damage, type = 'enemy', spread = 0) {
    const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - .5) * spread;
    fireEnemyShot(e, a, speed, damage, type);
  }

  function radialEnemyBurst(e, count, speed, damage, type = 'boss') {
    const offset = t * .7;
    for (let i = 0; i < count; i++) {
      fireEnemyShot(e, offset + i * Math.PI * 2 / count, speed, damage, type, type === 'boss' ? 6 : 5);
    }
  }

  function updateCharger(e, dt) {
    if (e.chargeTime > 0) {
      e.x += e.chargeVx * dt;
      e.y += e.chargeVy * dt;
      e.chargeTime -= dt;
      e.telegraph = false;
      return;
    }

    e.aiTimer -= dt;
    e.telegraph = e.aiTimer <= .48;
    if (e.aiTimer <= 0) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const speed = e.aiSpeed * 3.35;
      e.chargeVx = Math.cos(a) * speed;
      e.chargeVy = Math.sin(a) * speed;
      e.chargeTime = .52;
      e.aiTimer = 2.0 + Math.random() * 1.4;
      e.telegraph = false;
    } else {
      moveToward(e, e.aiSpeed * .62, dt);
    }
  }

  function updateShooter(e, dt) {
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx);
    if (d > 310) moveToward(e, e.aiSpeed * .82, dt);
    else if (d < 210) {
      e.x -= Math.cos(a) * e.aiSpeed * .75 * dt;
      e.y -= Math.sin(a) * e.aiSpeed * .75 * dt;
    } else {
      e.x += Math.cos(a + Math.PI / 2 * e.strafeDir) * e.aiSpeed * .48 * dt;
      e.y += Math.sin(a + Math.PI / 2 * e.strafeDir) * e.aiSpeed * .48 * dt;
    }

    e.shotCd -= dt;
    if (e.shotCd <= 0) {
      aimedShot(e, 245, 8 * Math.max(1, difficulty.enemyHp * .35), 'shooter', .08);
      e.shotCd = 1.65 + Math.random() * .55;
    }
  }

  function updateShielded(e, dt) {
    moveToward(e, e.aiSpeed * .66, dt, Math.sin(t * 1.3 + e.id) * .18);
    if (e.hp < e.lastHp) e.shieldRegenDelay = 2.2;
    else e.shieldRegenDelay -= dt;
    if (e.shieldRegenDelay <= 0) {
      e.hp = Math.min(e.max, e.hp + e.max * .012 * dt);
    }
    e.lastHp = e.hp;
  }

  function updateBoss(e, dt) {
    const ratio = Math.max(0, e.hp / e.max);
    const nextPhase = ratio > .66 ? 1 : ratio > .33 ? 2 : 3;
    if (nextPhase !== e.bossPhase) {
      e.bossPhase = nextPhase;
      e.bossTelegraph = .8;
      evoBanner = `RIFT WARDEN — PHASE ${['I','II','III'][nextPhase - 1]}`;
      evoBannerTime = 2.2;
      burst(e.x, e.y, 28);
    }

    e.bossAttackCd -= dt;
    e.bossDashCd -= dt;
    e.bossTelegraph = Math.max(0, e.bossTelegraph - dt);

    const d = Math.max(1, Math.hypot(p.x - e.x, p.y - e.y));
    const a = Math.atan2(p.y - e.y, p.x - e.x);

    if (e.bossPhase === 1) {
      const radial = d > 220 ? 1 : d < 150 ? -1 : 0;
      e.x += Math.cos(a) * e.aiSpeed * .66 * radial * dt;
      e.y += Math.sin(a) * e.aiSpeed * .66 * radial * dt;
      e.x += Math.cos(a + Math.PI / 2) * e.aiSpeed * .46 * dt;
      e.y += Math.sin(a + Math.PI / 2) * e.aiSpeed * .46 * dt;
      if (e.bossAttackCd <= 0) {
        radialEnemyBurst(e, 6, 205, 9 * difficulty.bossPower, 'boss');
        e.bossAttackCd = 2.35;
      }
      return;
    }

    if (e.bossPhase === 2) {
      if (e.bossDashTime > 0) {
        e.x += e.bossDashVx * dt;
        e.y += e.bossDashVy * dt;
        e.bossDashTime -= dt;
      } else if (e.bossWindup > 0) {
        e.bossWindup -= dt;
        e.bossTelegraph = e.bossWindup;
        if (e.bossWindup <= 0) {
          const da = Math.atan2(p.y - e.y, p.x - e.x);
          const ds = e.aiSpeed * 4.1;
          e.bossDashVx = Math.cos(da) * ds;
          e.bossDashVy = Math.sin(da) * ds;
          e.bossDashTime = .45;
        }
      } else {
        moveToward(e, e.aiSpeed * .78, dt, Math.sin(t) * .14);
        if (e.bossDashCd <= 0) {
          e.bossWindup = .46;
          e.bossDashCd = 2.6;
          e.bossTelegraph = .46;
        }
      }

      if (e.bossAttackCd <= 0) {
        for (let s = -1; s <= 1; s++) fireEnemyShot(e, a + s * .16, 265, 11 * difficulty.bossPower, 'boss');
        e.bossAttackCd = 1.55;
      }
      return;
    }

    moveToward(e, e.aiSpeed * 1.38, dt, Math.sin(t * 1.8) * .10);
    if (e.bossAttackCd <= 0) {
      radialEnemyBurst(e, 10, 255, 12 * difficulty.bossPower, 'boss');
      aimedShot(e, 340, 14 * difficulty.bossPower, 'boss', .04);
      e.bossAttackCd = 1.05;
    }
  }

  function updateEnemyAI(dt) {
    for (const e of enemies) {
      if (e.archetype === 'charger') updateCharger(e, dt);
      else if (e.archetype === 'shooter') updateShooter(e, dt);
      else if (e.archetype === 'splitter') moveToward(e, e.aiSpeed * .82, dt, Math.sin(t + e.id) * .08);
      else if (e.archetype === 'shielded') updateShielded(e, dt);
      else if (e.archetype === 'shard') moveToward(e, e.aiSpeed, dt);
      else if (e.archetype === 'rift-warden') updateBoss(e, dt);
    }
  }

  function updateEnemyShots(dt) {
    const fortress = activeSynergies.has('phase-fortress');
    for (const s of enemyShots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) continue;
      if (Math.hypot(s.x - p.x, s.y - p.y) < s.r + p.r) {
        const classMitigation = selectedClass === 'vanguard' ? .94 : 1;
        const synergyMitigation = fortress ? .82 : 1;
        p.hp -= s.damage * (1 - p.armor) * classMitigation * synergyMitigation;
        s.life = -1;
        burst(p.x, p.y, 8);
      }
    }
    enemyShots = enemyShots.filter(s =>
      s.life > 0 &&
      s.x > -100 && s.x < W + 100 &&
      s.y > -100 && s.y < H + 100
    );
  }

  function updateSynergies(silent = false) {
    for (const def of synergyDefs) {
      const ready = def.requires.every(id => levelOf(id) > 0);
      if (!ready || activeSynergies.has(def.id)) continue;
      activeSynergies.add(def.id);
      if (def.id === 'precision-core') p.critDamage += .35;
      if (!silent) {
        evoBanner = `SYNERGY UNLOCKED: ${def.name}`;
        evoBannerTime = 2.8;
        burst(p.x, p.y, 24);
      }
    }

    const hud = document.querySelector('#synergyHud');
    if (hud) {
      if (activeSynergies.size === 0) {
        hud.classList.add('hide');
        hud.innerHTML = '';
      } else {
        hud.classList.remove('hide');
        hud.innerHTML = [...activeSynergies].map(id => {
          const def = synergyDefs.find(s => s.id === id);
          return `<span title="${def?.desc || ''}">✦ ${def?.name || id}</span>`;
        }).join('');
      }
    }
  }

  function applySynergyEffects(dt, hpBefore) {
    if (activeSynergies.has('overload-grid') && zones.length) {
      const bonus = p.damage * .12 * dt;
      for (const z of zones) {
        for (const e of enemies) {
          if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) e.hp -= bonus;
        }
      }
    }

    if (activeSynergies.has('phase-fortress') && p.hp < hpBefore) {
      const lost = hpBefore - p.hp;
      p.hp = Math.min(p.max, p.hp + lost * .18);
    }
  }

  function handleRemovedEnemies(snapshot) {
    const survivors = new Set(enemies.map(e => e.id));
    for (const [id, old] of snapshot) {
      if (survivors.has(id)) continue;
      if (old.archetype === 'splitter') {
        spawnShard(old.x, old.y, -.35);
        spawnShard(old.x, old.y, .35);
      } else if (old.archetype === 'rift-warden') {
        bossesDefeated++;
      }
    }
  }

  function bossPhaseLabel(phase) {
    return `PHASE ${['I', 'II', 'III'][Math.max(1, Math.min(3, phase || 1)) - 1]}`;
  }

  function syncBossHud() {
    const hud = document.querySelector('#bossHud');
    if (!hud) return;
    const bosses = enemies.filter(e => e.archetype === 'rift-warden' && e.hp > 0);
    if (!bosses.length || state === STATES.MENU || state === STATES.GAMEOVER) {
      hud.classList.add('hide');
      return;
    }

    const boss = bosses.reduce((a, b) => a.hp / a.max < b.hp / b.max ? a : b);
    hud.classList.remove('hide');
    const name = document.querySelector('#bossName');
    const phase = document.querySelector('#bossPhase');
    const fill = document.querySelector('#bossBarFill');
    if (name) name.textContent = bosses.length > 1 ? `RIFT WARDENS ×${bosses.length}` : 'RIFT WARDEN';
    if (phase) phase.textContent = bossPhaseLabel(boss.bossPhase);
    if (fill) fill.style.width = `${Math.max(0, boss.hp / boss.max * 100)}%`;
  }

  function saveRun(summary) {
    const key = `neonRuns_${selectedMode}`;
    let history = [];
    try {
      history = JSON.parse(storageGet(key, '[]')) || [];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }
    history.unshift(summary);
    storageSet(key, JSON.stringify(history.slice(0, RUN_HISTORY_LIMIT)));
  }

  function renderRunSummary() {
    if (runEnded) return;
    runEnded = true;
    const multiplier = scoreMultipliers[selectedMode] || 1;
    const evoCount = Object.values(evolved).filter(Boolean).length;
    const score = Math.round((kills * 100 + Math.floor(t) * 12 + bossesDefeated * 1200 + evoCount * 500) * multiplier);
    const synergyNames = [...activeSynergies].map(id => synergyDefs.find(s => s.id === id)?.name).filter(Boolean);
    const summary = {
      score,
      kills,
      seconds: Math.floor(t),
      bosses: bossesDefeated,
      evos: evoCount,
      class: selectedClass,
      mode: selectedMode,
      at: Date.now()
    };
    saveRun(summary);

    ui.score.textContent = `SCORE ${score.toLocaleString()}`;
    const box = document.querySelector('#runSummary');
    if (box) {
      box.innerHTML = `
        <div class="summary-grid">
          <div><span>CLASS</span><b>${classes[selectedClass].name}</b></div>
          <div><span>MODE</span><b>${difficulty.label}</b></div>
          <div><span>SURVIVED</span><b>${fmt(t)}</b></div>
          <div><span>KILLS</span><b>${kills}</b></div>
          <div><span>BOSSES</span><b>${bossesDefeated}</b></div>
          <div><span>EVOS</span><b>${evoCount}</b></div>
        </div>
        <div class="summary-score">Difficulty multiplier <b>×${multiplier.toFixed(2)}</b></div>
        <div class="summary-synergy">${synergyNames.length ? `Synergies: ${synergyNames.join(' • ')}` : 'Synergies: none unlocked'}</div>
      `;
    }
  }

  const updateBeforeV33 = update;
  update = function(dt) {
    const wasPlaying = state === STATES.PLAYING;
    if (!wasPlaying) {
      updateBeforeV33(dt);
      syncBossHud();
      return;
    }

    const snapshot = new Map(enemies.map(e => [e.id, {
      id: e.id,
      x: e.x,
      y: e.y,
      archetype: e.archetype,
      hp: e.hp
    }]));
    const hpBefore = p.hp;

    updateBeforeV33(dt);
    handleRemovedEnemies(snapshot);

    if (state === STATES.GAMEOVER) {
      syncBossHud();
      renderRunSummary();
      return;
    }
    if (state !== STATES.PLAYING) {
      syncBossHud();
      return;
    }

    updateSynergies();
    applySynergyEffects(dt, hpBefore);
    updateEnemyAI(dt);
    updateEnemyShots(dt);
    syncBossHud();

    if (p.hp <= 0) {
      p.hp = 0;
    }
  };

  const drawBeforeV33 = draw;
  draw = function() {
    drawBeforeV33();

    for (const e of enemies) {
      if (!e.archetype || e.archetype === 'chaser') continue;

      x.save();
      if (e.archetype === 'charger') {
        x.strokeStyle = e.telegraph ? '#ffea73' : '#ff8a3d';
        x.lineWidth = e.telegraph ? 4 : 2;
        x.shadowBlur = e.telegraph ? 22 : 10;
        x.shadowColor = x.strokeStyle;
        x.beginPath();
        x.arc(e.x, e.y, e.r + 5 + (e.telegraph ? Math.sin(t * 18) * 3 : 0), 0, Math.PI * 2);
        x.stroke();
      } else if (e.archetype === 'shooter') {
        x.strokeStyle = '#8a7dff';
        x.lineWidth = 2;
        x.beginPath();
        x.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2);
        x.stroke();
        x.beginPath();
        x.moveTo(e.x - e.r - 7, e.y);
        x.lineTo(e.x + e.r + 7, e.y);
        x.stroke();
      } else if (e.archetype === 'splitter') {
        x.strokeStyle = '#ffb454';
        x.lineWidth = 2;
        x.beginPath();
        x.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2);
        x.stroke();
        x.beginPath();
        x.moveTo(e.x, e.y - e.r - 4);
        x.lineTo(e.x, e.y + e.r + 4);
        x.stroke();
      } else if (e.archetype === 'shielded') {
        x.strokeStyle = '#63f6dc';
        x.lineWidth = 3;
        x.shadowBlur = 18;
        x.shadowColor = '#63f6dc';
        x.beginPath();
        x.arc(e.x, e.y, e.r + 8 + Math.sin(t * 3 + e.id) * 2, 0, Math.PI * 2);
        x.stroke();
      } else if (e.archetype === 'shard') {
        x.strokeStyle = '#ffd05f';
        x.lineWidth = 1.5;
        x.beginPath();
        x.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
        x.stroke();
      } else if (e.archetype === 'rift-warden') {
        x.strokeStyle = e.bossPhase === 3 ? '#ff3d7f' : e.bossPhase === 2 ? '#ff8f4d' : '#d65cff';
        x.lineWidth = 4;
        x.shadowBlur = 26;
        x.shadowColor = x.strokeStyle;
        x.beginPath();
        x.arc(e.x, e.y, e.r + 9 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
        x.stroke();
        if (e.bossTelegraph > 0) {
          x.globalAlpha = .45 + Math.sin(t * 22) * .2;
          x.beginPath();
          x.arc(e.x, e.y, e.r + 28, 0, Math.PI * 2);
          x.stroke();
        }
      }
      x.restore();
    }

    for (const s of enemyShots) {
      x.save();
      x.fillStyle = s.type === 'boss' ? '#ff4b9c' : '#9b8cff';
      x.shadowBlur = s.type === 'boss' ? 18 : 12;
      x.shadowColor = x.fillStyle;
      x.beginPath();
      x.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
  };

  const updateLoadoutBeforeV33 = updateLoadout;
  updateLoadout = function() {
    updateLoadoutBeforeV33();
    updateSynergies(true);
  };

  syncClassUI();
  syncBossHud();
})();

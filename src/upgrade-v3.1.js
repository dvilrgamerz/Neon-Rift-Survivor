/* Neon Rift Survivor V3.1 — upgrade-system enhancement layer */
(() => {
  const icons = {
    disc:'◈', brick:'⬢', drill:'➤', core:'✹', field:'◉', guard:'✦', laser:'╱', arc:'ϟ',
    mine:'◆', plasma:'●', slash:'☾', missile:'➟', orb:'◎', magnet:'⌁', vital:'♥', ammo:'»',
    fuel:'⬡', regen:'✚', bracer:'⟳', cube:'◇', catalyst:'✺', armor:'⬟', boots:'➜', power:'✧',
    rate:'»', crit:'✣', repair:'✚'
  };

  const activePreviews = {
    disc: n => `+1 disc and stronger disc damage at Lv.${n}.`,
    brick: n => `+1 Gravity Brick and higher impact damage at Lv.${n}.`,
    drill: n => `+1 Ion Drill shot and higher piercing damage at Lv.${n}.`,
    core: n => `Longer lifetime, larger core, and higher damage at Lv.${n}.`,
    field: n => `Larger Phase Field and stronger continuous damage at Lv.${n}.`,
    guard: n => `Adds another Orbit Guard blade and increases contact damage at Lv.${n}.`,
    laser: n => `Adds another Prism Lance beam and increases beam damage at Lv.${n}.`,
    arc: n => `Chains to another target and increases strike damage at Lv.${n}.`,
    mine: n => `Larger blast radius and higher Rift Mine damage at Lv.${n}.`,
    plasma: n => `Larger, longer-lasting Plasma Pool with stronger burn at Lv.${n}.`,
    slash: n => `Larger Crescent Wave radius and stronger shockwave at Lv.${n}.`,
    missile: n => `Adds another Void Missile and increases explosion damage at Lv.${n}.`,
    orb: n => `Adds another Kinetic Orb and increases orb damage/size at Lv.${n}.`
  };

  const tierFor = (u, next) => {
    if (u.utility) return {key:'recovery', label:'RECOVERY'};
    if (u.kind === 'Active' && next >= u.max) return {key:'legendary', label:'LEGENDARY'};
    if (next >= 4) return {key:'epic', label:'EPIC'};
    if (next >= 3) return {key:'rare', label:'RARE'};
    if (next >= 2) return {key:'uncommon', label:'UNCOMMON'};
    return {key:'common', label:'COMMON'};
  };

  const passiveName = id => upgrades.find(u => u.id === id)?.name || id;
  const nextPreview = (u, next) => u.kind === 'Active' ? (activePreviews[u.id]?.(next) || u.desc) : u.desc;

  function evoStatus(u, next){
    const e = evoByActive[u.id];
    if (!e) return null;
    const passiveLv = levelOf(e.passive);
    const maxAfterPick = next >= u.max;
    if (evolved[e.id]) return {type:'evolved', text:`★ ${e.name} ACTIVE`};
    if (maxAfterPick && passiveLv > 0) return {type:'ready', text:`★ EVO READY → ${e.name}`};
    if (maxAfterPick) return {type:'missing', text:`EVO needs ${passiveName(e.passive)}`};
    if (passiveLv > 0) return {type:'progress', text:`EVO pair owned • reach Lv.${u.max} for ${e.name}`};
    return {type:'progress', text:`EVO path: ${passiveName(e.passive)} + Lv.${u.max}`};
  }

  function synergyWeight(u){
    let w = 1;
    const lv = levelOf(u.id);
    if (lv > 0) w += .28;
    if (u.kind === 'Active') {
      const e = evoByActive[u.id];
      if (e && levelOf(e.passive) > 0) w += .55;
      if (lv === u.max - 1) w += .25;
    } else {
      const matching = evolutions.find(e => e.passive === u.id && levelOf(e.active) > 0 && !evolved[e.id]);
      if (matching) w += levelOf(matching.active) >= 4 ? 1.0 : .45;
    }
    if (u.utility) w *= .72;
    return w;
  }

  function weightedChoices(pool, count=3){
    const bag = [...pool];
    const picks = [];
    while (bag.length && picks.length < count) {
      const total = bag.reduce((sum,u)=>sum+synergyWeight(u),0);
      let roll = Math.random()*total;
      let idx = 0;
      for (; idx < bag.length; idx++) {
        roll -= synergyWeight(bag[idx]);
        if (roll <= 0) break;
      }
      picks.push(bag.splice(Math.min(idx,bag.length-1),1)[0]);
    }
    return picks;
  }

  let rerollsRemaining = 2;
  let shownChoices = [];

  const originalReset = reset;
  reset = function(){
    rerollsRemaining = 2;
    shownChoices = [];
    return originalReset();
  };
  const playBtn = document.querySelector('#play');
  const againBtn = document.querySelector('#again');
  if (playBtn) playBtn.onclick = reset;
  if (againBtn) againBtn.onclick = reset;

  function ensureUpgradeTools(){
    const card = ui.level?.querySelector('.card');
    if (!card) return null;
    let tools = card.querySelector('.upgrade-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'upgrade-tools';
      tools.innerHTML = `
        <div class="upgrade-help"><span>1–3 select</span><span>R reroll</span><span>Max active + paired passive = EVO</span></div>
        <button id="rerollUpgrade" class="reroll-btn" type="button"></button>`;
      card.appendChild(tools);
    }
    return tools;
  }

  function fallbackChoice(){
    return {
      id:'rift-stabilizer', kind:'Utility', name:'Rift Stabilizer', max:1, utility:true,
      desc:'All normal upgrades are maxed. Gain +8% damage, +10 max HP, and heal 10 HP.',
      fallback:true
    };
  }

  function applyChoice(u){
    if (u.fallback) {
      p.damage *= 1.08;
      p.max += 10;
      p.hp = Math.min(p.max,p.hp+10);
      updateLoadout();
      ui.level.classList.add('hide');
      setState(STATES.PLAYING);
      return;
    }
    chooseUpgrade(u);
  }

  function renderUpgradeChoices(isReroll=false){
    ui.choices.innerHTML = '';
    const pool = upgrades.filter(canOffer);
    shownChoices = pool.length ? weightedChoices(pool,3) : [fallbackChoice()];

    shownChoices.forEach((u,index)=>{
      const lv = u.fallback ? 0 : levelOf(u.id);
      const next = u.fallback ? 1 : Math.min(u.max,lv+1);
      const tier = tierFor(u,next);
      const evo = u.fallback ? null : evoStatus(u,next);
      const b = document.createElement('button');
      b.className = `choice upgrade-card rarity-${tier.key}${evo?.type==='ready'?' evo-ready':''}`;
      b.type = 'button';
      b.dataset.choice = String(index+1);
      const stateTag = u.fallback ? 'MAX-BUILD BONUS' : (lv===0 ? 'NEW' : `LV.${lv} → LV.${next}`);
      const icon = icons[u.id] || '✦';
      b.innerHTML = `
        <span class="upgrade-topline"><span class="upgrade-icon">${icon}</span><span class="upgrade-tier">${tier.label}</span><span class="upgrade-key">${index+1}</span></span>
        <span class="upgrade-kind">${u.kind} • ${stateTag}</span>
        <b class="upgrade-name">${u.name}</b>
        <span class="upgrade-effect">${nextPreview(u,next)}</span>
        ${evo ? `<span class="upgrade-evo evo-${evo.type}">${evo.text}</span>` : ''}`;
      b.onclick = ()=>applyChoice(u);
      ui.choices.appendChild(b);
    });

    const tools = ensureUpgradeTools();
    const rerollBtn = tools?.querySelector('#rerollUpgrade');
    if (rerollBtn) {
      rerollBtn.textContent = rerollsRemaining > 0 ? `↻ REROLL (${rerollsRemaining})` : '↻ NO REROLLS LEFT';
      rerollBtn.disabled = rerollsRemaining <= 0 || shownChoices[0]?.fallback;
      rerollBtn.onclick = ()=>{
        if (rerollsRemaining <= 0 || shownChoices[0]?.fallback) return;
        rerollsRemaining--;
        renderUpgradeChoices(true);
      };
    }

    const sub = ui.level?.querySelector('.sub');
    if (sub) sub.textContent = isReroll
      ? 'New choices generated. Build toward a Level 5 active + its paired passive to unlock an EVO.'
      : 'Choose a card. Higher levels improve real weapon stats, and matching passives unlock EVO paths.';
  }

  levelUp = function(){
    setState(STATES.LEVEL);
    ui.level.classList.remove('hide');
    renderUpgradeChoices(false);
  };

  addEventListener('keydown', e=>{
    if (state !== STATES.LEVEL) return;
    if (['1','2','3'].includes(e.key)) {
      const idx = Number(e.key)-1;
      if (shownChoices[idx]) {
        e.preventDefault();
        applyChoice(shownChoices[idx]);
      }
    } else if (e.key.toLowerCase() === 'r') {
      const btn = document.querySelector('#rerollUpgrade');
      if (btn && !btn.disabled) {
        e.preventDefault();
        btn.click();
      }
    }
  });
})();

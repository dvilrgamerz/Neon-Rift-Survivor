import {WEAPONS,PASSIVES,RELICS} from './content.js';

export const DIFFICULTY_COPY={
  easy:{rank:1,description:'Casual survival with more breathing room.'},
  standard:{rank:2,description:'The intended, balanced experience.'},
  nightmare:{rank:3,description:'Faster threats. Stronger enemies.'},
  impossible:{rank:4,description:'Maximum pressure. Little room for mistakes.'},
  custom:{rank:0,description:'Build your own challenge.'},
};

/** Reward descriptions derive from the same level data used by combat. */
export function rewardPresentation(choice,run){
  const defs=choice.kind==='passive'?PASSIVES:choice.kind==='relic'?RELICS:WEAPONS;
  const def=defs.find(d=>d.id===choice.target);
  const level=choice.kind==='weapon'?run.weapons[choice.target]||0:choice.kind==='passive'?run.passives[choice.target]||0:0;
  const changes=[];
  if(choice.kind==='weapon'&&def){
    const before=def.levels[level-1],after=def.levels[Math.min(level,4)];
    for(const [key,label,unit] of [['damage','Damage',''],['cooldown','Attack interval','s'],['count','Projectiles',''],['pierce','Pierce','']]){
      if(!before||before[key]!==after[key])changes.push(`${label} ${before?`${before[key]} → `:''}${after[key]}${unit}`);
    }
  }else if(choice.kind==='passive'&&def)changes.push(def.description);
  else if(choice.kind==='evolution')changes.push('Evolution unlocked · signature attack');
  else if(choice.kind==='heal')changes.push(`Recover up to ${Math.ceil(run.player.maxHp*.35)} HP`);
  if(choice.rarity==='mythic')changes.unshift('Mythic bonus: +6% damage · +5 max HP');
  return {icon:def?.icon||(choice.kind==='heal'?'✚':'✦'),level:choice.kind==='evolution'?'Lv. 5 → EVOLVED':choice.kind==='weapon'||choice.kind==='passive'?`${level?`Lv. ${level}`:'NEW'} → Lv. ${Math.min(5,level+1)}`:choice.kind==='relic'?`${run.relics.length}/3 relic slots`:'',changes:changes.slice(0,4)};
}

/** A held key or double tap must not consume the following queued reward. */
export function createSelectionGuard(now=()=>performance.now(),delay=260){
  let next=0;
  return {take(){const time=now();if(time<next)return false;next=time+delay;return true;},reset(){next=0;}};
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function difficultyCards(difficulties,selected,daily){
  return `<section class="panel difficulty-panel" id="difficultySelection"><div class="panel-head"><span>01 &nbsp; Set the stakes</span><small>${daily?'DAILY USES STANDARD':'CHOOSE YOUR DIFFICULTY'}</small></div><div class="difficulty-grid">${difficulties.map(d=>{const copy=DIFFICULTY_COPY[d.id],active=(daily?'standard':selected)===d.id;return `<button class="difficulty-card ${active?'active':''}" data-difficulty="${d.id}" aria-pressed="${active}" ${daily?'disabled':''}><span class="difficulty-top"><b>${esc(d.name.toUpperCase())}</b><span class="selection-mark">${active?'✓ Selected':'○'}</span></span><span class="difficulty-meter" aria-hidden="true">${[1,2,3,4].map(i=>`<i class="${i<=copy.rank?'lit':''}"></i>`).join('')}${d.id==='custom'?'<span>＋</span>':''}</span><small>${copy.description}</small></button>`;}).join('')}</div></section>`;
}

export function rewardCard(c,run,attr,index){
  const detail=rewardPresentation(c,run),rarities=['common','uncommon','rare','epic','legendary','mythic'],rarity=rarities.includes(c.rarity)?c.rarity:null,tier=rarity?rarities.indexOf(rarity)+1:0;
  return `<button class="choice ${rarity?'rarity-'+rarity:''} ${rarity==='mythic'?'mythic':''}" ${attr}><span class="choice-top"><span class="choice-icon" aria-hidden="true">${detail.icon}</span><span class="tag">${esc(rarity||c.type||c.kind||'Encounter')}<span class="rarity-marks" aria-hidden="true">${'◆'.repeat(tier)}</span></span></span><b>${esc(c.name)}</b><small>${esc(c.description||'')}</small>${detail.level?`<span class="choice-level">${detail.level}</span>`:''}${detail.changes.length?`<span class="choice-change">${detail.changes.map(x=>`<span>${esc(x)}</span>`).join('')}</span>`:''}${c.price!==undefined?`<span class="tag">${c.sold?'SOLD':`${c.price} SCRAP`}</span>`:''}${index!==undefined?`<span class="choice-key">CHOOSE UPGRADE <kbd>${index+1}</kbd></span>`:''}</button>`;
}

export function hudMarkup(diagnostics){return `<div class="hud"><div class="hud-block hud-vitals"><div class="hud-label"><small id="hudOp"></small><small id="hudShield"></small></div><strong id="hudHP"></strong><div class="bars"><div class="bar"><i id="hpBar"></i></div><div class="bar shield"><i id="shieldBar"></i></div></div></div><div class="hud-block hud-counter"><small class="hud-label">SURVIVED</small><strong id="hudTime"></strong><small id="hudKills"></small><small class="hidden" id="hudBiome"></small></div><div class="hud-block hud-score"><small class="hud-label">SCORE</small><strong id="hudScore"></strong></div><button data-action="pause" aria-label="Pause game">Ⅱ</button><div class="hud-experience"><div class="hud-xp-head"><small id="hudLevel"></small><small id="hudXP"></small></div><div class="bar xp"><i id="xpBar"></i></div></div></div><div class="objective" id="objective"></div><div class="hud-bottom"><button data-action="dash" id="dashBtn"></button><button data-action="ability" id="abilityBtn"></button><button data-action="loadout">Build ▦</button></div><div class="touch-actions"><button data-action="dash" aria-label="Dash">↗<br>Dash</button><button data-action="ability" aria-label="Operator ability">✦<br>Ability</button></div><div class="diagnostic ${diagnostics?'':'hidden'}" id="diagnostic"></div><div id="stateOverlay"></div>`;}

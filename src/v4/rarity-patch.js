/* Neon Rift Survivor V4 — Mythic promotion, luck and extra progression rerolls */
(() => {
  const V4=window.NeonV4;if(!V4)return;
  let extra=0;
  const choices=document.querySelector('#choices');

  function mythicChance(){return Math.min(2.5,.5+(Number(window.NeonV4Luck)||0)*.05);}
  function promoteCard(card){
    if(!card||card.classList.contains('rarity-recovery')||card.dataset.v4RarityChecked)return;
    card.dataset.v4RarityChecked='1';
    if(Math.random()*100>=mythicChance())return;
    card.classList.remove('rarity-common','rarity-uncommon','rarity-rare','rarity-epic','rarity-legendary');card.classList.add('rarity-mythic');card.dataset.v4Mythic='1';
    const tier=card.querySelector('.upgrade-tier'),rate=card.querySelector('.upgrade-rate'),bonus=card.querySelector('.upgrade-bonus');
    if(tier)tier.textContent='MYTHIC';if(rate)rate.textContent=`${mythicChance().toFixed(2)}%`;
    if(bonus)bonus.textContent='Mythic bonus: +8% damage • +8 max HP • heal 8';
  }
  function scan(){document.querySelectorAll('#choices .upgrade-card').forEach(promoteCard);ensureExtraReroll();}
  if(choices)new MutationObserver(scan).observe(choices,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.upgrade-card[data-v4-mythic="1"]');if(!card||card.dataset.v4MythicApplied)return;card.dataset.v4MythicApplied='1';p.damage*=1.08;p.max+=8;p.hp=Math.min(p.max,p.hp+8);
  },true);

  function ensureExtraReroll(){
    const tools=document.querySelector('.upgrade-tools');if(!tools||document.querySelector('#v4ExtraReroll'))return;
    const b=document.createElement('button');b.id='v4ExtraReroll';b.className='reroll-btn';b.type='button';tools.appendChild(b);syncExtraButton();b.onclick=()=>{if(extra<=0)return;extra--;levelUp();syncExtraButton();};
  }
  function syncExtraButton(){const b=document.querySelector('#v4ExtraReroll');if(!b)return;b.textContent=extra>0?`✦ CORE REROLL (${extra})`:'✦ NO CORE REROLLS';b.disabled=extra<=0;}
  const oldReset=reset;reset=function(){extra=Number(window.NeonV4ExtraRerolls)||0;const v=oldReset();setTimeout(()=>{scan();syncExtraButton();},0);return v;};
  const pBtn=document.querySelector('#play'),aBtn=document.querySelector('#again');if(pBtn)pBtn.onclick=reset;if(aBtn)aBtn.onclick=reset;

  document.addEventListener('keydown',e=>{if(state!==STATES.LEVEL||e.key.toLowerCase()!=='r')return;const normal=document.querySelector('#rerollUpgrade');if(normal&&!normal.disabled)return;const core=document.querySelector('#v4ExtraReroll');if(core&&!core.disabled){e.preventDefault();e.stopImmediatePropagation();core.click();}},true);

  const oldLevelUp=levelUp;levelUp=function(){const v=oldLevelUp();setTimeout(scan,0);return v;};
  scan();
})();
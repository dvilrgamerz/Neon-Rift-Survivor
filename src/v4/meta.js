/* Neon Rift Survivor V4 — Expedition Hub, progression, leaderboards, settings and save tools */
(() => {
  const V4=window.NeonV4;if(!V4)return;const S=()=>V4.save;
  const M=V4.meta={};

  function ensureUI(){
    const startCard=ui.start?.querySelector('.card');if(!startCard)return;
    let hub=startCard.querySelector('#v4HubBar');
    if(!hub){
      hub=document.createElement('div');hub.id='v4HubBar';hub.className='v4-hubbar';hub.innerHTML=`
        <button type="button" data-v4tab="loadout">EXPEDITION</button>
        <button type="button" data-v4tab="progression">RIFT CORES <b id="v4CoreCount">0</b></button>
        <button type="button" data-v4tab="leaderboard">LEADERBOARD</button>
        <button type="button" data-v4tab="stats">STATS</button>
        <button type="button" data-v4tab="settings">SETTINGS</button>`;
      const play=startCard.querySelector('#play');startCard.insertBefore(hub,play);
      hub.addEventListener('click',e=>{const b=e.target.closest('[data-v4tab]');if(b)openPanel(b.dataset.v4tab);});
    }
    if(!document.querySelector('#v4Modal')){
      const modal=document.createElement('div');modal.id='v4Modal';modal.className='v4-modal hide';modal.innerHTML=`<div class="v4-modal-card"><button id="v4Close" class="v4-close" type="button">×</button><div id="v4ModalBody"></div></div>`;document.body.appendChild(modal);
      modal.querySelector('#v4Close').onclick=()=>modal.classList.add('hide');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hide');});
    }
    if(!document.querySelector('#v4Chest')){
      const chest=document.createElement('div');chest.id='v4Chest';chest.className='v4-modal hide';chest.innerHTML=`<div class="v4-modal-card chest-card"><div class="version-chip">BOSS CACHE</div><h2 id="v4ChestTitle">RIFT CACHE</h2><p>Choose one reward.</p><div id="v4ChestChoices" class="v4-chest-grid"></div></div>`;document.body.appendChild(chest);
    }
    if(!document.querySelector('#v4RunHud')){
      const hud=document.createElement('div');hud.id='v4RunHud';hud.className='v4-runhud';hud.innerHTML=`<span id="v4OperatorHud"></span><span id="v4ArenaHud"></span><span id="v4RunModeHud"></span><span id="v4MissionHud"></span><span id="v4ShieldHud"></span>`;document.querySelector('.hud')?.appendChild(hud);
    }
    const overCard=ui.over?.querySelector('.card');if(overCard&&!overCard.querySelector('#v4Result')){const box=document.createElement('div');box.id='v4Result';box.className='v4-result';const actions=overCard.querySelector('.gameover-actions');overCard.insertBefore(box,actions||null);}
    document.title='Neon Rift Survivor V4 — Rift Expedition';
  }

  function openPanel(tab){ensureUI();const body=document.querySelector('#v4ModalBody'),modal=document.querySelector('#v4Modal');if(!body||!modal)return;body.innerHTML='';
    if(tab==='loadout')renderLoadout(body);else if(tab==='progression')renderProgression(body);else if(tab==='leaderboard')renderLeaderboard(body);else if(tab==='stats')renderStats(body);else renderSettings(body);modal.classList.remove('hide');V4.sfx?.ui();
  }

  function selectGrid(title,items,current){return `<section class="v4-section"><h3>${title}</h3><div class="v4-select-grid">${items.map(i=>`<button type="button" class="v4-select ${i.id===current?'active':''}" data-id="${i.id}"><span>${i.icon||'✦'}</span><b>${i.name}</b><small>${i.desc||i.role||''}</small></button>`).join('')}</div></section>`;}
  function renderLoadout(root){
    const ops=Object.entries(V4.operators).map(([id,v])=>({id,...v})),ars=Object.entries(V4.arenas).map(([id,v])=>({id,...v})),modes=Object.entries(V4.runModes).map(([id,v])=>({id,icon:id==='daily'?'☀':id==='ascension'?'▲':id==='expedition'?'◎':'∞',...v}));
    root.innerHTML=`<div class="v4-title"><div><span>V4 RIFT EXPEDITION</span><h2>Build Your Run</h2></div><b>Rift Cores ${S().cores}</b></div>${selectGrid('Operator',ops,S().selected.operator)}${selectGrid('Arena',ars,S().selected.arena)}${selectGrid('Run Mode',modes,S().selected.runMode)}<p class="v4-note">Daily Challenge locks its Operator and Arena from the current UTC date when the run begins.</p>`;
    const sections=root.querySelectorAll('.v4-section');
    sections[0]?.addEventListener('click',e=>pick(e,'operator'));sections[1]?.addEventListener('click',e=>pick(e,'arena'));sections[2]?.addEventListener('click',e=>pick(e,'runMode'));
  }
  function pick(e,key){const b=e.target.closest('.v4-select');if(!b)return;S().selected[key]=b.dataset.id;V4.persist();renderSelections();renderLoadout(document.querySelector('#v4ModalBody'));}

  function renderProgression(root){
    root.innerHTML=`<div class="v4-title"><div><span>PERMANENT PROGRESSION</span><h2>Rift Core Grid</h2></div><b>${S().cores} CORES</b></div><p class="v4-note">Permanent upgrades are capped so each run still depends on your build and movement.</p><div class="v4-progression">${V4.progressionNodes.map(n=>{const lv=Number(S().progression[n.id]||0),max=lv>=n.max,c=max?'MAX':n.cost(lv);return `<button type="button" data-node="${n.id}" ${max?'disabled':''}><span>${n.icon}</span><b>${n.name}</b><small>${n.desc}</small><em>Lv.${lv}/${n.max} • ${max?'MAX':c+' cores'}</em></button>`;}).join('')}</div>`;
    root.querySelector('.v4-progression')?.addEventListener('click',e=>{const b=e.target.closest('[data-node]');if(!b)return;const n=V4.progressionNodes.find(v=>v.id===b.dataset.node),lv=Number(S().progression[n.id]||0);if(!n||lv>=n.max)return;const cost=n.cost(lv);if(S().cores<cost){V4.fx?.text(innerWidth/2,120,'NOT ENOUGH CORES','#ff7b99');return;}S().cores-=cost;S().progression[n.id]=lv+1;V4.persist();renderProgression(root);sync();V4.sfx?.chest();});
  }

  function availableBoards(){const keys=Object.keys(S().leaderboards);if(!keys.length)return ['No runs recorded yet'];return keys.sort();}
  function renderLeaderboard(root){
    const keys=availableBoards(),preferred=`${S().selected.runMode}:${S().selected.arena}:${selectedMode}`,key=keys.includes(preferred)?preferred:keys[0];
    root.innerHTML=`<div class="v4-title"><div><span>LOCAL TOP 10</span><h2>Leaderboard</h2></div><b>OFFLINE / DEVICE</b></div><label class="v4-field">Board<select id="v4BoardSelect">${keys.map(k=>`<option ${k===key?'selected':''}>${V4.escape(k)}</option>`).join('')}</select></label><div id="v4Board"></div><p class="v4-note">This leaderboard is stored on this device and works offline. The data model is ready for a future optional global backend.</p>`;
    const render=k=>{const box=root.querySelector('#v4Board');if(k==='No runs recorded yet'){box.innerHTML='<p class="v4-empty">Finish a V4 run to create the first score.</p>';return;}const board=S().leaderboards[k]||[];box.innerHTML=`<div class="v4-table"><div class="head"><span>#</span><span>Score</span><span>Operator / Class</span><span>Time</span><span>Bosses</span></div>${board.map((r,i)=>`<div><span>${i+1}</span><b>${Number(r.score).toLocaleString()}</b><span>${V4.escape(V4.operators[r.operator]?.name||r.operator)} / ${V4.escape(r.className)}</span><span>${fmt(r.seconds)}</span><span>${r.bosses}</span></div>`).join('')}</div>`;};render(key);root.querySelector('#v4BoardSelect')?.addEventListener('change',e=>render(e.target.value));
  }

  function renderStats(root){
    const s=S().stats,ach=V4.achievements.filter(a=>S().achievements[a.id]);
    root.innerHTML=`<div class="v4-title"><div><span>CAREER</span><h2>Statistics & Achievements</h2></div><b>${ach.length}/${V4.achievements.length} ACHIEVEMENTS</b></div><div class="summary-grid v4-statgrid"><div><span>RUNS</span><b>${s.runs}</b></div><div><span>KILLS</span><b>${s.kills.toLocaleString()}</b></div><div><span>BOSSES</span><b>${s.bosses}</b></div><div><span>PLAY TIME</span><b>${fmt(s.seconds)}</b></div><div><span>BEST SCORE</span><b>${s.bestScore.toLocaleString()}</b></div><div><span>MYTHICS</span><b>${s.mythics}</b></div><div><span>EVOS</span><b>${s.evos}</b></div><div><span>CORES EARNED</span><b>${s.coresEarned}</b></div></div><h3>Achievements</h3><div class="v4-achievements">${V4.achievements.map(a=>`<div class="${S().achievements[a.id]?'unlocked':''}"><span>${S().achievements[a.id]?'★':'◇'}</span><b>${a.name}</b><small>${a.desc}</small></div>`).join('')}</div><h3>Recent Runs</h3><div class="v4-history">${S().history.slice(0,10).map(r=>`<div><b>${Number(r.score).toLocaleString()}</b><span>${V4.escape(V4.arenas[r.arena]?.name||r.arena)} • ${V4.escape(V4.runModes[r.runMode]?.name||r.runMode)} • ${fmt(r.seconds)}</span></div>`).join('')||'<p class="v4-empty">No V4 run history yet.</p>'}</div>`;
  }

  function renderSettings(root){const s=S().settings;
    root.innerHTML=`<div class="v4-title"><div><span>OPTIONS</span><h2>Settings & Save</h2></div><b>V4.0</b></div><div class="v4-settings">
      ${range('sfx','SFX volume',s.sfx,0,1,.05)}${range('music','Ambient volume',s.music,0,.5,.05)}${range('vfx','VFX intensity',s.vfx,0,1,.1)}
      ${toggle('reducedMotion','Reduced motion',s.reducedMotion)}${toggle('damageNumbers','Damage / status text',s.damageNumbers)}${toggle('screenShake','Screen shake',s.screenShake)}${toggle('controller','Gamepad controls',s.controller)}${toggle('fixedJoystick','Fixed mobile joystick',s.fixedJoystick)}${toggle('performance','Performance mode',s.performance)}
    </div><h3>Save data</h3><textarea id="v4SaveBox" class="v4-savebox" placeholder="Exported V4 save appears here. Paste a V4 save here to import."></textarea><div class="v4-save-actions"><button id="v4Export" type="button">EXPORT SAVE</button><button id="v4Import" type="button">IMPORT SAVE</button><button id="v4ClearBoards" type="button">CLEAR LEADERBOARDS</button></div><p class="v4-note">Import replaces V4 progression, settings, history and local leaderboards on this device.</p>`;
    root.querySelectorAll('[data-setting]').forEach(el=>el.addEventListener(el.type==='range'?'input':'change',()=>{const k=el.dataset.setting;S().settings[k]=el.type==='checkbox'?el.checked:Number(el.value);V4.persist();V4.syncAudio?.();}));
    root.querySelector('#v4Export').onclick=()=>{const box=root.querySelector('#v4SaveBox');box.value=btoa(unescape(encodeURIComponent(JSON.stringify(S()))));box.select();navigator.clipboard?.writeText(box.value).catch(()=>{});};
    root.querySelector('#v4Import').onclick=()=>{const box=root.querySelector('#v4SaveBox');try{const raw=JSON.parse(decodeURIComponent(escape(atob(box.value.trim()))));localStorage.setItem(V4.saveKey,JSON.stringify(raw));V4.save=V4.load();sync();renderSettings(root);alert('V4 save imported.');}catch{alert('That V4 save could not be imported.');}};
    root.querySelector('#v4ClearBoards').onclick=()=>{if(confirm('Clear all local V4 leaderboard scores?')){S().leaderboards={};V4.persist();}};
  }
  function range(k,label,v,min,max,step){return `<label class="v4-field">${label}<input data-setting="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;}
  function toggle(k,label,v){return `<label class="v4-toggle"><input data-setting="${k}" type="checkbox" ${v?'checked':''}> ${label}</label>`;}

  M.showChest=function(grade,rewards){ensureUI();const c=document.querySelector('#v4Chest'),title=document.querySelector('#v4ChestTitle'),box=document.querySelector('#v4ChestChoices');title.textContent=`${grade} RIFT CACHE`;box.innerHTML=rewards.map((r,i)=>`<button type="button" data-reward="${i}"><b>${r.name}</b><small>${r.desc}</small></button>`).join('');box.onclick=e=>{const b=e.target.closest('[data-reward]');if(b)V4.takeChest(rewards[Number(b.dataset.reward)]);};c.classList.remove('hide');};

  M.renderRunResult=function(r){ensureUI();const box=document.querySelector('#v4Result');if(!box)return;box.innerHTML=`<div class="summary-grid"><div><span>OPERATOR</span><b>${V4.escape(V4.operators[r.operator]?.name)}</b></div><div><span>ARENA</span><b>${V4.escape(V4.arenas[r.arena]?.name)}</b></div><div><span>MODE</span><b>${V4.escape(V4.runModes[r.runMode]?.name)}</b></div><div><span>TIME</span><b>${fmt(r.seconds)}</b></div><div><span>BOSSES</span><b>${r.bosses}</b></div><div><span>EVOS</span><b>${r.evos}</b></div></div><div class="summary-score">Score multiplier <b>×${Number(r.mult).toFixed(2)}</b> • Rift Cores earned <b>+${r.cores}</b></div><div class="summary-synergy">Ultimate synergies: ${r.ultimates} • Mythic picks: ${r.mythics}</div>`;};

  M.updateHud=function(progress=0){const op=document.querySelector('#v4OperatorHud'),ar=document.querySelector('#v4ArenaHud'),rm=document.querySelector('#v4RunModeHud'),mi=document.querySelector('#v4MissionHud'),sh=document.querySelector('#v4ShieldHud');if(op)op.textContent=`${V4.operators[S().selected.operator]?.name||''}`;if(ar)ar.textContent=V4.arenas[S().selected.arena]?.name||'';if(rm)rm.textContent=V4.runModes[S().selected.runMode]?.name||'';if(mi)mi.textContent=['expedition','daily'].includes(S().selected.runMode)?`MISSION ${Math.floor(progress*100)}%`:'';if(sh)sh.textContent=(p?.v4ShieldMax||0)>0?`SHIELD ${Math.ceil(p.v4Shield||0)}/${Math.ceil(p.v4ShieldMax||0)}`:'';};
  M.syncSynergies=function(){let el=document.querySelector('#v4UltimateHud');if(!el){el=document.createElement('div');el.id='v4UltimateHud';el.className='v4-ultimate-hud';document.querySelector('.hud')?.appendChild(el);}el.innerHTML=[...V4.runtime.ultimate].map(id=>`<span>★ ${V4.escape(V4.ultimateSynergies.find(s=>s.id===id)?.name||id)}</span>`).join('');el.classList.toggle('hide',!V4.runtime.ultimate.size);};

  function renderSelections(){const note=document.querySelector('.mode-note');if(note)note.textContent=`V4 • ${V4.operators[S().selected.operator]?.name} • ${V4.arenas[S().selected.arena]?.name} • ${V4.runModes[S().selected.runMode]?.name} • Mythic upgrades • VFX/SFX • leaderboards`;const core=document.querySelector('#v4CoreCount');if(core)core.textContent=S().cores;}
  M.renderSelections=renderSelections;
  M.sync=function(){ensureUI();renderSelections();M.updateHud(0);};
  function fmt(v){v=Math.max(0,Number(v)||0);const h=Math.floor(v/3600),m=Math.floor(v%3600/60),s=Math.floor(v%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}

  ensureUI();renderSelections();
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
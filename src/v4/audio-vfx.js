/* Neon Rift Survivor V4 — original WebAudio SFX + lightweight ability VFX */
(() => {
  const V4=window.NeonV4;if(!V4)return;
  const A=V4.audio={ctx:null,master:null,musicGain:null,ambient:null,last:{}};
  const R=V4.runtime;

  function ensureAudio(){
    if(A.ctx)return A.ctx;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    A.ctx=new AC();A.master=A.ctx.createGain();A.master.connect(A.ctx.destination);
    A.musicGain=A.ctx.createGain();A.musicGain.connect(A.master);
    syncAudio();return A.ctx;
  }
  function syncAudio(){
    if(!A.ctx)return;
    const s=V4.save.settings;
    A.master.gain.setTargetAtTime(Math.max(0,Math.min(1,s.sfx)),A.ctx.currentTime,.02);
    A.musicGain.gain.setTargetAtTime(Math.max(0,Math.min(.5,s.music)),A.ctx.currentTime,.05);
  }
  V4.syncAudio=syncAudio;
  addEventListener('pointerdown',()=>{const ctx=ensureAudio();if(ctx?.state==='suspended')ctx.resume();},{once:false,passive:true});
  addEventListener('keydown',()=>{const ctx=ensureAudio();if(ctx?.state==='suspended')ctx.resume();},{once:false});

  function tone(freq=440,dur=.09,type='sine',gain=.08,slide=0){
    const ctx=ensureAudio();if(!ctx||V4.save.settings.sfx<=0)return;
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),ctx.currentTime+dur);
    g.gain.setValueAtTime(0.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),ctx.currentTime+.008);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);
    o.connect(g);g.connect(A.master);o.start();o.stop(ctx.currentTime+dur+.02);
  }
  function chord(freqs,dur=.14,type='sine',gain=.035){freqs.forEach((f,i)=>setTimeout(()=>tone(f,dur,type,gain,i*10),i*16));}
  function throttled(key,ms,fn){const n=performance.now();if(n-(A.last[key]||0)<ms)return;A.last[key]=n;fn();}

  V4.shake=function(power=4){if(!V4.save.settings.screenShake||V4.save.settings.reducedMotion)return;const dx=(Math.random()-.5)*power,dy=(Math.random()-.5)*power;c.style.transform=`translate(${dx}px,${dy}px)`;setTimeout(()=>{c.style.transform='';},55);};

  V4.sfx={
    ui(){tone(510,.055,'sine',.035,80)},
    hit(){throttled('hit',60,()=>tone(150,.05,'square',.022,-40))},
    damage(){throttled('damage',120,()=>tone(92,.11,'sawtooth',.055,-30))},
    boss(){chord([110,165,220],.22,'sawtooth',.035)},
    evo(){chord([392,523,659,784],.18,'triangle',.05)},
    synergy(){chord([330,440,660],.16,'sine',.045)},
    chest(){chord([440,554,659],.18,'triangle',.045)},
    mythic(){chord([523,659,784,1047],.24,'sine',.06)},
    legendary(){chord([440,554,659],.16,'sine',.045)},
    ability(type){
      const map={pulse:[620,.045,'square',.018,-120],disc:[330,.09,'triangle',.035,160],brick:[130,.11,'square',.045,-35],drill:[760,.065,'sawtooth',.028,220],core:[220,.12,'triangle',.04,90],laser:[980,.06,'sine',.035,-240],arc:[720,.07,'square',.03,180],mine:[120,.12,'sawtooth',.045,-55],plasma:[260,.12,'triangle',.035,-80],slash:[430,.08,'sawtooth',.035,170],missile:[180,.12,'square',.04,80],orb:[560,.07,'sine',.03,130],field:[300,.1,'sine',.025,40],guard:[470,.08,'triangle',.025,90]};
      const a=map[type]||map.pulse;throttled('ability-'+type,75,()=>tone(...a));
    }
  };

  V4.startAmbient=function(){
    const ctx=ensureAudio();if(!ctx||A.ambient||V4.save.settings.music<=0)return;
    const g=ctx.createGain();g.gain.value=.05;g.connect(A.musicGain);
    const o1=ctx.createOscillator(),o2=ctx.createOscillator();o1.type='sine';o2.type='triangle';o1.frequency.value=55;o2.frequency.value=82.41;
    const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.12;lg.gain.value=7;lfo.connect(lg);lg.connect(o2.frequency);
    o1.connect(g);o2.connect(g);o1.start();o2.start();lfo.start();A.ambient={o1,o2,lfo,g};
  };
  V4.stopAmbient=function(){if(!A.ambient)return;for(const k of ['o1','o2','lfo'])try{A.ambient[k].stop();}catch{}A.ambient=null;};

  const FX=V4.fx={items:[]};
  FX.ring=function(px,py,color='#7ff',r=18,max=72,life=.35,line=3){if(V4.save.settings.vfx<=0)return;FX.items.push({kind:'ring',x:px,y:py,color,r,max,life,ttl:life,line});};
  FX.spark=function(px,py,color='#fff',count=8){if(V4.save.settings.vfx<=0)return;const factor=V4.save.settings.performance?.45:(V4.save.settings.reducedMotion?.55:1);const n=Math.max(1,Math.floor(count*V4.save.settings.vfx*factor));for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*160;FX.items.push({kind:'spark',x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,life:.32,ttl:.32});}};
  FX.text=function(px,py,text,color='#fff'){if(!V4.save.settings.damageNumbers)return;FX.items.push({kind:'text',x:px,y:py,text,color,life:.65,ttl:.65});};
  FX.update=function(dt){for(const f of FX.items){f.life-=dt;if(f.kind==='spark'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.97;f.vy*=.97;}if(f.kind==='text')f.y-=28*dt;}FX.items=FX.items.filter(f=>f.life>0).slice(-420);};
  FX.draw=function(ctx){
    if(!ctx||V4.save.settings.vfx<=0)return;
    for(const f of FX.items){const a=Math.max(0,f.life/f.ttl);ctx.save();ctx.globalAlpha=a;
      if(f.kind==='ring'){const q=1-a,rr=f.r+(f.max-f.r)*q;ctx.strokeStyle=f.color;ctx.lineWidth=f.line*a+1;ctx.shadowBlur=16;ctx.shadowColor=f.color;ctx.beginPath();ctx.arc(f.x,f.y,rr,0,Math.PI*2);ctx.stroke();}
      else if(f.kind==='spark'){ctx.fillStyle=f.color;ctx.shadowBlur=9;ctx.shadowColor=f.color;ctx.fillRect(f.x-2,f.y-2,4,4);}
      else if(f.kind==='text'){ctx.fillStyle=f.color;ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.shadowBlur=8;ctx.shadowColor=f.color;ctx.fillText(f.text,f.x,f.y);}
      ctx.restore();
    }
  };

  const colors={disc:'#ff526d',brick:'#cb8051',drill:'#ffd44f',core:'#9fe34f',laser:'#ff47e6',arc:'#74f6ff',mine:'#ffbd2e',plasma:'#ff5fb9',slash:'#c78cff',missile:'#ff9b42',orb:'#5fe7ff',field:'#50ffaa',guard:'#43e8ff',pulse:'#fff'};
  function abilityFx(type){const col=colors[type]||'#7ff';FX.ring(p.x,p.y,col,10,type==='slash'?125:58,.28,type==='laser'?2:3);FX.spark(p.x,p.y,col,type==='arc'?12:7);V4.sfx.ability(type);if(['mine','missile','slash'].includes(type))V4.shake(3);}

  if(typeof radialShot==='function'){
    const old=radialShot;radialShot=function(type,...args){const v=old(type,...args);abilityFx(type);return v;};
  }
  if(typeof targetedShot==='function'){
    const old=targetedShot;targetedShot=function(type,...args){const v=old(type,...args);throttled('targetfx-'+type,90,()=>abilityFx(type));return v;};
  }
  if(typeof fire==='function'){
    const old=fire;fire=function(){const v=old();V4.sfx.ability('pulse');return v;};
  }
  if(typeof activateSkills==='function'){
    const old=activateSkills;activateSkills=function(dt){const before={...timers};const v=old(dt);for(const id of ['field','guard','arc','mine','plasma','slash']){if(owned[id]&&(timers[id]||0)>(before[id]||0)+.05)abilityFx(id);}return v;};
  }
  if(typeof explode==='function'){
    const old=explode;explode=function(px,py,r,dmg){const v=old(px,py,r,dmg);FX.ring(px,py,'#ff9b42',10,Math.min(r,160),.32,4);FX.spark(px,py,'#ffd36d',15);V4.sfx.ability('mine');return v;};
  }
  if(typeof checkEvolutions==='function'){
    const old=checkEvolutions;checkEvolutions=function(){const b=Object.values(evolved).filter(Boolean).length;const v=old();const a=Object.values(evolved).filter(Boolean).length;if(a>b){V4.sfx.evo();FX.ring(p.x,p.y,'#ffe66d',20,150,.7,5);FX.spark(p.x,p.y,'#fff2a3',30);}return v;};
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.upgrade-card');if(!card)return;
    if(card.classList.contains('rarity-mythic')){R.mythicPicks++;V4.sfx.mythic();FX.ring(p.x,p.y,'#ff7cff',20,180,.8,6);}
    else if(card.classList.contains('rarity-legendary'))V4.sfx.legendary();
    else V4.sfx.ui();
  });
})();
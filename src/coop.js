/** Authoritative, two-player simulation. No browser, network or wall-clock dependencies. */
import { createRun, stepRun, withCoopPlayer, PLAYER_FIELDS, chooseRoute, selectReward, equipRelic, buyItem, chooseEvent, togglePause, rerollReward, abandonRun, getRunSummary } from './engine.js';

const clone = value => JSON.parse(JSON.stringify(value));
const number = value => Number.isFinite(value) ? Math.max(-1,Math.min(1,value)) : 0;
function safeInput(raw={}) { return { x:number(raw.x),y:number(raw.y),aimX:number(raw.aimX),aimY:number(raw.aimY),dash:raw.dash===true,ability:raw.ability===true,revive:raw.revive===true,...(typeof raw.manualAim==='boolean'?{manualAim:raw.manualAim}:{}) }; }
function member(session,id) { return session.players.find(player=>player.id===id); }
function emit(session,type,extra={}) { const e={type,time:session.run.time,...extra};session.run.events.push(e);session.run.recentEvents.push(e);if(session.run.recentEvents.length>80)session.run.recentEvents.shift(); }

export function createCoopRun(configs=[{},{}],profiles=[{},{}]) {
  if(!Array.isArray(configs)||configs.length!==2)throw new Error('A co-op expedition needs exactly two players.');
  const ids=configs.map((c,i)=>String(c.playerId||`p${i+1}`));
  if(ids[0]===ids[1]||ids.some(id=>!id||id.length>100))throw new Error('Player IDs must be distinct.');
  const host={...configs[0]};
  if(host.mode==='daily')host.mode='expedition'; // Daily remains its fixed solo competition.
  const run=createRun(host,profiles[0]||{});
  const players=configs.map((config,index)=>{
    const personal=index===0?run:createRun({...config,mode:run.config.mode,difficulty:run.config.difficulty,customDifficulty:run.config.customDifficulty,seed:run.config.seed,date:run.config.date,biome:run.biome},profiles[index]||{});
    return {id:ids[index],connected:true,disconnectedTicks:0,personalKills:0,...Object.fromEntries(PLAYER_FIELDS.map(key=>[key,personal[key]]))};
  });
  players[0].player.x=550;players[1].player.x=650;
  for(const player of players){player.player.downed=false;player.player.reviveProgress=0;}
  run.coopPlayers=players;run.currentPlayerId=players[0].id;
  return {id:`coop-${run.id}`,run,players,hostId:players[0].id,tick:0,connected:true};
}

function releaseDisconnectedRewards(session) {
  const run=session.run;
  for(let i=0;i<30&&run.state==='reward'&&run.rewardOwnerId&&member(session,run.rewardOwnerId)?.connected===false;i++){
    const owner=run.rewardOwnerId;
    withCoopPlayer(run,owner,()=>{
      if(run.pendingRelic)equipRelic(run,run.pendingRelic,run.relics[0]);
      else if(run.rewardChoices[0])selectReward(run,run.rewardChoices[0].id);
    });
  }
}

export function stepCoopRun(session,inputFrames={},dt=1/60) {
  if(!session?.run||!Array.isArray(session.players))throw new Error('Invalid co-op session.');
  if(!session.players.some(p=>p.connected))return [];
  // The host calls once per tick. The supplied dt cannot speed up or bypass the
  // authoritative clock; browsers only submit inputs.
  const fixedDt=1/60;
  const inputs={};session.players.forEach((player,index)=>{inputs[player.id]=safeInput(Array.isArray(inputFrames)?inputFrames[index]:inputFrames[player.id]);if(!player.connected)inputs[player.id]={};});
  const events=stepRun(session.run,{players:inputs},fixedDt);
  session.tick=session.run.tick;
  for(const player of session.players)if(!player.connected)player.disconnectedTicks++;
  if(session.run.state==='playing') {
    for(const downed of session.players.filter(p=>p.player.downed&&p.connected)){
      const rescuer=session.players.find(p=>p.id!==downed.id&&p.connected&&!p.player.downed&&(inputs[p.id]?.revive||Math.hypot(inputs[p.id]?.x||0,inputs[p.id]?.y||0)<.15)&&Math.hypot(p.player.x-downed.player.x,p.player.y-downed.player.y)<=75);
      downed.player.reviveProgress=rescuer?Math.min(3,downed.player.reviveProgress+fixedDt):Math.max(0,downed.player.reviveProgress-fixedDt*1.5);
      if(downed.player.reviveProgress>=3-1e-9){downed.player.downed=false;downed.player.hp=downed.player.maxHp*.35;downed.player.invulnerable=2;downed.player.reviveProgress=0;emit(session,'player-revived',{playerId:downed.id,by:rescuer.id});}
    }
  }
  releaseDisconnectedRewards(session);
  return events;
}

export function coopAction(session,playerId,action={}) {
  const player=member(session,playerId);if(!player||!action||typeof action.type!=='string')return false;
  const run=session.run;
  if(action.type==='disconnect'){
    player.connected=false;player.disconnectedTicks=0;
    if(session.hostId===playerId)session.hostId=session.players.find(p=>p.connected)?.id||playerId;
    if(run.state==='paused'&&session.players.some(p=>p.connected))run.state='playing';
    emit(session,'player-disconnected',{playerId});releaseDisconnectedRewards(session);return true;
  }
  if(action.type==='reconnect'){
    player.connected=true;player.disconnectedTicks=0;player.player.invulnerable=Math.max(2,player.player.invulnerable);
    emit(session,'player-reconnected',{playerId});return true;
  }
  if(!player.connected||run.state==='gameover')return false;
  const host=playerId===session.hostId;
  if(['route','shop','event','abandon'].includes(action.type)&&!host)return false;
  if(action.type==='pause'&&action.paused===true&&run.state==='paused')return true;
  if(action.type==='pause'&&!host&&run.state==='paused')return false;
  return withCoopPlayer(run,playerId,()=>{
    if(action.type==='reward')return selectReward(run,action.id??action.index);
    if(action.type==='reroll')return rerollReward(run);
    if(action.type==='relic'){
      if(!run.pendingRelic||action.id!==run.pendingRelic||(run.pendingRelicOwnerId&&run.pendingRelicOwnerId!==playerId)||(run.rewardOwnerId&&run.rewardOwnerId!==playerId))return false;
      return equipRelic(run,action.id,action.replaceId);
    }
    if(action.type==='route'){
      const result=chooseRoute(run,action.index??action.id);
      if(result)session.players.forEach((p,index)=>{p.player.x=550+index*100;p.player.y=380;if(p.player.downed){p.player.downed=false;p.player.hp=p.player.maxHp*.35;p.player.reviveProgress=0;}p.player.invulnerable=1;});
      return result;
    }
    if(action.type==='shop')return buyItem(run,action.id);
    if(action.type==='event')return chooseEvent(run,action.id);
    if(action.type==='pause'){if(action.paused===true&&run.state==='paused')return true;return togglePause(run);}
    if(action.type==='abandon')return abandonRun(run);
    return false;
  });
}

export function getCoopView(session,playerId) {
  const own=member(session,playerId);if(!own)throw new Error('Player is not in this expedition.');
  return withCoopPlayer(session.run,playerId,()=>{
    const {coopPlayers,currentPlayerId,...raw}=session.run;
    const view=clone(raw);
    const waiting=Boolean(view.state==='reward'&&view.rewardOwnerId&&view.rewardOwnerId!==playerId);
    if(waiting){view.rewardChoices=[];view.pendingRelic=null;}
    if(view.pendingRelicOwnerId&&view.pendingRelicOwnerId!==playerId)view.pendingRelic=null;
    view.coop={sessionId:session.id,playerId,hostId:session.hostId,serverTick:session.tick,rewardOwnerId:view.rewardOwnerId,waitingForOtherPlayer:waiting,players:session.players.map(p=>({id:p.id,operator:p.config.operator,classId:p.config.classId,x:p.player.x,y:p.player.y,hp:p.player.hp,maxHp:p.player.maxHp,shield:p.player.shield,angle:p.player.angle,downed:!!p.player.downed,connected:p.connected,reviveProgress:p.player.reviveProgress||0}))};
    view.summary=getRunSummary(session.run);
    delete view.rngState;delete view.progression;delete view.recentEvents;
    return view;
  });
}

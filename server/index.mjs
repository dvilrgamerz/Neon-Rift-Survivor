import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomInt} from 'node:crypto';
import {createStore} from './store.mjs';
import {HttpError,fail,text,username,password,object,number,boolean,hashPassword,checkPassword,sessionToken,tokenHash,cookies,RateLimiter,readJson} from './security.mjs';
import {defaultSave,validateSave,isOperatorUnlocked} from '../src/storage.js';
import {OPERATORS,BIOMES,DIFFICULTIES,MODES,BALANCE_VERSION} from '../src/content.js';
import {CLASS_DEFINITIONS,SUBCLASSES,getProfileView} from '../src/nexus.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DAY=86400000;
const profileDefaults=name=>({displayName:name,bio:'',privacy:{publicProfile:false,allowFriendRequests:true},notifications:{friends:true,season:true},analyticsOptIn:false});
const publicUser=user=>user?{id:user.id,username:user.username,role:user.role,profile:structuredClone(user.profile)}:null;
const pair=(a,b)=>[a,b].sort().join(':');
const accountByName=(state,name)=>Object.values(state.users).find(user=>user.username.toLowerCase()===name.toLowerCase());
const known=(items,id)=>items.some(item=>item.id===id);

function configuration(raw={}) {
  object(raw,'run configuration');
  const result={mode:raw.mode||'endless',difficulty:raw.difficulty||'standard',operator:raw.operator||'nova',biome:raw.biome||'neon-city',manualAim:!!raw.manualAim};
  if(!known(MODES,result.mode)||!known(DIFFICULTIES,result.difficulty)||!known(OPERATORS,result.operator)||!known(BIOMES,result.biome))fail(400,'Unknown mode, difficulty, operator, or biome.');
  result.classId=raw.classId||raw.class||'assault';
  if(!known(CLASS_DEFINITIONS,result.classId))fail(400,'Unknown class.');
  result.subclass=raw.subclass||null;
  if(result.subclass&&!SUBCLASSES.some(item=>item.id===result.subclass&&item.classId===result.classId))fail(400,'The subclass does not match the selected class.');
  return result;
}
function checkedSave(value){try{return validateSave(value);}catch(error){fail(400,error.message);}}
function addNotice(db,userId,message,type='friend',extra={}) {
  const user=db.users[userId];if(!user||!user.profile.notifications[type==='season'?'season':'friends'])return;
  db.notices[userId]=[{id:randomUUID(),message,type,read:false,createdAt:new Date().toISOString(),...extra},...(db.notices[userId]||[])].slice(0,100);
}
function summaryFrom(raw) {
  object(raw,'run summary');
  const result={};
  for(const key of ['operator','mode','difficulty','balanceVersion','outcome','biome'])if(raw[key]!==undefined)result[key]=text(raw[key],key,80);
  for(const key of ['score','kills','elites','bosses','encounters','damageDealt','damageTaken','shieldAbsorbed','dashes','abilities'])result[key]=number(raw[key]??0,key,0,1e12);
  result.duration=number(raw.duration??raw.seconds??raw.time??0,'duration',0,DAY/1000);
  result.causeOfDeath=text(raw.causeOfDeath||raw.cause||'','cause of death',300);
  result.weapons={};result.passives={};
  for(const key of ['weapons','passives'])if(raw[key]){object(raw[key],key);if(Object.keys(raw[key]).length>6)fail(400,`Too many ${key}.`);for(const [id,level] of Object.entries(raw[key]))result[key][text(id,'content ID',60)]=number(level,'item level',1,5);}
  result.relics=(Array.isArray(raw.relics)?raw.relics:[]).slice(0,3).map(id=>text(id,'relic ID',60));
  result.evolutions=(Array.isArray(raw.evolutions)?raw.evolutions:[]).slice(0,6).map(id=>text(id,'evolution ID',60));
  return result;
}
function rankReasons(ticket,summary,now) {
  const reasons=[];
  for(const key of ['mode','difficulty','operator'])if(summary[key]!==ticket.config[key])reasons.push(`The submitted ${key} does not match its ticket.`);
  if(ticket.config.mode==='daily'&&summary.biome!==ticket.config.biome)reasons.push('The Daily biome does not match its seeded ticket.');
  if(summary.balanceVersion!==BALANCE_VERSION)reasons.push('The balance version differs from this server.');
  if(ticket.config.difficulty==='custom'||ticket.config.mode==='training')reasons.push('Custom and Training runs are not ranked.');
  if(summary.duration<10)reasons.push('The run is shorter than the ranked minimum.');
  if(summary.duration>(now-ticket.startedAt)/1000+15)reasons.push('The simulation duration exceeds elapsed server time.');
  if(now-ticket.startedAt>4*60*60*1000)reasons.push('The run ticket is over four hours old.');
  if(summary.kills>summary.duration*50+100)reasons.push('The claimed kill rate is outside the review threshold.');
  if(summary.bosses>summary.duration/30+2)reasons.push('The claimed boss rate is outside the review threshold.');
  if(summary.elites>summary.kills)reasons.push('Elite kills exceed total kills.');
  if(summary.score>Math.max(10000,summary.duration*2000+summary.kills*1000+summary.bosses*100000))reasons.push('The score exceeds the plausibility threshold.');
  if(!['victory','defeat','abandoned','won'].includes(summary.outcome))reasons.push('The result does not describe a completed run.');
  return reasons;
}

/** Optional same-origin service. No external APIs, dependencies, telemetry collectors, or hosting accounts. */
export async function createRiftServer(options={}) {
  const clock=options.clock||Date.now;
  const host=options.host||'127.0.0.1';
  const staticRoot=await realpath(options.staticRoot||ROOT);
  const dataDir=path.resolve(options.dataDir||path.join(os.homedir(),'.neon-rift-server'));
  const relativeData=path.relative(staticRoot,dataDir);
  if(relativeData===''||(!relativeData.startsWith('..'+path.sep)&&!path.isAbsolute(relativeData)))throw new Error('RIFT_DATA_DIR must be outside the served project directory.');
  if(!['127.0.0.1','localhost','::1'].includes(host)&&!options.publicOrigin)throw new Error('Binding beyond localhost requires RIFT_ORIGIN, the exact browser-facing origin.');
  let origin=options.publicOrigin?new URL(options.publicOrigin).origin:null;
  if(origin&&!/^https?:\/\//.test(origin))throw new Error('RIFT_ORIGIN must use HTTP or HTTPS.');
  const secure=origin?.startsWith('https:')||false;
  const adminName=options.adminUsername?username(options.adminUsername):null;
  const store=await createStore(dataDir);
  if(adminName){
    const existing=accountByName(store.state,adminName);
    if(existing)await store.update(db=>{db.users[existing.id].role='admin';return true;});
    else if(options.adminPassword){
      const credential=await hashPassword(password(options.adminPassword));
      await store.update(db=>{const id=randomUUID();db.users[id]={id,username:adminName,password:credential,role:'admin',banned:false,createdAt:clock(),profile:profileDefaults(adminName)};return true;});
    }
  }
  const sessions=new Map(),rooms=new Map(),limiter=new RateLimiter(clock),streams=new Set();
  let authWorkers=0,closed=false,roomTimer,lastFrame=performance.now(),accumulator=0,broadcastClock=0;
  let coopModule,seasonModule;
  const coop=async()=>coopModule||(coopModule=await import('../src/coop.js'));
  function profileStats(userId){
    const save=store.state.cloudSaves[userId]?.save||defaultSave(),view=getProfileView(save);
    const favorite=Object.entries(save.operatorStats||{}).sort((a,b)=>(b[1].encounters||0)-(a[1].encounters||0))[0]?.[0]||'nova';
    return {level:view.level,title:view.title,bestScore:save.stats.bestScore||0,runs:save.stats.runs||0,bosses:save.stats.bosses||0,favoriteOperator:favorite,badges:[...new Set([...(save.nexus?.achievements||[]),...Object.keys(save.achievements||{}).filter(id=>save.achievements[id])])].slice(0,24)};
  }
  function collectOptInStats(db,userId,summary){
    const user=db.users[userId];if(!user?.profile.analyticsOptIn)return;
    const totals=user.analytics||{runs:0,seconds:0,kills:0,bosses:0};totals.runs++;totals.seconds+=summary.duration||0;totals.kills+=summary.kills||0;totals.bosses+=summary.bosses||0;user.analytics=totals;
  }
  const season=async()=>{
    seasonModule=seasonModule||await import('../src/nexus.js');
    const now=new Date(clock()),current=seasonModule.getSeason(now),weekly=seasonModule.getWeeklyChallenges(now);
    return {season:current,weeks:8,weeklyChallenges:weekly,weeklyChallenge:weekly[0]||null};
  };
  function userFor(req,required=true) {
    const token=cookies(req.headers.cookie).rift_session;
    const session=token?sessions.get(tokenHash(token)):null;
    const user=session&&session.expiresAt>clock()?store.state.users[session.userId]:null;
    if(!user||user.banned){if(required)fail(401,'Sign in to the Nexus server.');return null;}return user;
  }
  function adminFor(req){const user=userFor(req);if(user.role!=='admin')fail(403,'Administrator access is required.');return user;}
  function makeSession(user,res){
    const token=sessionToken();sessions.set(tokenHash(token),{userId:user.id,expiresAt:clock()+7*DAY});
    const own=[...sessions.entries()].filter(([,session])=>session.userId===user.id);for(const [key] of own.slice(0,Math.max(0,own.length-8)))sessions.delete(key);
    res.setHeader('Set-Cookie',`rift_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure?'; Secure':''}`);
  }
  function send(res,status,value){if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
  function rate(req,key,limit,period=60000){limiter.take(`${key}:${req.socket.remoteAddress}`,limit,period);}
  function syncHost(room){if(room.session){const hostPlayer=room.players.find(player=>player.playerId===room.session.hostId);if(hostPlayer)room.hostUserId=hostPlayer.userId;}}
  function isMember(room,userId){return room.players.some(player=>player.userId===userId&&!player.left)||room.spectators.includes(userId);}
  function roomFor(code,user){const room=rooms.get(code.toUpperCase());if(!room)fail(404,'This room has expired or does not exist.');if(!isMember(room,user.id))fail(403,'Join this private room before viewing it.');syncHost(room);return room;}
  function playerFor(room,user){const player=room.players.find(member=>member.userId===user.id);if(!player)fail(403,'Spectators cannot control the match.');return player;}
  function roomView(room,userId){
    syncHost(room);
    const own=room.players.find(player=>player.userId===userId);
    const result={room:{code:room.code,state:room.state,status:room.state,config:room.config,hostId:room.hostUserId,players:room.players.map(({profile,lastInputAt,...player})=>({...player})),spectators:room.spectators.length,you:{playerId:own?.playerId||null,host:userId===room.hostUserId,spectator:!own}}};
    if(room.session&&coopModule)result.view=coopModule.getCoopView(room.session,own?.playerId||room.players[0].playerId);
    return result;
  }
  function broadcast(room){
    room.sequence++;
    for(const subscriber of room.subscribers){
      if(subscriber.res.writableLength>512*1024){subscriber.res.end();continue;}
      try{subscriber.res.write(`id: ${room.sequence}\nevent: state\ndata: ${JSON.stringify(roomView(room,subscriber.userId))}\n\n`);}catch{subscriber.res.destroy();}
    }
  }
  function disconnectUser(userId){
    for(const stream of streams)if(stream.userId===userId)stream.res.end();
    for(const room of rooms.values()){
      const player=room.players.find(member=>member.userId===userId);
      if(player){player.connected=false;if(room.session)coopModule?.coopAction(room.session,player.playerId,{type:'disconnect'});}
    }
  }
  function canJoin(user){for(const room of rooms.values())if(room.state!=='finished'&&room.players.some(player=>player.userId===user.id&&!player.left))fail(409,`Leave room ${room.code} before joining another room.`);}
  function addPlayer(room,user,operator,rawProfile,specialization={}){
    const profile=rawProfile?checkedSave(rawProfile):store.state.cloudSaves[user.id]?.save||defaultSave();
    const chosen=operator||profile.selected.operator;
    if(!known(OPERATORS,chosen))fail(400,'Unknown operator.');
    if(!isOperatorUnlocked(profile,chosen,room.config.mode))fail(403,'This operator has not been unlocked in the profile supplied to this room.');
    const config=configuration({...room.config,...specialization,operator:chosen});
    if(config.subclass&&(profile.nexus?.xp||0)<2000&&room.config.mode!=='training')fail(403,'Subclasses unlock at profile level five.');
    const usedIds=new Set(room.players.map(player=>player.playerId));
    const player={userId:user.id,playerId:usedIds.has('p1')?'p2':'p1',username:user.username,operator:chosen,classId:config.classId,subclass:config.subclass,ready:false,connected:true,profile,lastInputAt:0};room.players.push(player);return player;
  }
  async function finalizeRoom(room){
    if(room.recorded||!room.session?.run?.outcome)return;room.recorded=true;room.state='finished';
    if(room.config.mode==='training')return;
    const seasonData=await season();
    await store.update(db=>{
      for(const player of room.players){const id=`coop-${room.session.id}-${player.userId}`;if(db.runs[id])continue;const summary=summaryFrom(coopModule.getCoopView(room.session,player.playerId).summary);db.runs[id]={id,userId:player.userId,config:{...room.config,operator:player.operator},startedAt:room.startedAt,finishedAt:clock(),seasonId:seasonData.season.id,weekId:seasonData.season.weekId,status:'accepted',kind:'coop',verification:'server-simulated',reasons:[],summary};collectOptInStats(db,player.userId,summary);}
      return true;
    });
  }
  function tickRooms(){
    const current=performance.now(),elapsed=Math.min(.25,(current-lastFrame)/1000);lastFrame=current;accumulator+=elapsed;broadcastClock+=elapsed;
    let steps=0;
    while(accumulator>=1/60&&steps<8){
      for(const room of rooms.values())if(room.session&&room.state==='playing'){
        const frames={};for(const player of room.players){const frame=room.inputs[player.playerId];frames[player.playerId]=frame&&clock()-player.lastInputAt<600?frame:{x:0,y:0};}
        try{coopModule.stepCoopRun(room.session,frames,1/60);for(const frame of Object.values(room.inputs)){frame.dash=false;frame.ability=false;}
          if(room.session.run?.outcome)finalizeRoom(room).catch(()=>{room.recorded=false;});
        }catch{room.state='error';room.error='The match stopped unexpectedly. Offline play and your profile remain available.';}
      }
      accumulator-=1/60;steps++;
    }
    if(steps===8)accumulator=0;
    if(broadcastClock>=.1){broadcastClock=0;for(const room of rooms.values())if(room.session&&room.subscribers.size)broadcast(room);}
  }

  async function api(req,res,url){
    const route=url.pathname.slice('/api/v1'.length)||'/',method=req.method;
    const ip=req.socket.remoteAddress;
    if(method!=='GET'&&method!=='HEAD'){
      if(req.headers.origin!==origin)fail(403,'This action must come from the game’s own origin.');
      if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'&&req.headers['sec-fetch-site']!=='none')fail(403,'Cross-origin actions are not allowed.');
    }
    const highRateInput=/^\/rooms\/[A-Z0-9]{6}\/input$/.test(route);
    if(!highRateInput)rate(req,'api',300);
    if(route==='/status'&&method==='GET')return send(res,200,{available:true,name:'Rift Nexus',version:'5.0.0',offlineSupported:true,analyticsDefault:false,features:['accounts','cloud-saves','friends','seasons','ranked-review','private-coop']});
    if(route==='/auth/me'&&method==='GET')return send(res,200,{user:publicUser(userFor(req,false))});
    if(['/auth/signup','/auth/login'].includes(route)&&method==='POST'){
      rate(req,'auth',12);const body=await readJson(req,2048);const name=username(body.username),secret=password(body.password);limiter.take(`auth-name:${name.toLowerCase()}`,10,60000);
      if(authWorkers>=4)fail(429,'The server is processing sign-ins. Please try again shortly.');authWorkers++;
      let user;
      try{
        if(route==='/auth/signup'){
          if(adminName&&name.toLowerCase()===adminName.toLowerCase())fail(409,'This username is reserved for local administrator setup.');
          const credential=await hashPassword(secret);
          user=await store.update(db=>{
            if(accountByName(db,name))fail(409,'That username is already registered.');
            if(Object.keys(db.users).length>=(options.maxAccounts||500))fail(503,'This private server has reached its account limit.');
            const id=randomUUID(),created={id,username:name,password:credential,role:'player',banned:false,createdAt:clock(),profile:profileDefaults(name)};db.users[id]=created;return created;
          });
        }else{user=accountByName(store.state,name);const valid=await checkPassword(secret,user?.password);if(!valid||user?.banned)fail(401,'Username or password is incorrect, or this account is suspended.');}
      }finally{authWorkers--;}
      makeSession(user,res);
      const {season:current}=await season();if(user.profile.notifications.season&&user.lastSeasonNotice!==current.id)await store.update(db=>{addNotice(db,user.id,`${current.name} is open. Weekly challenges reset ${current.weekEndsAt.slice(0,10)} UTC.`,'season');db.users[user.id].lastSeasonNotice=current.id;return true;});
      return send(res,route==='/auth/signup'?201:200,{user:publicUser(user)});
    }
    if(route==='/auth/logout'&&method==='POST'){
      const user=userFor(req,false),token=cookies(req.headers.cookie).rift_session;if(token)sessions.delete(tokenHash(token));if(user)disconnectUser(user.id);
      res.setHeader('Set-Cookie',`rift_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure?'; Secure':''}`);return send(res,200,{ok:true});
    }
    if(route==='/season'&&method==='GET')return send(res,200,await season());
    if(route==='/leaderboard'&&method==='GET'){
      const {season:current}=await season(),mode=url.searchParams.get('mode'),difficulty=url.searchParams.get('difficulty'),period=url.searchParams.get('period')||'season',kind=url.searchParams.get('kind')||'solo';
      if(!['all','season','weekly'].includes(period)||!['solo','coop','all'].includes(kind))fail(400,'Invalid leaderboard filter.');
      const friendsOnly=url.searchParams.get('friends')==='true',viewer=friendsOnly?userFor(req):null;
      const date=url.searchParams.get('date')||new Date(clock()).toISOString().slice(0,10),version=url.searchParams.get('balanceVersion')||BALANCE_VERSION;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!/^[A-Za-z0-9_.-]{1,40}$/.test(version))fail(400,'Invalid Daily date or balance version.');
      let entries=Object.values(store.state.runs).filter(run=>run.status==='accepted'&&!store.state.users[run.userId]?.banned&&run.summary?.balanceVersion===version&&(run.config.mode!=='daily'||run.date===date)&&(!mode||run.config.mode===mode)&&(!difficulty||run.config.difficulty===difficulty)&&(kind==='all'||run.kind===kind)&&(period==='all'||run.seasonId===current.id)&&(period!=='weekly'||run.weekId===current.weekId)&&(!friendsOnly||run.userId===viewer.id||store.state.friendships.includes(pair(viewer.id,run.userId))));
      const best=new Map();for(const entry of entries){const grouping=`${entry.userId}:${entry.config.mode}:${entry.config.difficulty}:${entry.kind}:${entry.summary.balanceVersion}:${entry.config.mode==='daily'?entry.date:''}`;if(!best.has(grouping)||(entry.summary?.score||0)>(best.get(grouping).summary?.score||0))best.set(grouping,entry);}
      entries=[...best.values()].sort((a,b)=>(b.summary.score||0)-(a.summary.score||0)).slice(0,100).map((run,index)=>({rank:index+1,runId:run.id,userId:run.userId,username:store.state.users[run.userId]?.username||'Deleted account',displayName:store.state.users[run.userId]?.profile.displayName,score:run.summary.score,operator:run.summary.operator||run.config.operator,mode:run.config.mode,difficulty:run.config.difficulty,kind:run.kind,verification:run.verification,seasonId:run.seasonId,duration:run.summary.duration,balanceVersion:run.summary.balanceVersion,dailyDate:run.config.mode==='daily'?run.date:null}));
      return send(res,200,{entries,season:current,dailyDate:date,balanceVersion:version,verificationNotice:'Client summaries are screened by heuristics, not proven cheat-free. Co-op simulations have a separate leaderboard.'});
    }
    const user=userFor(req);
    if(route==='/profile'&&method==='GET')return send(res,200,{profile:user.profile,user:publicUser(user)});
    if(route==='/profile'&&method==='PATCH'){
      const body=await readJson(req,4096);
      const profile=structuredClone(user.profile);
      if(body.displayName!==undefined)profile.displayName=text(body.displayName,'display name',32,1).trim()||user.username;
      if(body.bio!==undefined)profile.bio=text(body.bio,'bio',240);
      for(const key of ['privacy','notifications'])if(body[key]!==undefined){object(body[key],key);for(const field of Object.keys(profile[key]))if(body[key][field]!==undefined)profile[key][field]=boolean(body[key][field],field);}
      if(body.analyticsOptIn!==undefined)profile.analyticsOptIn=boolean(body.analyticsOptIn,'analytics preference');
      await store.update(db=>{db.users[user.id].profile=profile;if(!profile.analyticsOptIn)delete db.users[user.id].analytics;return true;});return send(res,200,{profile});
    }
    const profileMatch=route.match(/^\/profiles\/([A-Za-z0-9_]+)$/);
    if(profileMatch&&method==='GET'){
      const target=accountByName(store.state,profileMatch[1]);if(!target||target.banned)fail(404,'Profile not found.');
      if(target.id!==user.id&&!target.profile.privacy.publicProfile&&!store.state.friendships.includes(pair(target.id,user.id)))fail(403,'This profile is private.');
      return send(res,200,{user:{id:target.id,username:target.username,profile:{displayName:target.profile.displayName,bio:target.profile.bio},stats:profileStats(target.id)}});
    }
    if(route==='/cloud-save'&&method==='GET'){const record=store.state.cloudSaves[user.id];return send(res,200,record?{save:record.save,revision:record.revision,updatedAt:record.updatedAt}:{save:null,revision:0});}
    if(route==='/cloud-save'&&method==='PUT'){
      rate(req,'cloud',20);const body=await readJson(req,2*1024*1024+8192);const revision=number(body.revision,'save revision',0,1e9);if(!Number.isInteger(revision))fail(400,'Save revision must be an integer.');const save=checkedSave(body.save);
      const record=await store.update(db=>{const previous=db.cloudSaves[user.id];if(revision!==(previous?.revision||0))fail(409,'The cloud save changed on another device. Inspect it before choosing which save to keep.',{revision:previous?.revision||0});const next={save,revision:revision+1,updatedAt:clock()};db.cloudSaves[user.id]=next;return next;});
      return send(res,200,{revision:record.revision,updatedAt:record.updatedAt});
    }
    if(route==='/friends'&&method==='GET'){
      const friends=store.state.friendships.filter(key=>key.split(':').includes(user.id)).map(key=>key.split(':').find(id=>id!==user.id)).map(id=>store.state.users[id]).filter(target=>target&&!target.banned).map(target=>({id:target.id,username:target.username,profile:{displayName:target.profile.displayName,bio:target.profile.bio},bestScore:Math.max(0,...Object.values(store.state.runs).filter(run=>run.userId===target.id&&run.status==='accepted').map(run=>run.summary?.score||0))}));
      const requests=Object.values(store.state.friendRequests).filter(request=>request.to===user.id&&request.status==='pending').map(request=>({...request,from:{id:request.from,username:store.state.users[request.from]?.username},username:store.state.users[request.from]?.username}));return send(res,200,{friends,requests});
    }
    if(route==='/friends/requests'&&method==='POST'){
      limiter.take(`friend:${user.id}`,10,60*60*1000);const body=await readJson(req,2048);const target=accountByName(store.state,username(body.username));
      if(!target||target.banned||!target.profile.privacy.allowFriendRequests)fail(404,'This player is unavailable for friend requests.');if(target.id===user.id)fail(400,'Choose another player.');
      const request=await store.update(db=>{if(db.friendships.includes(pair(user.id,target.id)))fail(409,'You are already friends.');if(Object.values(db.friendRequests).some(request=>request.status==='pending'&&pair(request.from,request.to)===pair(user.id,target.id)))fail(409,'A friend request is already pending.');const request={id:randomUUID(),from:user.id,to:target.id,status:'pending',createdAt:clock()};db.friendRequests[request.id]=request;addNotice(db,target.id,`${user.username} sent you a friend request.`);return request;});return send(res,201,{request});
    }
    const respondMatch=route.match(/^\/friends\/requests\/([a-f0-9-]+)\/respond$/);
    if(respondMatch&&method==='POST'){
      const body=await readJson(req,1024),accept=boolean(body.accept,'friend response');
      await store.update(db=>{const request=db.friendRequests[respondMatch[1]];if(!request||request.to!==user.id)fail(404,'Friend request not found.');if(request.status!=='pending')fail(409,'This request has already been handled.');request.status=accept?'accepted':'rejected';if(accept){const key=pair(request.from,request.to);if(!db.friendships.includes(key))db.friendships.push(key);addNotice(db,request.from,`${user.username} accepted your friend request.`);}return true;});return send(res,200,{ok:true});
    }
    const friendMatch=route.match(/^\/friends\/([a-f0-9-]+)$/);
    if(friendMatch&&method==='DELETE'){await store.update(db=>{db.friendships=db.friendships.filter(key=>key!==pair(user.id,friendMatch[1]));return true;});return send(res,200,{ok:true});}
    const inviteMatch=route.match(/^\/friends\/([a-f0-9-]+)\/invite$/);
    if(inviteMatch&&method==='POST'){
      limiter.take(`invite:${user.id}`,12,60000);const body=await readJson(req,1024),code=text(body.code,'room code',6,6).toUpperCase();roomFor(code,user);
      const target=store.state.users[inviteMatch[1]];if(!target||target.banned||!store.state.friendships.includes(pair(user.id,target.id)))fail(403,'Room invitations require an accepted friendship.');
      await store.update(db=>{addNotice(db,target.id,`${user.username} invited you to private room ${code}.`,'invite',{roomCode:code,fromUserId:user.id});return true;});return send(res,200,{ok:true});
    }
    if(['/notices','/notifications'].includes(route)&&method==='GET')return send(res,200,{notices:store.state.notices[user.id]||[]});
    if(['/notices/read','/notifications/read'].includes(route)&&method==='POST'){await store.update(db=>{for(const notice of db.notices[user.id]||[])notice.read=true;return true;});return send(res,200,{ok:true});}
    if(route==='/runs/start'&&method==='POST'){
      limiter.take(`rank-start:${user.id}`,12,60*60*1000);const body=await readJson(req,4096),config=configuration(body);if(config.mode==='training'||config.difficulty==='custom')fail(400,'Training and Custom runs are not eligible for ranked tickets.');
      const {season:current}=await season();const id=randomUUID(),date=new Date(clock()).toISOString().slice(0,10);let seed=randomInt(1,2147483647);
      if(config.mode==='daily'){const {createRun}=await import('../src/engine.js');const daily=createRun({mode:'daily',date},defaultSave());Object.assign(config,{operator:daily.config.operator,biome:daily.config.biome,difficulty:daily.config.difficulty,classId:daily.config.classId,subclass:null});seed=daily.config.seed;}
      await store.update(db=>{const active=Object.values(db.runs).filter(run=>run.userId===user.id&&run.status==='active'&&clock()-run.startedAt<4*60*60*1000);if(active.length>=3)fail(409,'Finish an existing ranked run before starting another.');db.runs[id]={id,userId:user.id,config,seed,date,startedAt:clock(),seasonId:current.id,weekId:current.weekId,status:'active',kind:'solo',verification:'client-summary-heuristic'};return true;});
      return send(res,201,{runId:id,seed,date,dailyDate:date,config,seasonId:current.id,balanceVersion:BALANCE_VERSION});
    }
    const finishMatch=route.match(/^\/runs\/([a-f0-9-]+)\/finish$/);
    if(finishMatch&&method==='POST'){
      const body=await readJson(req,32768),summary=summaryFrom(body.summary);
      const result=await store.update(db=>{const ticket=db.runs[finishMatch[1]];if(!ticket||ticket.userId!==user.id)fail(404,'Run ticket not found.');if(ticket.status!=='active')return {status:ticket.status,reasons:ticket.reasons||[],duplicate:true};const reasons=rankReasons(ticket,summary,clock());ticket.summary=summary;ticket.reasons=reasons;ticket.finishedAt=clock();ticket.status=reasons.length?'quarantined':'accepted';
        if(ticket.status==='accepted')for(const key of db.friendships.filter(key=>key.split(':').includes(user.id))){const friendId=key.split(':').find(id=>id!==user.id);const friendBest=Math.max(0,...Object.values(db.runs).filter(run=>run.userId===friendId&&run.status==='accepted'&&run.config.mode===ticket.config.mode&&run.config.difficulty===ticket.config.difficulty).map(run=>run.summary?.score||0));if(summary.score>friendBest)addNotice(db,friendId,`${user.username} posted ${Math.round(summary.score).toLocaleString()} in ${ticket.config.mode}.`,'score');}
        if(ticket.status==='accepted')collectOptInStats(db,user.id,summary);
        return {status:ticket.status,reasons,verification:ticket.verification};});return send(res,200,result);
    }
    if(route==='/reports'&&method==='POST'){
      limiter.take(`reports:${user.id}`,5,60*60*1000);const body=await readJson(req,2048),target=accountByName(store.state,username(body.username)),reason=text(body.reason,'report reason',500,5);if(!target)fail(404,'Player not found.');
      await store.update(db=>{db.reports.unshift({id:randomUUID(),reporterId:user.id,targetUserId:target.id,targetUsername:target.username,username:target.username,reason,createdAt:clock(),status:'open'});db.reports=db.reports.slice(0,1000);return true;});return send(res,201,{ok:true});
    }
    if(route==='/admin/reports'&&method==='GET'){
      adminFor(req);return send(res,200,{runs:Object.values(store.state.runs).filter(run=>run.status==='quarantined').slice(-200).map(run=>({...run,username:store.state.users[run.userId]?.username})),reports:store.state.reports,users:Object.values(store.state.users).filter(target=>target.banned).map(target=>({id:target.id,username:target.username,banned:true}))});
    }
    const moderateRun=route.match(/^\/admin\/runs\/([^/]+)$/);
    if(moderateRun&&method==='PATCH'){
      const admin=adminFor(req),body=await readJson(req,2048);if(!['approve','reject'].includes(body.decision))fail(400,'Choose approve or reject.');const reason=text(body.reason||'Moderator review','moderation reason',500,3);
      await store.update(db=>{const run=db.runs[moderateRun[1]];if(!run?.summary)fail(404,'Completed run not found.');run.status=body.decision==='approve'?'accepted':'rejected';run.moderation={by:admin.id,reason,at:clock()};return true;});return send(res,200,{ok:true});
    }
    const moderateUser=route.match(/^\/admin\/users\/([a-f0-9-]+)$/);
    if(moderateUser&&method==='PATCH'){
      const admin=adminFor(req),body=await readJson(req,1024),banned=boolean(body.banned,'suspension');if(moderateUser[1]===admin.id)fail(400,'The administrator cannot suspend their own account.');
      await store.update(db=>{const target=db.users[moderateUser[1]];if(!target)fail(404,'Account not found.');target.banned=banned;return true;});if(banned){for(const [key,session] of sessions)if(session.userId===moderateUser[1])sessions.delete(key);disconnectUser(moderateUser[1]);}return send(res,200,{ok:true});
    }
    if(route==='/rooms'&&method==='POST'){
      limiter.take(`room-create:${user.id}`,8,60000);canJoin(user);if(rooms.size>=32)fail(503,'All private room slots are occupied.');const body=await readJson(req,2*1024*1024+8192),config=configuration(body.config||{});let code;do{code=Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(31)]).join('');}while(rooms.has(code));
      if(config.mode==='daily')fail(400,'Daily competition is solo. Choose another co-op mode.');
      const room={code,hostUserId:user.id,config,createdAt:clock(),updatedAt:clock(),state:'lobby',players:[],spectators:[],subscribers:new Set(),session:null,inputs:{},sequence:0};addPlayer(room,user,config.operator,body.profile,config);rooms.set(code,room);return send(res,201,roomView(room,user.id));
    }
    if(route==='/rooms/join'&&method==='POST'){
      limiter.take(`room-join:${user.id}`,20,60000);const body=await readJson(req,2*1024*1024+8192),code=text(body.code,'room code',6,6).toUpperCase(),room=rooms.get(code);if(!room)fail(404,'Room not found.');
      if(!isMember(room,user.id)){if(body.spectator===true){if(room.spectators.length>=8)fail(409,'Spectator slots are full.');room.spectators.push(user.id);}else{canJoin(user);if(room.state!=='lobby'||room.players.length>=2)fail(409,'This match is already full or has started.');addPlayer(room,user,body.operator,body.profile,{classId:body.classId||body.config?.classId||'assault',subclass:body.subclass||body.config?.subclass||null});}}
      room.updatedAt=clock();broadcast(room);return send(res,200,roomView(room,user.id));
    }
    const roomMatch=route.match(/^\/rooms\/([A-Za-z0-9]{6})(?:\/(events|ready|start|input|action|leave|reconnect))?$/);
    if(roomMatch){
      const room=roomFor(roomMatch[1],user),operation=roomMatch[2];room.updatedAt=clock();
      if(!operation&&method==='GET')return send(res,200,roomView(room,user.id));
      if(operation==='events'&&method==='GET'){
        if([...streams].filter(stream=>stream.userId===user.id).length>=2)fail(429,'Close another room connection before opening this one.');
        const member=room.players.find(player=>player.userId===user.id);if(member){member.connected=true;if(room.session)coopModule.coopAction(room.session,member.playerId,{type:'reconnect'});}
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');
        const stream={res,userId:user.id,roomCode:room.code};room.subscribers.add(stream);streams.add(stream);broadcast(room);
        req.on('close',()=>{room.subscribers.delete(stream);streams.delete(stream);if(member&&![...room.subscribers].some(other=>other.userId===user.id)){member.connected=false;if(room.session)coopModule.coopAction(room.session,member.playerId,{type:'disconnect'});broadcast(room);}});return;
      }
      if(method!=='POST')fail(405,'Use the documented room method.');
      const body=await readJson(req,operation==='ready'?2*1024*1024+8192:8192);
      if(operation==='leave'){
        for(const stream of room.subscribers)if(stream.userId===user.id)stream.res.end();
        if(room.state==='lobby'){room.players=room.players.filter(player=>player.userId!==user.id);if(room.hostUserId===user.id){room.hostUserId=room.players[0]?.userId;if(!room.hostUserId){for(const stream of room.subscribers)stream.res.end();rooms.delete(room.code);return send(res,200,{ok:true});}}}
        else{const player=room.players.find(member=>member.userId===user.id);if(player){player.connected=false;player.left=true;coopModule.coopAction(room.session,player.playerId,{type:'disconnect'});}}
        room.spectators=room.spectators.filter(id=>id!==user.id);broadcast(room);return send(res,200,{ok:true});
      }
      if(operation==='reconnect'){
        const player=room.players.find(member=>member.userId===user.id);if(player){player.connected=true;player.sequence=-1;if(room.session)coopModule.coopAction(room.session,player.playerId,{type:'reconnect'});}return send(res,200,roomView(room,user.id));
      }
      const player=playerFor(room,user);
      if(operation==='ready'){
        if(room.state!=='lobby')fail(409,'The match has already started.');const ready=boolean(body.ready,'ready state'),profile=body.profile?checkedSave(body.profile):player.profile;
        const selected=configuration({...room.config,operator:body.operator||player.operator,classId:body.classId||player.classId,subclass:body.subclass!==undefined?body.subclass:player.subclass});
        if(!isOperatorUnlocked(profile,selected.operator,room.config.mode))fail(400,'Operator unavailable for this profile.');
        if(selected.subclass&&(profile.nexus?.xp||0)<2000&&room.config.mode!=='training')fail(403,'Subclasses unlock at profile level five.');
        Object.assign(player,{ready,profile,operator:selected.operator,classId:selected.classId,subclass:selected.subclass});broadcast(room);return send(res,200,roomView(room,user.id));
      }
      if(operation==='start'){
        if(room.hostUserId!==user.id)fail(403,'Only the host can launch this room.');if(room.state!=='lobby')fail(409,'This room has already started.');if(room.players.length!==2||room.players.some(member=>!member.ready))fail(409,'Both players must join and ready up.');
        const engine=await coop(),seed=randomInt(1,2147483647);room.session=engine.createCoopRun(room.players.map(member=>({...room.config,seed,operator:member.operator,classId:member.classId,subclass:member.subclass,playerId:member.playerId})),room.players.map(member=>member.profile));room.startedAt=clock();room.state='playing';broadcast(room);return send(res,200,roomView(room,user.id));
      }
      if(!room.session||room.state!=='playing')fail(409,'This match is not running.');
      if(operation==='input'){
        limiter.take(`input:${user.id}`,90,1000);const input=object(body.input,'input frame'),frame={};for(const key of ['x','y','aimX','aimY'])frame[key]=number(input[key]??0,key,-1,1);for(const key of ['manualAim','dash','ability','revive'])frame[key]=input[key]===undefined?false:boolean(input[key],key);
        if(body.sequence!==undefined){const sequence=number(body.sequence,'input sequence',0,Number.MAX_SAFE_INTEGER);if(sequence<=(player.sequence??-1))return send(res,200,{ok:true,stale:true});player.sequence=sequence;}
        const previous=room.inputs[player.playerId];frame.dash=frame.dash||previous?.dash||false;frame.ability=frame.ability||previous?.ability||false;room.inputs[player.playerId]=frame;player.lastInputAt=clock();return send(res,200,{ok:true,tick:room.session.tick});
      }
      if(operation==='action'){
        limiter.take(`room-action:${user.id}`,60,60000);const action=object(body.action,'room action'),kind=text(action.type,'action',24);const aliases={buy:'shop',replace:'relic'};const normalized={type:aliases[kind]||kind};
        if(!['pause','reward','route','shop','event','relic','reroll','abandon','revive'].includes(normalized.type))fail(400,'Unknown match action.');
        for(const key of ['id','replaceId'])if(action[key]!==undefined)normalized[key]=text(action[key],key,120);
        if(action.index!==undefined)normalized.index=number(action.index,'route index',0,10);
        if(action.paused!==undefined)normalized.paused=boolean(action.paused,'pause state');
        if(['route','abandon'].includes(normalized.type)&&room.hostUserId!==user.id)fail(403,'Only the host can change the shared encounter.');
        if(normalized.type==='pause'&&room.hostUserId!==user.id&&normalized.paused!==true&&room.session.run.state==='paused')fail(403,'Only the host can resume the match.');
        const result=coopModule.coopAction(room.session,player.playerId,normalized);if(result===false||result?.ok===false)fail(409,result?.error||'That action is unavailable in the current match state.');broadcast(room);return send(res,200,roomView(room,user.id));
      }
    }
    fail(404,'Endpoint not found.');
  }

  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.md':'text/plain; charset=utf-8','.json':'application/json'};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    try{
      if(!origin)fail(503,'The server is still starting.');
      if(req.headers.host!==new URL(origin).host)fail(421,'Use the configured game origin.');
      const url=new URL(req.url,origin);
      if(url.pathname.startsWith('/api/v1'))return await api(req,res,url);
      if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');
      const pathname=decodeURIComponent(url.pathname),allowed=pathname==='/'||/^\/(index\.html|styles(?:-v5)?\.css|sw\.js|manifest\.webmanifest|src\/[A-Za-z0-9_-]+\.js|assets\/[A-Za-z0-9_.-]+\.(?:svg|png|ico)|docs\/SELF_HOSTING\.md)$/.test(pathname);
      if(!allowed)fail(404,'File not found.');const file=await realpath(path.join(staticRoot,pathname==='/'?'index.html':pathname.slice(1)));
      const relative=path.relative(staticRoot,file);if(relative.startsWith('..')||path.isAbsolute(relative))fail(404,'File not found.');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':pathname==='/sw.js'?'no-cache':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){
      if(res.headersSent){res.end();return;}
      const status=error.status||(error.code==='ENOENT'?404:500);if(status===429&&error.details?.retryAfter)res.setHeader('Retry-After',String(error.details.retryAfter));
      send(res,status,{error:{message:status===500?'The server could not complete this request.':error.message,...(error.details||{})}});
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=40;
  server.on('clientError',(_error,socket)=>socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'));
  const housekeeping=setInterval(()=>{
    const now=clock();for(const [key,session] of sessions)if(session.expiresAt<=now)sessions.delete(key);
    for(const [code,room] of rooms){if(now-room.updatedAt>15*60*1000&&!room.subscribers.size){for(const stream of room.subscribers)stream.res.end();rooms.delete(code);}else for(const stream of room.subscribers)stream.res.write(': heartbeat\n\n');}
  },15000);housekeeping.unref();
  return {
    server,store,rooms,
    get url(){return origin;},
    async start(port=options.port??4174){
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.removeListener('error',reject);resolve();});});
      if(!origin){const boundHost=host==='::1'?'[::1]':host;origin=`http://${boundHost}:${server.address().port}`;}
      lastFrame=performance.now();roomTimer=setInterval(tickRooms,1000/60);roomTimer.unref();return origin;
    },
    async close(){if(closed)return;closed=true;clearInterval(housekeeping);clearInterval(roomTimer);for(const stream of streams)stream.res.end();await new Promise(resolve=>server.close(resolve));server.closeAllConnections?.();await store.flush();},
  };
}

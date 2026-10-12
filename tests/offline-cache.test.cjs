const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');

function worker({offline=false}={}){
  const events={};
  const removed=[];
  const cache={
    addAll:async()=>{},
    match:async()=>({offline:true}),
    put:async()=>{},
  };
  const caches={
    open:async()=>cache,
    keys:async()=>['neon-rift-v4-3','neon-rift-v4-4-ui','neon-rift-v4-5-offline','unrelated-site'],
    delete:async name=>{removed.push(name);return true;},
  };
  const self={
    location:{origin:'https://rift.test',href:'https://rift.test/sw.js'},
    addEventListener:(key,fn)=>{events[key]=fn;},
    skipWaiting:async()=>{},
    clients:{claim:async()=>{}},
  };
  vm.runInNewContext(src,{self,caches,Promise,URL,Set,Response:{error:()=>null},fetch:async()=>{if(offline)throw new Error('offline');return {ok:true,clone(){return this;}};}});
  const fetchEvent=(url,mode='cors',method='GET')=>{
    const event={request:{url,method,mode},respondWith(p){this.response=p;}};
    events.fetch(event);
    return event;
  };
  return {events,removed,fetchEvent};
}
test('never intercepts remote requests, writes, or dynamic API responses',()=>{
  const {fetchEvent}=worker();
  assert.equal(fetchEvent('https://other.test/player.json').response,undefined);
  assert.equal(fetchEvent('https://rift.test/api/leaderboard').response,undefined);
  assert.equal(fetchEvent('https://rift.test/.netlify/functions/score').response,undefined);
  assert.equal(fetchEvent('https://rift.test/src/game-v3.js','cors','POST').response,undefined);
});
test('activation retains unrelated web application caches',async()=>{
  const {events,removed}=worker();
  const event={waitUntil(p){this.wait=p;}};
  events.activate(event);
  await event.wait;
  assert.deepEqual(removed,['neon-rift-v4-3','neon-rift-v4-4-ui']);
});
test('offline game navigation resolves to the installed shell',async()=>{
  const {fetchEvent}=worker({offline:true});
  const event=fetchEvent('https://rift.test/','navigate');
  assert.deepEqual(await event.response,{offline:true});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnline} from '../src/online.js';

test('offline account, co-op and leaderboard explain availability and link to playable local features',()=>{
  const online=createOnline({getSave:()=>({})});
  for(const page of ['online','coop','leaderboards']){
    const html=online.render(page);
    assert.match(html,/local preview/);
    assert.match(html,/data-page="expedition"/);
    assert.match(html,/data-page="records"/);
    assert.doesNotMatch(html,/self-hosting guide|self-hosted Nexus server/i);
  }
  assert.match(online.render('leaderboards'),/LEADERBOARD OFFLINE/);
});

test('leaderboard renders bounded escaped player names, numeric ranks, duration and own-result marker',()=>{
  const online=createOnline({getSave:()=>({})});
  Object.assign(online.state,{available:true,user:{id:'me',username:'self'},entries:[
    {userId:'me',username:'self',displayName:'<img src=x onerror=alert(1)>',rank:'<script>bad</script>',score:1234,duration:125,difficulty:'standard'},
    {username:'A'.repeat(100),score:500,summary:{seconds:59,difficulty:'easy'}},
  ]});
  const html=online.render('leaderboards');
  assert.doesNotMatch(html,/<img src=x|<script>bad|A{25}/);
  assert.match(html,/&lt;img src=x onerror=alert/);
  assert.match(html,/class="own-result"/);
  assert.match(html,/<td>1<\/td>/);
  assert.match(html,/<td>2:05<\/td>/);
  assert.match(html,/<td>0:59<\/td>/);
  for(const label of ['PLAYER','SCORE','TIME','DIFFICULTY'])assert.match(html,new RegExp(`>${label}<`));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckpointWriter} from '../src/checkpoints.js';
import {createRun,chooseRoute,serializeCheckpoint,restoreCheckpoint} from '../src/engine.js';

test('mid-encounter rewards restore encounter entry rather than farming a new checkpoint',async()=>{
  const saved=[];const writer=createCheckpointWriter({serialize:serializeCheckpoint,write:async data=>saved.push(data)});
  const run=createRun({mode:'campaign',seed:765});
  await writer.capture(run);chooseRoute(run,0);await writer.capture(run,{entry:true});
  const entry=structuredClone(saved.at(-1));run.time=40;run.score=600;run.scrap=70;run.player.hp=10;run.state='reward';run.pendingCompletion=false;
  await writer.capture(run);assert.equal(saved.length,2);
  const restored=restoreCheckpoint(saved.at(-1));assert.equal(restored.score,entry.score);assert.equal(restored.player.hp,entry.player.hp);assert.equal(restored.rngState,entry.rngState);
  run.pendingCompletion=true;run.completedEncounters=1;await writer.capture(run);assert.equal(saved.length,3);assert.equal(saved.at(-1).score,600);
});

test('queued boundary writes preserve order instead of dropping a newer reward decision',async()=>{
  const saved=[];let unlock;const blocker=new Promise(resolve=>unlock=resolve);
  const writer=createCheckpointWriter({serialize:structuredClone,write:async data=>{if(!saved.length)await blocker;saved.push(data);}});
  const run={config:{mode:'campaign'},state:'route',id:'x',scrap:0};
  const first=writer.capture(run);run.scrap=10;const second=writer.capture(run);run.scrap=20;const third=writer.capture(run);unlock();
  await Promise.all([first,second,third]);assert.deepEqual(saved.map(data=>data.scrap),[0,10,20]);
  await writer.capture(run);assert.equal(saved.length,3);
});

test('a failed checkpoint write can be retried and does not report success',async()=>{
  let attempts=0,reported=0,saved=0;const writer=createCheckpointWriter({serialize:structuredClone,write:async()=>{if(++attempts===1)throw Error('quota');},onSaved:()=>saved++,onError:()=>reported++});
  const run={config:{mode:'campaign'},state:'route',id:'x'};
  await assert.rejects(writer.capture(run),/quota/);await writer.capture(run);assert.equal(attempts,2);assert.equal(reported,1);assert.equal(saved,1);
});

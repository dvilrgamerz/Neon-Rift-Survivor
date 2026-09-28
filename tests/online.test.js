import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnline} from '../src/online.js';

test('leaderboard refresh preserves the selected filters in both request and UI',async()=>{
  const original={fetch:globalThis.fetch,document:globalThis.document,FormData:globalThis.FormData};
  const urls=[];
  try{
    globalThis.document={querySelector:()=>({})};
    globalThis.FormData=class{*[Symbol.iterator](){yield ['period','all'];yield ['mode','campaign'];yield ['difficulty','nightmare'];}};
    globalThis.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>url.includes('/season')?{season:{}}:{entries:[]}};};
    const online=createOnline({getSave:()=>({})});online.state.available=true;
    await online.refresh('leaderboards');
    assert.ok(urls[0].includes('period=all&mode=campaign&difficulty=nightmare'));
    const html=online.render('leaderboards');
    for(const value of ['all','campaign','nightmare'])assert.match(html,new RegExp(`value="${value}" selected`));
    globalThis.document.querySelector=()=>null;
    await online.refresh('leaderboards');
    assert.equal(urls[2],urls[0]);
  }finally{
    for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});

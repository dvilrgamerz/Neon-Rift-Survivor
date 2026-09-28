import test from 'node:test';
import assert from 'node:assert/strict';

// Contract smoke test only: this intentionally does not claim browser rendering or device acceptance.
test('app boots as an offline guest, every hub page renders, and a run can launch/pause/end/relaunch',async()=>{
  const originals=new Map(),elements=new Map(),listeners=new Map(),values=new Map();
  function global(name,value){originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});}
  class Element {
    constructor(id=''){this.id=id;this.dataset={};this.style={};this.classList={toggle(){},add(){},remove(){}};this.open=false;this.value='';this.checked=false;this.disabled=false;this.offsetParent={};this.listeners={};this._html='';}
    set innerHTML(html){for(const match of this._html.matchAll(/\bid="([^"]+)"/g)){const child=elements.get('#'+match[1]);if(child)child.innerHTML='';elements.delete('#'+match[1]);}this._html=html;for(const match of html.matchAll(/\bid="([^"]+)"/g))elements.set('#'+match[1],new Element(match[1]));}
    get innerHTML(){return this._html;} get textContent(){return this._text||'';}set textContent(v){this._text=v;}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}removeEventListener(){}querySelectorAll(){return [];}querySelector(){return null;}setAttribute(){}append(){}remove(){}focus(){}click(){}showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {left:0,top:0,width:1200,height:760};}
  }
  for(const id of ['app','world','toast','dialog','dialogBody'])elements.set('#'+id,new Element(id));
  const context=new Proxy({},{get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
  elements.get('#world').getContext=()=>context;
  const window={addEventListener:(type,fn)=>(listeners.get(type)||listeners.set(type,[]).get(type)).push(fn),removeEventListener(){}};
  global('window',window);global('document',{querySelector:id=>elements.get(id)||null,body:new Element('body'),documentElement:new Element('html'),activeElement:null,hidden:false,createElement:()=>new Element(),addEventListener:window.addEventListener,removeEventListener(){}});
  global('navigator',{onLine:false,userAgent:'node-contract-test',getGamepads:()=>[],clipboard:{writeText:async()=>{}}});
  global('localStorage',{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
  global('sessionStorage',{getItem:()=>null,setItem(){},removeItem(){}});global('fetch',async()=>({ok:false,status:404,json:async()=>({error:'Offline'})}));
  global('requestAnimationFrame',()=>0);global('innerWidth',1200);global('innerHeight',760);global('devicePixelRatio',1);global('location',{origin:'http://localhost',reload(){}});
  async function click(dataset){const button={dataset,disabled:false};for(const fn of elements.get('#app').listeners.click||[])await fn({target:{closest:()=>button}});}
  async function dialog(action){for(const fn of listeners.get('click')||[])fn({target:{closest:()=>({dataset:{action}})}});await new Promise(resolve=>setTimeout(resolve,10));}
  try{
    await import('../src/app.js?contract-smoke');
    assert.match(elements.get('#app').innerHTML,/RIFT NEXUS/);
    for(const page of ['profile','seasons','achievements','history','lore','tutorial','online','coop','leaderboards','codex','planner','progression','records','settings','expedition']){await click({page});assert.ok(elements.get('#app').innerHTML.length>500,page);}
    await click({mode:'training'});await click({action:'launch'});assert.match(elements.get('#app').innerHTML,/hudHP/);
    await click({action:'pause'});assert.match(elements.get('#stateOverlay').innerHTML,/Take a breath/);
    await click({action:'end-run'});await dialog('confirm-end');assert.match(elements.get('#stateOverlay').innerHTML,/Every fall/);
    await click({action:'return-hub'});await click({action:'launch'});assert.match(elements.get('#app').innerHTML,/hudHP/);
    await click({action:'pause'});await click({action:'game-settings'});assert.match(elements.get('#app').innerHTML,/Back to paused run/);
    assert.doesNotMatch(elements.get('#toast').textContent,/Cannot|undefined|Invalid|not a function/);
  }finally{for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});

import {createClient} from '@supabase/supabase-js';

const memory=new Map();
const memoryStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};

export function configured(){const c=globalThis.__RIFT_CONFIG__||{};return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.supabaseUrl||'')&&/^sb_publishable_/.test(c.supabaseKey||'');}

export function createSecureAuth(){
  if(!configured())return null;
  const config=globalThis.__RIFT_CONFIG__;
  let accessToken='',user=null,refreshTimer=0;
  const client=createClient(config.supabaseUrl,config.supabaseKey,{accessToken:async()=>accessToken||null,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce',storage:memoryStorage},realtime:{params:{eventsPerSecond:20}}});
  const endpoint=name=>`/.netlify/functions/auth-${name}`;
  async function call(name,body){const response=await fetch(endpoint(name),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(15000)});const data=await response.json().catch(()=>({error:'Authentication service returned an invalid response.'}));if(!response.ok)throw Object.assign(new Error(data.error||'Authentication request failed.'),{status:response.status});return data;}
  function accept(data){accessToken=data.access_token||'';user=data.user||null;client.realtime.setAuth(accessToken||null);clearTimeout(refreshTimer);if(accessToken&&data.expires_in)refreshTimer=setTimeout(()=>refresh().catch(()=>signOut()),Math.max(30,(data.expires_in-60))*1000);return user;}
  async function restore(){try{return accept(await call('refresh'));}catch{return accept({});}}
  async function signIn(email,password){const data=await call('login',{email,password});accept(data);return {...data.user,mfa_required:data.mfa_required,factors:data.factors||[]};}
  async function signUp(email,password,username){return call('signup',{email,password,username});}
  async function refresh(){return accept(await call('refresh'));}
  async function signOut(){try{await call('logout');}finally{accept({});memory.clear();}}
  async function requestReset(email){return call('reset-request',{email});}
  async function updatePassword(password){return call('reset-complete',{password});}
  async function resendVerification(email){return call('resend',{email});}
  async function enrollTotp(){return call('mfa-enroll');}
  async function verifyTotp(factorId,code){const data=await call('mfa-verify',{factorId,code});return accept(data);}
  return {client,restore,signIn,signUp,signOut,requestReset,updatePassword,resendVerification,enrollTotp,verifyTotp,get user(){return user;},get accessToken(){return accessToken;}};
}

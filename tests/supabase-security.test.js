import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Supabase auth never persists session tokens in localStorage',async()=>{
  const source=await readFile('src/supabase-auth.js','utf8');
  assert.doesNotMatch(source,/localStorage|sessionStorage/);
  assert.match(source,/persistSession:false/);
  assert.match(source,/memoryStorage/);
  assert.match(source,/accessToken:async\(\)=>accessToken\|\|null/);
});

test('auth refresh cookie is HttpOnly, Secure, strict and narrowly scoped',async()=>{
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY='sb_secret_test';
  const {setCookie}=await import('../netlify/functions/_auth.mjs');
  const value=setCookie('secret');
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/.netlify/functions/auth-'])assert.match(value,new RegExp(flag.replace(/[/.]/g,'\\$&')));
});

test('database migration enables RLS and keeps admin identity out of user metadata',async()=>{
  const sql=await readFile('supabase/migrations/202609200001_secure_nexus.sql','utf8');
  for(const table of ['profiles','coop_rooms','coop_members','auth_rate_limits'])assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
  assert.doesNotMatch(sql,/raw_user_meta_data[^\n]*(admin|role)/i);
  assert.match(sql,/revoke all on function public\.check_auth_rate_limit/);
  assert.match(sql,/realtime\.messages/);
  assert.match(sql,/revoke insert on public\.coop_rooms,public\.coop_members from authenticated/);
  assert.match(sql,/grant update \(ready,loadout\) on public\.coop_members to authenticated/);
});

-- Neon Rift Nexus security baseline. Apply through the Supabase migration workflow.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 32),
  created_at timestamptz not null default now()
);
create table if not exists public.coop_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  config jsonb not null default '{}'::jsonb check (pg_column_size(config) <= 8192),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours')
);
create table if not exists public.coop_members (
  room_id uuid not null references public.coop_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player','spectator')),
  ready boolean not null default false,
  loadout jsonb not null default '{}'::jsonb check (pg_column_size(loadout)<=8192),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create table if not exists public.auth_rate_limits (
  bucket text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.coop_rooms enable row level security;
alter table public.coop_members enable row level security;
alter table public.auth_rate_limits enable row level security;

create policy "profiles are readable to signed in players" on public.profiles for select to authenticated using (true);
create policy "players insert their own profile" on public.profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy "players update their own profile" on public.profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(user_id,username,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'username','operator_'||substr(new.id::text,1,8)),coalesce(new.raw_user_meta_data->>'username','Operator'));
  return new;
end $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_room_member(p_room uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.coop_members where room_id=p_room and user_id=p_user)
$$;
revoke all on function private.is_room_member(uuid,uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.is_room_member(uuid,uuid) to authenticated;

create policy "members read their room" on public.coop_rooms for select to authenticated using ((select auth.jwt()->>'aal')='aal2' and private.is_room_member(id,(select auth.uid())));
create policy "host creates room" on public.coop_rooms for insert to authenticated with check ((select auth.jwt()->>'aal')='aal2' and host_id=(select auth.uid()));
create policy "host updates room" on public.coop_rooms for update to authenticated using ((select auth.jwt()->>'aal')='aal2' and host_id=(select auth.uid())) with check ((select auth.jwt()->>'aal')='aal2' and host_id=(select auth.uid()));
create policy "host deletes room" on public.coop_rooms for delete to authenticated using ((select auth.jwt()->>'aal')='aal2' and host_id=(select auth.uid()));
create policy "members read same room membership" on public.coop_members for select to authenticated using (private.is_room_member(room_id,(select auth.uid())));
create policy "players join themselves" on public.coop_members for insert to authenticated with check (user_id=(select auth.uid()));
create policy "players update themselves" on public.coop_members for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "players leave themselves" on public.coop_members for delete to authenticated using (user_id=(select auth.uid()));

create or replace function public.check_auth_rate_limit(p_action text,p_identity text,p_ip text) returns boolean
language plpgsql security definer set search_path='' as $$
declare k text:=encode(digest(p_action||':'||lower(p_identity)||':'||p_ip,'sha256'),'hex'); row public.auth_rate_limits; max_attempts int:=case when p_action='login' then 10 else 5 end;
begin
  insert into public.auth_rate_limits(bucket,attempts) values(k,1)
  on conflict(bucket) do update set attempts=case when public.auth_rate_limits.window_started_at < now()-interval '15 minutes' then 1 else public.auth_rate_limits.attempts+1 end,window_started_at=case when public.auth_rate_limits.window_started_at < now()-interval '15 minutes' then now() else public.auth_rate_limits.window_started_at end
  returning * into row;
  return row.attempts<=max_attempts;
end $$;
revoke all on function public.check_auth_rate_limit(text,text,text) from public,anon,authenticated;
grant execute on function public.check_auth_rate_limit(text,text,text) to service_role;

create policy "room members receive private realtime" on realtime.messages for select to authenticated using (
  (select auth.jwt()->>'aal')='aal2' and realtime.messages.extension in ('broadcast','presence') and exists(select 1 from public.coop_rooms r where private.is_room_member(r.id,(select auth.uid())) and ('room:'||r.id::text)=(select realtime.topic()) and r.expires_at>now())
);
create policy "room members send private realtime" on realtime.messages for insert to authenticated with check (
  (select auth.jwt()->>'aal')='aal2' and realtime.messages.extension in ('broadcast','presence') and exists(select 1 from public.coop_rooms r where private.is_room_member(r.id,(select auth.uid())) and ('room:'||r.id::text)=(select realtime.topic()) and r.expires_at>now())
);

grant select,insert,update on public.profiles to authenticated;
-- Room creation and membership changes must pass through the validated RPCs.
-- Direct insert access would let a browser bypass room capacity and MFA checks;
-- unrestricted member updates would also allow changing role or room_id.
grant select,update,delete on public.coop_rooms to authenticated;
grant select,delete on public.coop_members to authenticated;
grant update (ready,loadout) on public.coop_members to authenticated;
revoke insert on public.coop_rooms,public.coop_members from authenticated;
revoke all on public.auth_rate_limits from anon,authenticated;

create or replace function public.create_coop_room(p_config jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); rid uuid; room_code text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if (select auth.jwt()->>'aal')<>'aal2' then raise exception 'Two-factor verification required'; end if;
  if pg_column_size(coalesce(p_config,'{}'::jsonb))>8192 then raise exception 'Room configuration too large'; end if;
  loop room_code:=substr(translate(upper(encode(gen_random_bytes(16),'hex')),'01','23'),1,6); exit when not exists(select 1 from public.coop_rooms where code=room_code); end loop;
  insert into public.coop_rooms(code,host_id,config) values(room_code,uid,coalesce(p_config,'{}'::jsonb)) returning id into rid;
  insert into public.coop_members(room_id,user_id) values(rid,uid);
  return rid;
end $$;
revoke all on function public.create_coop_room(jsonb) from public,anon;
grant execute on function public.create_coop_room(jsonb) to authenticated;

create or replace function public.join_coop_room(p_code text,p_role text default 'player') returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); rid uuid; players int;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if (select auth.jwt()->>'aal')<>'aal2' then raise exception 'Two-factor verification required'; end if;
  if p_role not in ('player','spectator') then raise exception 'Invalid room role'; end if;
  select id into rid from public.coop_rooms where code=upper(trim(p_code)) and status='lobby' and expires_at>now() for update;
  if rid is null then raise exception 'Room not found or expired'; end if;
  select count(*) into players from public.coop_members where room_id=rid and role='player';
  if p_role='player' and players>=2 and not exists(select 1 from public.coop_members where room_id=rid and user_id=uid) then raise exception 'Room is full'; end if;
  insert into public.coop_members(room_id,user_id,role) values(rid,uid,p_role) on conflict(room_id,user_id) do update set role=excluded.role;
  return rid;
end $$;
revoke all on function public.join_coop_room(text,text) from public,anon;
grant execute on function public.join_coop_room(text,text) to authenticated;

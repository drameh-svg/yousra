-- Run once in the Supabase SQL editor. No service key belongs in browser code.
create table if not exists public.records (
  kind text not null,
  id text not null,
  owner uuid,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind,id)
);
create index if not exists records_owner_kind on public.records(owner,kind);
create index if not exists records_updated on public.records(kind,updated_at desc);
alter table public.records enable row level security;
-- All writes pass through the authenticated backend. Browser SDK access is read-only.
drop policy if exists own_records_read on public.records;
create policy own_records_read on public.records for select to authenticated
  using (owner = auth.uid() and kind in ('profile','library','search','job','event'));
drop policy if exists product_records_read on public.records;
create policy product_records_read on public.records for select to authenticated
  using (kind = 'product' and owner is null);
revoke all on public.records from anon;
revoke insert, update, delete on public.records from authenticated;
grant select on public.records to authenticated;
grant all on public.records to service_role;

create table if not exists public.provider_usage (
  provider text not null,
  day text not null,
  n integer not null default 0,
  primary key(provider,day)
);
alter table public.provider_usage enable row level security;
revoke all on public.provider_usage from anon, authenticated;
grant all on public.provider_usage to service_role;

-- Service-role-only invoker functions; no privilege escalation is needed.
-- Serialize provider reservations across instances. Failed calls still consume a reservation.
create or replace function public.reserve_call(p_provider text,p_daily integer,p_total integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d text := to_char(now() at time zone 'UTC','YYYY-MM-DD'); daily_count integer; total_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_provider,0));
  select coalesce(n,0) into daily_count from provider_usage where provider=p_provider and day=d;
  select coalesce(n,0) into total_count from provider_usage where provider=p_provider and day='all';
  if coalesce(daily_count,0)>=p_daily or coalesce(total_count,0)>=p_total then return false; end if;
  insert into provider_usage values(p_provider,d,1) on conflict(provider,day) do update set n=provider_usage.n+1;
  insert into provider_usage values(p_provider,'all',1) on conflict(provider,day) do update set n=provider_usage.n+1;
  return true;
end;
$$;
revoke all on function public.reserve_call(text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_call(text,integer,integer) to service_role;

-- Optimistic concurrency protects collections and progressive jobs against lost updates.
create or replace function public.cas_record(p_kind text,p_id text,p_owner uuid,p_version integer,p_payload jsonb)
returns boolean language plpgsql security invoker set search_path=public as $$
declare affected integer;
begin
  update records set payload=p_payload,updated_at=now()
  where kind=p_kind and id=p_id and owner=p_owner and (payload->>'version')::integer=p_version;
  get diagnostics affected = row_count;
  return affected=1;
end;
$$;
revoke all on function public.cas_record(text,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.cas_record(text,text,uuid,integer,jsonb) to service_role;

-- For brand traction use real outbound events only. Never interpret these as purchases.
create or replace view public.brand_traction with (security_invoker=true) as
select payload->>'store' as store,
       count(*) as outbound_clicks,
       count(distinct owner) as unique_shoppers
from public.records
where kind='event' and payload->>'type'='outbound_click'
  and coalesce((payload->>'demo')::boolean,false)=false
group by payload->>'store';
revoke all on public.brand_traction from anon,authenticated;
grant select on public.brand_traction to service_role;

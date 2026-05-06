-- =============================================
-- ENQUEUE — Full Database Schema
-- Run this once in your Supabase SQL Editor
-- =============================================

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  initial_avg_wait_minutes integer not null default 5,
  created_at timestamptz default now()
);
alter table public.businesses enable row level security;
create policy "Owner full access" on public.businesses using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Public can read" on public.businesses for select using (true);
grant select on public.businesses to anon, authenticated;
grant select on public.queues to anon, authenticated;
grant select on public.queue_entries to anon, authenticated;

create table public.queues (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null default 'Main Queue',
  is_paused boolean default false,
  created_at timestamptz default now()
);
alter table public.queues enable row level security;
create policy "Owner full access" on public.queues using (business_id in (select id from public.businesses where owner_id = auth.uid())) with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "Public can read" on public.queues for select using (true);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.queues(id) on delete cascade not null,
  business_id uuid not null,
  customer_name text not null,
  customer_phone text,
  position integer not null,
  status text default 'waiting' check (status in ('waiting','serving','done','removed','banned','no_show')),
  notes text,
  joined_at timestamptz default now(),
  called_at timestamptz,
  served_at timestamptz
);
alter table public.queue_entries enable row level security;
create policy "Owner full access" on public.queue_entries using (business_id in (select id from public.businesses where owner_id = auth.uid())) with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "Public can insert" on public.queue_entries for insert with check (true);
create policy "Public can read" on public.queue_entries for select using (true);

create table public.banned_customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  phone text,
  reason text,
  banned_at timestamptz default now()
);
alter table public.banned_customers enable row level security;
create policy "Owner full access" on public.banned_customers using (business_id in (select id from public.businesses where owner_id = auth.uid())) with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "Public can read" on public.banned_customers for select using (true);

alter table public.queue_entries replica identity full;
alter table public.queues replica identity full;
alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.queues;

create or replace function public.create_default_queue()
returns trigger language plpgsql security definer as $$
begin
  insert into public.queues (business_id, name) values (NEW.id, 'Main Queue');
  return NEW;
end;
$$;
create trigger on_business_created after insert on public.businesses for each row execute function public.create_default_queue();

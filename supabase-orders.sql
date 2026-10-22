-- Executar uma vez no SQL Editor do Supabase.
-- A aplicacao usa a tabela plural public.orders.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid,
  client_name text not null,
  date timestamptz not null default now(),
  delivery text not null,
  payment_terms text not null,
  notes text not null,
  status text not null default 'Rascunho',
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  document jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Torna o script reutilizavel caso ja exista uma versao incompleta da tabela.
alter table public.orders add column if not exists number text;
alter table public.orders add column if not exists client_id uuid;
alter table public.orders add column if not exists client_name text;
alter table public.orders add column if not exists date timestamptz default now();
alter table public.orders add column if not exists delivery text default '';
alter table public.orders add column if not exists payment_terms text default '';
alter table public.orders add column if not exists notes text default '';
alter table public.orders add column if not exists status text default 'Rascunho';
alter table public.orders add column if not exists subtotal numeric(14,2) default 0;
alter table public.orders add column if not exists vat_total numeric(14,2) default 0;
alter table public.orders add column if not exists total numeric(14,2) default 0;
alter table public.orders add column if not exists document jsonb default '{}'::jsonb;
alter table public.orders add column if not exists created_by uuid default auth.uid();
alter table public.orders add column if not exists created_at timestamptz default now();

create index if not exists orders_date_idx on public.orders (date desc);
create unique index if not exists orders_number_uidx on public.orders (number);
create index if not exists orders_client_id_idx on public.orders (client_id);
create index if not exists orders_created_by_idx on public.orders (created_by);

alter table public.orders enable row level security;

drop policy if exists "orders_select_authenticated" on public.orders;
drop policy if exists "orders_insert_authenticated" on public.orders;
drop policy if exists "orders_update_authenticated" on public.orders;

create policy "orders_select_authenticated"
on public.orders for select to authenticated
using (true);

create policy "orders_insert_authenticated"
on public.orders for insert to authenticated
with check (created_by is null or created_by = auth.uid());

create policy "orders_update_authenticated"
on public.orders for update to authenticated
using (created_by is null or created_by = auth.uid())
with check (created_by is null or created_by = auth.uid());

grant select, insert, update on public.orders to authenticated;
notify pgrst, 'reload schema';

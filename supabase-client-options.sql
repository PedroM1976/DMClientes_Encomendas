-- Executar uma vez no SQL Editor do Supabase.
-- Permite que todos os utilizadores autenticados leiam as opções,
-- mas apenas comercial@domingos-morgado.pt pode acrescentar ou alterar valores.

create extension if not exists pgcrypto;

create table if not exists public.dm_client_options (
  id uuid primary key default gen_random_uuid(),
  option_type text not null check (option_type in ('group','associate')),
  name text not null check (length(trim(name)) > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (option_type,name)
);

alter table public.dm_client_options enable row level security;

drop policy if exists "client_options_select_authenticated" on public.dm_client_options;
drop policy if exists "client_options_insert_commercial" on public.dm_client_options;
drop policy if exists "client_options_update_commercial" on public.dm_client_options;
drop policy if exists "client_options_delete_commercial" on public.dm_client_options;

create policy "client_options_select_authenticated"
on public.dm_client_options for select to authenticated
using (true);

create policy "client_options_insert_commercial"
on public.dm_client_options for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) = 'comercial@domingos-morgado.pt');

create policy "client_options_update_commercial"
on public.dm_client_options for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) = 'comercial@domingos-morgado.pt')
with check (lower(coalesce(auth.jwt() ->> 'email','')) = 'comercial@domingos-morgado.pt');

create policy "client_options_delete_commercial"
on public.dm_client_options for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) = 'comercial@domingos-morgado.pt');

grant select,insert,update,delete on public.dm_client_options to authenticated;

insert into public.dm_client_options (option_type,name) values
  ('group','Cliente Comprador'),('group','Colisão'),('group','Geral'),
  ('group','Distribuidor de Peças'),('group','Inativo'),('group','Nova Distribuição'),
  ('group','Oficina de Mecânica'),('group','Oficina de Elétrica'),('group','Pneus'),
  ('group','Stand Automóveis'),('group','Reparadores Autorizados'),
  ('group','Station'),('group','Vulco'),
  ('associate','A Oficina'),('associate','BMW'),('associate','ContiService'),
  ('associate','Empresa'),('associate','Feu Vert'),('associate','MForce'),
  ('associate','Pneuport'),('associate','Points'),('associate','Roady'),
  ('associate','Stellantis Grupo'),('associate','Serca'),('associate','Vulco'),
  ('associate','Topcar'),('associate','SEAT'),('associate','Online'),
  ('associate','Norauto'),('associate','Independente'),('associate','Eurorepar'),
  ('associate','Euromaster'),('associate','Conforauto'),('associate','Centers Auto'),
  ('associate','Euromais'),('associate','RedService'),('associate','Midas'),
  ('associate','Bosch Car Service'),('associate','Auto Check Center'),
  ('associate','Driver'),('associate','First Stop'),('associate','Ford')
on conflict (option_type,name) do nothing;

notify pgrst, 'reload schema';

-- Executar uma vez no SQL Editor do projeto Supabase.
-- Requer que public.crm_clients e public.orders já existam.
-- Cria links públicos de utilização única e permite que todos os utilizadores
-- autenticados editem clientes do CRM e encomendas.

create extension if not exists pgcrypto;

begin;

create table if not exists public.client_form_links (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  submitted_client_id uuid,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists client_form_links_expires_idx
on public.client_form_links (expires_at) where used_at is null;

alter table public.client_form_links enable row level security;
revoke all on table public.client_form_links from anon, authenticated;

create or replace function public.create_client_form_link(p_expires_in_hours integer default 168)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'É necessária uma sessão autenticada.' using errcode = '42501';
  end if;
  if p_expires_in_hours < 1 or p_expires_in_hours > 720 then
    raise exception 'A validade deve estar entre 1 e 720 horas.' using errcode = '22023';
  end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.client_form_links (token_hash, expires_at, created_by)
  values (extensions.digest(v_token, 'sha256'), now() + make_interval(hours => p_expires_in_hours), auth.uid());
  return v_token;
end;
$$;

create or replace function public.check_client_form_link(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (
    select 1 from public.client_form_links
    where token_hash = extensions.digest(p_token, 'sha256')
      and used_at is null and expires_at > now()
  ) then jsonb_build_object('valid', true) else jsonb_build_object('valid', false) end;
$$;

create or replace function public.submit_client_form(p_token text, p_form jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link_id uuid;
  v_client_id uuid;
  v_name text := trim(coalesce(p_form->>'name',''));
  v_nif text := trim(coalesce(p_form->>'nif',''));
  v_email text := trim(coalesce(p_form->>'email',''));
begin
  select id into v_link_id
  from public.client_form_links
  where token_hash = extensions.digest(p_token, 'sha256')
    and used_at is null and expires_at > now()
  for update;

  if v_link_id is null then
    raise exception 'O link expirou, já foi utilizado ou não é válido.' using errcode = '22023';
  end if;
  if v_name = '' or v_nif !~ '^[0-9]{9}$'
     or trim(coalesce(p_form->>'address','')) = ''
     or trim(coalesce(p_form->>'postal','')) !~ '^[0-9]{4}-[0-9]{3}$'
     or trim(coalesce(p_form->>'locality','')) = ''
     or trim(coalesce(p_form->>'district','')) = ''
     or trim(coalesce(p_form->>'municipality','')) = ''
     or trim(coalesce(p_form->>'phone','')) = ''
     or trim(coalesce(p_form->>'mobile','')) = ''
     or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or trim(coalesce(p_form->>'activity','')) = ''
     or trim(coalesce(p_form->>'cae','')) !~ '^[0-9]+$'
     or trim(coalesce(p_form->>'bank','')) = ''
     or trim(coalesce(p_form->>'paymentTerms','')) = ''
     or trim(coalesce(p_form->>'paymentMethod','')) = ''
     or trim(coalesce(p_form->>'contact','')) = ''
     or trim(coalesce(p_form->>'contactPhone','')) = ''
     or trim(coalesce(p_form->>'contactEmail','')) = ''
     or trim(coalesce(p_form->>'financialResponsible','')) = ''
     or trim(coalesce(p_form->>'financialPhone','')) = ''
     or trim(coalesce(p_form->>'financialEmail','')) = ''
     or coalesce(p_form->>'privacyConsent','') <> 'on' then
    raise exception 'Preencha corretamente todos os campos obrigatórios.' using errcode = '22023';
  end if;
  if exists (select 1 from public.crm_clients where trim(nif) = v_nif) then
    raise exception 'Já existe uma ficha com este NIF. Contacte a Domingos & Morgado.' using errcode = '23505';
  end if;

  insert into public.crm_clients (name,nif,phone,email,district,owner_name,notes,active,extra_fields)
  values (
    v_name,v_nif,trim(p_form->>'phone'),v_email,trim(p_form->>'district'),'Cliente — formulário público',coalesce(p_form->>'notes',''),true,
    jsonb_build_object(
      'address',coalesce(p_form->>'address',''),'postal',coalesce(p_form->>'postal',''),'locality',coalesce(p_form->>'locality',''),
      'district',coalesce(p_form->>'district',''),'municipality',coalesce(p_form->>'municipality',''),'mobile',coalesce(p_form->>'mobile',''),
      'activity',coalesce(p_form->>'activity',''),'cae',coalesce(p_form->>'cae',''),'bank',coalesce(p_form->>'bank',''),
      'nib',coalesce(p_form->>'nib',''),'paymentTerms',coalesce(p_form->>'paymentTerms',''),'paymentMethod',coalesce(p_form->>'paymentMethod',''),
      'contact',coalesce(p_form->>'contact',''),'contactPhone',coalesce(p_form->>'contactPhone',''),'contactEmail',coalesce(p_form->>'contactEmail',''),
      'financialResponsible',coalesce(p_form->>'financialResponsible',''),'financialPhone',coalesce(p_form->>'financialPhone',''),'financialEmail',coalesce(p_form->>'financialEmail',''),
      'purchasingResponsible',coalesce(p_form->>'purchasingResponsible',''),'purchasingPhone',coalesce(p_form->>'purchasingPhone',''),'purchasingEmail',coalesce(p_form->>'purchasingEmail',''),
      'created_by_email','Formulário público','submitted_via','client_form_link','privacy_consent_at',now()
    )
  ) returning id into v_client_id;

  update public.client_form_links
  set used_at = now(), submitted_client_id = v_client_id
  where id = v_link_id;
  return v_client_id;
end;
$$;

revoke execute on function public.create_client_form_link(integer) from public, anon;
revoke execute on function public.check_client_form_link(text) from public;
revoke execute on function public.submit_client_form(text,jsonb) from public;
grant execute on function public.create_client_form_link(integer) to authenticated;
grant execute on function public.check_client_form_link(text) to anon, authenticated;
grant execute on function public.submit_client_form(text,jsonb) to anon, authenticated;

alter table public.crm_clients enable row level security;
grant select, insert, update on table public.crm_clients to authenticated;
drop policy if exists "dm_crm_clients_update_all_authenticated" on public.crm_clients;
create policy "dm_crm_clients_update_all_authenticated"
on public.crm_clients for update to authenticated
using (true) with check (true);

alter table public.orders enable row level security;
grant select, insert, update on table public.orders to authenticated;
drop policy if exists "orders_update_authenticated" on public.orders;
create policy "orders_update_authenticated"
on public.orders for update to authenticated
using (true) with check (true);

notify pgrst, 'reload schema';

commit;

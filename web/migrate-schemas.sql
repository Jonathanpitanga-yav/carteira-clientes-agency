-- ============================================
-- Migração: Modular Monolith - Schemas
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. CRIAR SCHEMAS
create schema if not exists core;
create schema if not exists integration;
create schema if not exists sales;
create schema if not exists products;
create schema if not exists jobs;

-- 2. FUNÇÕES HELPER (security definer)
do $$ begin drop function if exists core.get_my_role() cascade; end; $$;
do $$ begin drop function if exists core.can_access_client(uuid) cascade; end; $$;

create function core.get_my_role()
returns text
language sql security definer
as $$
  select role from core.profiles where id = auth.uid();
$$;

create function core.can_access_client(client_uuid uuid)
returns boolean
language plpgsql security definer
as $$
declare
  v_role text;
begin
  select role into v_role from core.profiles where id = auth.uid();

  if v_role in ('admin', 'leader') then
    return true;
  end if;

  if v_role = 'analyst' then
    return exists (
      select 1 from core.client_analysts
      where client_id = client_uuid and analyst_id = auth.uid()
    );
  end if;

  if v_role = 'client' then
    return exists (
      select 1 from core.client_users
      where client_id = client_uuid and user_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

-- 3. CORE SCHEMA (drop first to avoid partial-run conflicts)
drop table if exists core.audit_logs cascade;
drop table if exists core.api_tokens cascade;
drop table if exists core.client_users cascade;
drop table if exists core.client_analysts cascade;
drop table if exists core.clients cascade;
drop table if exists core.profiles cascade;

create table core.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role        text not null default 'client' check (role in ('admin','leader','analyst','client')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table core.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  document    text unique,
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table core.client_analysts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references core.clients(id) on delete cascade,
  analyst_id  uuid not null references core.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  constraint unique_client_analyst unique (client_id, analyst_id)
);

create table core.client_users (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references core.clients(id) on delete cascade,
  user_id     uuid not null references core.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  constraint unique_client_user unique (client_id, user_id)
);

create table core.api_tokens (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references core.clients(id) on delete cascade,
  name        text not null default 'default',
  token_hash  text unique,
  prefix      text not null,
  permissions jsonb default '[]'::jsonb,
  status      text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at  timestamptz,
  last_used_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table core.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references core.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  payload     jsonb default '{}'::jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz default now()
);

-- Trigger: cria profile automaticamente ao signup
do $$ begin drop function if exists core.handle_new_user() cascade; end; $$;
create function core.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into core.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name',
          coalesce(new.raw_user_meta_data ->> 'role', 'client'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function core.handle_new_user();

-- Trigger: updated_at
do $$ begin drop function if exists core.update_updated_at() cascade; end; $$;
create function core.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on core.profiles;
create trigger set_profiles_updated_at
  before update on core.profiles
  for each row execute function core.update_updated_at();

drop trigger if exists set_clients_updated_at on core.clients;
create trigger set_clients_updated_at
  before update on core.clients
  for each row execute function core.update_updated_at();

-- Migrar dados públicos para core
insert into core.profiles (id, full_name, role, created_at, updated_at)
select id, full_name, role, created_at, updated_at
from public.profiles
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = excluded.updated_at;

insert into core.clients (id, name, document, status, created_at, updated_at)
select id, name, document, status, created_at, updated_at
from public.clients
on conflict (id) do update set
  name = excluded.name,
  document = excluded.document,
  status = excluded.status,
  updated_at = excluded.updated_at;

insert into core.api_tokens (id, client_id, name, prefix, permissions, status, expires_at, last_used_at, created_at, updated_at)
select id, client_id, 'default'::text, prefix, permissions, status, expires_at, last_used_at, created_at, now()
from public.api_tokens
on conflict (id) do nothing;

insert into core.audit_logs (id, user_id, action, entity_type, entity_id, payload, ip_address, created_at)
select id, user_id, action, entity_type, entity_id::uuid, coalesce(payload, '{}'::jsonb), ip_address, created_at
from public.audit_logs
on conflict (id) do nothing;

-- RLS: core
alter table core.profiles enable row level security;
alter table core.clients enable row level security;
alter table core.client_analysts enable row level security;
alter table core.client_users enable row level security;
alter table core.api_tokens enable row level security;
alter table core.audit_logs enable row level security;

drop policy if exists "usuarios veem seu perfil ou admins veem todos" on core.profiles;
create policy "usuarios veem seu perfil ou admins veem todos" on core.profiles
  for select using (id = auth.uid() or core.get_my_role() = 'admin');

drop policy if exists "admins podem atualizar qualquer perfil" on core.profiles;
create policy "admins podem atualizar qualquer perfil" on core.profiles
  for all using (core.get_my_role() = 'admin');

drop policy if exists "acesso a clientes baseado no vinculo" on core.clients;
create policy "acesso a clientes baseado no vinculo" on core.clients
  for select using (core.can_access_client(id));

drop policy if exists "admins e leaders gerenciam clientes" on core.clients;
create policy "admins e leaders gerenciam clientes" on core.clients
  for all using (core.get_my_role() in ('admin', 'leader'));

drop policy if exists "admins gerenciam api_tokens" on core.api_tokens;
create policy "admins gerenciam api_tokens" on core.api_tokens
  for all using (core.get_my_role() = 'admin');

drop policy if exists "admins veem audit_logs" on core.audit_logs;
create policy "admins veem audit_logs" on core.audit_logs
  for select using (core.get_my_role() = 'admin');

drop policy if exists "admins e leaders gerenciam client_analysts" on core.client_analysts;
create policy "admins e leaders gerenciam client_analysts" on core.client_analysts
  for all using (core.get_my_role() in ('admin', 'leader'));

drop policy if exists "leitura de vinculos de analistas" on core.client_analysts;
create policy "leitura de vinculos de analistas" on core.client_analysts
  for select using (core.get_my_role() in ('admin', 'leader') or analyst_id = auth.uid());

drop policy if exists "admins e leaders gerenciam client_users" on core.client_users;
create policy "admins e leaders gerenciam client_users" on core.client_users
  for all using (core.get_my_role() in ('admin', 'leader'));

-- 4. INTEGRATION SCHEMA (drop first to avoid partial-run conflicts)
drop table if exists integration.tokens cascade;
drop table if exists integration.credentials cascade;
drop table if exists integration.client_applications cascade;
drop table if exists integration.erp_providers cascade;

create table integration.erp_providers (
  id            uuid primary key default gen_random_uuid(),
  name          text unique not null,
  display_name  text not null,
  auth_type     text not null check (auth_type in ('oauth2', 'api_key')),
  auth_config   jsonb default '{}'::jsonb not null,
  created_at    timestamptz default now()
);

create table integration.client_applications (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references core.clients(id) on delete cascade,
  provider_id uuid not null references integration.erp_providers(id) on delete cascade,
  app_name    text not null,
  status      text not null default 'pending' check (status in ('active','expired','error','pending')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint unique_client_provider_app unique (client_id, provider_id, app_name)
);

create table integration.credentials (
  id                uuid primary key default gen_random_uuid(),
  app_id            uuid unique not null references integration.client_applications(id) on delete cascade,
  client_identifier text,
  client_secret     text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table integration.tokens (
  id                  uuid primary key default gen_random_uuid(),
  app_id              uuid unique not null references integration.client_applications(id) on delete cascade,
  access_token        text not null,
  refresh_token       text,
  expires_at          timestamptz,
  raw_payload_response jsonb default '{}'::jsonb not null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Migrar ERPs (ajustar colunas)
insert into integration.erp_providers (name, display_name, auth_type, auth_config)
select
  coalesce(slug, lower(name)),
  name,
  'oauth2',
  '{}'::jsonb
from public.erp_providers
on conflict (name) do nothing;

-- Inserir ERPs padrao se nao existirem
insert into integration.erp_providers (name, display_name, auth_type, auth_config) values
  ('bling', 'Bling ERP', 'oauth2', '{"auth_url": "https://www.bling.com.br/Api/v3/oauth/authorize", "token_url": "https://www.bling.com.br/Api/v3/oauth/token"}'),
  ('tiny', 'Tiny ERP', 'oauth2', '{"auth_url": "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth", "token_url": "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token", "scope": "openid"}'),
  ('anymarket', 'Anymarket', 'api_key', '{}')
on conflict (name) do nothing;

-- Migrar client_applications
insert into integration.client_applications (id, client_id, provider_id, app_name, status, created_at, updated_at)
select
  a.id,
  a.client_id,
  coalesce(p.id, (select id from integration.erp_providers limit 1)),
  coalesce(c.name, 'app') as app_name,
  case when a.status = 'inactive' then 'expired' else a.status end,
  a.created_at,
  a.updated_at
from public.client_applications a
left join core.clients c on c.id = a.client_id
left join integration.erp_providers p on p.id = (select id from integration.erp_providers limit 1)
on conflict (id) do nothing;

-- Migrar credentials (do JSONB inline para tabela separada)
insert into integration.credentials (app_id, client_identifier, client_secret)
select
  a.id,
  a.credentials->>'client_id',
  a.credentials->>'client_secret'
from public.client_applications a
where a.credentials is not null and a.credentials != '{}'::jsonb
on conflict (app_id) do nothing;

-- RLS: integration
alter table integration.erp_providers enable row level security;
alter table integration.client_applications enable row level security;
alter table integration.credentials enable row level security;
alter table integration.tokens enable row level security;

drop policy if exists "usuarios autenticados veem erp_providers" on integration.erp_providers;
create policy "usuarios autenticados veem erp_providers" on integration.erp_providers
  for select using (true);

drop policy if exists "admins gerenciam erp_providers" on integration.erp_providers;
create policy "admins gerenciam erp_providers" on integration.erp_providers
  for all using (core.get_my_role() = 'admin');

drop policy if exists "leitura de apps baseada no vinculo" on integration.client_applications;
create policy "leitura de apps baseada no vinculo" on integration.client_applications
  for select using (core.can_access_client(client_id));

drop policy if exists "admins e leaders gerenciam apps" on integration.client_applications;
create policy "admins e leaders gerenciam apps" on integration.client_applications
  for all using (core.get_my_role() in ('admin', 'leader'));

drop policy if exists "admin ve credentials" on integration.credentials;
create policy "admin ve credentials" on integration.credentials
  for select using (core.get_my_role() = 'admin');

drop policy if exists "admin gerencia credentials" on integration.credentials;
create policy "admin gerencia credentials" on integration.credentials
  for all using (core.get_my_role() = 'admin');

drop policy if exists "admin ve tokens" on integration.tokens;
create policy "admin ve tokens" on integration.tokens
  for select using (core.get_my_role() = 'admin');

drop policy if exists "admin gerencia tokens" on integration.tokens;
create policy "admin gerencia tokens" on integration.tokens
  for all using (core.get_my_role() = 'admin');

-- 5. SALES SCHEMA (drop first to avoid partial-run conflicts)
drop table if exists sales.invoice_items cascade;
drop table if exists sales.invoices cascade;
drop table if exists sales.products cascade;

create table sales.products (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references core.clients(id) on delete cascade,
  app_id      uuid not null references integration.client_applications(id) on delete cascade,
  external_id text not null,
  name        text not null,
  sku         text,
  price       numeric(15,2) default 0,
  category    text,
  raw_payload jsonb default '{}'::jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint unique_external_product unique (app_id, external_id)
);

create table sales.invoices (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references core.clients(id) on delete cascade,
  app_id         uuid references integration.client_applications(id) on delete set null,
  external_id    text,
  invoice_number text,
  issue_date     date not null default now(),
  total_amount   numeric(15,2) not null default 0,
  status         text not null default 'pending' check (status in ('pending','approved','canceled','refunded')),
  raw_payload    jsonb default '{}'::jsonb not null,
  synced_at      timestamptz default now(),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint unique_external_invoice unique (app_id, external_id)
);

create table sales.invoice_items (
  id                 uuid primary key default gen_random_uuid(),
  invoice_id         uuid not null references sales.invoices(id) on delete cascade,
  product_id         uuid references sales.products(id) on delete set null,
  external_product_id text,
  description        text,
  quantity           numeric(15,4) not null default 1,
  unit_price         numeric(15,2) not null default 0,
  total_amount       numeric(15,2) not null default 0,
  created_at         timestamptz default now()
);

-- Migrar invoices
insert into sales.invoices (id, client_id, external_id, total_amount, status, created_at, updated_at)
select id, client_id, external_id, total_amount, status, created_at, now()
from public.invoices
on conflict (id) do nothing;

-- Views de faturamento (colunas compatíveis com hooks existentes)
create or replace view sales.client_monthly_billing as
select
  i.client_id,
  c.name as client_name,
  to_char(coalesce(i.issue_date, i.created_at), 'YYYY-MM') as year_month,
  coalesce(sum(i.total_amount) filter (where i.status = 'approved'), 0) as total_approved,
  coalesce(sum(i.total_amount) filter (where i.status = 'canceled'), 0) as total_canceled,
  coalesce(sum(i.total_amount), 0) as total_gross,
  count(*) filter (where i.status = 'approved') as approved_count
from sales.invoices i
left join core.clients c on c.id = i.client_id
group by i.client_id, c.name, to_char(coalesce(i.issue_date, i.created_at), 'YYYY-MM')
order by year_month desc;

create or replace view sales.daily_billing as
select
  i.client_id,
  i.created_at::date as date,
  coalesce(sum(i.total_amount) filter (where i.status = 'approved'), 0) as total_approved,
  count(*) filter (where i.status = 'approved') as order_count
from sales.invoices i
group by i.client_id, i.created_at::date
order by date desc;

create or replace view sales.product_ranking as
select
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.client_id,
  c.name as client_name,
  count(distinct ii.invoice_id) as total_orders,
  coalesce(sum(ii.quantity), 0) as total_quantity,
  coalesce(sum(ii.total_amount), 0) as total_revenue
from sales.products p
left join sales.invoice_items ii on ii.product_id = p.id
left join sales.invoices i on i.id = ii.invoice_id and i.status = 'approved'
join core.clients c on c.id = p.client_id
group by p.id, p.name, p.sku, p.client_id, c.name
order by total_revenue desc;

-- RLS: sales
alter table sales.invoices enable row level security;
alter table sales.invoice_items enable row level security;
alter table sales.products enable row level security;

create policy "acesso a faturas baseado no vinculo" on sales.invoices
  for select using (core.can_access_client(client_id));

create policy "itens seguem regra da fatura" on sales.invoice_items
  for select using (exists (
    select 1 from sales.invoices i where i.id = invoice_id and core.can_access_client(i.client_id)
  ));

create policy "acesso a produtos baseado no vinculo" on sales.products
  for select using (core.can_access_client(client_id));

create policy "service role gerencia faturas" on sales.invoices
  for all to service_role using (true) with check (true);

create policy "service role gerencia itens" on sales.invoice_items
  for all to service_role using (true) with check (true);

create policy "service role gerencia produtos" on sales.products
  for all to service_role using (true) with check (true);

-- 6. QUEUE STATUS (jobs schema)
drop view if exists jobs.queue_status cascade;
create view jobs.queue_status as
select
  'erp_token_retry' as queue_name, 0::bigint as pending, 0::bigint as archived
union all
select 'erp_sync_retry', 0, 0
union all
select 'erp_webhook_retry', 0, 0;

-- 7. DROP TABELAS ANTIGAS DO PUBLIC (depois de migrar)
drop table if exists public.client_applications cascade;
drop table if exists public.erp_providers cascade;
drop table if exists public.invoices cascade;
drop table if exists public.api_tokens cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.clients cascade;
drop table if exists public.profiles cascade;
drop view if exists public.client_monthly_billing cascade;
drop view if exists public.daily_billing cascade;
drop view if exists public.product_ranking cascade;
drop function if exists public.get_queue_status cascade;
drop function if exists public.handle_new_user cascade;
drop function if exists public.update_updated_at cascade;
drop function if exists public.is_admin cascade;
drop function if exists public.has_role cascade;
drop function if exists public.has_any_role cascade;

-- 8. ADICIONAR SCHEMAS AO SEARCH PATH
-- Apos rodar, va em API Settings > Extra Search Path e adicione:
-- public, core, integration, sales, products, jobs
alter database postgres set search_path to public, core, integration, sales, products, jobs;

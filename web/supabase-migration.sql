-- ============================================
-- Seller Wallet - Schema Completo
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. PROFILES (vinculado ao auth.users)
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role        text not null default 'client' check (role in ('admin','leader','analyst','client')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Trigger: cria profile automaticamente ao signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', coalesce(new.raw_user_meta_data ->> 'role', 'client'));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: atualiza updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- RLS: usuários veem apenas seu perfil; admins veem todos
create policy "users_view_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "admins_view_all_profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "users_update_own_profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. CLIENTS
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  document    text,
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.clients enable row level security;

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at();

create policy "admins_full_access_clients"
  on public.clients for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "leaders_view_clients"
  on public.clients for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('leader','analyst')));

-- 3. API TOKENS
create table public.api_tokens (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients on delete cascade,
  prefix      text not null,
  permissions jsonb,
  status      text not null default 'active' check (status in ('active','revoked')),
  expires_at  timestamptz,
  last_used_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.api_tokens enable row level security;

create policy "admins_full_access_api_tokens"
  on public.api_tokens for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 4. INVOICES (pedidos)
create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.clients on delete set null,
  external_id   text,
  total_amount  numeric(12,2) default 0,
  status        text not null default 'pending' check (status in ('pending','approved','canceled')),
  created_at    timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "admins_full_access_invoices"
  on public.invoices for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "leaders_analysts_view_invoices"
  on public.invoices for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('leader','analyst')));

create policy "clients_view_own_invoices"
  on public.invoices for select
  using (client_id in (select id from public.clients where id = client_id));

-- 5. ERP PROVIDERS
create table public.erp_providers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

alter table public.erp_providers enable row level security;

create policy "admins_full_access_erp"
  on public.erp_providers for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "view_erp_providers"
  on public.erp_providers for select
  using (exists (select 1 from public.profiles where id = auth.uid()));

-- 6. CLIENT APPLICATIONS (integrações)
create table public.client_applications (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references public.clients on delete cascade not null,
  erp_provider_id uuid references public.erp_providers on delete set null,
  status          text not null default 'active' check (status in ('active','inactive')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.client_applications enable row level security;

create trigger set_client_applications_updated_at
  before update on public.client_applications
  for each row execute function public.update_updated_at();

create policy "admins_full_access_apps"
  on public.client_applications for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "view_client_applications"
  on public.client_applications for select
  using (exists (select 1 from public.profiles where id = auth.uid()));

-- 7. AUDIT LOGS
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  payload     jsonb,
  ip_address  text,
  created_at  timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "admins_full_access_audit"
  on public.audit_logs for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 8. VIEWS DE FATURAMENTO

-- Monthly billing view
create or replace view public.client_monthly_billing as
select
  i.client_id,
  c.name as client_name,
  to_char(i.created_at, 'YYYY-MM') as year_month,
  coalesce(sum(i.total_amount) filter (where i.status = 'approved'), 0) as total_approved,
  coalesce(sum(i.total_amount) filter (where i.status = 'canceled'), 0) as total_canceled,
  coalesce(sum(i.total_amount), 0) as total_gross,
  count(*) filter (where i.status = 'approved') as approved_count
from public.invoices i
left join public.clients c on c.id = i.client_id
group by i.client_id, c.name, to_char(i.created_at, 'YYYY-MM');

-- Daily billing view
create or replace view public.daily_billing as
select
  i.client_id,
  i.created_at::date as date,
  coalesce(sum(i.total_amount) filter (where i.status = 'approved'), 0) as total_approved,
  count(*) filter (where i.status = 'approved') as order_count
from public.invoices i
group by i.client_id, i.created_at::date;

-- 9. PRODUCT RANKING VIEW
create or replace view public.product_ranking as
select
  null::uuid as product_id,
  null::text as product_name,
  null::text as sku,
  i.client_id,
  c.name as client_name,
  count(*) as total_orders,
  count(*) as total_quantity,
  coalesce(sum(i.total_amount), 0) as total_revenue
from public.invoices i
left join public.clients c on c.id = i.client_id
where i.status = 'approved'
group by i.client_id, c.name;

-- 10. QUEUE STATUS (pgmq)
create or replace function public.get_queue_status()
returns table (queue_name text, pending bigint, archived bigint)
language sql
as $$
  select 'default'::text as queue_name, 0::bigint as pending, 0::bigint as archived
  where false;
$$;

-- ============================================
-- SEED: admin user (substitua o ID se necessário)
-- ============================================
-- O usuario ja foi criado via signup (id: 114ac2d9-2c9e-4587-bee9-8ffd8ac36b4b)
-- Apos confirmar o email, execute:
-- update public.profiles set role = 'admin', full_name = 'Jonathan Pitanga'
-- where id = '114ac2d9-2c9e-4587-bee9-8ffd8ac36b4b';

-- Se quiser pular confirmacao de email (apenas dev):
-- update auth.users set email_confirmed_at = now()
-- where id = '114ac2d9-2c9e-4587-bee9-8ffd8ac36b4b';

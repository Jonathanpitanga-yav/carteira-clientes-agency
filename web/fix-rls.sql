-- ============================================
-- Corrige RLS - Recursão infinita
-- ============================================

-- 1. Functions security definer (bypass RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_role(role_name text)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = role_name
  );
$$;

create or replace function public.has_any_role(role_names text[])
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(role_names)
  );
$$;

-- 2. Drop policies antigas com recursão
drop policy if exists "admins_view_all_profiles" on public.profiles;
drop policy if exists "admins_full_access_clients" on public.clients;
drop policy if exists "leaders_view_clients" on public.clients;
drop policy if exists "admins_full_access_api_tokens" on public.api_tokens;
drop policy if exists "admins_full_access_invoices" on public.invoices;
drop policy if exists "leaders_analysts_view_invoices" on public.invoices;
drop policy if exists "admins_full_access_erp" on public.erp_providers;
drop policy if exists "view_erp_providers" on public.erp_providers;
drop policy if exists "admins_full_access_apps" on public.client_applications;
drop policy if exists "view_client_applications" on public.client_applications;
drop policy if exists "admins_full_access_audit" on public.audit_logs;

-- 3. Recria policies usando security definer

-- PROFILES
create policy "profiles_select"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

-- CLIENTS
create policy "clients_all_admins"
  on public.clients for all
  using (public.is_admin());

create policy "clients_select_non_admins"
  on public.clients for select
  using (public.has_any_role(array['leader','analyst']));

-- API TOKENS
create policy "api_tokens_all_admins"
  on public.api_tokens for all
  using (public.is_admin());

-- INVOICES
create policy "invoices_all_admins"
  on public.invoices for all
  using (public.is_admin());

create policy "invoices_select_leaders_analysts"
  on public.invoices for select
  using (public.has_any_role(array['leader','analyst']));

-- ERP PROVIDERS
create policy "erp_providers_all_admins"
  on public.erp_providers for all
  using (public.is_admin());

create policy "erp_providers_select_all"
  on public.erp_providers for select
  using (public.has_any_role(array['admin','leader','analyst','client']));

-- CLIENT APPLICATIONS
create policy "client_applications_all_admins"
  on public.client_applications for all
  using (public.is_admin());

create policy "client_applications_select_all"
  on public.client_applications for select
  using (public.has_any_role(array['admin','leader','analyst','client']));

-- AUDIT LOGS
create policy "audit_logs_all_admins"
  on public.audit_logs for all
  using (public.is_admin());

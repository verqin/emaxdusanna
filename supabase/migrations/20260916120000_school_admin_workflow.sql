-- School administrator invitation, approval, explicit permissions, and reconciliation reporting.
-- Apply after the existing Lovable/Supabase migrations. No service-role secret belongs in this file.

create extension if not exists pgcrypto;

alter table public.contracted_schools
  add column if not exists onboarding_enabled boolean not null default false,
  add column if not exists onboarding_token_hash text,
  add column if not exists onboarding_expires_at timestamptz,
  add column if not exists onboarding_updated_at timestamptz;

create unique index if not exists contracted_schools_onboarding_token_hash_idx
  on public.contracted_schools (onboarding_token_hash)
  where onboarding_token_hash is not null;

create table if not exists public.school_admin_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.contracted_schools(id) on delete cascade,
  email text not null,
  full_name text,
  requested_role text not null default 'school_manager' check (requested_role in ('school_manager','school_finance','school_viewer')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  access_token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_admin_invitations_school_status_idx
  on public.school_admin_invitations (school_id, status, created_at desc);

create table if not exists public.school_admin_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references public.contracted_schools(id) on delete cascade,
  permission text not null check (permission in ('manage_roster','view_progress','verify_payments','view_reports','manage_invites')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, school_id, permission)
);

create index if not exists school_admin_permissions_school_idx
  on public.school_admin_permissions (school_id, user_id);

create or replace function public.has_school_permission(_school_id uuid, _permission text, _user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.school_admin_permissions p
    where p.school_id = _school_id and p.user_id = _user_id and p.permission = _permission
  ) or exists (
    select 1 from public.user_roles r where r.user_id = _user_id and r.role = 'admin'
  );
$$;

create or replace view public.school_payment_reconciliation with (security_invoker = true) as
select
  cs.id as school_id,
  cs.school_name,
  count(cp.id)::integer as payment_count,
  coalesce(sum(cp.amount), 0)::numeric as gross_amount,
  coalesce(sum(cp.amount) filter (where cp.payment_status in ('noted','certificate_sent')), 0)::numeric as reconciled_amount,
  coalesce(sum(cp.amount) filter (where cp.payment_status = 'paid_pending_admin'), 0)::numeric as pending_amount,
  max(cp.created_at) as last_payment_at
from public.contracted_schools cs
left join public.certificate_payments cp on lower(btrim(cp.school_name)) = cs.normalized_name
group by cs.id, cs.school_name;

alter table public.school_admin_invitations enable row level security;
alter table public.school_admin_permissions enable row level security;

 drop policy if exists school_admin_invites_admin_only on public.school_admin_invitations;
create policy school_admin_invites_admin_only on public.school_admin_invitations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists school_admin_permissions_admin_or_self on public.school_admin_permissions;
create policy school_admin_permissions_admin_or_self on public.school_admin_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists school_payment_reconciliation_admin_or_school on public.school_payment_reconciliation;
create policy school_payment_reconciliation_admin_or_school on public.school_payment_reconciliation
  for select to authenticated
  using (public.is_admin() or public.has_school_permission(school_id, 'view_reports'));

grant select on public.school_payment_reconciliation to authenticated;
grant select, insert, update, delete on public.school_admin_invitations to authenticated;
grant select on public.school_admin_permissions to authenticated;

create or replace function public.touch_school_admin_invitation()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists school_admin_invitations_touch on public.school_admin_invitations;
create trigger school_admin_invitations_touch before update on public.school_admin_invitations
for each row execute function public.touch_school_admin_invitation();

-- Backfill explicit permissions for current school administrators.
insert into public.school_admin_permissions (user_id, school_id, permission)
select sa.user_id, sa.school_id, permission
from public.school_admins sa
cross join unnest(array['manage_roster','view_progress','verify_payments','view_reports','manage_invites']) permission
where sa.school_id is not null
on conflict do nothing;

comment on table public.school_admin_invitations is 'Public-link onboarding requests; access is controlled by contracted_schools.onboarding_enabled and token expiry.';
comment on table public.school_admin_permissions is 'Explicit school-scoped permissions; never infer authorization from editable profile metadata.';
comment on view public.school_payment_reconciliation is 'School-scoped payment and reconciliation totals for finance reporting.';

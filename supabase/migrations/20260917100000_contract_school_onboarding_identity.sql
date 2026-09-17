-- Contracted school onboarding identity and secure invitation access.
-- The invitation token is never stored in plaintext.

alter table public.contracted_schools
  add column if not exists school_code text,
  add column if not exists onboarding_enabled boolean not null default false;

create sequence if not exists public.contracted_school_code_seq;

update public.contracted_schools
set school_code = 'CS' || upper(substr(replace(id::text, '-', ''), 1, 3)) || upper(substr(md5(coalesce(normalized_name, school_name)), 1, 2))
where school_code is null;

alter table public.contracted_schools
  alter column school_code set not null;

create unique index if not exists contracted_schools_school_code_key
  on public.contracted_schools (school_code);

create or replace function public.assign_contracted_school_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.school_code is null or btrim(new.school_code) = '' then
    new.school_code := 'CS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 3)) || upper(substr(md5(coalesce(new.normalized_name, new.school_name)), 1, 2));
  end if;
  return new;
end;
$$;

drop trigger if exists contracted_schools_assign_code on public.contracted_schools;
create trigger contracted_schools_assign_code
before insert on public.contracted_schools
for each row execute function public.assign_contracted_school_code();

comment on column public.contracted_schools.school_code is 'Stable human-readable contracted school identifier, e.g. CS71S.';
comment on column public.contracted_schools.onboarding_enabled is 'Controls whether the private administrator invitation page accepts submissions.';

create or replace view public.school_admin_invitations_safe with (security_invoker = true) as
select i.id, i.school_id, i.email, i.full_name, i.requested_role, i.status,
       i.expires_at, i.submitted_at, i.reviewed_at, i.approved_user_id, i.created_at,
       s.school_name, s.school_code, s.onboarding_enabled
from public.school_admin_invitations i
join public.contracted_schools s on s.id = i.school_id;

grant select on public.school_admin_invitations_safe to authenticated;

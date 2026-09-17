-- Restore the enrollment table before applying client-side upserts.
-- This is safe for projects where the table already exists.
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  level text not null check (level in ('certificate', 'diploma')),
  course_title text,
  created_at timestamptz not null default now()
);

create unique index if not exists enrollments_user_course_level_key
  on public.enrollments (user_id, course_id, level);

create index if not exists idx_enrollments_user_id
  on public.enrollments (user_id);

grant select, insert, update, delete on public.enrollments to authenticated;

alter table public.enrollments enable row level security;

drop policy if exists "Users manage their own enrollments" on public.enrollments;
create policy "Users manage their own enrollments"
  on public.enrollments
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

comment on table public.enrollments is 'Course enrollments owned by authenticated learners.';
comment on column public.enrollments.course_id is 'Stable catalog course identifier.';
comment on column public.enrollments.level is 'Enrollment level: certificate or diploma.';
comment on column public.enrollments.course_title is 'Course title captured at enrollment time.';
comment on column public.enrollments.created_at is 'Enrollment creation timestamp.';

-- Keep the schema bootstrap in sync for fresh Supabase projects.

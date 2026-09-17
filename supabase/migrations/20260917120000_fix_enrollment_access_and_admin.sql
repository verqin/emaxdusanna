-- Restore the enrollment contract used by the client upsert and make the
-- authenticated user's ownership policy explicit for every write operation.

with duplicates as (
  select id, row_number() over (
    partition by user_id, course_id, level
    order by created_at asc, id asc
  ) as row_number
  from public.enrollments
)
delete from public.enrollments
where id in (select id from duplicates where row_number > 1);

create unique index if not exists enrollments_user_course_level_key
  on public.enrollments (user_id, course_id, level);

grant select, insert, update, delete on public.enrollments to authenticated;

drop policy if exists "Users manage their own enrollments" on public.enrollments;
create policy "Users manage their own enrollments"
  on public.enrollments
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Make the requested account an administrator when the account already exists.
-- The statement is intentionally idempotent; if the account is created later,
-- the admin dashboard can assign the same role without creating duplicates.
do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = 'tinashelvurayai@gmail.com'
  limit 1;

  if target_user_id is not null then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;
end;
$$;

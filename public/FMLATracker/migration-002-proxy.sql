-- ============================================================
-- Migration 002: move to the Pages Function proxy model.
--
-- Cloudflare Access is now the only identity system. There are no
-- Supabase Auth users, so hr_staff can no longer key on auth.users.
-- It keys on the verified email from the Access token instead.
--
-- Access to these tables narrows to service_role, which only the
-- Pages Function holds. anon and authenticated both get nothing.
-- ============================================================

-- 1. Rebuild the staff list around email.
--    Safe to drop: it has no rows yet, and nothing references it by FK.
drop table if exists fmla.hr_staff cascade;

create table fmla.hr_staff (
  email      text primary key,
  full_name  text,
  added_at   timestamptz default now()
);

-- Emails are compared lowercase in the Function. Enforce it here too so a
-- capitalized entry cannot silently fail to match.
create or replace function fmla.lowercase_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(new.email);
  return new;
end $$;

create trigger hr_staff_lower_email
  before insert or update on fmla.hr_staff
  for each row execute function fmla.lowercase_email();

-- 2. is_hr_staff() is no longer used. The Function does this check against
--    the verified Access email before any query runs.
drop function if exists fmla.is_hr_staff();

-- 3. Withdraw the grants added in migration 001. The browser no longer holds
--    any Supabase credential, so `authenticated` needs nothing.
revoke all on all tables    in schema fmla from authenticated;
revoke all on all sequences in schema fmla from authenticated;
revoke usage on schema fmla from authenticated;

alter default privileges in schema fmla revoke all on tables from authenticated;

-- 4. Reassert the anon lockout.
revoke all   on all tables    in schema fmla from anon;
revoke all   on all sequences in schema fmla from anon;
revoke usage on schema fmla                  from anon;

-- 5. service_role is the only way in.
grant usage on schema fmla to service_role;
grant select, insert, update, delete on all tables    in schema fmla to service_role;
grant usage, select                  on all sequences in schema fmla to service_role;
alter default privileges in schema fmla
  grant select, insert, update, delete on tables to service_role;

-- 6. RLS stays enabled with no policies. service_role bypasses RLS, so this
--    changes nothing for the Function, but it means that if a grant is ever
--    added back to anon or authenticated by mistake, they still read nothing.
--    Defense in depth, not the primary control.
alter table fmla.cases      enable row level security;
alter table fmla.usage      enable row level security;
alter table fmla.access_log enable row level security;
alter table fmla.hr_staff   enable row level security;

drop policy if exists hr_all_cases  on fmla.cases;
drop policy if exists hr_all_usage  on fmla.usage;
drop policy if exists hr_insert_log on fmla.access_log;
drop policy if exists hr_read_log   on fmla.access_log;
drop policy if exists hr_read_staff on fmla.hr_staff;

-- 7. Add yourself. This is now the entire access control list.
insert into fmla.hr_staff (email, full_name)
values ('CHANGE_ME@law.tamu.edu', 'Payton Baldridge')
on conflict (email) do nothing;


-- ============================================================
-- VERIFY. Both should return no rows.
-- ============================================================
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'fmla' and grantee in ('anon','authenticated');
--
-- select policyname from pg_policies where schemaname = 'fmla';
--
-- And this should return true, false, false:
-- select has_schema_privilege('service_role','fmla','USAGE'),
--        has_schema_privilege('authenticated','fmla','USAGE'),
--        has_schema_privilege('anon','fmla','USAGE');

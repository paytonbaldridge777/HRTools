-- ============================================================
-- PART 1: DIAGNOSTIC. Read-only. Changes nothing.
-- Run this first and read the output before touching PART 2.
-- ============================================================

-- 1a. Which of my schema versions did you actually run?
select
  case
    when exists (select 1 from pg_tables where schemaname = 'fmla' and tablename = 'cases')
      then 'v3 (correct): tables live in the fmla schema'
    when exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fmla_cases')
      then 'v1 or v2 (superseded): tables live in public as fmla_cases'
    else 'neither: no FMLA tables found'
  end as which_version;

-- 1b. Anything left behind in public that should be cleaned up.
select schemaname, tablename
from pg_tables
where (schemaname = 'public' and tablename like 'fmla%')
   or  schemaname = 'fmla'
order by schemaname, tablename;

-- 1c. Schema-level access. anon must be false, authenticated must be true.
select
  has_schema_privilege('anon',          'fmla', 'USAGE') as anon_can_enter_schema,
  has_schema_privilege('authenticated', 'fmla', 'USAGE') as authd_can_enter_schema;

-- 1d. Table-level grants. This is the thing that is probably missing.
-- Expect rows for `authenticated` and NONE for `anon`.
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'fmla'
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by grantee, table_name;

-- 1e. Policies that exist right now.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'fmla'
order by tablename, policyname;


-- ============================================================
-- PART 2: THE FIX.
-- Only run this if 1a said "v3 (correct)".
-- If it said v1/v2, stop and go to PART 3 instead.
--
-- Every statement here is idempotent. Running it twice is harmless.
-- ============================================================

-- Table privileges are checked BEFORE row level security. Without these,
-- a signed-in HR user is denied at the table level and the policies never
-- get a chance to run. Supabase grants these automatically in `public`
-- but not in a custom schema.
grant select, insert, update, delete on all tables    in schema fmla to authenticated;
grant usage, select                 on all sequences in schema fmla to authenticated;

-- Tables created later inherit the same treatment.
alter default privileges in schema fmla
  grant select, insert, update, delete on tables to authenticated;

-- Narrow back down where the blanket grant above is too generous.
-- Membership is managed from the SQL editor, not from the app.
revoke insert, update, delete on fmla.hr_staff   from authenticated;
-- Audit log is append-only.
revoke update, delete         on fmla.access_log from authenticated;

-- Reassert that anon got nothing, in case an earlier run granted it.
revoke all on all tables    in schema fmla from anon;
revoke all on all sequences in schema fmla from anon;
revoke usage on schema fmla from anon;


-- ============================================================
-- PART 3: ONLY IF 1a SAID "v1 or v2".
-- Those versions put tables in `public` with a policy predicate
-- (auth.jwt() ->> 'role') that can never match in Supabase.
-- Nothing of value is in them yet, so drop and start clean.
-- ============================================================

-- Uncomment to run:
-- drop table if exists public.fmla_access_log cascade;
-- drop table if exists public.fmla_usage      cascade;
-- drop table if exists public.fmla_cases      cascade;
-- drop function if exists public.fmla_balance(text, date);
-- Then run the full current schema.sql from scratch.


-- ============================================================
-- PART 4: CONFIRM THE FIX TOOK.
-- Re-run 1c and 1d. You are looking for:
--   anon_can_enter_schema  = false
--   authd_can_enter_schema = true
--   grants listed for `authenticated` on cases, usage, access_log
--   grants listed for `anon` on nothing at all
-- ============================================================

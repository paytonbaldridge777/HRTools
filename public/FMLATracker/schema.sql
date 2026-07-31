-- FMLA Case Tracker schema
-- Deployed into the EXISTING HRTools Supabase project (cnxdlahqonlewgbcjyla)
-- because the free plan caps at two projects.
--
-- Separation is achieved with a dedicated Postgres schema rather than a
-- dedicated project. 29 CFR 825.500(g) requires FMLA medical records be kept
-- "in separate files/records from the usual personnel files". That is an
-- access-separation requirement, not a separate-hardware requirement. Three
-- controls make the separation real:
--
--   1. Tables live in schema `fmla`, not `public`.
--   2. The `anon` role has no USAGE on schema `fmla`. The anon key embedded
--      in OnboardingTracker/index.html therefore cannot reach these tables
--      even though it sits in the same project.
--   3. RLS additionally requires the caller be a listed HR staff member.
--
-- Co-location is defensible, not ideal: a service_role key leak would expose
-- onboarding and FMLA together. Revisit when a second project frees up.

create schema if not exists fmla;

-- The most important lines in this file.
revoke all   on schema fmla from anon;
revoke usage on schema fmla from anon;
grant  usage on schema fmla to   authenticated;

alter default privileges in schema fmla revoke all on tables from anon;

-- Who counts as HR staff. A membership table rather than a JWT claim, because
-- Supabase's `role` claim carries the Postgres role (anon / authenticated) and
-- cannot express an application role without a custom access token hook.
create table if not exists fmla.hr_staff (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text not null,
  added_at timestamptz default now()
);

create or replace function fmla.is_hr_staff()
returns boolean language sql stable security definer
set search_path = fmla, public as $$
  select exists (select 1 from fmla.hr_staff where user_id = auth.uid());
$$;

revoke execute on function fmla.is_hr_staff() from public, anon;
grant  execute on function fmla.is_hr_staff() to authenticated;

create table if not exists fmla.cases (
  id                      bigint generated always as identity primary key,

  employee_name           text not null,
  uin                     text not null,
  department              text,
  supervisor_name         text,
  supervisor_email        text,

  -- Eligibility, 29 CFR 825.110
  hire_date               date,
  scheduled_hours_week    numeric(5,2) default 40,
  hours_prior_12mo        numeric(7,2),
  eligibility_determined  date,
  is_eligible             boolean,

  -- Leave characterization. Category only, never diagnosis.
  leave_reason            text check (leave_reason in
                            ('own','family','bonding_birth','bonding_placement',
                             'exigency','military_caregiver')),
  family_relationship     text check (family_relationship in
                            ('spouse','child','parent') or family_relationship is null),
  leave_type              text check (leave_type in ('continuous','intermittent','reduced')),

  request_received        date,
  leave_start             date,
  expected_end            date,
  actual_end              date,

  -- Notices and certification. Dates and sufficiency flags only.
  eligibility_notice_sent date,
  cert_requested          date,
  cert_received           date,
  cert_sufficient         text check (cert_sufficient in
                            ('sufficient','incomplete','insufficient') or cert_sufficient is null),
  cert_cured              date,
  second_opinion_date     date,
  third_opinion_date      date,
  designation_sent        date,
  recert_due              date,
  recert_received         date,

  ffd_required            boolean default false,
  ffd_received            date,

  paid_leave_substitution text,
  status                  text not null default 'intake' check (status in
                            ('intake','awaiting_cert','cert_review','approved',
                             'denied','exhausted','closed')),
  notes                   text,

  -- Pointer to the medical certification form in the sanctioned document
  -- system.
  -- The form itself is deliberately not stored here.
  cert_document_ref       text,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Dated entries. A running total cannot support a rolling 12-month lookback.
create table if not exists fmla.usage (
  id          bigint generated always as identity primary key,
  case_id     bigint not null references fmla.cases(id) on delete cascade,
  uin         text not null,
  usage_date  date not null,
  hours       numeric(5,2) not null,
  created_at  timestamptz default now()
);

create index if not exists idx_usage_uin_date on fmla.usage (uin, usage_date desc);
create index if not exists idx_cases_uin      on fmla.cases (uin);

-- Append-only. FMLA and ADA disputes turn on who saw what, when.
create table if not exists fmla.access_log (
  id          bigint generated always as identity primary key,
  case_id     bigint,
  actor       text not null,
  action      text not null,
  occurred_at timestamptz default now()
);


create or replace function fmla.balance(p_uin text, p_as_of date default current_date)
returns numeric language sql stable
set search_path = fmla, public as $$
  select coalesce(sum(hours), 0)
  from fmla.usage
  where uin = p_uin
    and usage_date >  p_as_of - interval '365 days'
    and usage_date <= p_as_of;
$$;

revoke execute on function fmla.balance(text, date) from public, anon;
grant  execute on function fmla.balance(text, date) to authenticated;

-- Table-level grants. RLS filters rows, but Postgres checks table privileges
-- FIRST. Without these, a signed-in HR user gets "permission denied for table
-- cases" and the policies below never even run. Supabase auto-grants these in
-- `public` but NOT in a custom schema, so they must be explicit.
-- Note these run after the tables exist; ALL TABLES only affects what is
-- already created.
grant select, insert, update, delete on all tables    in schema fmla to authenticated;
grant usage, select                 on all sequences in schema fmla to authenticated;

-- New tables added later inherit the same treatment.
alter default privileges in schema fmla
  grant select, insert, update, delete on tables to authenticated;

-- Narrow it back down where the broad grant is wrong.
-- Membership list is managed from the SQL editor, not the app.
revoke insert, update, delete on fmla.hr_staff   from authenticated;
-- Audit log stays append-only.
revoke update, delete         on fmla.access_log from authenticated;

-- And confirm anon got nothing, belt and suspenders alongside the schema revoke.
revoke all on all tables    in schema fmla from anon;
revoke all on all sequences in schema fmla from anon;

alter table fmla.cases      enable row level security;
alter table fmla.usage      enable row level security;
alter table fmla.access_log enable row level security;
alter table fmla.hr_staff   enable row level security;

create policy hr_all_cases on fmla.cases
  for all to authenticated
  using (fmla.is_hr_staff()) with check (fmla.is_hr_staff());

create policy hr_all_usage on fmla.usage
  for all to authenticated
  using (fmla.is_hr_staff()) with check (fmla.is_hr_staff());

create policy hr_insert_log on fmla.access_log
  for insert to authenticated with check (fmla.is_hr_staff());

create policy hr_read_log on fmla.access_log
  for select to authenticated using (fmla.is_hr_staff());

create policy hr_read_staff on fmla.hr_staff
  for select to authenticated using (fmla.is_hr_staff());

-- After running this, expose the schema to PostgREST:
--   Dashboard, Settings, API, Exposed schemas, add `fmla`.
--
-- Then seed yourself:
--   insert into fmla.hr_staff (user_id, email)
--   values ('<your-auth-uid>', 'you@law.tamu.edu');
--
-- Then verify the wall. All three must FAIL using the ANON key:
--   GET  /rest/v1/cases         header  Accept-Profile: fmla
--   GET  /rest/v1/hr_staff      header  Accept-Profile: fmla
--   POST /rest/v1/rpc/balance   header  Content-Profile: fmla
-- If any of them returns data, stop and do not enter real cases.

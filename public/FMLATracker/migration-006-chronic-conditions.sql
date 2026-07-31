-- ============================================================
-- Migration 006: chronic and indefinite-duration conditions.
--
-- A chronic serious health condition under 825.115(c) has no return to
-- work date, because the employee never fully left. What has an end
-- date is the CERTIFICATION, not the leave. Recording "lifetime" in an
-- expected_end field produces either a nonsense date or a blank that
-- other logic then trips over.
-- ============================================================

-- The provider certifies a duration for the condition. When that is
-- indefinite or longer than 30 days, 825.308(b) allows recertification
-- every six months in connection with an absence, rather than the
-- usual 30-day floor.
alter table fmla.cases
  add column if not exists condition_indefinite boolean default false;

-- When the current certification stops being valid. Distinct from
-- expected_end, which is a return-to-work date and does not exist for
-- an intermittent chronic case.
alter table fmla.cases
  add column if not exists cert_valid_through date;

-- The frequency and duration the provider authorized, e.g. "2 to 3
-- episodes per month, 1 to 2 days each". Without this there is nothing
-- to compare actual usage against, and the checklist item about an
-- employee using more leave than the doctor allowed cannot be checked.
alter table fmla.cases
  add column if not exists intermittent_episodes numeric(5,2);

alter table fmla.cases
  add column if not exists intermittent_hours_each numeric(5,2);

alter table fmla.cases
  add column if not exists intermittent_period text
    check (intermittent_period in ('week','month') or intermittent_period is null);

-- Authorized frequency only means something for episodic leave.
alter table fmla.cases
  drop constraint if exists frequency_only_for_episodic;

alter table fmla.cases
  add constraint frequency_only_for_episodic
  check (intermittent_episodes is null
         or leave_type in ('intermittent','reduced'));


-- ============================================================
-- VERIFY
-- ============================================================
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'fmla' and table_name = 'cases'
--   and column_name in ('condition_indefinite','cert_valid_through',
--                       'intermittent_episodes','intermittent_hours_each',
--                       'intermittent_period');
--
-- Should fail, frequency on a continuous leave:
--   insert into fmla.cases (employee_name, uin, leave_type, intermittent_episodes)
--   values ('Constraint test', '000000000', 'continuous', 3);

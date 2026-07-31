-- ============================================================
-- Migration 007: care duration fields from the medical
-- certification form.
--
-- The certification asks for two different shapes depending on the
-- leave, and both were previously being typed into the notes field:
--
--   Episodic flare-ups:  N episodes per week/month, X hours each
--                        (migration 006)
--   Reduced schedule:    X hours per day, Y days per week
--                        (this migration)
--
-- Recording these as free text in `notes` was also pushing clinical
-- detail toward a field that is supposed to stay administrative.
-- Structured fields keep the numbers out of prose.
-- ============================================================

-- Hours per day the employee needs off, or needs to provide care.
alter table fmla.cases
  add column if not exists care_hours_per_day numeric(4,2);

-- Days per week the same applies.
alter table fmla.cases
  add column if not exists care_days_per_week numeric(3,1);

-- Sanity bounds. A transcription slip that puts 40 in hours-per-day
-- would otherwise silently inflate the authorized total and mask real
-- overuse, which is the opposite of what the field is for.
alter table fmla.cases
  drop constraint if exists care_hours_per_day_range;

alter table fmla.cases
  add constraint care_hours_per_day_range
  check (care_hours_per_day is null
         or (care_hours_per_day > 0 and care_hours_per_day <= 24));

alter table fmla.cases
  drop constraint if exists care_days_per_week_range;

alter table fmla.cases
  add constraint care_days_per_week_range
  check (care_days_per_week is null
         or (care_days_per_week > 0 and care_days_per_week <= 7));

-- Meaningful only for episodic leave, matching the existing frequency
-- constraint. On a continuous leave the employee is off entirely, so
-- hours per day does not describe anything.
alter table fmla.cases
  drop constraint if exists care_duration_only_for_episodic;

alter table fmla.cases
  add constraint care_duration_only_for_episodic
  check ((care_hours_per_day is null and care_days_per_week is null)
         or leave_type in ('intermittent','reduced'));


-- ============================================================
-- VERIFY
-- ============================================================
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'fmla' and table_name = 'cases'
--   and column_name in ('care_hours_per_day','care_days_per_week');
--
-- Should fail, out of range:
--   insert into fmla.cases (employee_name, uin, leave_type, care_hours_per_day)
--   values ('Constraint test', '000000000', 'reduced', 40);

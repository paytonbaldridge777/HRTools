-- ============================================================
-- Migration 005: one case for a continuous birth-then-bonding leave.
--
-- A mother who delivers, recovers, bonds, and returns once has made ONE
-- leave request. One eligibility notice, one designation notice, one
-- restoration. Recording it as two cases manufactured a second set of
-- notice deadlines that 825.300(b) never required, because that section
-- ties the notice to the request and there was only one request.
--
-- Two cases remain correct when she actually returns to work in between
-- and later requests bonding leave separately. That is two requests.
-- ============================================================

-- Migration 003 restricted the birth date to bonding reasons. Under the
-- single-case model the leave is recorded as 'own', since that is what
-- initiates it, so that constraint now forbids the intended shape.
alter table fmla.cases
  drop constraint if exists birth_date_only_for_bonding;

alter table fmla.cases
  add constraint birth_date_reason_allowed
  check (birth_or_placement_date is null
         or leave_reason in ('own', 'bonding_birth', 'bonding_placement'));

-- Where the leave stops being her own serious health condition and
-- becomes bonding. The boundary matters because the intermittent rule
-- flips across it: reduced schedule during recovery is hers as medically
-- necessary under 825.202, while the same request during bonding
-- requires employer agreement under 825.120(b).
alter table fmla.cases
  add column if not exists bonding_start_date date;

alter table fmla.cases
  drop constraint if exists bonding_start_needs_birth;

alter table fmla.cases
  add constraint bonding_start_needs_birth
  check (bonding_start_date is null or birth_or_placement_date is not null);

alter table fmla.cases
  drop constraint if exists bonding_start_after_birth;

alter table fmla.cases
  add constraint bonding_start_after_birth
  check (bonding_start_date is null
         or bonding_start_date >= birth_or_placement_date);


-- ============================================================
-- VERIFY
-- ============================================================
-- Should succeed, this is the single-case shape:
--   insert into fmla.cases
--     (employee_name, uin, leave_reason, leave_type,
--      birth_or_placement_date, bonding_start_date)
--   values ('Constraint test', '000000000', 'own', 'continuous',
--           '2026-09-01', '2026-10-15');
--
-- Should fail, bonding cannot start before the birth:
--   update fmla.cases set bonding_start_date = '2026-08-01'
--   where uin = '000000000';
--
-- Clean up:
--   delete from fmla.cases where uin = '000000000';

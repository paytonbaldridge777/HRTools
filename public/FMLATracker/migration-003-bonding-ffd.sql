-- ============================================================
-- Migration 003: bonding expiry, fitness-for-duty guardrails,
-- and a condition-neutral accommodation flag.
--
-- Safe to run on a populated table. Every column is nullable or
-- defaulted, and nothing is dropped.
-- ============================================================

-- Bonding entitlement expires 12 months after birth or placement
-- (29 CFR 825.120(a)(2) and 825.121(a)(2)). Without this date the
-- expiry cannot be computed.
--
-- Note this is a DATE OF AN EVENT, not a diagnosis. "Pregnancy" is a
-- medical condition and is deliberately not recorded anywhere. A birth
-- date plus leave_reason = bonding_birth conveys everything needed to
-- administer the leave, without creating a pregnancy record that could
-- later be evidence in a Title VII or PDA claim.
alter table fmla.cases
  add column if not exists birth_or_placement_date date;

-- Fitness-for-duty may only be required if the requirement was stated
-- in the designation notice (29 CFR 825.300(d)(3)). Demanding it at the
-- door when it was never noticed is the most common way employers lose
-- this. Recording it separately lets the app warn instead of silently
-- letting an unenforceable requirement sit on the case.
alter table fmla.cases
  add column if not exists ffd_noticed_in_designation boolean default false;

-- Condition-neutral. PWFA and ADA obligations can attach to any case and
-- can survive a clean fitness-for-duty certification. Deliberately NOT a
-- pregnancy flag: a field that fires only for pregnancy is a pregnancy
-- record wearing a different hat.
alter table fmla.cases
  add column if not exists accommodation_review boolean default false;

-- Fitness-for-duty applies only to the employee's own serious health
-- condition. It is not available for bonding, family care, qualifying
-- exigency, or military caregiver leave. Enforce at the database level
-- so a client bug cannot persist an unlawful combination.
alter table fmla.cases
  drop constraint if exists ffd_only_for_own_condition;

alter table fmla.cases
  add constraint ffd_only_for_own_condition
  check (ffd_required is not true or leave_reason = 'own');

-- Birth or placement date only makes sense for bonding leave.
alter table fmla.cases
  drop constraint if exists birth_date_only_for_bonding;

alter table fmla.cases
  add constraint birth_date_only_for_bonding
  check (birth_or_placement_date is null
         or leave_reason in ('bonding_birth', 'bonding_placement'));


-- ============================================================
-- VERIFY
-- ============================================================
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'fmla' and table_name = 'cases'
--   and column_name in ('birth_or_placement_date',
--                       'ffd_noticed_in_designation',
--                       'accommodation_review');
--
-- This should fail with a constraint violation, which is the point:
--   insert into fmla.cases (employee_name, uin, leave_reason, ffd_required)
--   values ('Constraint test', '000000000', 'bonding_birth', true);

-- ============================================================
-- Migration 004: align with the TAMU Employee FMLA Reminders and
-- Checklist (rev. 8/26/2025).
--
-- Safe on a populated table. Everything is nullable or defaulted.
-- ============================================================

-- Faculty requesting intermittent leave must be routed to the Director
-- of Employee Relations for review BEFORE the designation notice is
-- issued. This is a hard stop in the checklist between steps 4 and 5,
-- and nothing in the tool knew about it.
alter table fmla.cases
  add column if not exists employee_type text
    check (employee_type in ('staff','faculty') or employee_type is null);

alter table fmla.cases add column if not exists er_review_sent    date;
alter table fmla.cases add column if not exists er_review_cleared date;

-- Eligibility is 12 months of service to the STATE OF TEXAS, and it
-- need not be consecutive. Deriving it from the Law School hire date
-- was wrong: it would deny an eligible employee who transferred in from
-- another state agency. HR confirms this directly, as on the checklist.
alter table fmla.cases
  add column if not exists twelve_months_state_service boolean;

-- The checklist requires documenting how the certification arrived, and
-- retaining the fax cover letter when faxed.
alter table fmla.cases
  add column if not exists cert_received_method text
    check (cert_received_method in ('fax','email','in_person') or cert_received_method is null);

-- Step 5: the supervisor gets the return date and any intermittent
-- limits within five days. A separate obligation from the designation
-- notice, and separately missable.
alter table fmla.cases add column if not exists supervisor_notified date;

-- Step 7: check in one to two weeks before the expected return.
alter table fmla.cases add column if not exists return_checkin_done date;

-- Step 5: 31 days to add a newborn to insurance. Not an FMLA deadline,
-- but it is time-critical, it is on the checklist, and missing it costs
-- the employee real money.
alter table fmla.cases add column if not exists insurance_enrollment_noted date;

-- Employee Relations review only applies to faculty.
alter table fmla.cases
  drop constraint if exists er_review_faculty_only;

alter table fmla.cases
  add constraint er_review_faculty_only
  check (er_review_sent is null or employee_type = 'faculty');


-- ============================================================
-- VERIFY
-- ============================================================
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'fmla' and table_name = 'cases'
--   and column_name in ('employee_type','er_review_sent','er_review_cleared',
--                       'twelve_months_state_service','cert_received_method',
--                       'supervisor_notified','return_checkin_done',
--                       'insurance_enrollment_noted');

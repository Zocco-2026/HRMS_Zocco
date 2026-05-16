-- Verification queries after seeding Z71 attendance.

select count(*)::int as z71_log_rows
from public.attendance_logs l
where l.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade';

select count(*)::int as z71_seed_log_rows
from public.attendance_logs l
where l.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade'
  and l.mark_source = 'seed';

select count(*)::int as z71_daily_rows
from public.daily_attendance d
where d.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade';

select
  d.attendance_date,
  d.first_in_time,
  d.last_out_time,
  d.primary_status,
  d.working_minutes,
  d.is_present,
  d.is_late,
  d.is_early_exit,
  d.is_half_day,
  d.is_absent
from public.daily_attendance d
where d.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade'
order by d.attendance_date desc
limit 15;

select
  d.primary_status,
  count(*)::int as day_count
from public.daily_attendance d
where d.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade'
  and d.attendance_date >= (timezone('Asia/Kolkata', now()))::date - 29
group by d.primary_status
order by d.primary_status;

-- May 2026 summary (web calendar month)
select
  count(*) filter (where d.primary_status = 'present')::int as present,
  count(*) filter (where d.primary_status = 'late')::int as late,
  count(*) filter (where d.primary_status = 'early_exit')::int as early_exit,
  count(*) filter (where d.primary_status = 'half_day')::int as half_day,
  count(*) filter (where d.primary_status = 'absent')::int as absent
from public.daily_attendance d
where d.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade'
  and d.attendance_date >= '2026-05-01'
  and d.attendance_date < '2026-06-01';

-- Rollback Z71 seed attendance only (mark_source = 'seed').
-- Cascades: trigger does not run on DELETE; daily rows refreshed after delete.

begin;

delete from public.attendance_logs l
where l.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade'
  and l.mark_source = 'seed';

-- Remove orphan daily rows for dates that only had seed data
delete from public.daily_attendance d
where d.employee_id = 'f2be5952-f6a8-4f06-935a-3f46b9128ade'
  and not exists (
    select 1
    from public.attendance_logs l
    where l.employee_id = d.employee_id
      and (timezone('Asia/Kolkata', l."timestamp"))::date = d.attendance_date
  );

select public.reconcile_daily_attendance(30) as reconcile_result;

commit;

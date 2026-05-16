-- Phase 3: Refresh daily_attendance after any punch insert (keeps ledger + rollup in sync).

create or replace function public.trg_attendance_logs_refresh_daily()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_daily_attendance(
    new.employee_id,
    (timezone('Asia/Kolkata', new."timestamp"))::date
  );
  return new;
end;
$$;

drop trigger if exists attendance_logs_refresh_daily_trg on public.attendance_logs;
create trigger attendance_logs_refresh_daily_trg
after insert on public.attendance_logs
for each row
execute function public.trg_attendance_logs_refresh_daily();

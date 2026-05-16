-- Phase 3: Server-side daily rollup (mirrors packages/shared attendanceEngine.js rules).

create or replace function public._att_parse_clock_minutes(p_raw text, p_default integer default 0)
returns integer
language plpgsql
immutable
as $$
declare
  v_parts text[];
  v_h int;
  v_m int;
begin
  if p_raw is null or trim(p_raw) = '' then
    return p_default;
  end if;
  v_parts := string_to_array(trim(p_raw), ':');
  begin
    v_h := coalesce(nullif(trim(v_parts[1]), '')::int, 0);
    v_m := case when array_length(v_parts, 1) >= 2 then coalesce(nullif(trim(v_parts[2]), '')::int, 0) else 0 end;
  exception when others then
    return p_default;
  end;
  return v_h * 60 + v_m;
end;
$$;

create or replace function public.refresh_daily_attendance(
  p_employee_id uuid,
  p_attendance_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intime text;
  v_outtime text;
  v_entry_buffer int := 15;
  v_exit_buffer int := 15;
  v_start_m int;
  v_end_m int;
  v_in_time text := null;
  v_out_time text := null;
  v_in_min int;
  v_out_min int;
  v_working int := 0;
  v_status text := 'absent';
  v_flags jsonb := '{}'::jsonb;
  v_row record;
  v_is_late boolean := false;
  v_is_early boolean := false;
  v_id uuid;
begin
  if p_employee_id is null or p_attendance_date is null then
    return null;
  end if;

  select e.intime, e.outtime
    into v_intime, v_outtime
  from public.employees e
  where e.id = p_employee_id
  limit 1;

  if not found then
    return null;
  end if;

  v_start_m := public._att_parse_clock_minutes(v_intime, 9 * 60 + 30);
  v_end_m := public._att_parse_clock_minutes(v_outtime, 18 * 60);

  for v_row in
    select
      l.punch_type,
      to_char(timezone('Asia/Kolkata', l."timestamp"), 'HH24:MI') as clock_local
    from public.attendance_logs l
    where l.employee_id = p_employee_id
      and (timezone('Asia/Kolkata', l."timestamp"))::date = p_attendance_date
  loop
    if lower(trim(coalesce(v_row.punch_type, 'in'))) = 'in' then
      if v_in_time is null or v_row.clock_local < v_in_time then
        v_in_time := v_row.clock_local;
      end if;
    else
      if v_out_time is null or v_row.clock_local > v_out_time then
        v_out_time := v_row.clock_local;
      end if;
    end if;
  end loop;

  if v_in_time is null then
    v_status := 'absent';
    v_flags := jsonb_build_object('no_in', true);
  else
    v_in_min := public._att_parse_clock_minutes(v_in_time, 0);
    v_out_min := case when v_out_time is null then null else public._att_parse_clock_minutes(v_out_time, 0) end;

    if v_out_min is not null then
      v_working := greatest(0, v_out_min - v_in_min);
    end if;

    if v_out_min is not null and v_working < 240 then
      v_status := 'absent';
      v_flags := jsonb_build_object('insufficient_hours', true);
    elsif v_in_min > v_start_m + 60 then
      v_status := 'half_day';
      v_flags := jsonb_build_object('half_day_late_in', true);
    elsif v_out_min is not null and v_out_min < v_end_m - 60 then
      v_status := 'half_day';
      v_flags := jsonb_build_object('half_day_early_out', true);
    else
      v_is_late := v_in_min > v_start_m + v_entry_buffer and v_in_min <= v_start_m + 60;
      v_is_early := v_out_min is not null and v_out_min >= v_end_m - 60 and v_out_min < v_end_m - v_exit_buffer;

      if v_is_late then
        v_flags := v_flags || jsonb_build_object('late', true);
      end if;
      if v_is_early then
        v_flags := v_flags || jsonb_build_object('early_exit', true);
      end if;

      if v_is_late and v_is_early then
        v_status := 'late';
      elsif v_is_late then
        v_status := 'late';
      elsif v_is_early then
        v_status := 'early_exit';
      elsif v_in_min <= v_start_m + v_entry_buffer
        and (v_out_min is null or v_out_min >= v_end_m - v_exit_buffer)
        and (v_out_min is null or v_working >= 240) then
        v_status := 'present';
      else
        v_status := 'absent';
        v_flags := v_flags || jsonb_build_object('unclassified', true);
      end if;
    end if;
  end if;

  insert into public.daily_attendance (
    employee_id,
    attendance_date,
    first_in_time,
    last_out_time,
    working_minutes,
    primary_status,
    flags,
    is_present,
    is_late,
    is_early_exit,
    is_half_day,
    is_absent,
    shift_start_time,
    shift_end_time,
    entry_buffer_minutes,
    exit_buffer_minutes,
    calculated_at
  ) values (
    p_employee_id,
    p_attendance_date,
    v_in_time,
    v_out_time,
    v_working,
    v_status,
    coalesce(v_flags, '{}'::jsonb),
    v_status = 'present',
    v_status = 'late',
    v_status = 'early_exit',
    v_status = 'half_day',
    v_status = 'absent',
    coalesce(v_intime, ''),
    coalesce(v_outtime, ''),
    v_entry_buffer,
    v_exit_buffer,
    timezone('utc', now())
  )
  on conflict (employee_id, attendance_date) do update set
    first_in_time = excluded.first_in_time,
    last_out_time = excluded.last_out_time,
    working_minutes = excluded.working_minutes,
    primary_status = excluded.primary_status,
    flags = excluded.flags,
    is_present = excluded.is_present,
    is_late = excluded.is_late,
    is_early_exit = excluded.is_early_exit,
    is_half_day = excluded.is_half_day,
    is_absent = excluded.is_absent,
    shift_start_time = excluded.shift_start_time,
    shift_end_time = excluded.shift_end_time,
    entry_buffer_minutes = excluded.entry_buffer_minutes,
    exit_buffer_minutes = excluded.exit_buffer_minutes,
    calculated_at = excluded.calculated_at,
    updated_at = timezone('utc', now())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.refresh_daily_attendance(uuid, date) from public;
grant execute on function public.refresh_daily_attendance(uuid, date) to service_role;

create or replace function public.reconcile_daily_attendance(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_from date := (timezone('Asia/Kolkata', now()))::date - (v_days - 1);
  v_pair record;
  v_count integer := 0;
begin
  for v_pair in
    select distinct l.employee_id, (timezone('Asia/Kolkata', l."timestamp"))::date as work_date
    from public.attendance_logs l
    where (timezone('Asia/Kolkata', l."timestamp"))::date >= v_from
  loop
    perform public.refresh_daily_attendance(v_pair.employee_id, v_pair.work_date);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'days_window', v_days,
    'from_date', v_from,
    'refreshed_pairs', v_count
  );
end;
$$;

revoke all on function public.reconcile_daily_attendance(integer) from public;
grant execute on function public.reconcile_daily_attendance(integer) to service_role;

-- Employee self-read: month of canonical daily rows
create or replace function public.employee_list_my_daily_attendance(
  p_year integer,
  p_month integer
)
returns setof public.daily_attendance
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_emp uuid;
  v_start date;
  v_end date;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  v_emp := public.employee_id_for_auth_user();
  if v_emp is null then
    raise exception 'EMPLOYEE_PROFILE_MISSING';
  end if;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;

  return query
  select d.*
  from public.daily_attendance d
  where d.employee_id = v_emp
    and d.attendance_date >= v_start
    and d.attendance_date < v_end
  order by d.attendance_date asc;
end;
$$;

revoke all on function public.employee_list_my_daily_attendance(integer, integer) from public;
grant execute on function public.employee_list_my_daily_attendance(integer, integer) to authenticated;

-- HR read month for one employee
create or replace function public.hr_list_employee_daily_attendance(
  p_employee_id uuid,
  p_year integer,
  p_month integer
)
returns setof public.daily_attendance
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  if not public.is_hr_user(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if p_employee_id is null then
    raise exception 'INVALID_REQUEST';
  end if;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;

  return query
  select d.*
  from public.daily_attendance d
  where d.employee_id = p_employee_id
    and d.attendance_date >= v_start
    and d.attendance_date < v_end
  order by d.attendance_date asc;
end;
$$;

revoke all on function public.hr_list_employee_daily_attendance(uuid, integer, integer) from public;
grant execute on function public.hr_list_employee_daily_attendance(uuid, integer, integer) to authenticated;

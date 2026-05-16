-- Seed realistic Z71 attendance (Asia/Kolkata). Safe to re-run after rollback.
-- Employee: Z71 / f2be5952-f6a8-4f06-935a-3f46b9128ade | Shift 10:00–18:00

begin;

do $$
declare
  v_employee_id uuid := 'f2be5952-f6a8-4f06-935a-3f46b9128ade';
  v_shop_id uuid := '04e4d19d-037e-4e3d-9ed3-9a3d9befd912';
  v_lat double precision := 28.1065;
  v_lng double precision := 76.25675;
  v_device text := 'seed-device-z71';
  -- (work_date, in_time, out_time) — null/null = absent; null out skipped
  v_days constant text[][] := array[
    array['2026-04-17', '09:58', '18:02'],  -- Present
    array['2026-04-20', '10:22', '18:05'],  -- Late
    array['2026-04-21', '09:55', '18:00'],  -- Present
    array['2026-04-22', '10:00', '17:20'],  -- Early exit
    array['2026-04-23', '10:05', '18:10'],  -- Present
    array['2026-04-27', '11:20', '18:00'],  -- Half day (late in)
    array['2026-04-28', '10:00', '18:00'],  -- Present
    array['2026-04-29', '10:35', '18:00'],  -- Late
    array['2026-04-30', '09:50', '17:55'],  -- Present
    array['2026-05-01', '10:00', '17:05'],  -- Early exit
    array['2026-05-04', '10:02', '18:00'],  -- Present
    array['2026-05-06', '10:00', '16:30'],  -- Half day (early out)
    array['2026-05-07', '10:18', '18:05'],  -- Late
    array['2026-05-08', '10:00', '18:00'],  -- Present
    array['2026-05-11', '09:58', '18:00'],  -- Present
    array['2026-05-12', '10:45', '18:00'],  -- Late
    array['2026-05-13', '10:00', '17:35'],  -- Early exit
    array['2026-05-14', '10:00', '18:00'],  -- Present
    array['2026-05-15', '11:15', '18:00'],  -- Half day (late in)
    array['2026-05-16', '10:05', '17:50']   -- Present (Saturday optional work)
    -- Absent (no rows): 2026-04-18,19,24,25,26,05-02,03,05,09,10
    -- Weekends skipped: Apr 18-19, 25-26; May 2-3, 9-10
  ];
  v_day text[];
  v_work_date date;
  v_in text;
  v_out text;
  v_in_ts timestamptz;
  v_out_ts timestamptz;
  v_idem_in text;
  v_idem_out text;
begin
  if not exists (select 1 from public.employees e where e.id = v_employee_id) then
    raise exception 'Employee % not found', v_employee_id;
  end if;

  foreach v_day slice 1 in array v_days loop
    v_work_date := v_day[1]::date;
    v_in := v_day[2];
    v_out := v_day[3];
    v_idem_in := 'seed-z71-' || to_char(v_work_date, 'YYYY-MM-DD') || '-in';
    v_idem_out := 'seed-z71-' || to_char(v_work_date, 'YYYY-MM-DD') || '-out';

    v_in_ts := (v_work_date::text || ' ' || v_in || ':00')::timestamp at time zone 'Asia/Kolkata';
    v_out_ts := (v_work_date::text || ' ' || v_out || ':00')::timestamp at time zone 'Asia/Kolkata';

    if not exists (
      select 1 from public.attendance_logs l where l.idempotency_key = v_idem_in
    ) then
      insert into public.attendance_logs (
        employee_id,
        shop_id,
        device_id,
        punch_type,
        face_verified,
        face_session_token,
        latitude,
        longitude,
        lat,
        lng,
        location_verified,
        status,
        mark_source,
        idempotency_key,
        "timestamp",
        created_at,
        updated_at
      ) values (
        v_employee_id,
        v_shop_id,
        v_device,
        'in',
        true,
        v_idem_in,
        v_lat,
        v_lng,
        v_lat,
        v_lng,
        true,
        'present',
        'seed',
        v_idem_in,
        v_in_ts,
        v_in_ts,
        v_in_ts
      );
    end if;

    if not exists (
      select 1 from public.attendance_logs l where l.idempotency_key = v_idem_out
    ) then
      insert into public.attendance_logs (
        employee_id,
        shop_id,
        device_id,
        punch_type,
        face_verified,
        face_session_token,
        latitude,
        longitude,
        lat,
        lng,
        location_verified,
        status,
        mark_source,
        idempotency_key,
        "timestamp",
        created_at,
        updated_at
      ) values (
        v_employee_id,
        v_shop_id,
        v_device,
        'out',
        true,
        v_idem_out,
        v_lat,
        v_lng,
        v_lat,
        v_lng,
        true,
        'present',
        'seed',
        v_idem_out,
        v_out_ts,
        v_out_ts,
        v_out_ts
      );
    end if;
  end loop;
end $$;

-- Repair rollup for full 30-day window (trigger also ran per insert)
select public.reconcile_daily_attendance(30) as reconcile_result;

commit;

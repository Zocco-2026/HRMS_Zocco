-- Phase 1: Canonical daily attendance (additive; attendance_logs remains punch ledger).

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  attendance_date date not null,
  first_in_time text null,
  last_out_time text null,
  working_minutes integer not null default 0,
  primary_status text not null default 'absent',
  flags jsonb not null default '{}'::jsonb,
  is_present boolean not null default false,
  is_late boolean not null default false,
  is_early_exit boolean not null default false,
  is_half_day boolean not null default false,
  is_absent boolean not null default true,
  shift_start_time text not null default '',
  shift_end_time text not null default '',
  entry_buffer_minutes integer not null default 15,
  exit_buffer_minutes integer not null default 15,
  calculated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_attendance_employee_date_unique unique (employee_id, attendance_date),
  constraint daily_attendance_primary_status_chk check (
    lower(trim(primary_status)) in (
      'present',
      'late',
      'early_exit',
      'half_day',
      'absent'
    )
  ),
  constraint daily_attendance_working_minutes_chk check (working_minutes >= 0)
);

create index if not exists daily_attendance_employee_date_idx
  on public.daily_attendance (employee_id, attendance_date desc);

create index if not exists daily_attendance_date_idx
  on public.daily_attendance (attendance_date desc);

create index if not exists daily_attendance_primary_status_idx
  on public.daily_attendance (primary_status);

drop trigger if exists daily_attendance_set_updated_at on public.daily_attendance;
create trigger daily_attendance_set_updated_at
before update on public.daily_attendance
for each row
execute function public.set_employees_updated_at();

alter table public.daily_attendance enable row level security;

grant select on table public.daily_attendance to authenticated;
grant all on table public.daily_attendance to service_role;

drop policy if exists "daily_attendance_select_employee_self" on public.daily_attendance;
create policy "daily_attendance_select_employee_self"
  on public.daily_attendance
  for select
  to authenticated
  using (employee_id = public.employee_id_for_auth_user());

drop policy if exists "daily_attendance_select_hr" on public.daily_attendance;
create policy "daily_attendance_select_hr"
  on public.daily_attendance
  for select
  to authenticated
  using (public.is_hr_user(auth.uid()));

-- Realtime (optional; matches attendance_logs pattern)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'daily_attendance'
    ) then
      alter publication supabase_realtime add table public.daily_attendance;
    end if;
  end if;
end $$;

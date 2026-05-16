-- Allow QA seed scripts to tag attendance rows (rollback filters on mark_source = 'seed').

alter table public.attendance_logs drop constraint if exists attendance_logs_mark_source_chk;

alter table public.attendance_logs
  add constraint attendance_logs_mark_source_chk check (
    mark_source is null
    or mark_source in ('edge', 'client_direct', 'seed')
  );

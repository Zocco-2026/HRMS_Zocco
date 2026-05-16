-- Resolve employee_id for authenticated mobile users when HR auth mapping is missing.
-- Login email is {card_no}@agfashions.local (see hr-provision-employee-auth).

create or replace function public.employee_id_for_auth_user()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select eap.employee_id
      from public.employee_auth_profiles eap
      where eap.auth_user_id = auth.uid()
        and eap.status = 'active'
      limit 1
    ),
    (
      select e.id
      from public.employees e
      where e.status = 'Active'
        and trim(lower(e.card_no)) = trim(
          lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
        )
        and lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 2)) = 'agfashions.local'
      limit 1
    )
  );
$$;

revoke all on function public.employee_id_for_auth_user() from public;
grant execute on function public.employee_id_for_auth_user() to authenticated;

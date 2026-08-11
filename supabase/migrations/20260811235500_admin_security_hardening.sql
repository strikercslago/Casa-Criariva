create or replace function public.is_active_user(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and is_active
  );
$$;

create or replace function public.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = check_role
  )
  and public.is_active_user(check_user_id);
$$;

create or replace function public.current_user_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.has_role((select auth.uid()), 'owner'::public.app_role);
$$;

create or replace function public.current_user_has_any_role(check_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = any(check_roles)
  )
  and public.is_active_user((select auth.uid()));
$$;

create or replace function public.current_user_can_manage_operations()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_has_any_role(array['owner', 'admin']::public.app_role[]);
$$;

create or replace function public.current_user_can_teach()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_has_any_role(array['owner', 'admin', 'teacher']::public.app_role[]);
$$;

create or replace function public.current_user_can_manage_billing()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_has_any_role(array['owner', 'admin']::public.app_role[]);
$$;

create or replace function public.current_user_can_view_dashboard()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_has_any_role(array['owner', 'admin']::public.app_role[]);
$$;

alter function public.is_active_user(uuid) owner to postgres;
alter function public.has_role(uuid, public.app_role) owner to postgres;
alter function public.current_user_is_owner() owner to postgres;
alter function public.current_user_has_any_role(public.app_role[]) owner to postgres;
alter function public.current_user_can_manage_operations() owner to postgres;
alter function public.current_user_can_teach() owner to postgres;
alter function public.current_user_can_manage_billing() owner to postgres;
alter function public.current_user_can_view_dashboard() owner to postgres;

grant execute on function public.is_active_user(uuid) to authenticated;
grant execute on function public.current_user_has_any_role(public.app_role[]) to authenticated;
grant execute on function public.current_user_can_manage_operations() to authenticated;
grant execute on function public.current_user_can_teach() to authenticated;
grant execute on function public.current_user_can_manage_billing() to authenticated;
grant execute on function public.current_user_can_view_dashboard() to authenticated;

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete restrict;

alter table public.user_roles drop constraint if exists user_roles_user_id_fkey;
alter table public.user_roles
  add constraint user_roles_user_id_fkey foreign key (user_id) references auth.users(id) on delete restrict;

create or replace function public.active_owner_count()
returns integer
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select count(*)::integer
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role = 'owner'::public.app_role
    and p.is_active;
$$;

create or replace function public.prevent_last_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    if old.is_active and not new.is_active and public.has_role(old.id, 'owner'::public.app_role) then
      if public.active_owner_count() <= 1 then
        raise exception 'Cannot deactivate the last active owner.';
      end if;
    end if;

    return new;
  end if;

  if tg_table_name = 'user_roles' and tg_op = 'DELETE' then
    if old.role = 'owner'::public.app_role and public.is_active_user(old.user_id) then
      if public.active_owner_count() <= 1 then
        raise exception 'Cannot remove the last active owner.';
      end if;
    end if;

    return old;
  end if;

  if tg_table_name = 'user_roles' and tg_op = 'UPDATE' then
    if old.role = 'owner'::public.app_role
      and new.role <> 'owner'::public.app_role
      and public.is_active_user(old.user_id)
    then
      if public.active_owner_count() <= 1 then
        raise exception 'Cannot demote the last active owner.';
      end if;
    end if;

    return new;
  end if;

  return coalesce(new, old);
end;
$$;

alter function public.active_owner_count() owner to postgres;
alter function public.prevent_last_owner_loss() owner to postgres;

drop trigger if exists profiles_prevent_last_owner_deactivation on public.profiles;
create trigger profiles_prevent_last_owner_deactivation
before update of is_active on public.profiles
for each row execute function public.prevent_last_owner_loss();

drop trigger if exists user_roles_prevent_last_owner_loss on public.user_roles;
create trigger user_roles_prevent_last_owner_loss
before update or delete on public.user_roles
for each row execute function public.prevent_last_owner_loss();

create or replace function public.set_user_role_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by = coalesce(new.created_by, (select auth.uid()));
  return new;
end;
$$;

drop trigger if exists user_roles_set_created_by on public.user_roles;
create trigger user_roles_set_created_by
before insert on public.user_roles
for each row execute function public.set_user_role_created_by();

create table if not exists public.app_settings (
  singleton boolean primary key default true,
  organization_name text not null default 'Casa Criativa',
  display_name text not null default 'Casa Criativa Gestao',
  phone text,
  email text,
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR',
  currency_code text not null default 'BRL',
  default_class_duration_minutes integer not null default 60,
  default_due_day smallint not null default 10,
  default_page_size integer not null default 20,
  low_stock_threshold numeric(12, 3) not null default 5,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (singleton),
  constraint app_settings_timezone_check check (timezone = 'America/Sao_Paulo'),
  constraint app_settings_locale_check check (locale = 'pt-BR'),
  constraint app_settings_currency_check check (currency_code = 'BRL'),
  constraint app_settings_duration_check check (default_class_duration_minutes between 15 and 240),
  constraint app_settings_due_day_check check (default_due_day between 1 and 28),
  constraint app_settings_page_size_check check (default_page_size between 5 and 100),
  constraint app_settings_low_stock_threshold_check check (low_stock_threshold >= 0)
);

insert into public.app_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant select, update on table public.app_settings to authenticated;

drop policy if exists "app_settings_select_active_users" on public.app_settings;
create policy "app_settings_select_active_users"
on public.app_settings
for select to authenticated
using (public.current_user_has_any_role(array['owner', 'admin', 'teacher']::public.app_role[]));

drop policy if exists "app_settings_update_owner" on public.app_settings;
create policy "app_settings_update_owner"
on public.app_settings
for update to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create or replace function public.get_application_settings()
returns public.app_settings
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.app_settings
  where singleton
    and public.current_user_has_any_role(array['owner', 'admin', 'teacher']::public.app_role[]);
$$;

create or replace function public.update_application_settings(payload jsonb)
returns public.app_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := (select auth.uid());
  updated_row public.app_settings;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owner can update application settings.';
  end if;

  update public.app_settings
  set
    organization_name = coalesce(nullif(btrim(payload ->> 'organization_name'), ''), organization_name),
    display_name = coalesce(nullif(btrim(payload ->> 'display_name'), ''), display_name),
    phone = nullif(btrim(payload ->> 'phone'), ''),
    email = nullif(btrim(payload ->> 'email'), ''),
    default_class_duration_minutes = coalesce((payload ->> 'default_class_duration_minutes')::integer, default_class_duration_minutes),
    default_due_day = coalesce((payload ->> 'default_due_day')::smallint, default_due_day),
    default_page_size = coalesce((payload ->> 'default_page_size')::integer, default_page_size),
    low_stock_threshold = coalesce((payload ->> 'low_stock_threshold')::numeric, low_stock_threshold),
    updated_by = actor_id
  where singleton
  returning * into updated_row;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'app_settings',
    actor_id,
    'settings.updated',
    jsonb_build_object('summary', 'Configuracoes gerais atualizadas')
  );

  return updated_row;
end;
$$;

create or replace function public.list_admin_audit_events(
  p_start_date date default null,
  p_end_date date default null,
  p_actor_user_id uuid default null,
  p_action text default null,
  p_entity_type text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  id uuid,
  created_at timestamptz,
  actor_user_id uuid,
  actor_name text,
  entity_type text,
  entity_id uuid,
  action text,
  summary text,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select
      ae.id,
      ae.created_at,
      ae.actor_user_id,
      coalesce(nullif(p.full_name, ''), 'Usuario removido') as actor_name,
      ae.entity_type,
      ae.entity_id,
      ae.action,
      coalesce(ae.metadata ->> 'summary', ae.action || ' em ' || ae.entity_type) as summary
    from public.audit_events ae
    left join public.profiles p on p.id = ae.actor_user_id
    where public.current_user_is_owner()
      and (p_start_date is null or ae.created_at >= p_start_date::timestamptz)
      and (p_end_date is null or ae.created_at < (p_end_date + 1)::timestamptz)
      and (p_actor_user_id is null or ae.actor_user_id = p_actor_user_id)
      and (p_action is null or ae.action ilike '%' || p_action || '%')
      and (p_entity_type is null or ae.entity_type = p_entity_type)
  )
  select
    filtered.*,
    count(*) over() as total_count
  from filtered
  order by created_at desc
  limit greatest(1, least(coalesce(p_page_size, 20), 100))
  offset greatest(0, coalesce(p_page, 1) - 1) * greatest(1, least(coalesce(p_page_size, 20), 100));
$$;

alter function public.get_application_settings() owner to postgres;
alter function public.update_application_settings(jsonb) owner to postgres;
alter function public.list_admin_audit_events(date, date, uuid, text, text, integer, integer) owner to postgres;

grant execute on function public.get_application_settings() to authenticated;
grant execute on function public.update_application_settings(jsonb) to authenticated;
grant execute on function public.list_admin_audit_events(date, date, uuid, text, text, integer, integer) to authenticated;

drop policy if exists "students_select_active_staff" on public.students;
create policy "students_select_active_staff"
on public.students
for select to authenticated
using (public.current_user_can_teach());

drop policy if exists "students_write_operations" on public.students;
create policy "students_write_operations"
on public.students
for insert to authenticated
with check (public.current_user_can_manage_operations());

drop policy if exists "students_update_operations" on public.students;
create policy "students_update_operations"
on public.students
for update to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "guardians_operations_all" on public.guardians;
create policy "guardians_operations_all"
on public.guardians
for all to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "student_guardians_operations_all" on public.student_guardians;
create policy "student_guardians_operations_all"
on public.student_guardians
for all to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "classes_staff_select" on public.classes;
create policy "classes_staff_select"
on public.classes
for select to authenticated
using (public.current_user_can_teach());

drop policy if exists "classes_operations_write" on public.classes;
create policy "classes_operations_write"
on public.classes
for insert to authenticated
with check (public.current_user_can_manage_operations());

drop policy if exists "classes_operations_update" on public.classes;
create policy "classes_operations_update"
on public.classes
for update to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "class_schedules_staff_select" on public.class_schedules;
create policy "class_schedules_staff_select"
on public.class_schedules
for select to authenticated
using (public.current_user_can_teach());

drop policy if exists "class_schedules_operations_all" on public.class_schedules;
create policy "class_schedules_operations_all"
on public.class_schedules
for all to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "enrollments_staff_select" on public.enrollments;
create policy "enrollments_staff_select"
on public.enrollments
for select to authenticated
using (public.current_user_can_teach());

drop policy if exists "enrollments_operations_all" on public.enrollments;
create policy "enrollments_operations_all"
on public.enrollments
for all to authenticated
using (public.current_user_can_manage_operations())
with check (public.current_user_can_manage_operations());

drop policy if exists "billing_operations_all" on public.monthly_fees;
create policy "billing_operations_all"
on public.monthly_fees
for all to authenticated
using (public.current_user_can_manage_billing())
with check (public.current_user_can_manage_billing());

drop policy if exists "payments_operations_all" on public.payments;
create policy "payments_operations_all"
on public.payments
for all to authenticated
using (public.current_user_can_manage_billing())
with check (public.current_user_can_manage_billing());

drop policy if exists "payment_allocations_operations_all" on public.payment_allocations;
create policy "payment_allocations_operations_all"
on public.payment_allocations
for all to authenticated
using (public.current_user_can_manage_billing())
with check (public.current_user_can_manage_billing());

do $$
declare
  target regprocedure;
  targets regprocedure[];
  definition text;
begin
  targets := array[
    'public.get_dashboard_today(date)'::regprocedure,
    'public.get_dashboard_attention(date)'::regprocedure,
    'public.get_dashboard_operations(date)'::regprocedure
  ];

  foreach target in array targets loop
    definition := pg_get_functiondef(target);
    execute replace(definition, 'public.current_user_is_owner()', 'public.current_user_can_view_dashboard()');
  end loop;

  targets := array[
    'public.create_guardian_with_optional_student(jsonb)'::regprocedure,
    'public.update_guardian_contact(jsonb)'::regprocedure,
    'public.upsert_guardian_student_link(jsonb)'::regprocedure,
    'public.unlink_guardian_student(jsonb)'::regprocedure,
    'public.complete_student_enrollment(jsonb)'::regprocedure,
    'public.create_class_with_schedules(jsonb)'::regprocedure,
    'public.update_class_with_schedules(jsonb)'::regprocedure,
    'public.add_student_to_class(jsonb)'::regprocedure,
    'public.end_class_enrollment(jsonb)'::regprocedure,
    'public.transfer_student_class(jsonb)'::regprocedure,
    'public.update_class_status(jsonb)'::regprocedure,
    'public.update_class_session_status(jsonb)'::regprocedure,
    'public.create_extra_class_session(jsonb)'::regprocedure,
    'public.list_guardians(text,text,integer,integer)'::regprocedure,
    'public.list_events(text,text,text,integer,integer)'::regprocedure,
    'public.get_event_finance_summary(uuid)'::regprocedure,
    'public.list_event_registrations(uuid,text,text,text,integer,integer)'::regprocedure,
    'public.create_event(jsonb)'::regprocedure,
    'public.update_event_status(jsonb)'::regprocedure,
    'public.create_event_registration(jsonb)'::regprocedure,
    'public.confirm_event_registration(jsonb)'::regprocedure,
    'public.cancel_event_registration(jsonb)'::regprocedure,
    'public.settle_event_registration(jsonb)'::regprocedure,
    'public.list_materials(text,text,text,uuid,integer,integer)'::regprocedure,
    'public.get_inventory_summary()'::regprocedure,
    'public.list_inventory_movements(uuid,integer,integer)'::regprocedure,
    'public.record_inventory_movement(jsonb)'::regprocedure,
    'public.create_material(jsonb)'::regprocedure,
    'public.update_material(jsonb)'::regprocedure,
    'public.archive_material(jsonb)'::regprocedure,
    'public.create_material_category(jsonb)'::regprocedure,
    'public.list_suppliers(text,text,integer,integer)'::regprocedure,
    'public.upsert_supplier(jsonb)'::regprocedure,
    'public.create_purchase(jsonb)'::regprocedure,
    'public.receive_purchase(jsonb)'::regprocedure,
    'public.cancel_purchase(jsonb)'::regprocedure,
    'public.list_purchases(text,text,integer,integer)'::regprocedure,
    'public.get_purchase_detail(uuid)'::regprocedure
  ];

  foreach target in array targets loop
    definition := pg_get_functiondef(target);
    execute replace(definition, 'public.current_user_is_owner()', 'public.current_user_can_manage_operations()');
  end loop;

  targets := array[
    'public.list_classes(text,text,text,integer,integer)'::regprocedure,
    'public.ensure_class_sessions(date,date)'::regprocedure,
    'public.list_agenda_sessions(date,date)'::regprocedure,
    'public.get_session_attendance(uuid)'::regprocedure,
    'public.save_session_attendance(jsonb)'::regprocedure
  ];

  foreach target in array targets loop
    definition := pg_get_functiondef(target);
    execute replace(definition, 'public.current_user_is_owner()', 'public.current_user_can_teach()');
  end loop;

  targets := array[
    'public.ensure_monthly_fees(date)'::regprocedure,
    'public.list_monthly_fees(date,text,text,integer,integer)'::regprocedure,
    'public.get_billing_month_summary(date)'::regprocedure,
    'public.get_monthly_fee_detail(uuid)'::regprocedure,
    'public.register_payment(jsonb)'::regprocedure,
    'public.reverse_payment(jsonb)'::regprocedure,
    'public.cancel_monthly_fee(jsonb)'::regprocedure,
    'public.update_monthly_fee_amount(jsonb)'::regprocedure,
    'public.get_student_billing_snapshot(uuid,date,integer,integer)'::regprocedure
  ];

  foreach target in array targets loop
    definition := pg_get_functiondef(target);
    execute replace(definition, 'public.current_user_is_owner()', 'public.current_user_can_manage_billing()');
  end loop;
end $$;

comment on function public.current_user_can_manage_operations() is
  'Owner/admin operational authorization for students, guardians, classes, agenda, events and materials.';
comment on function public.current_user_can_teach() is
  'Owner/admin/teacher authorization for class visibility and attendance workflows.';
comment on function public.current_user_can_manage_billing() is
  'Owner/admin authorization for mensalidades and payment operations. General finance remains owner-only.';
comment on function public.current_user_can_view_dashboard() is
  'Owner/admin authorization for management dashboard data. Teacher dashboard requires a limited future projection.';

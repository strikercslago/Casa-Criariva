create type public.class_status as enum ('active', 'inactive', 'archived');
create type public.enrollment_status as enum ('active', 'paused', 'ended');
create type public.billing_plan_status as enum ('active', 'paused', 'ended');

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guardians_full_name_clean check (
    full_name = btrim(full_name)
    and char_length(full_name) between 2 and 160
  ),
  constraint guardians_phone_length check (
    phone is null
    or char_length(phone) between 8 and 32
  ),
  constraint guardians_email_length check (
    email is null
    or char_length(email) <= 254
  ),
  constraint guardians_notes_length check (
    notes is null
    or char_length(notes) <= 2000
  )
);

create table public.student_guardians (
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  relationship text not null,
  is_primary_contact boolean not null default false,
  is_financial_responsible boolean not null default false,
  can_pick_up boolean not null default false,
  is_emergency_contact boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (student_id, guardian_id),
  constraint student_guardians_relationship_clean check (
    relationship = btrim(relationship)
    and char_length(relationship) between 2 and 60
  )
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  capacity integer,
  status public.class_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_name_clean check (
    name = btrim(name)
    and char_length(name) between 2 and 120
  ),
  constraint classes_capacity_positive check (
    capacity is null
    or capacity > 0
  ),
  constraint classes_description_length check (
    description is null
    or char_length(description) <= 1000
  )
);

create table public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint class_schedules_weekday_range check (weekday between 1 and 7),
  constraint class_schedules_time_order check (end_time > start_time),
  unique (class_id, weekday, start_time, end_time)
);

comment on column public.class_schedules.weekday is
  'ISO weekday: 1=Monday through 7=Sunday.';

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  start_date date not null,
  end_date date,
  status public.enrollment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_date_order check (
    end_date is null
    or end_date >= start_date
  )
);

create table public.student_billing_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  financial_guardian_id uuid references public.guardians(id) on delete set null,
  base_amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  discount_reason text,
  due_day smallint not null,
  billing_start_date date not null,
  auto_generate_fees boolean not null default true,
  status public.billing_plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_billing_plans_amounts_nonnegative check (
    base_amount >= 0
    and discount_amount >= 0
  ),
  constraint student_billing_plans_discount_limit check (discount_amount <= base_amount),
  constraint student_billing_plans_due_day_range check (due_day between 1 and 31),
  constraint student_billing_plans_discount_reason_length check (
    discount_reason is null
    or char_length(discount_reason) <= 240
  )
);

comment on column public.student_billing_plans.base_amount is
  'Full monthly amount before discounts. The application calculates net amount as base_amount - discount_amount.';
comment on column public.student_billing_plans.due_day is
  'Due day from 1 to 31. Future billing generation should use the last valid month day when the configured day does not exist.';

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_entity_type_clean check (
    entity_type = btrim(entity_type)
    and char_length(entity_type) between 2 and 80
  ),
  constraint audit_events_action_clean check (
    action = btrim(action)
    and char_length(action) between 2 and 120
  ),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create trigger guardians_set_updated_at
before update on public.guardians
for each row execute function public.set_updated_at();

create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

create trigger student_billing_plans_set_updated_at
before update on public.student_billing_plans
for each row execute function public.set_updated_at();

create index guardians_phone_idx on public.guardians (phone) where phone is not null;
create index guardians_email_lower_idx on public.guardians (lower(email)) where email is not null;
create index student_guardians_student_id_idx on public.student_guardians (student_id);
create index student_guardians_guardian_id_idx on public.student_guardians (guardian_id);
create index classes_status_name_idx on public.classes (status, name, id);
create index class_schedules_class_id_idx on public.class_schedules (class_id, weekday, start_time);
create index enrollments_student_status_idx on public.enrollments (student_id, status);
create index enrollments_class_status_idx on public.enrollments (class_id, status);
create unique index enrollments_active_student_class_uidx
on public.enrollments (student_id, class_id)
where status = 'active';
create index student_billing_plans_student_status_idx
on public.student_billing_plans (student_id, status);
create unique index student_billing_plans_active_student_uidx
on public.student_billing_plans (student_id)
where status = 'active';
create index audit_events_entity_created_at_idx
on public.audit_events (entity_type, entity_id, created_at desc);
create index audit_events_created_at_idx
on public.audit_events (created_at desc);

comment on index public.guardians_phone_idx is
  'Supports existing guardian lookup by phone during enrollment onboarding.';
comment on index public.guardians_email_lower_idx is
  'Supports case-insensitive existing guardian lookup by email during enrollment onboarding.';
comment on index public.student_guardians_student_id_idx is
  'Loads all guardians linked to a student profile.';
comment on index public.student_guardians_guardian_id_idx is
  'Finds all students linked to a guardian without duplicating guardian records.';
comment on index public.classes_status_name_idx is
  'Lists active classes for quick enrollment selection.';
comment on index public.class_schedules_class_id_idx is
  'Loads class schedules for selected class or student profile.';
comment on index public.enrollments_student_status_idx is
  'Loads current and historical enrollments for a student.';
comment on index public.enrollments_class_status_idx is
  'Supports future class roster queries.';
comment on index public.enrollments_active_student_class_uidx is
  'Prevents duplicate active enrollment for the same student and class.';
comment on index public.student_billing_plans_student_status_idx is
  'Loads current billing plan for a student.';
comment on index public.student_billing_plans_active_student_uidx is
  'Prevents multiple active billing plans for a student.';
comment on index public.audit_events_entity_created_at_idx is
  'Loads student timeline events ordered newest first.';
comment on index public.audit_events_created_at_idx is
  'Supports administrative recent audit review.';

alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.classes enable row level security;
alter table public.class_schedules enable row level security;
alter table public.enrollments enable row level security;
alter table public.student_billing_plans enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.guardians from anon, authenticated;
revoke all on table public.student_guardians from anon, authenticated;
revoke all on table public.classes from anon, authenticated;
revoke all on table public.class_schedules from anon, authenticated;
revoke all on table public.enrollments from anon, authenticated;
revoke all on table public.student_billing_plans from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;

grant select, insert, update, delete on table public.guardians to authenticated;
grant select, insert, update, delete on table public.student_guardians to authenticated;
grant select, insert, update, delete on table public.classes to authenticated;
grant select, insert, update, delete on table public.class_schedules to authenticated;
grant select, insert, update, delete on table public.enrollments to authenticated;
grant select, insert, update, delete on table public.student_billing_plans to authenticated;
grant select on table public.audit_events to authenticated;

create policy "guardians_owner_all"
on public.guardians
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "student_guardians_owner_all"
on public.student_guardians
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "classes_owner_all"
on public.classes
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "class_schedules_owner_all"
on public.class_schedules
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "enrollments_owner_all"
on public.enrollments
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "student_billing_plans_owner_all"
on public.student_billing_plans
for all to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "audit_events_select_owner"
on public.audit_events
for select to authenticated
using (public.current_user_is_owner());

create or replace function public.complete_student_enrollment(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  student_payload jsonb := coalesce(payload -> 'student', '{}'::jsonb);
  guardians_payload jsonb := coalesce(payload -> 'guardians', '[]'::jsonb);
  class_payload jsonb := payload -> 'class';
  billing_payload jsonb := payload -> 'billing_plan';
  created_student_id uuid;
  guardian_item jsonb;
  guardian_payload jsonb;
  current_guardian_id uuid;
  financial_guardian_id uuid;
  selected_class_id uuid;
  class_schedules_payload jsonb;
  schedule_item jsonb;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;

  if jsonb_typeof(guardians_payload) <> 'array' then
    raise exception 'guardians must be an array' using errcode = '22023';
  end if;

  insert into public.students (
    full_name,
    preferred_name,
    birth_date,
    enrollment_date,
    notes,
    created_by
  )
  values (
    btrim(student_payload ->> 'full_name'),
    nullif(btrim(coalesce(student_payload ->> 'preferred_name', '')), ''),
    nullif(student_payload ->> 'birth_date', '')::date,
    coalesce(nullif(student_payload ->> 'enrollment_date', '')::date, current_date),
    nullif(btrim(coalesce(student_payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into created_student_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'student', created_student_id, 'student.created', '{}'::jsonb);

  for guardian_item in select value from jsonb_array_elements(guardians_payload)
  loop
    current_guardian_id := nullif(guardian_item ->> 'guardian_id', '')::uuid;
    guardian_payload := coalesce(guardian_item -> 'guardian', '{}'::jsonb);

    if current_guardian_id is null then
      insert into public.guardians (full_name, phone, email, notes)
      values (
        btrim(guardian_payload ->> 'full_name'),
        nullif(btrim(coalesce(guardian_payload ->> 'phone', '')), ''),
        nullif(lower(btrim(coalesce(guardian_payload ->> 'email', ''))), ''),
        nullif(btrim(coalesce(guardian_payload ->> 'notes', '')), '')
      )
      returning id into current_guardian_id;
    end if;

    insert into public.student_guardians (
      student_id,
      guardian_id,
      relationship,
      is_primary_contact,
      is_financial_responsible,
      can_pick_up,
      is_emergency_contact
    )
    values (
      created_student_id,
      current_guardian_id,
      btrim(coalesce(guardian_item ->> 'relationship', 'Responsavel')),
      coalesce((guardian_item ->> 'is_primary_contact')::boolean, false),
      coalesce((guardian_item ->> 'is_financial_responsible')::boolean, false),
      coalesce((guardian_item ->> 'can_pick_up')::boolean, false),
      coalesce((guardian_item ->> 'is_emergency_contact')::boolean, false)
    );

    if financial_guardian_id is null
      and coalesce((guardian_item ->> 'is_financial_responsible')::boolean, false)
    then
      financial_guardian_id := current_guardian_id;
    end if;

    insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
    values (
      actor_id,
      'student',
      created_student_id,
      'guardian.linked',
      jsonb_build_object('guardian_id', current_guardian_id)
    );
  end loop;

  if class_payload is not null and jsonb_typeof(class_payload) = 'object' then
    selected_class_id := nullif(class_payload ->> 'class_id', '')::uuid;

    if selected_class_id is null and class_payload ? 'quick_create' then
      insert into public.classes (name, capacity)
      values (
        btrim(class_payload #>> '{quick_create,name}'),
        nullif(class_payload #>> '{quick_create,capacity}', '')::integer
      )
      returning id into selected_class_id;

      class_schedules_payload := coalesce(class_payload #> '{quick_create,schedules}', '[]'::jsonb);

      if jsonb_typeof(class_schedules_payload) <> 'array' then
        raise exception 'class schedules must be an array' using errcode = '22023';
      end if;

      for schedule_item in select value from jsonb_array_elements(class_schedules_payload)
      loop
        insert into public.class_schedules (class_id, weekday, start_time, end_time)
        values (
          selected_class_id,
          (schedule_item ->> 'weekday')::smallint,
          (schedule_item ->> 'start_time')::time,
          (schedule_item ->> 'end_time')::time
        );
      end loop;
    end if;

    if selected_class_id is not null then
      insert into public.enrollments (student_id, class_id, start_date)
      values (
        created_student_id,
        selected_class_id,
        coalesce(nullif(class_payload ->> 'start_date', '')::date, (select enrollment_date from public.students where id = created_student_id))
      );

      insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
      values (
        actor_id,
        'student',
        created_student_id,
        'enrollment.created',
        jsonb_build_object('class_id', selected_class_id)
      );
    end if;
  end if;

  if billing_payload is not null and jsonb_typeof(billing_payload) = 'object' then
    insert into public.student_billing_plans (
      student_id,
      financial_guardian_id,
      base_amount,
      discount_amount,
      discount_reason,
      due_day,
      billing_start_date,
      auto_generate_fees
    )
    values (
      created_student_id,
      coalesce(nullif(billing_payload ->> 'financial_guardian_id', '')::uuid, financial_guardian_id),
      coalesce((billing_payload ->> 'base_amount')::numeric, 0),
      coalesce((billing_payload ->> 'discount_amount')::numeric, 0),
      nullif(btrim(coalesce(billing_payload ->> 'discount_reason', '')), ''),
      (billing_payload ->> 'due_day')::smallint,
      (billing_payload ->> 'billing_start_date')::date,
      coalesce((billing_payload ->> 'auto_generate_fees')::boolean, true)
    );

    insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
    values (
      actor_id,
      'student',
      created_student_id,
      'billing_plan.created',
      '{}'::jsonb
    );
  end if;

  return created_student_id;
end;
$$;

alter function public.complete_student_enrollment(jsonb) owner to postgres;
revoke all on function public.complete_student_enrollment(jsonb) from public, anon;
grant execute on function public.complete_student_enrollment(jsonb) to authenticated;

comment on function public.complete_student_enrollment(jsonb) is
  'Atomic Student 360 enrollment RPC. SECURITY DEFINER is used only to write audit_events without granting arbitrary client inserts; it validates owner access explicitly and uses a fixed search_path.';

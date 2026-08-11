create or replace function public.normalize_phone_digits(phone_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(phone_value, ''), '\D', '', 'g');
$$;

comment on function public.normalize_phone_digits(text) is
  'Derives phone digits for search without duplicating or rewriting the stored guardian phone value.';

create index guardians_phone_digits_trgm_idx
on public.guardians
using gin (public.normalize_phone_digits(phone) extensions.gin_trgm_ops)
where phone is not null;

comment on index public.guardians_phone_digits_trgm_idx is
  'Supports guardian search by digits when phone numbers are stored with punctuation.';

create or replace function public.list_guardians(
  p_search text default '',
  p_role_filter text default 'all',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  guardian_id uuid,
  full_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  students_count bigint,
  is_primary_contact boolean,
  is_financial_responsible boolean,
  can_pick_up boolean,
  is_emergency_contact boolean,
  linked_students jsonb,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      greatest(coalesce(p_page, 1), 1) as page_number,
      least(greatest(coalesce(p_page_size, 20), 1), 50) as page_size,
      nullif(btrim(coalesce(p_search, '')), '') as search_text,
      public.normalize_phone_digits(p_search) as search_digits,
      case
        when p_role_filter in ('financial', 'primary', 'pickup', 'emergency') then p_role_filter
        else 'all'
      end as role_filter
  ),
  role_summary as (
    select
      sg.guardian_id,
      count(sg.student_id)::bigint as students_count,
      coalesce(bool_or(sg.is_primary_contact), false) as is_primary_contact,
      coalesce(bool_or(sg.is_financial_responsible), false) as is_financial_responsible,
      coalesce(bool_or(sg.can_pick_up), false) as can_pick_up,
      coalesce(bool_or(sg.is_emergency_contact), false) as is_emergency_contact
    from public.student_guardians sg
    group by sg.guardian_id
  ),
  filtered as (
    select
      g.id,
      g.full_name,
      g.phone,
      g.email,
      g.notes,
      g.created_at,
      g.updated_at,
      coalesce(rs.students_count, 0) as students_count,
      coalesce(rs.is_primary_contact, false) as is_primary_contact,
      coalesce(rs.is_financial_responsible, false) as is_financial_responsible,
      coalesce(rs.can_pick_up, false) as can_pick_up,
      coalesce(rs.is_emergency_contact, false) as is_emergency_contact
    from public.guardians g
    cross join params p
    left join role_summary rs on rs.guardian_id = g.id
    where (
      p.search_text is null
      or g.full_name ilike '%' || p.search_text || '%'
      or coalesce(g.email, '') ilike '%' || lower(p.search_text) || '%'
      or coalesce(g.phone, '') ilike '%' || p.search_text || '%'
      or (
        char_length(p.search_digits) >= 3
        and public.normalize_phone_digits(g.phone) ilike '%' || p.search_digits || '%'
      )
    )
    and (
      p.role_filter = 'all'
      or (p.role_filter = 'financial' and coalesce(rs.is_financial_responsible, false))
      or (p.role_filter = 'primary' and coalesce(rs.is_primary_contact, false))
      or (p.role_filter = 'pickup' and coalesce(rs.can_pick_up, false))
      or (p.role_filter = 'emergency' and coalesce(rs.is_emergency_contact, false))
    )
  ),
  paged as (
    select
      filtered.*,
      count(*) over () as total_count
    from filtered
    cross join params p
    order by filtered.full_name asc, filtered.id asc
    limit (select page_size from params)
    offset ((select page_number from params) - 1) * (select page_size from params)
  )
  select
    paged.id as guardian_id,
    paged.full_name,
    paged.phone,
    paged.email,
    paged.notes,
    paged.created_at,
    paged.updated_at,
    paged.students_count,
    paged.is_primary_contact,
    paged.is_financial_responsible,
    paged.can_pick_up,
    paged.is_emergency_contact,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'full_name', s.full_name,
            'preferred_name', s.preferred_name,
            'status', s.status,
            'relationship', sg.relationship,
            'is_primary_contact', sg.is_primary_contact,
            'is_financial_responsible', sg.is_financial_responsible,
            'can_pick_up', sg.can_pick_up,
            'is_emergency_contact', sg.is_emergency_contact
          )
          order by s.full_name asc, s.id asc
        )
        from public.student_guardians sg
        join public.students s on s.id = sg.student_id
        where sg.guardian_id = paged.id
      ),
      '[]'::jsonb
    ) as linked_students,
    paged.total_count
  from paged;
$$;

comment on function public.list_guardians(text, text, integer, integer) is
  'Paged guardian list with linked-student summary. Avoids N+1 queries and keeps Student 360 relations normalized.';

create or replace function public.create_guardian_with_optional_student(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  guardian_payload jsonb := coalesce(payload -> 'guardian', '{}'::jsonb);
  link_payload jsonb := payload -> 'student_link';
  new_guardian_id uuid;
  linked_student_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create guardians.' using errcode = '42501';
  end if;

  insert into public.guardians (full_name, phone, email, notes)
  values (
    btrim(guardian_payload ->> 'full_name'),
    nullif(btrim(coalesce(guardian_payload ->> 'phone', '')), ''),
    nullif(lower(btrim(coalesce(guardian_payload ->> 'email', ''))), ''),
    nullif(btrim(coalesce(guardian_payload ->> 'notes', '')), '')
  )
  returning id into new_guardian_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'guardian',
    new_guardian_id,
    'guardian.created',
    jsonb_build_object('has_initial_student_link', link_payload is not null)
  );

  if link_payload is not null then
    linked_student_id := (link_payload ->> 'student_id')::uuid;

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
      linked_student_id,
      new_guardian_id,
      btrim(link_payload ->> 'relationship'),
      coalesce((link_payload ->> 'is_primary_contact')::boolean, false),
      coalesce((link_payload ->> 'is_financial_responsible')::boolean, false),
      coalesce((link_payload ->> 'can_pick_up')::boolean, false),
      coalesce((link_payload ->> 'is_emergency_contact')::boolean, false)
    );

    insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
    values
      (
        actor_id,
        'guardian',
        new_guardian_id,
        'guardian.linked_to_student',
        jsonb_build_object('student_id', linked_student_id)
      ),
      (
        actor_id,
        'student',
        linked_student_id,
        'guardian.linked_to_student',
        jsonb_build_object('guardian_id', new_guardian_id)
      );
  end if;

  return new_guardian_id;
end;
$$;

create or replace function public.update_guardian_contact(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_guardian_id uuid := (payload ->> 'guardian_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update guardians.' using errcode = '42501';
  end if;

  update public.guardians
  set
    full_name = btrim(payload ->> 'full_name'),
    phone = nullif(btrim(coalesce(payload ->> 'phone', '')), ''),
    email = nullif(lower(btrim(coalesce(payload ->> 'email', ''))), ''),
    notes = nullif(btrim(coalesce(payload ->> 'notes', '')), '')
  where id = target_guardian_id;

  if not found then
    raise exception 'Guardian not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'guardian', target_guardian_id, 'guardian.updated', '{}'::jsonb);

  return target_guardian_id;
end;
$$;

create or replace function public.upsert_guardian_student_link(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_guardian_id uuid := (payload ->> 'guardian_id')::uuid;
  target_student_id uuid := (payload ->> 'student_id')::uuid;
  was_existing boolean;
  event_action text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can manage guardian links.' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.student_guardians
    where guardian_id = target_guardian_id
      and student_id = target_student_id
  ) into was_existing;

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
    target_student_id,
    target_guardian_id,
    btrim(payload ->> 'relationship'),
    coalesce((payload ->> 'is_primary_contact')::boolean, false),
    coalesce((payload ->> 'is_financial_responsible')::boolean, false),
    coalesce((payload ->> 'can_pick_up')::boolean, false),
    coalesce((payload ->> 'is_emergency_contact')::boolean, false)
  )
  on conflict (student_id, guardian_id) do update
  set
    relationship = excluded.relationship,
    is_primary_contact = excluded.is_primary_contact,
    is_financial_responsible = excluded.is_financial_responsible,
    can_pick_up = excluded.can_pick_up,
    is_emergency_contact = excluded.is_emergency_contact;

  event_action := case when was_existing then 'guardian.relationship_updated' else 'guardian.linked_to_student' end;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'guardian',
      target_guardian_id,
      event_action,
      jsonb_build_object('student_id', target_student_id)
    ),
    (
      actor_id,
      'student',
      target_student_id,
      event_action,
      jsonb_build_object('guardian_id', target_guardian_id)
    );
end;
$$;

create or replace function public.unlink_guardian_student(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_guardian_id uuid := (payload ->> 'guardian_id')::uuid;
  target_student_id uuid := (payload ->> 'student_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can unlink guardians.' using errcode = '42501';
  end if;

  delete from public.student_guardians
  where guardian_id = target_guardian_id
    and student_id = target_student_id;

  if not found then
    raise exception 'Guardian relationship not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      actor_id,
      'guardian',
      target_guardian_id,
      'guardian.unlinked_from_student',
      jsonb_build_object('student_id', target_student_id)
    ),
    (
      actor_id,
      'student',
      target_student_id,
      'guardian.unlinked_from_student',
      jsonb_build_object('guardian_id', target_guardian_id)
    );
end;
$$;

comment on function public.create_guardian_with_optional_student(jsonb) is
  'Creates a guardian and optional student link atomically while recording audit events. SECURITY DEFINER is limited to owner validation and audit writes.';
comment on function public.update_guardian_contact(jsonb) is
  'Updates guardian-owned contact data only and records a guardian audit event.';
comment on function public.upsert_guardian_student_link(jsonb) is
  'Creates or updates relationship-specific student_guardians data without editing guardian contact fields.';
comment on function public.unlink_guardian_student(jsonb) is
  'Removes one student_guardians link without deleting the guardian or affecting other links.';

alter function public.normalize_phone_digits(text) owner to postgres;
alter function public.list_guardians(text, text, integer, integer) owner to postgres;
alter function public.create_guardian_with_optional_student(jsonb) owner to postgres;
alter function public.update_guardian_contact(jsonb) owner to postgres;
alter function public.upsert_guardian_student_link(jsonb) owner to postgres;
alter function public.unlink_guardian_student(jsonb) owner to postgres;

revoke all on function public.normalize_phone_digits(text) from public, anon;
revoke all on function public.list_guardians(text, text, integer, integer) from public, anon;
revoke all on function public.create_guardian_with_optional_student(jsonb) from public, anon;
revoke all on function public.update_guardian_contact(jsonb) from public, anon;
revoke all on function public.upsert_guardian_student_link(jsonb) from public, anon;
revoke all on function public.unlink_guardian_student(jsonb) from public, anon;

grant execute on function public.normalize_phone_digits(text) to authenticated;
grant execute on function public.list_guardians(text, text, integer, integer) to authenticated;
grant execute on function public.create_guardian_with_optional_student(jsonb) to authenticated;
grant execute on function public.update_guardian_contact(jsonb) to authenticated;
grant execute on function public.upsert_guardian_student_link(jsonb) to authenticated;
grant execute on function public.unlink_guardian_student(jsonb) to authenticated;

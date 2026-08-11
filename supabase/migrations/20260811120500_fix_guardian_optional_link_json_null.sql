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
    jsonb_build_object('has_initial_student_link', link_payload is not null and jsonb_typeof(link_payload) <> 'null')
  );

  if link_payload is not null and jsonb_typeof(link_payload) <> 'null' then
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

comment on function public.create_guardian_with_optional_student(jsonb) is
  'Creates a guardian and optional student link atomically while recording audit events. SECURITY DEFINER is limited to owner validation and audit writes; JSON null student_link is treated as no link.';

alter function public.create_guardian_with_optional_student(jsonb) owner to postgres;
revoke all on function public.create_guardian_with_optional_student(jsonb) from public, anon;
grant execute on function public.create_guardian_with_optional_student(jsonb) to authenticated;

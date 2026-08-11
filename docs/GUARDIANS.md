# Guardians

The Guardians module is the Phase 4 administrative surface for responsible parties.

## Routes

- `/responsaveis`: paged list.
- `/responsaveis/:guardianId`: routed detail drawer for one responsible party.

## Data Ownership

`guardians` owns personal contact data:

- name;
- phone;
- email;
- notes.

`student_guardians` owns relationship data:

- relationship;
- primary contact;
- financial responsible;
- authorized pickup;
- emergency contact.

The module does not duplicate relationship flags into `guardians` and does not duplicate guardian contact data into students.

## List Query

The list uses `list_guardians(search, role, page, page_size)`. The RPC returns one page with:

- guardian contact fields;
- linked student summaries;
- aggregate role flags;
- total count.

This avoids N+1 requests while keeping full student profiles and history out of the list.

## Search

Search covers:

- name;
- phone;
- email.

Phone search uses `normalize_phone_digits(text)`, so a user can search digits such as `54999999999` even when the stored value contains punctuation.

## Filters

Operational filters are intentionally small:

- all;
- financial responsible;
- primary contacts;
- authorized pickup;
- emergency contacts.

Multiple primary contacts and multiple financial responsible parties are allowed. Casa Criativa may need more than one adult in either role, so Phase 4 does not impose uniqueness.

## Mutations

All important write operations use RPCs so audit events are created atomically:

- create guardian with optional initial student link;
- update guardian contact;
- create or update a student relationship;
- unlink one student relationship.

Unlinking never deletes the guardian. Physical deletion is not exposed in Phase 4.

## Cache

Guardian mutations invalidate:

- guardian list keys;
- guardian detail key;
- affected student detail key;
- affected Student 360 relation key.

Editing guardian contact also invalidates Student 360 for currently linked students when the guardian detail is cached.

## History

Phase 4 records:

- `guardian.created`;
- `guardian.updated`;
- `guardian.linked_to_student`;
- `guardian.relationship_updated`;
- `guardian.unlinked_from_student`.

Events avoid sensitive contact snapshots in metadata.

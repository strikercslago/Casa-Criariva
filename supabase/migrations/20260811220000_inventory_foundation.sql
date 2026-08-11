set check_function_bodies = off;

create type public.material_unit as enum (
  'unit',
  'package',
  'box',
  'sheet',
  'roll',
  'liter',
  'milliliter',
  'kilogram',
  'gram',
  'meter',
  'bottle',
  'other'
);

create type public.inventory_movement_type as enum (
  'initial_stock',
  'purchase',
  'consumption',
  'loss',
  'adjustment_in',
  'adjustment_out',
  'return'
);

create type public.purchase_status as enum (
  'draft',
  'received',
  'cancelled'
);

create table public.material_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_categories_name_clean check (
    char_length(btrim(name)) between 2 and 120
    and name = btrim(name)
  )
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.material_categories(id) on delete set null,
  unit public.material_unit not null,
  minimum_stock numeric(12,3) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  constraint materials_name_clean check (
    char_length(btrim(name)) between 2 and 160
    and name = btrim(name)
  ),
  constraint materials_minimum_stock_nonnegative check (minimum_stock >= 0),
  constraint materials_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint materials_archive_consistency check (
    (is_active and archived_at is null and archived_by is null)
    or (not is_active and archived_at is not null)
  )
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity numeric(12,3) not null,
  unit_cost numeric(12,4),
  reference_type text,
  reference_id uuid,
  notes text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint inventory_movements_quantity_positive check (quantity > 0),
  constraint inventory_movements_unit_cost_nonnegative check (unit_cost is null or unit_cost >= 0),
  constraint inventory_movements_reference_clean check (
    reference_type is null
    or (
      reference_type = btrim(reference_type)
      and char_length(reference_type) between 2 and 80
      and reference_id is not null
    )
  ),
  constraint inventory_movements_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_clean check (
    char_length(btrim(name)) between 2 and 160
    and name = btrim(name)
  ),
  constraint suppliers_contact_clean check (
    contact_name is null
    or (
      contact_name = btrim(contact_name)
      and char_length(contact_name) between 2 and 160
    )
  ),
  constraint suppliers_email_clean check (
    email is null
    or (
      email = lower(btrim(email))
      and char_length(email) <= 200
      and email like '%@%'
    )
  ),
  constraint suppliers_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_date date not null default current_date,
  due_date date,
  status public.purchase_status not null default 'draft',
  notes text,
  financial_entry_id uuid unique references public.financial_entries(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  received_at timestamptz,
  received_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  constraint purchases_dates_valid check (due_date is null or due_date >= purchase_date),
  constraint purchases_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint purchases_status_consistency check (
    (status = 'draft' and received_at is null and received_by is null and cancelled_at is null and cancelled_by is null and cancellation_reason is null and financial_entry_id is null)
    or (status = 'received' and received_at is not null and received_by is not null and cancelled_at is null and cancelled_by is null and cancellation_reason is null and financial_entry_id is not null)
    or (status = 'cancelled' and received_at is null and received_by is null and cancelled_at is not null and cancelled_by is not null and cancellation_reason is not null and financial_entry_id is null)
  ),
  constraint purchases_cancellation_reason_clean check (
    cancellation_reason is null
    or (
      cancellation_reason = btrim(cancellation_reason)
      and char_length(cancellation_reason) between 4 and 500
    )
  )
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  quantity numeric(12,3) not null,
  unit_cost numeric(12,4) not null,
  total_amount numeric(12,2) generated always as (round(quantity * unit_cost, 2)) stored,
  created_at timestamptz not null default now(),
  constraint purchase_items_quantity_positive check (quantity > 0),
  constraint purchase_items_unit_cost_nonnegative check (unit_cost >= 0)
);

create trigger material_categories_set_updated_at
before update on public.material_categories
for each row execute function public.set_updated_at();

create trigger materials_set_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create unique index material_categories_name_uidx
on public.material_categories (lower(name));

create index materials_category_idx
on public.materials (category_id, name);

create index materials_active_name_idx
on public.materials (is_active, name, id);

create index materials_name_trgm_idx
on public.materials using gin (name extensions.gin_trgm_ops);

create index inventory_movements_material_occurred_idx
on public.inventory_movements (material_id, occurred_at desc, id desc);

create index inventory_movements_reference_idx
on public.inventory_movements (reference_type, reference_id)
where reference_type is not null and reference_id is not null;

create unique index suppliers_name_uidx
on public.suppliers (lower(name));

create index suppliers_name_trgm_idx
on public.suppliers using gin (name extensions.gin_trgm_ops);

create index purchases_status_date_idx
on public.purchases (status, purchase_date desc, id);

create index purchases_supplier_idx
on public.purchases (supplier_id, purchase_date desc);

create index purchases_financial_entry_idx
on public.purchases (financial_entry_id)
where financial_entry_id is not null;

create index purchase_items_purchase_idx
on public.purchase_items (purchase_id, id);

create index purchase_items_material_idx
on public.purchase_items (material_id, purchase_id);

comment on table public.material_categories is
  'Operational categories for art, cleaning and disposable materials. Used categories should be deactivated instead of deleted.';
comment on table public.materials is
  'Material catalog. Current stock is derived from inventory_movements, never edited directly.';
comment on table public.inventory_movements is
  'Inventory facts. Historical rows are preserved; corrections use compensating movements.';
comment on table public.suppliers is
  'Simple supplier/contact records for material purchases.';
comment on table public.purchases is
  'Material purchase header. Receiving a purchase atomically updates stock and finance.';
comment on table public.purchase_items is
  'Material purchase lines. total_amount is generated from quantity and unit_cost.';

alter table public.material_categories enable row level security;
alter table public.materials enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

revoke all on table public.material_categories from anon, authenticated;
revoke all on table public.materials from anon, authenticated;
revoke all on table public.inventory_movements from anon, authenticated;
revoke all on table public.suppliers from anon, authenticated;
revoke all on table public.purchases from anon, authenticated;
revoke all on table public.purchase_items from anon, authenticated;

grant select, insert, update on table public.material_categories to authenticated;
grant select, insert, update on table public.materials to authenticated;
grant select, insert on table public.inventory_movements to authenticated;
grant select, insert, update on table public.suppliers to authenticated;
grant select, insert, update on table public.purchases to authenticated;
grant select, insert, update, delete on table public.purchase_items to authenticated;

create policy "material_categories_owner_all"
on public.material_categories
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "materials_owner_all"
on public.materials
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "inventory_movements_owner_select_insert"
on public.inventory_movements
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "suppliers_owner_all"
on public.suppliers
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "purchases_owner_all"
on public.purchases
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

create policy "purchase_items_owner_all"
on public.purchase_items
for all
to authenticated
using (public.current_user_is_owner())
with check (public.current_user_is_owner());

insert into public.material_categories (name)
values
  ('Tintas'),
  ('Papeis'),
  ('Pinceis'),
  ('Colas'),
  ('Desenho'),
  ('Modelagem'),
  ('Tecidos'),
  ('Descartaveis'),
  ('Limpeza'),
  ('Outros')
on conflict do nothing;

create or replace function public.inventory_movement_signed_quantity(
  p_movement_type public.inventory_movement_type,
  p_quantity numeric
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_movement_type in ('initial_stock', 'purchase', 'adjustment_in', 'return') then p_quantity
    else -p_quantity
  end;
$$;

create or replace function public.get_material_stock(p_material_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(public.inventory_movement_signed_quantity(movement_type, quantity)), 0)::numeric(12,3)
  from public.inventory_movements
  where material_id = p_material_id
    and public.current_user_is_owner();
$$;

create or replace function public.material_stock_rows()
returns table (
  material_id uuid,
  current_stock numeric,
  last_unit_cost numeric
)
language sql
stable
set search_path = public
as $$
  with stock as (
    select
      im.material_id,
      coalesce(sum(public.inventory_movement_signed_quantity(im.movement_type, im.quantity)), 0)::numeric(12,3) as current_stock
    from public.inventory_movements im
    where public.current_user_is_owner()
    group by im.material_id
  ),
  last_cost as (
    select distinct on (im.material_id)
      im.material_id,
      im.unit_cost
    from public.inventory_movements im
    where im.unit_cost is not null
      and im.movement_type = 'purchase'
      and public.current_user_is_owner()
    order by im.material_id, im.occurred_at desc, im.id desc
  )
  select
    coalesce(stock.material_id, last_cost.material_id),
    coalesce(stock.current_stock, 0)::numeric(12,3),
    last_cost.unit_cost
  from stock
  full join last_cost on last_cost.material_id = stock.material_id;
$$;

create or replace function public.list_materials(
  p_search text default '',
  p_stock_filter text default 'all',
  p_active_filter text default 'active',
  p_category_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  material_id uuid,
  name text,
  category_id uuid,
  category_name text,
  unit public.material_unit,
  minimum_stock numeric,
  current_stock numeric,
  stock_status text,
  last_unit_cost numeric,
  is_active boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with rows as (
    select
      m.id as material_id,
      m.name,
      m.category_id,
      mc.name as category_name,
      m.unit,
      m.minimum_stock,
      coalesce(ms.current_stock, 0)::numeric(12,3) as current_stock,
      case
        when coalesce(ms.current_stock, 0) <= 0 then 'out'
        when coalesce(ms.current_stock, 0) <= m.minimum_stock then 'low'
        else 'ok'
      end as stock_status,
      ms.last_unit_cost,
      m.is_active,
      m.notes,
      m.created_at,
      m.updated_at
    from public.materials m
    left join public.material_categories mc on mc.id = m.category_id
    left join public.material_stock_rows() ms on ms.material_id = m.id
    where public.current_user_is_owner()
      and (p_category_id is null or m.category_id = p_category_id)
      and (
        p_active_filter = 'all'
        or (p_active_filter = 'active' and m.is_active)
        or (p_active_filter = 'archived' and not m.is_active)
      )
      and (
        btrim(coalesce(p_search, '')) = ''
        or m.name ilike '%' || btrim(p_search) || '%'
        or mc.name ilike '%' || btrim(p_search) || '%'
      )
  ),
  filtered as (
    select *
    from rows
    where p_stock_filter = 'all'
      or stock_status = p_stock_filter
  ),
  paged as (
    select *, count(*) over () as total_count
    from filtered
    order by
      case stock_status when 'out' then 0 when 'low' then 1 else 2 end,
      name,
      material_id
    limit least(greatest(coalesce(p_page_size, 20), 1), 50)
    offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50)
  )
  select * from paged;
$$;

create or replace function public.get_inventory_summary()
returns table (
  materials_count bigint,
  low_stock_count bigint,
  out_of_stock_count bigint,
  recent_purchases_count bigint
)
language sql
stable
set search_path = public
as $$
  with material_rows as (
    select *
    from public.list_materials('', 'all', 'active', null, 1, 100000)
  )
  select
    count(*)::bigint,
    count(*) filter (where stock_status = 'low')::bigint,
    count(*) filter (where stock_status = 'out')::bigint,
    (
      select count(*)::bigint
      from public.purchases p
      where public.current_user_is_owner()
        and p.purchase_date >= current_date - interval '30 days'
    )
  from material_rows;
$$;

create or replace function public.list_inventory_movements(
  p_material_id uuid,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  movement_id uuid,
  material_id uuid,
  movement_type public.inventory_movement_type,
  quantity numeric,
  signed_quantity numeric,
  unit_cost numeric,
  reference_type text,
  reference_id uuid,
  notes text,
  occurred_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    im.id,
    im.material_id,
    im.movement_type,
    im.quantity,
    public.inventory_movement_signed_quantity(im.movement_type, im.quantity)::numeric(12,3),
    im.unit_cost,
    im.reference_type,
    im.reference_id,
    im.notes,
    im.occurred_at,
    im.created_at,
    count(*) over () as total_count
  from public.inventory_movements im
  where im.material_id = p_material_id
    and public.current_user_is_owner()
  order by im.occurred_at desc, im.id desc
  limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50);
$$;

create or replace function public.record_inventory_movement(payload jsonb)
returns table (
  material_id uuid,
  movement_id uuid,
  current_stock numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_material public.materials%rowtype;
  target_type public.inventory_movement_type := (payload ->> 'movement_type')::public.inventory_movement_type;
  target_quantity numeric := nullif(payload ->> 'quantity', '')::numeric;
  target_unit_cost numeric := nullif(payload ->> 'unit_cost', '')::numeric;
  target_notes text := nullif(btrim(coalesce(payload ->> 'notes', '')), '');
  target_occurred_at timestamptz := coalesce(nullif(payload ->> 'occurred_at', '')::timestamptz, now());
  before_stock numeric;
  after_stock numeric;
  new_movement_id uuid;
  audit_action text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can record inventory movements.' using errcode = '42501';
  end if;

  if target_type = 'purchase' then
    raise exception 'Purchase movements must be created by receive_purchase.' using errcode = '23514';
  end if;

  if target_quantity is null or target_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.' using errcode = '23514';
  end if;

  if target_type in ('loss', 'adjustment_out') and coalesce(target_notes, '') = '' then
    raise exception 'A reason is required for loss or adjustment.' using errcode = '23514';
  end if;

  select *
  into target_material
  from public.materials
  where id = (payload ->> 'material_id')::uuid
  for update;

  if not found or not target_material.is_active then
    raise exception 'Material not found or archived.' using errcode = 'P0002';
  end if;

  select public.get_material_stock(target_material.id) into before_stock;
  after_stock := before_stock + public.inventory_movement_signed_quantity(target_type, target_quantity);

  if after_stock < 0 then
    raise exception 'Insufficient stock. Available: %.', before_stock using errcode = '23514';
  end if;

  insert into public.inventory_movements (
    material_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_id,
    notes,
    occurred_at,
    created_by
  )
  values (
    target_material.id,
    target_type,
    target_quantity,
    target_unit_cost,
    nullif(btrim(coalesce(payload ->> 'reference_type', '')), ''),
    nullif(payload ->> 'reference_id', '')::uuid,
    target_notes,
    target_occurred_at,
    actor_id
  )
  returning id into new_movement_id;

  audit_action := case
    when target_type = 'consumption' then 'inventory.consumed'
    when target_type = 'loss' then 'inventory.loss'
    else 'inventory.adjusted'
  end;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'material',
    target_material.id,
    audit_action,
    jsonb_build_object('movement_id', new_movement_id, 'movement_type', target_type, 'quantity', target_quantity, 'before_stock', before_stock, 'after_stock', after_stock)
  );

  return query select target_material.id, new_movement_id, after_stock::numeric(12,3);
end;
$$;

create or replace function public.create_material(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_material_id uuid;
  initial_stock numeric := coalesce(nullif(payload ->> 'initial_stock', '')::numeric, 0);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create materials.' using errcode = '42501';
  end if;

  insert into public.materials (name, category_id, unit, minimum_stock, notes, created_by)
  values (
    btrim(payload ->> 'name'),
    nullif(payload ->> 'category_id', '')::uuid,
    (payload ->> 'unit')::public.material_unit,
    coalesce(nullif(payload ->> 'minimum_stock', '')::numeric, 0),
    nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into new_material_id;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'material', new_material_id, 'material.created', jsonb_build_object('initial_stock', initial_stock));

  if initial_stock > 0 then
    insert into public.inventory_movements (material_id, movement_type, quantity, notes, occurred_at, created_by)
    values (
      new_material_id,
      'initial_stock',
      initial_stock,
      nullif(btrim(coalesce(payload ->> 'initial_stock_notes', 'Estoque inicial')), ''),
      coalesce(nullif(payload ->> 'occurred_at', '')::timestamptz, now()),
      actor_id
    );
  end if;

  return new_material_id;
end;
$$;

create or replace function public.update_material(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_material_id uuid := (payload ->> 'material_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can update materials.' using errcode = '42501';
  end if;

  update public.materials
  set
    name = btrim(payload ->> 'name'),
    category_id = nullif(payload ->> 'category_id', '')::uuid,
    unit = (payload ->> 'unit')::public.material_unit,
    minimum_stock = coalesce(nullif(payload ->> 'minimum_stock', '')::numeric, 0),
    notes = nullif(btrim(coalesce(payload ->> 'notes', '')), '')
  where id = target_material_id
    and is_active;

  if not found then
    raise exception 'Material not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'material', target_material_id, 'material.updated', '{}'::jsonb);

  return target_material_id;
end;
$$;

create or replace function public.archive_material(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_material_id uuid := (payload ->> 'material_id')::uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can archive materials.' using errcode = '42501';
  end if;

  update public.materials
  set is_active = false,
      archived_at = now(),
      archived_by = actor_id
  where id = target_material_id
    and is_active;

  if not found then
    raise exception 'Material not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'material', target_material_id, 'material.archived', '{}'::jsonb);

  return target_material_id;
end;
$$;

create or replace function public.create_material_category(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_category_id uuid;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create material categories.' using errcode = '42501';
  end if;

  insert into public.material_categories (name)
  values (btrim(payload ->> 'name'))
  on conflict (lower(name)) do update
  set is_active = true,
      updated_at = now()
  returning id into new_category_id;

  return new_category_id;
end;
$$;

create or replace function public.list_suppliers(
  p_search text default '',
  p_active_filter text default 'active',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  supplier_id uuid,
  name text,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean,
  last_purchase_date date,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with rows as (
    select
      s.id as supplier_id,
      s.name,
      s.contact_name,
      s.phone,
      s.email,
      s.notes,
      s.is_active,
      max(p.purchase_date) as last_purchase_date
    from public.suppliers s
    left join public.purchases p on p.supplier_id = s.id
    where public.current_user_is_owner()
      and (
        p_active_filter = 'all'
        or (p_active_filter = 'active' and s.is_active)
        or (p_active_filter = 'archived' and not s.is_active)
      )
      and (
        btrim(coalesce(p_search, '')) = ''
        or s.name ilike '%' || btrim(p_search) || '%'
        or s.phone ilike '%' || btrim(p_search) || '%'
        or s.email ilike '%' || btrim(p_search) || '%'
      )
    group by s.id
  )
  select *, count(*) over () as total_count
  from rows
  order by name
  limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50);
$$;

create or replace function public.upsert_supplier(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_supplier_id uuid := nullif(payload ->> 'supplier_id', '')::uuid;
  saved_supplier_id uuid;
  action_name text;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can save suppliers.' using errcode = '42501';
  end if;

  if target_supplier_id is null then
    insert into public.suppliers (name, contact_name, phone, email, notes)
    values (
      btrim(payload ->> 'name'),
      nullif(btrim(coalesce(payload ->> 'contact_name', '')), ''),
      nullif(btrim(coalesce(payload ->> 'phone', '')), ''),
      nullif(lower(btrim(coalesce(payload ->> 'email', ''))), ''),
      nullif(btrim(coalesce(payload ->> 'notes', '')), '')
    )
    returning id into saved_supplier_id;
    action_name := 'supplier.created';
  else
    update public.suppliers
    set name = btrim(payload ->> 'name'),
        contact_name = nullif(btrim(coalesce(payload ->> 'contact_name', '')), ''),
        phone = nullif(btrim(coalesce(payload ->> 'phone', '')), ''),
        email = nullif(lower(btrim(coalesce(payload ->> 'email', ''))), ''),
        notes = nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
        is_active = coalesce((payload ->> 'is_active')::boolean, true)
    where id = target_supplier_id
    returning id into saved_supplier_id;
    action_name := 'supplier.updated';
  end if;

  if saved_supplier_id is null then
    raise exception 'Supplier not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'supplier', saved_supplier_id, action_name, '{}'::jsonb);

  return saved_supplier_id;
end;
$$;

create or replace function public.create_purchase(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  new_purchase_id uuid;
  item jsonb;
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can create purchases.' using errcode = '42501';
  end if;

  if jsonb_array_length(coalesce(payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Purchase requires at least one item.' using errcode = '23514';
  end if;

  insert into public.purchases (supplier_id, purchase_date, due_date, notes, created_by)
  values (
    nullif(payload ->> 'supplier_id', '')::uuid,
    coalesce(nullif(payload ->> 'purchase_date', '')::date, current_date),
    nullif(payload ->> 'due_date', '')::date,
    nullif(btrim(coalesce(payload ->> 'notes', '')), ''),
    actor_id
  )
  returning id into new_purchase_id;

  for item in select * from jsonb_array_elements(payload -> 'items') loop
    insert into public.purchase_items (purchase_id, material_id, quantity, unit_cost)
    values (
      new_purchase_id,
      (item ->> 'material_id')::uuid,
      (item ->> 'quantity')::numeric,
      (item ->> 'unit_cost')::numeric
    );
  end loop;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'purchase', new_purchase_id, 'purchase.created', jsonb_build_object('items_count', jsonb_array_length(payload -> 'items')));

  return new_purchase_id;
end;
$$;

create or replace function public.receive_purchase(payload jsonb)
returns table (
  purchase_id uuid,
  financial_entry_id uuid,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_purchase public.purchases%rowtype;
  target_total numeric;
  target_category_id uuid;
  target_financial_entry_id uuid;
  supplier_name text;
  item record;
  should_settle boolean := coalesce((payload ->> 'settle_now')::boolean, false);
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can receive purchases.' using errcode = '42501';
  end if;

  select *
  into target_purchase
  from public.purchases
  where id = (payload ->> 'purchase_id')::uuid
  for update;

  if not found then
    raise exception 'Purchase not found.' using errcode = 'P0002';
  end if;

  if target_purchase.status <> 'draft' then
    raise exception 'Only draft purchases can be received.' using errcode = '23514';
  end if;

  select coalesce(sum(total_amount), 0)::numeric(12,2)
  into target_total
  from public.purchase_items
  where purchase_id = target_purchase.id;

  if target_total <= 0 then
    raise exception 'Purchase total must be greater than zero.' using errcode = '23514';
  end if;

  select name into supplier_name
  from public.suppliers
  where id = target_purchase.supplier_id;

  select id
  into target_category_id
  from public.financial_categories
  where lower(name) = lower('Materiais')
    and type = 'expense'
  limit 1;

  if target_category_id is null then
    insert into public.financial_categories (name, type)
    values ('Materiais', 'expense')
    returning id into target_category_id;
  end if;

  insert into public.financial_entries (
    type,
    category_id,
    description,
    amount,
    competence_date,
    due_date,
    notes,
    created_by
  )
  values (
    'expense',
    target_category_id,
    'Compra de materiais' || coalesce(' - ' || supplier_name, ''),
    target_total,
    target_purchase.purchase_date,
    coalesce(target_purchase.due_date, target_purchase.purchase_date),
    target_purchase.notes,
    actor_id
  )
  returning id into target_financial_entry_id;

  for item in
    select pi.*
    from public.purchase_items pi
    where pi.purchase_id = target_purchase.id
  loop
    perform 1
    from public.materials m
    where m.id = item.material_id
      and m.is_active
    for update;

    if not found then
      raise exception 'Purchase contains archived or missing material.' using errcode = '23514';
    end if;

    insert into public.inventory_movements (
      material_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_id,
      notes,
      occurred_at,
      created_by
    )
    values (
      item.material_id,
      'purchase',
      item.quantity,
      item.unit_cost,
      'purchase',
      target_purchase.id,
      'Recebimento de compra',
      now(),
      actor_id
    );
  end loop;

  update public.purchases
  set status = 'received',
      financial_entry_id = target_financial_entry_id,
      received_at = now(),
      received_by = actor_id
  where id = target_purchase.id;

  if should_settle then
    perform public.settle_financial_entry(jsonb_build_object(
      'financial_entry_id', target_financial_entry_id,
      'amount', target_total,
      'payment_method', coalesce(nullif(payload ->> 'payment_method', ''), 'pix'),
      'cash_account_id', nullif(payload ->> 'cash_account_id', ''),
      'settled_at', coalesce(nullif(payload ->> 'settled_at', ''), now()::text),
      'notes', nullif(btrim(coalesce(payload ->> 'settlement_notes', 'Pagamento de compra de materiais')), '')
    ));
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    actor_id,
    'purchase',
    target_purchase.id,
    'purchase.received',
    jsonb_build_object('financial_entry_id', target_financial_entry_id, 'total_amount', target_total, 'settled_now', should_settle)
  );

  return query select target_purchase.id, target_financial_entry_id, target_total;
end;
$$;

create or replace function public.cancel_purchase(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_purchase_id uuid := (payload ->> 'purchase_id')::uuid;
  reason text := btrim(coalesce(payload ->> 'reason', ''));
begin
  if actor_id is null or not public.current_user_is_owner() then
    raise exception 'Only owners can cancel purchases.' using errcode = '42501';
  end if;

  if char_length(reason) < 4 then
    raise exception 'Cancellation reason is required.' using errcode = '23514';
  end if;

  update public.purchases
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = actor_id,
      cancellation_reason = reason
  where id = target_purchase_id
    and status = 'draft';

  if not found then
    raise exception 'Only draft purchases can be cancelled.' using errcode = '23514';
  end if;

  insert into public.audit_events (actor_user_id, entity_type, entity_id, action, metadata)
  values (actor_id, 'purchase', target_purchase_id, 'purchase.cancelled', jsonb_build_object('reason', reason));

  return target_purchase_id;
end;
$$;

create or replace function public.list_purchases(
  p_status_filter text default 'all',
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  purchase_id uuid,
  supplier_id uuid,
  supplier_name text,
  purchase_date date,
  due_date date,
  status public.purchase_status,
  total_amount numeric,
  paid_amount numeric,
  balance numeric,
  finance_status text,
  financial_entry_id uuid,
  items_count bigint,
  notes text,
  received_at timestamptz,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with item_totals as (
    select
      pi.purchase_id,
      count(*)::bigint as items_count,
      coalesce(sum(pi.total_amount), 0)::numeric(12,2) as total_amount
    from public.purchase_items pi
    group by pi.purchase_id
  ),
  settlement_totals as (
    select
      fe.id as financial_entry_id,
      coalesce(sum(fs.amount) filter (where fs.status = 'active'), 0)::numeric(12,2) as paid_amount
    from public.financial_entries fe
    left join public.financial_settlements fs on fs.financial_entry_id = fe.id
    group by fe.id
  ),
  rows as (
    select
      p.id as purchase_id,
      p.supplier_id,
      s.name as supplier_name,
      p.purchase_date,
      p.due_date,
      p.status,
      coalesce(it.total_amount, 0)::numeric(12,2) as total_amount,
      coalesce(st.paid_amount, 0)::numeric(12,2) as paid_amount,
      greatest(coalesce(it.total_amount, 0) - coalesce(st.paid_amount, 0), 0)::numeric(12,2) as balance,
      case
        when p.status = 'draft' then 'draft'
        when p.status = 'cancelled' then 'cancelled'
        when coalesce(st.paid_amount, 0) >= coalesce(it.total_amount, 0) then 'paid'
        when coalesce(st.paid_amount, 0) > 0 then 'partial'
        else 'pending'
      end as finance_status,
      p.financial_entry_id,
      coalesce(it.items_count, 0)::bigint as items_count,
      p.notes,
      p.received_at
    from public.purchases p
    left join public.suppliers s on s.id = p.supplier_id
    left join item_totals it on it.purchase_id = p.id
    left join settlement_totals st on st.financial_entry_id = p.financial_entry_id
    where public.current_user_is_owner()
      and (p_status_filter = 'all' or p.status::text = p_status_filter)
      and (
        btrim(coalesce(p_search, '')) = ''
        or s.name ilike '%' || btrim(p_search) || '%'
        or p.notes ilike '%' || btrim(p_search) || '%'
      )
  )
  select *, count(*) over () as total_count
  from rows
  order by purchase_date desc, purchase_id desc
  limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 50);
$$;

create or replace function public.get_purchase_detail(p_purchase_id uuid)
returns table (
  purchase_id uuid,
  supplier_id uuid,
  supplier_name text,
  purchase_date date,
  due_date date,
  status public.purchase_status,
  notes text,
  financial_entry_id uuid,
  total_amount numeric,
  paid_amount numeric,
  balance numeric,
  finance_status text,
  items jsonb
)
language sql
stable
set search_path = public
as $$
  with purchase_row as (
    select *
    from public.list_purchases('all', '', 1, 100000)
    where purchase_id = p_purchase_id
  ),
  items as (
    select
      pi.purchase_id,
      jsonb_agg(
        jsonb_build_object(
          'purchase_item_id', pi.id,
          'material_id', pi.material_id,
          'material_name', m.name,
          'unit', m.unit,
          'quantity', pi.quantity,
          'unit_cost', pi.unit_cost,
          'total_amount', pi.total_amount
        )
        order by m.name
      ) as items
    from public.purchase_items pi
    join public.materials m on m.id = pi.material_id
    where pi.purchase_id = p_purchase_id
      and public.current_user_is_owner()
    group by pi.purchase_id
  )
  select
    pr.purchase_id,
    pr.supplier_id,
    pr.supplier_name,
    pr.purchase_date,
    pr.due_date,
    pr.status,
    pr.notes,
    pr.financial_entry_id,
    pr.total_amount,
    pr.paid_amount,
    pr.balance,
    pr.finance_status,
    coalesce(items.items, '[]'::jsonb)
  from purchase_row pr
  left join items on items.purchase_id = pr.purchase_id;
$$;

create or replace function public.finance_cash_flow_rows(p_start_date date, p_end_date date)
returns table (
  movement_id uuid,
  source_type text,
  source_id uuid,
  direction text,
  description text,
  category_id uuid,
  category_name text,
  cash_account_id uuid,
  cash_account_name text,
  payment_method public.payment_method,
  amount numeric,
  occurred_at timestamptz,
  related_entry_id uuid
)
language sql
stable
set search_path = public
as $$
  select
    p.id as movement_id,
    'tuition_payment'::text as source_type,
    p.id as source_id,
    'income'::text as direction,
    'Mensalidade - ' || string_agg(distinct s.full_name, ', ' order by s.full_name) as description,
    null::uuid as category_id,
    'Mensalidades'::text as category_name,
    null::uuid as cash_account_id,
    null::text as cash_account_name,
    p.payment_method,
    p.amount,
    p.paid_at as occurred_at,
    null::uuid as related_entry_id
  from public.payments p
  join public.payment_allocations pa on pa.payment_id = p.id
  join public.monthly_fees mf on mf.id = pa.monthly_fee_id
  join public.students s on s.id = mf.student_id
  where p.status = 'received'
    and p.paid_at::date between p_start_date and p_end_date
    and public.current_user_is_owner()
  group by p.id

  union all

  select
    fs.id as movement_id,
    case
      when er.id is not null then 'event_registration'
      when pur.id is not null then 'material_purchase'
      else 'financial_settlement'
    end as source_type,
    coalesce(er.id, pur.id, fs.id) as source_id,
    fe.type::text as direction,
    fe.description,
    fe.category_id,
    fc.name as category_name,
    fs.cash_account_id,
    ca.name as cash_account_name,
    fs.payment_method,
    fs.amount,
    fs.settled_at as occurred_at,
    fe.id as related_entry_id
  from public.financial_settlements fs
  join public.financial_entries fe on fe.id = fs.financial_entry_id
  left join public.financial_categories fc on fc.id = fe.category_id
  left join public.cash_accounts ca on ca.id = fs.cash_account_id
  left join public.event_registrations er on er.financial_entry_id = fe.id
  left join public.purchases pur on pur.financial_entry_id = fe.id
  where fs.status = 'active'
    and fe.lifecycle_status = 'active'
    and fs.settled_at::date between p_start_date and p_end_date
    and public.current_user_is_owner();
$$;

alter function public.inventory_movement_signed_quantity(public.inventory_movement_type, numeric) owner to postgres;
alter function public.get_material_stock(uuid) owner to postgres;
alter function public.material_stock_rows() owner to postgres;
alter function public.list_materials(text, text, text, uuid, integer, integer) owner to postgres;
alter function public.get_inventory_summary() owner to postgres;
alter function public.list_inventory_movements(uuid, integer, integer) owner to postgres;
alter function public.record_inventory_movement(jsonb) owner to postgres;
alter function public.create_material(jsonb) owner to postgres;
alter function public.update_material(jsonb) owner to postgres;
alter function public.archive_material(jsonb) owner to postgres;
alter function public.create_material_category(jsonb) owner to postgres;
alter function public.list_suppliers(text, text, integer, integer) owner to postgres;
alter function public.upsert_supplier(jsonb) owner to postgres;
alter function public.create_purchase(jsonb) owner to postgres;
alter function public.receive_purchase(jsonb) owner to postgres;
alter function public.cancel_purchase(jsonb) owner to postgres;
alter function public.list_purchases(text, text, integer, integer) owner to postgres;
alter function public.get_purchase_detail(uuid) owner to postgres;
alter function public.finance_cash_flow_rows(date, date) owner to postgres;

alter function public.list_materials(text, text, text, uuid, integer, integer) security definer;
alter function public.get_inventory_summary() security definer;
alter function public.list_inventory_movements(uuid, integer, integer) security definer;
alter function public.list_suppliers(text, text, integer, integer) security definer;
alter function public.list_purchases(text, text, integer, integer) security definer;
alter function public.get_purchase_detail(uuid) security definer;
alter function public.finance_cash_flow_rows(date, date) security definer;

revoke all on function public.inventory_movement_signed_quantity(public.inventory_movement_type, numeric) from public, anon;
revoke all on function public.get_material_stock(uuid) from public, anon;
revoke all on function public.material_stock_rows() from public, anon;
revoke all on function public.list_materials(text, text, text, uuid, integer, integer) from public, anon;
revoke all on function public.get_inventory_summary() from public, anon;
revoke all on function public.list_inventory_movements(uuid, integer, integer) from public, anon;
revoke all on function public.record_inventory_movement(jsonb) from public, anon;
revoke all on function public.create_material(jsonb) from public, anon;
revoke all on function public.update_material(jsonb) from public, anon;
revoke all on function public.archive_material(jsonb) from public, anon;
revoke all on function public.create_material_category(jsonb) from public, anon;
revoke all on function public.list_suppliers(text, text, integer, integer) from public, anon;
revoke all on function public.upsert_supplier(jsonb) from public, anon;
revoke all on function public.create_purchase(jsonb) from public, anon;
revoke all on function public.receive_purchase(jsonb) from public, anon;
revoke all on function public.cancel_purchase(jsonb) from public, anon;
revoke all on function public.list_purchases(text, text, integer, integer) from public, anon;
revoke all on function public.get_purchase_detail(uuid) from public, anon;
revoke all on function public.finance_cash_flow_rows(date, date) from public, anon;

grant execute on function public.inventory_movement_signed_quantity(public.inventory_movement_type, numeric) to authenticated;
grant execute on function public.get_material_stock(uuid) to authenticated;
grant execute on function public.material_stock_rows() to authenticated;
grant execute on function public.list_materials(text, text, text, uuid, integer, integer) to authenticated;
grant execute on function public.get_inventory_summary() to authenticated;
grant execute on function public.list_inventory_movements(uuid, integer, integer) to authenticated;
grant execute on function public.record_inventory_movement(jsonb) to authenticated;
grant execute on function public.create_material(jsonb) to authenticated;
grant execute on function public.update_material(jsonb) to authenticated;
grant execute on function public.archive_material(jsonb) to authenticated;
grant execute on function public.create_material_category(jsonb) to authenticated;
grant execute on function public.list_suppliers(text, text, integer, integer) to authenticated;
grant execute on function public.upsert_supplier(jsonb) to authenticated;
grant execute on function public.create_purchase(jsonb) to authenticated;
grant execute on function public.receive_purchase(jsonb) to authenticated;
grant execute on function public.cancel_purchase(jsonb) to authenticated;
grant execute on function public.list_purchases(text, text, integer, integer) to authenticated;
grant execute on function public.get_purchase_detail(uuid) to authenticated;
grant execute on function public.finance_cash_flow_rows(date, date) to authenticated;

comment on function public.record_inventory_movement(jsonb) is
  'Owner-only inventory movement RPC. Locks the material, recalculates stock and rejects negative stock.';
comment on function public.receive_purchase(jsonb) is
  'Owner-only purchase receiving RPC. Atomically creates purchase movements and the linked finance expense, optionally settling it.';

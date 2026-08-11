# Inventory

Phase 10 adds the materials, stock, purchases and suppliers module.

## Model

The system treats stock as a ledger, not as an editable field:

`materials -> inventory_movements`

`materials.current_stock` does not exist. Current stock is derived by summing signed movements.

Positive movement types:

- `initial_stock`
- `purchase`
- `adjustment_in`
- `return`

Negative movement types:

- `consumption`
- `loss`
- `adjustment_out`

Corrections must be new compensating movements with notes. Historical movements are not deleted by the application.

## Catalog

Materials store:

- name;
- optional category;
- unit;
- minimum stock;
- notes;
- active/archive state.

The stock list supports search, category, active/archive state, stock status, pagination and low/out-of-stock indicators. Last unit cost comes from purchase movements.

## Suppliers

Suppliers are intentionally simple:

- name;
- contact name;
- phone;
- email;
- notes;
- active state.

Supplier records support search and reuse in purchases. They do not own finance rows.

## Purchases

Purchases have three statuses:

- `draft`: editable intent, no stock movement and no finance entry.
- `received`: material was received; stock and finance were created atomically.
- `cancelled`: cancelled draft preserved with a reason.

Receiving a purchase creates:

- one `purchase` inventory movement per item;
- one linked expense in `financial_entries`;
- optionally one settlement in `financial_settlements` for immediate cash payment.

The linked finance entry is stored in `purchases.financial_entry_id`, so finance cash flow can label settled material purchases as `material_purchase` without duplicating expenses.

## Query Keys

Inventory uses stable TanStack Query keys:

- `materialsKeys.all`
- `materialsKeys.list(filters)`
- `materialsKeys.detail(id)`
- `materialsKeys.movements(id, filters)`
- `inventoryKeys.summary()`
- `purchasesKeys.list(filters)`
- `purchasesKeys.detail(id)`
- `suppliersKeys.list(filters)`

Mutations invalidate only the affected domains:

- catalog and manual movements invalidate materials and inventory summary;
- supplier mutations invalidate suppliers;
- draft purchase creation invalidates purchases and suppliers;
- purchase receiving invalidates inventory, purchases and finance.

## Database Safety

Stock-changing RPCs run in the database:

- manual movements lock the material row, recalculate stock and reject negative results;
- purchase receiving locks the purchase row and accepts only draft purchases;
- duplicate receiving is rejected;
- draft cancellation requires a reason;
- received purchase cancellation is not exposed as a simple destructive action.

All inventory tables use owner-only RLS. Anonymous access is blocked. RPCs validate `auth.uid()` and `current_user_is_owner()` and set `search_path = public`.

## Validation

Remote rollback smoke covered:

- initial stock;
- consumption;
- loss;
- physical-count adjustment;
- negative-stock rejection;
- draft purchase with no stock or finance effect;
- purchase receiving with stock movements and one finance expense;
- duplicate receive rejection;
- immediate cash purchase settlement;
- finance cash-flow source `material_purchase`;
- rollback with zero residual material, supplier and purchase rows.

## Reports Integration

Dashboard and `/relatorios` use derived inventory projections:

- low stock and out of stock come from `list_materials`/`material_stock_rows`;
- consumption in a period comes from `inventory_movements.movement_type = consumption`;
- purchase quantity/value in a period comes from `inventory_movements.movement_type = purchase`;
- no report invents total inventory valuation.

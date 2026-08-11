import { expect, test } from '@playwright/test'

type MovementType = 'initial_stock' | 'purchase' | 'consumption' | 'loss' | 'adjustment_in' | 'adjustment_out' | 'return'
type MaterialUnit = 'unit' | 'package' | 'box' | 'sheet' | 'roll' | 'liter' | 'milliliter' | 'kilogram' | 'gram' | 'meter' | 'bottle' | 'other'

type Material = {
  category_id: string | null
  id: string
  is_active: boolean
  minimum_stock: number
  name: string
  notes: string | null
  unit: MaterialUnit
}

type Movement = {
  id: string
  material_id: string
  movement_type: MovementType
  notes: string | null
  occurred_at: string
  quantity: number
  reference_id: string | null
  reference_type: string | null
  unit_cost: number | null
}

type Purchase = {
  due_date: string | null
  financial_entry_id: string | null
  id: string
  items: Array<{ materialId: string; quantity: number; unitCost: number }>
  purchase_date: string
  status: 'draft' | 'received' | 'cancelled'
  supplier_id: string | null
}

test('manages inventory movements, purchases and finance integration', async ({ page }) => {
  const consoleErrors: string[] = []
  const rpcRequests: string[] = []
  const now = '2026-08-11T12:00:00.000Z'
  const userId = '11111111-1111-4111-8111-111111111111'
  const categories = [{ created_at: now, id: 'cat-paints', is_active: true, name: 'Tintas', updated_at: now }]
  const cashAccount = { created_at: now, id: 'account-main', is_active: true, name: 'Conta Principal', type: 'bank', updated_at: now }
  let materials: Material[] = []
  let movements: Movement[] = []
  let suppliers = [] as Array<{ contact_name: string | null; email: string | null; id: string; is_active: boolean; name: string; notes: string | null; phone: string | null }>
  let purchases: Purchase[] = []
  let financeEntries = [] as Array<{ amount: number; description: string; id: string; purchase_id: string }>
  let settlements = [] as Array<{ amount: number; financial_entry_id: string; id: string; settled_at: string }>

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/auth/v1/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        access_token: 'mock-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        user: {
          app_metadata: {},
          aud: 'authenticated',
          confirmed_at: now,
          created_at: now,
          email: 'owner@example.com',
          id: userId,
          role: 'authenticated',
          updated_at: now,
          user_metadata: {},
        },
      },
      status: 200,
    })
  })

  await page.route('https://baugbpqdgslfogggaqen.supabase.co/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/profiles')) {
      await route.fulfill({ contentType: 'application/json', json: { avatar_url: null, created_at: now, full_name: 'Owner', id: userId, is_active: true, updated_at: now }, status: 200 })
      return
    }

    if (url.pathname.endsWith('/user_roles')) {
      await route.fulfill({ contentType: 'application/json', json: [{ role: 'owner' }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/material_categories')) {
      await route.fulfill({ contentType: 'application/json', json: categories, status: 200 })
      return
    }

    if (url.pathname.endsWith('/cash_accounts')) {
      await route.fulfill({ contentType: 'application/json', json: [cashAccount], status: 200 })
      return
    }

    if (url.pathname.endsWith('/financial_categories') || url.pathname.endsWith('/recurring_financial_rules')) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_inventory_summary')) {
      rpcRequests.push('POST get_inventory_summary')
      const rows = materials.filter((material) => material.is_active).map(toMaterialRow)
      await route.fulfill({
        contentType: 'application/json',
        json: [{
          low_stock_count: rows.filter((row) => row.stock_status === 'low').length,
          materials_count: rows.length,
          out_of_stock_count: rows.filter((row) => row.stock_status === 'out').length,
          recent_purchases_count: purchases.length,
        }],
        status: 200,
      })
      return
    }

    if (url.pathname.endsWith('/rpc/list_materials')) {
      rpcRequests.push('POST list_materials')
      await route.fulfill({ contentType: 'application/json', json: materials.map(toMaterialRow), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/create_material')) {
      rpcRequests.push('POST create_material')
      const body = request.postDataJSON() as { payload: { category_id: string | null; initial_stock: number; minimum_stock: number; name: string; notes: string | null; unit: MaterialUnit } }
      const material: Material = { category_id: body.payload.category_id, id: `material-${materials.length + 1}`, is_active: true, minimum_stock: Number(body.payload.minimum_stock), name: body.payload.name, notes: body.payload.notes, unit: body.payload.unit }
      materials = [material, ...materials]
      if (Number(body.payload.initial_stock) > 0) addMovement(material.id, 'initial_stock', Number(body.payload.initial_stock), null, 'Estoque inicial', null)
      await route.fulfill({ contentType: 'application/json', json: material.id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/record_inventory_movement')) {
      rpcRequests.push('POST record_inventory_movement')
      const body = request.postDataJSON() as { payload: { material_id: string; movement_type: MovementType; notes: string | null; quantity: number } }
      const currentStock = stockOf(body.payload.material_id)
      const signed = signedQuantity(body.payload.movement_type, Number(body.payload.quantity))
      if (currentStock + signed < 0) {
        await route.fulfill({ contentType: 'application/json', json: { code: '23514', message: `Insufficient stock. Available: ${currentStock}.` }, status: 400 })
        return
      }
      const movement = addMovement(body.payload.material_id, body.payload.movement_type, Number(body.payload.quantity), null, body.payload.notes, null)
      await route.fulfill({ contentType: 'application/json', json: [{ current_stock: stockOf(body.payload.material_id), material_id: body.payload.material_id, movement_id: movement.id }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_inventory_movements')) {
      const body = request.postDataJSON() as { p_material_id: string }
      await route.fulfill({ contentType: 'application/json', json: movements.filter((movement) => movement.material_id === body.p_material_id).map(toMovementRow), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_suppliers')) {
      rpcRequests.push('POST list_suppliers')
      await route.fulfill({ contentType: 'application/json', json: suppliers.map((supplier) => ({ ...supplier, last_purchase_date: purchases.find((purchase) => purchase.supplier_id === supplier.id)?.purchase_date ?? null, supplier_id: supplier.id, total_count: suppliers.length })), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/upsert_supplier')) {
      rpcRequests.push('POST upsert_supplier')
      const body = request.postDataJSON() as { payload: { contact_name: string | null; email: string | null; name: string; notes: string | null; phone: string | null } }
      const supplier = { contact_name: body.payload.contact_name, email: body.payload.email, id: `supplier-${suppliers.length + 1}`, is_active: true, name: body.payload.name, notes: body.payload.notes, phone: body.payload.phone }
      suppliers = [supplier, ...suppliers]
      await route.fulfill({ contentType: 'application/json', json: supplier.id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/create_purchase')) {
      rpcRequests.push('POST create_purchase')
      const body = request.postDataJSON() as { payload: { due_date: string | null; items: Purchase['items']; purchase_date: string; supplier_id: string | null } }
      const purchase: Purchase = { due_date: body.payload.due_date, financial_entry_id: null, id: `purchase-${purchases.length + 1}`, items: body.payload.items, purchase_date: body.payload.purchase_date, status: 'draft', supplier_id: body.payload.supplier_id }
      purchases = [purchase, ...purchases]
      await route.fulfill({ contentType: 'application/json', json: purchase.id, status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_purchases')) {
      rpcRequests.push('POST list_purchases')
      await route.fulfill({ contentType: 'application/json', json: purchases.map(toPurchaseRow), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_purchase_detail')) {
      const body = request.postDataJSON() as { p_purchase_id: string }
      const purchase = purchases.find((candidate) => candidate.id === body.p_purchase_id)
      await route.fulfill({ contentType: 'application/json', json: purchase ? [toPurchaseDetail(purchase)] : [], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/receive_purchase')) {
      rpcRequests.push('POST receive_purchase')
      const body = request.postDataJSON() as { payload: { purchase_id: string; settle_now: boolean; settled_at: string } }
      const purchase = purchases.find((candidate) => candidate.id === body.payload.purchase_id)
      if (!purchase || purchase.status !== 'draft') {
        await route.fulfill({ contentType: 'application/json', json: { code: '23514', message: 'Only draft purchases can be received.' }, status: 400 })
        return
      }
      const total = purchaseTotal(purchase)
      const entryId = `entry-${purchase.id}`
      purchase.status = 'received'
      purchase.financial_entry_id = entryId
      financeEntries = [{ amount: total, description: 'Compra de materiais', id: entryId, purchase_id: purchase.id }, ...financeEntries]
      purchase.items.forEach((item) => addMovement(item.materialId, 'purchase', item.quantity, item.unitCost, 'Recebimento de compra', purchase.id))
      if (body.payload.settle_now) settlements = [{ amount: total, financial_entry_id: entryId, id: `settlement-${settlements.length + 1}`, settled_at: body.payload.settled_at ?? now }, ...settlements]
      await route.fulfill({ contentType: 'application/json', json: [{ financial_entry_id: entryId, purchase_id: purchase.id, total_amount: total }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/get_finance_month_summary')) {
      await route.fulfill({ contentType: 'application/json', json: [{ cash_in: 0, cash_movements_count: settlements.length, cash_out: settlements.reduce((sum, settlement) => sum + settlement.amount, 0), payable_amount: financeEntries.reduce((sum, entry) => sum + balanceOf(entry.id), 0), receivable_amount: 0, reference_month: '2026-08-01', result_amount: -settlements.reduce((sum, settlement) => sum + settlement.amount, 0) }], status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_finance_cash_flow')) {
      rpcRequests.push('POST list_finance_cash_flow')
      await route.fulfill({ contentType: 'application/json', json: settlements.map((settlement) => {
        const entry = financeEntries.find((candidate) => candidate.id === settlement.financial_entry_id)
        return { amount: settlement.amount, cash_account_id: cashAccount.id, cash_account_name: cashAccount.name, category_id: null, category_name: 'Materiais', description: entry?.description ?? 'Compra de materiais', direction: 'expense', movement_id: settlement.id, occurred_at: settlement.settled_at, payment_method: 'pix', related_entry_id: entry?.id ?? null, source_id: entry?.purchase_id ?? settlement.id, source_type: 'material_purchase', total_count: settlements.length }
      }), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_finance_payables')) {
      await route.fulfill({ contentType: 'application/json', json: financeEntries.filter((entry) => balanceOf(entry.id) > 0).map((entry) => ({ amount: entry.amount, balance: balanceOf(entry.id), computed_status: 'pending', days_overdue: 0, description: entry.description, due_date: '2026-08-20', item_id: entry.id, settled_amount: paidOf(entry.id), source_id: entry.id, source_type: 'financial_entry', total_count: 1 })), status: 200 })
      return
    }

    if (url.pathname.endsWith('/rpc/list_financial_entries') || url.pathname.endsWith('/rpc/list_finance_receivables')) {
      await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
      return
    }

    await route.fulfill({ contentType: 'application/json', json: [], status: 200 })
  })

  function signedQuantity(type: MovementType, quantity: number) {
    return ['initial_stock', 'purchase', 'adjustment_in', 'return'].includes(type) ? quantity : -quantity
  }

  function stockOf(materialId: string) {
    return movements.filter((movement) => movement.material_id === materialId).reduce((sum, movement) => sum + signedQuantity(movement.movement_type, movement.quantity), 0)
  }

  function addMovement(materialId: string, type: MovementType, quantity: number, unitCost: number | null, notes: string | null, referenceId: string | null) {
    const movement: Movement = { id: `movement-${movements.length + 1}`, material_id: materialId, movement_type: type, notes, occurred_at: now, quantity, reference_id: referenceId, reference_type: referenceId ? 'purchase' : null, unit_cost: unitCost }
    movements = [movement, ...movements]
    return movement
  }

  function toMaterialRow(material: Material) {
    const currentStock = stockOf(material.id)
    return { category_id: material.category_id, category_name: categories.find((category) => category.id === material.category_id)?.name ?? null, created_at: now, current_stock: currentStock, is_active: material.is_active, last_unit_cost: null, material_id: material.id, minimum_stock: material.minimum_stock, name: material.name, notes: material.notes, stock_status: currentStock <= 0 ? 'out' : currentStock <= material.minimum_stock ? 'low' : 'ok', total_count: materials.length, unit: material.unit, updated_at: now }
  }

  function toMovementRow(movement: Movement) {
    return { created_at: now, material_id: movement.material_id, movement_id: movement.id, movement_type: movement.movement_type, notes: movement.notes, occurred_at: movement.occurred_at, quantity: movement.quantity, reference_id: movement.reference_id, reference_type: movement.reference_type, signed_quantity: signedQuantity(movement.movement_type, movement.quantity), total_count: movements.length, unit_cost: movement.unit_cost }
  }

  function purchaseTotal(purchase: Purchase) {
    return purchase.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  }

  function paidOf(entryId: string) {
    return settlements.filter((settlement) => settlement.financial_entry_id === entryId).reduce((sum, settlement) => sum + settlement.amount, 0)
  }

  function balanceOf(entryId: string) {
    const entry = financeEntries.find((candidate) => candidate.id === entryId)
    return Math.max((entry?.amount ?? 0) - paidOf(entryId), 0)
  }

  function toPurchaseRow(purchase: Purchase) {
    const total = purchaseTotal(purchase)
    const paid = purchase.financial_entry_id ? paidOf(purchase.financial_entry_id) : 0
    return { balance: Math.max(total - paid, 0), due_date: purchase.due_date, finance_status: purchase.status === 'draft' ? 'draft' : paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending', financial_entry_id: purchase.financial_entry_id, items_count: purchase.items.length, notes: null, paid_amount: paid, purchase_date: purchase.purchase_date, purchase_id: purchase.id, received_at: purchase.status === 'received' ? now : null, status: purchase.status, supplier_id: purchase.supplier_id, supplier_name: suppliers.find((supplier) => supplier.id === purchase.supplier_id)?.name ?? null, total_amount: total, total_count: purchases.length }
  }

  function toPurchaseDetail(purchase: Purchase) {
    return { ...toPurchaseRow(purchase), items: purchase.items.map((item) => ({ material_id: item.materialId, material_name: materials.find((material) => material.id === item.materialId)?.name ?? 'Material', quantity: item.quantity, total_amount: item.quantity * item.unitCost, unit: materials.find((material) => material.id === item.materialId)?.unit ?? 'unit', unit_cost: item.unitCost })) }
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Senha').fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()

  await page.goto('/materiais')
  await expect(page.getByRole('heading', { name: 'Materiais' })).toBeVisible()
  await expect(page.getByText('Nenhum material encontrado.')).toBeVisible()

  await page.getByRole('button', { name: 'Novo material' }).first().click()
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Nome').fill('Tinta Branca')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Categoria').selectOption('cat-paints')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Unidade').selectOption('bottle')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Estoque minimo').fill('3')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Estoque inicial').fill('10')
  await page.getByRole('dialog', { name: 'Novo material' }).getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Material criado.')).toBeVisible()
  await expect(page.getByText('10 frasco').first()).toBeVisible()

  await page.getByRole('button', { name: 'Novo material' }).first().click()
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Nome').fill('Papel A3')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Categoria').selectOption('cat-paints')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Unidade').selectOption('sheet')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Estoque minimo').fill('20')
  await page.getByRole('dialog', { name: 'Novo material' }).getByRole('button', { name: 'Salvar' }).click()

  await page.locator('article').filter({ hasText: 'Tinta Branca' }).getByRole('button', { name: 'Consumo' }).first().click()
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByLabel('Quantidade').fill('3')
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('Movimentacao registrada.')).toBeVisible()
  await expect(page.getByText('7 frasco').first()).toBeVisible()

  await page.locator('article').filter({ hasText: 'Tinta Branca' }).getByRole('button', { name: 'Ver' }).click()
  await page.getByRole('button', { name: 'Registrar perda' }).click()
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByLabel('Quantidade').fill('2')
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByLabel('Motivo').fill('Material danificado')
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('5 frasco').first()).toBeVisible()

  await page.getByRole('button', { name: 'Ajustar estoque' }).click()
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByLabel('Estoque contado').fill('4')
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByLabel('Motivo').fill('Contagem fisica')
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('4 frasco').first()).toBeVisible()

  await page.getByRole('button', { name: 'Registrar consumo' }).click()
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByLabel('Quantidade').fill('20')
  await page.getByRole('dialog', { name: 'Movimentar estoque' }).getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText('Nao foi possivel movimentar estoque.')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar' }).first().click()

  await page.getByRole('button', { name: 'Fornecedores' }).click()
  await page.getByRole('button', { name: 'Novo fornecedor' }).click()
  await page.getByRole('dialog', { name: 'Novo fornecedor' }).getByLabel('Nome').fill('Papelaria Central')
  await page.getByRole('dialog', { name: 'Novo fornecedor' }).getByLabel('Telefone').fill('11999990000')
  await page.getByRole('dialog', { name: 'Novo fornecedor' }).getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Fornecedor criado.')).toBeVisible()

  await page.getByRole('button', { name: 'Compras' }).click()
  await page.getByRole('button', { name: 'Nova compra' }).first().click()
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Fornecedor').selectOption('supplier-1')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Material').selectOption('material-1')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Quantidade').fill('10')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Custo unitario').fill('10')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Material').nth(1).selectOption('material-2')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Quantidade').nth(1).fill('20')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Custo unitario').nth(1).fill('2')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Compra salva em rascunho.')).toBeVisible()
  await expect(page.locator('article').filter({ hasText: 'Papelaria Central' }).getByText('Rascunho')).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page.getByText('Compra recebida.')).toBeVisible()
  await expect(page.getByText('A pagar').first()).toBeVisible()

  await page.getByRole('button', { name: 'Estoque' }).click()
  await expect(page.locator('article').filter({ hasText: 'Tinta Branca' }).getByText('14 frasco').first()).toBeVisible()
  await expect(page.locator('article').filter({ hasText: 'Papel A3' }).getByText('20 folha').first()).toBeVisible()

  await page.getByRole('button', { name: 'Compras' }).click()
  await page.getByRole('button', { name: 'Nova compra' }).first().click()
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Material').selectOption('material-2')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Quantidade').fill('5')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Custo unitario').fill('2')
  await page.getByRole('dialog', { name: 'Nova compra' }).getByLabel('Registrar pagamento agora ao receber').check()
  await page.getByRole('dialog', { name: 'Nova compra' }).getByRole('button', { name: 'Confirmar recebimento' }).click()
  await expect(page.getByText('Compra recebida.')).toBeVisible()

  await page.goto('/financeiro')
  await expect(page.getByRole('heading', { name: 'Financeiro' })).toBeVisible()
  await expect(page.getByText('Compra de materiais').first()).toBeVisible()

  expect(rpcRequests).toEqual(expect.arrayContaining(['POST create_material', 'POST record_inventory_movement', 'POST upsert_supplier', 'POST create_purchase', 'POST receive_purchase', 'POST list_finance_cash_flow']))
  expect(consoleErrors.filter((message) => !message.includes('400 (Bad Request)'))).toEqual([])
})

import { db, TENANT_ID, BRANCH_ID, ctx } from '../setup'

const uid = () => Math.random().toString(36).slice(2, 8)
const inserted: string[] = []

afterAll(async () => {
  if (inserted.length > 0) await db.from('uniform_items').delete().in('id', inserted)
})

const makeItem = () => ({
  tenant_id: TENANT_ID,
  branch_id: BRANCH_ID,
  category_id: ctx.uniformCategoryId,
  item_type: 'shirt' as const,
  item_subtype_id: ctx.itemSubtypeId,
  position_code: `TEST${uid()}`,
  set_number: 1,
  qr_code: `qr-test-${uid()}`,
  current_status: 'in_store' as const,
  asset_state_id: ctx.assetStateInStoreId,
})

describe('uniform_items', () => {
  it('reads seed items for the branch', async () => {
    const { data, error } = await db.from('uniform_items').select('*')
      .eq('tenant_id', TENANT_ID).eq('branch_id', BRANCH_ID).limit(10)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('reads with category and asset_state joins', async () => {
    const { data, error } = await db.from('uniform_items')
      .select('id, current_status, category:uniform_categories(id,name), asset_state:asset_states(id,name)')
      .eq('tenant_id', TENANT_ID).limit(1).single()
    expect(error).toBeNull()
    expect(data).toHaveProperty('category')
    expect(data).toHaveProperty('asset_state')
  })

  it('reads with current_staff join', async () => {
    const { data, error } = await db.from('uniform_items')
      .select('id, current_status, current_staff:current_staff_id(name)')
      .eq('tenant_id', TENANT_ID).limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('inserts a new uniform item', async () => {
    const payload = makeItem()
    const { data, error } = await db.from('uniform_items').insert(payload).select().single()
    expect(error).toBeNull()
    expect(data!.position_code).toBe(payload.position_code)
    expect(data!.current_status).toBe('in_store')
    inserted.push(data!.id)
  })

  it('inserts with optional size field', async () => {
    const { data, error } = await db.from('uniform_items')
      .insert({ ...makeItem(), size: 'L' }).select().single()
    expect(error).toBeNull()
    expect(data!.size).toBe('L')
    inserted.push(data!.id)
  })

  it('updates current_status', async () => {
    const { data: item } = await db.from('uniform_items').insert(makeItem()).select().single()
    inserted.push(item!.id)
    const { error } = await db.from('uniform_items').update({ current_status: 'in_laundry' }).eq('id', item!.id)
    expect(error).toBeNull()
    const { data: updated } = await db.from('uniform_items').select('current_status').eq('id', item!.id).single()
    expect(updated!.current_status).toBe('in_laundry')
  })

  it('updates size', async () => {
    const { data: item } = await db.from('uniform_items').insert(makeItem()).select().single()
    inserted.push(item!.id)
    const { error } = await db.from('uniform_items').update({ size: 'XL' }).eq('id', item!.id)
    expect(error).toBeNull()
    const { data: updated } = await db.from('uniform_items').select('size').eq('id', item!.id).single()
    expect(updated!.size).toBe('XL')
  })

  it('deletes a uniform item', async () => {
    const { data: item } = await db.from('uniform_items').insert(makeItem()).select().single()
    const { error } = await db.from('uniform_items').delete().eq('id', item!.id)
    expect(error).toBeNull()
    const { data: gone } = await db.from('uniform_items').select('id').eq('id', item!.id)
    expect(gone!.length).toBe(0)
  })
})

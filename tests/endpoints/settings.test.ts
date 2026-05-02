import { db, TENANT_ID } from '../setup'

const uid = () => Math.random().toString(36).slice(2, 8)

// ── asset_states ──────────────────────────────────────────────────
describe('asset_states', () => {
  const inserted: string[] = []
  afterAll(async () => { if (inserted.length > 0) await db.from('asset_states').delete().in('id', inserted) })

  it('reads seed asset states', async () => {
    const { data, error } = await db.from('asset_states').select('*').eq('tenant_id', TENANT_ID)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('inserts an asset state', async () => {
    const { data, error } = await db.from('asset_states')
      .insert({ tenant_id: TENANT_ID, name: `State ${uid()}`, color_hex: '#aabbcc', sort_order: 99, is_assigned_state: false, is_initial_state: false })
      .select().single()
    expect(error).toBeNull()
    inserted.push(data!.id)
  })

  it('updates an asset state', async () => {
    const { data: s } = await db.from('asset_states')
      .insert({ tenant_id: TENANT_ID, name: `State ${uid()}`, color_hex: '#aabbcc', sort_order: 99, is_assigned_state: false, is_initial_state: false })
      .select().single()
    inserted.push(s!.id)
    const { error } = await db.from('asset_states').update({ name: 'Updated State' }).eq('id', s!.id)
    expect(error).toBeNull()
  })

  it('deletes an asset state', async () => {
    const { data: s } = await db.from('asset_states')
      .insert({ tenant_id: TENANT_ID, name: `State ${uid()}`, color_hex: '#aabbcc', sort_order: 99, is_assigned_state: false, is_initial_state: false })
      .select().single()
    const { error } = await db.from('asset_states').delete().eq('id', s!.id)
    expect(error).toBeNull()
  })
})

// ── staff_categories ──────────────────────────────────────────────
describe('staff_categories', () => {
  const inserted: string[] = []
  afterAll(async () => { if (inserted.length > 0) await db.from('staff_categories').delete().in('id', inserted) })

  it('reads seed staff categories', async () => {
    const { data, error } = await db.from('staff_categories').select('*').eq('tenant_id', TENANT_ID)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('inserts a staff category', async () => {
    const { data, error } = await db.from('staff_categories')
      .insert({ tenant_id: TENANT_ID, name: `Cat ${uid()}`, color_hex: '#aabbcc', sort_order: 99 })
      .select().single()
    expect(error).toBeNull()
    inserted.push(data!.id)
  })

  it('updates a staff category', async () => {
    const { data: c } = await db.from('staff_categories')
      .insert({ tenant_id: TENANT_ID, name: `Cat ${uid()}`, color_hex: '#aabbcc', sort_order: 99 })
      .select().single()
    inserted.push(c!.id)
    const { error } = await db.from('staff_categories').update({ name: 'Updated Cat' }).eq('id', c!.id)
    expect(error).toBeNull()
  })

  it('deletes a staff category', async () => {
    const { data: c } = await db.from('staff_categories')
      .insert({ tenant_id: TENANT_ID, name: `Cat ${uid()}`, color_hex: '#aabbcc', sort_order: 99 })
      .select().single()
    const { error } = await db.from('staff_categories').delete().eq('id', c!.id)
    expect(error).toBeNull()
  })
})

// ── item_subtypes ─────────────────────────────────────────────────
describe('item_subtypes', () => {
  const inserted: string[] = []
  afterAll(async () => { if (inserted.length > 0) await db.from('item_subtypes').delete().in('id', inserted) })

  it('reads seed item subtypes', async () => {
    const { data, error } = await db.from('item_subtypes').select('*').eq('tenant_id', TENANT_ID)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('inserts an item subtype', async () => {
    const { data, error } = await db.from('item_subtypes')
      .insert({ tenant_id: TENANT_ID, name: `Sub ${uid()}`, sort_order: 99 })
      .select().single()
    expect(error).toBeNull()
    inserted.push(data!.id)
  })

  it('updates an item subtype', async () => {
    const { data: s } = await db.from('item_subtypes')
      .insert({ tenant_id: TENANT_ID, name: `Sub ${uid()}`, sort_order: 99 })
      .select().single()
    inserted.push(s!.id)
    const { error } = await db.from('item_subtypes').update({ name: 'Updated Sub' }).eq('id', s!.id)
    expect(error).toBeNull()
  })

  it('deletes an item subtype', async () => {
    const { data: s } = await db.from('item_subtypes')
      .insert({ tenant_id: TENANT_ID, name: `Sub ${uid()}`, sort_order: 99 })
      .select().single()
    const { error } = await db.from('item_subtypes').delete().eq('id', s!.id)
    expect(error).toBeNull()
  })
})

// ── uniform_categories (read-only in app) ─────────────────────────
describe('uniform_categories', () => {
  it('reads seed uniform categories', async () => {
    const { data, error } = await db.from('uniform_categories').select('*').eq('tenant_id', TENANT_ID)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('returned rows have expected shape', async () => {
    const { data } = await db.from('uniform_categories').select('id, name, code_prefix, color_hex').eq('tenant_id', TENANT_ID).limit(1).single()
    expect(data).toMatchObject({ id: expect.any(String), name: expect.any(String) })
  })
})

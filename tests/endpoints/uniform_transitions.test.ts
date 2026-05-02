import { db, TENANT_ID, BRANCH_ID, MGR_ID, ctx } from '../setup'

const uid = () => Math.random().toString(36).slice(2, 8)

describe('uniform_transitions', () => {
  it('reads transition history for the tenant', async () => {
    const { data, error } = await db.from('uniform_transitions').select('*')
      .eq('tenant_id', TENANT_ID).order('created_at', { ascending: false }).limit(10)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('returned rows have expected shape', async () => {
    const { data } = await db.from('uniform_transitions')
      .select('id, tenant_id, uniform_item_id, from_status, to_status, staff_id, performed_by, notes, created_at')
      .eq('tenant_id', TENANT_ID).limit(1).single()
    expect(data).toMatchObject({
      id: expect.any(String),
      tenant_id: TENANT_ID,
      uniform_item_id: expect.any(String),
      to_status: expect.any(String),
    })
  })

  it('can join to uniform_items', async () => {
    const { data, error } = await db.from('uniform_transitions')
      .select('id, to_status, uniform_item:uniform_item_id(id, position_code)')
      .eq('tenant_id', TENANT_ID).limit(3)
    expect(error).toBeNull()
    expect(data![0]).toHaveProperty('uniform_item')
  })
})

describe('transition_uniform RPC', () => {
  let itemId: string

  beforeAll(async () => {
    // Create a fresh item to transition so seed data stays intact
    const { data } = await db.from('uniform_items').insert({
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      category_id: ctx.uniformCategoryId,
      item_type: 'shirt',
      item_subtype_id: ctx.itemSubtypeId,
      position_code: `RPC${uid()}`,
      set_number: 1,
      qr_code: `rpc-test-${uid()}`,
      current_status: 'in_store',
      asset_state_id: ctx.assetStateInStoreId,
    }).select('id').single()
    itemId = data!.id
  })

  afterAll(async () => {
    if (itemId) await db.from('uniform_items').delete().eq('id', itemId)
  })

  it('transitions item to with_staff', async () => {
    const { error } = await db.rpc('transition_uniform', {
      p_item_id:      itemId,
      p_new_status:   'with_staff',
      p_staff_id:     ctx.staffMemberId,
      p_performed_by: MGR_ID,
      p_notes:        '[test]',
    })
    expect(error).toBeNull()

    const { data } = await db.from('uniform_items')
      .select('current_status, current_staff_id').eq('id', itemId).single()
    expect(data!.current_status).toBe('with_staff')
    expect(data!.current_staff_id).toBe(ctx.staffMemberId)
  })

  it('creates a transition row as a side effect', async () => {
    const { data } = await db.from('uniform_transitions')
      .select('to_status, staff_id, notes')
      .eq('uniform_item_id', itemId)
      .order('created_at', { ascending: false }).limit(1).single()
    expect(data!.to_status).toBe('with_staff')
    expect(data!.staff_id).toBe(ctx.staffMemberId)
    expect(data!.notes).toBe('[test]')
  })

  it('transitions item to in_laundry without clearing staff assignment', async () => {
    const { error } = await db.rpc('transition_uniform', {
      p_item_id:      itemId,
      p_new_status:   'in_laundry',
      p_staff_id:     null,
      p_performed_by: MGR_ID,
      p_notes:        null,
    })
    expect(error).toBeNull()

    const { data } = await db.from('uniform_items')
      .select('current_status, current_staff_id').eq('id', itemId).single()
    expect(data!.current_status).toBe('in_laundry')
    // Staff assignment persists — uniform is still tracked to the same person
    expect(data!.current_staff_id).toBe(ctx.staffMemberId)
  })

  it('returns an error for a non-existent item id', async () => {
    const { error } = await db.rpc('transition_uniform', {
      p_item_id:      '00000000-0000-0000-0000-000000000000',
      p_new_status:   'in_store',
      p_staff_id:     null,
      p_performed_by: MGR_ID,
      p_notes:        null,
    })
    expect(error).not.toBeNull()
  })
})

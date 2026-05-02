import { db, TENANT_ID, BRANCH_ID, ctx } from '../setup'

const uid = () => Math.random().toString(36).slice(2, 8)
const inserted: string[] = []

afterAll(async () => {
  if (inserted.length > 0) await db.from('staff_members').delete().in('id', inserted)
})

describe('staff_members', () => {
  it('reads active staff for the branch', async () => {
    const { data, error } = await db.from('staff_members').select('*')
      .eq('tenant_id', TENANT_ID).eq('branch_id', BRANCH_ID).eq('is_active', true)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })

  it('reads with staff_category join', async () => {
    const { data, error } = await db.from('staff_members')
      .select('id, name, staff_category:staff_categories(id, name)')
      .eq('tenant_id', TENANT_ID).limit(1).single()
    expect(error).toBeNull()
    expect(data).toHaveProperty('staff_category')
  })

  it('inserts a new staff member', async () => {
    const { data, error } = await db.from('staff_members').insert({
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      name: `Test Staff ${uid()}`,
      role_category: 'chef',
      staff_category_id: ctx.staffCategoryId,
    }).select().single()
    expect(error).toBeNull()
    expect(data!.is_active).toBe(true)
    inserted.push(data!.id)
  })

  it('updates a staff member name', async () => {
    const { data: s } = await db.from('staff_members').insert({
      tenant_id: TENANT_ID, branch_id: BRANCH_ID, name: `Test ${uid()}`, role_category: 'chef',
    }).select().single()
    inserted.push(s!.id)
    const { error } = await db.from('staff_members').update({ name: 'Updated Staff' }).eq('id', s!.id)
    expect(error).toBeNull()
  })

  it('marks a staff member as inactive', async () => {
    const { data: s } = await db.from('staff_members').insert({
      tenant_id: TENANT_ID, branch_id: BRANCH_ID, name: `Test ${uid()}`, role_category: 'chef',
    }).select().single()
    inserted.push(s!.id)
    const { error } = await db.from('staff_members').update({ is_active: false }).eq('id', s!.id)
    expect(error).toBeNull()
    const { data: check } = await db.from('staff_members').select('is_active').eq('id', s!.id).single()
    expect(check!.is_active).toBe(false)
  })
})

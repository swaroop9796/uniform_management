import { db, TENANT_ID, OWNER_ID } from '../setup'

describe('profiles', () => {
  it('reads all profiles for the tenant', async () => {
    const { data, error } = await db.from('profiles').select('*').eq('tenant_id', TENANT_ID)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(2)
  })

  it('reads the owner profile by id', async () => {
    const { data, error } = await db.from('profiles').select('id, role, full_name').eq('id', OWNER_ID).single()
    expect(error).toBeNull()
    expect(data!.role).toBe('owner')
    expect(data!.full_name).toBe('Vikas')
  })
})

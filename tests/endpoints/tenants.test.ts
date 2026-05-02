import { db, TENANT_ID } from '../setup'

describe('tenants', () => {
  it('reads the seed tenant', async () => {
    const { data, error } = await db.from('tenants').select('*').eq('id', TENANT_ID).single()
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.name).toBe('Bengaluru Cafe')
  })

  it('updates name and restores it', async () => {
    const original = 'Bengaluru Cafe'
    const { error } = await db.from('tenants').update({ name: 'Test Name' }).eq('id', TENANT_ID)
    expect(error).toBeNull()

    const { data } = await db.from('tenants').select('name').eq('id', TENANT_ID).single()
    expect(data!.name).toBe('Test Name')

    await db.from('tenants').update({ name: original }).eq('id', TENANT_ID)
  })
})

import { db, TENANT_ID, BRANCH_ID } from '../setup'

const uid = () => Math.random().toString(36).slice(2, 8)
const inserted: string[] = []

afterAll(async () => {
  if (inserted.length > 0) await db.from('branches').delete().in('id', inserted)
})

describe('branches', () => {
  it('reads seed branches', async () => {
    const { data, error } = await db.from('branches').select('*').eq('tenant_id', TENANT_ID)
    expect(error).toBeNull()
    expect(data!.some(b => b.id === BRANCH_ID)).toBe(true)
  })

  it('inserts a new branch', async () => {
    const { data, error } = await db
      .from('branches').insert({ tenant_id: TENANT_ID, name: `Test Branch ${uid()}` })
      .select().single()
    expect(error).toBeNull()
    inserted.push(data!.id)
  })

  it('updates a branch name', async () => {
    const { data: b } = await db.from('branches').insert({ tenant_id: TENANT_ID, name: `Test ${uid()}` }).select().single()
    inserted.push(b!.id)
    const { error } = await db.from('branches').update({ name: 'Updated' }).eq('id', b!.id)
    expect(error).toBeNull()
    const { data: updated } = await db.from('branches').select('name').eq('id', b!.id).single()
    expect(updated!.name).toBe('Updated')
  })

  it('deletes a branch', async () => {
    const { data: b } = await db.from('branches').insert({ tenant_id: TENANT_ID, name: `Del ${uid()}` }).select().single()
    const { error } = await db.from('branches').delete().eq('id', b!.id)
    expect(error).toBeNull()
    const { data: gone } = await db.from('branches').select('id').eq('id', b!.id)
    expect(gone!.length).toBe(0)
  })
})

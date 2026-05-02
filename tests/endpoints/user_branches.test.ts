import { db, OWNER_ID, MGR_ID, BRANCH_ID } from '../setup'

describe('user_branches', () => {
  it('reads branch assignments for the owner', async () => {
    const { data, error } = await db.from('user_branches').select('*').eq('user_id', OWNER_ID)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('the branch manager is assigned to the seed branch', async () => {
    const { data } = await db.from('user_branches').select('branch_id').eq('user_id', MGR_ID)
    const branchIds = (data ?? []).map((r: { branch_id: string }) => r.branch_id)
    expect(branchIds).toContain(BRANCH_ID)
  })
})

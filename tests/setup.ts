import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!key) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not set. Create .env.test.local — see .env.test.example')
}

export const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Hardcoded from seed.sql
export const TENANT_ID = 'b1000000-0000-0000-0000-000000000001'
export const BRANCH_ID = 'b2000000-0000-0000-0000-000000000001'
export const OWNER_ID  = 'b3000000-0000-0000-0000-000000000001'
export const MGR_ID    = 'b3000000-0000-0000-0000-000000000002'

// Fetched from DB — seed_company_defaults uses gen_random_uuid()
export const ctx = {
  uniformCategoryId: '',
  uniformItemId: '',
  staffMemberId: '',
  staffCategoryId: '',
  assetStateInStoreId: '',
  assetStateWithStaffId: '',
  itemSubtypeId: '',
}

beforeAll(async () => {
  const assertSeed = (label: string, val: unknown) => {
    if (!val) throw new Error(`Seed row not found: ${label}. Run \`supabase db reset\` first.`)
  }

  const [
    { data: tenant },
    { data: cat },
    { data: item },
    { data: staff },
    { data: sCat },
    { data: stateStore },
    { data: stateStaff },
    { data: subtype },
  ] = await Promise.all([
    db.from('tenants').select('id').eq('id', TENANT_ID).single(),
    db.from('uniform_categories').select('id').eq('tenant_id', TENANT_ID).limit(1).single(),
    db.from('uniform_items').select('id').eq('tenant_id', TENANT_ID).limit(1).single(),
    db.from('staff_members').select('id').eq('tenant_id', TENANT_ID).limit(1).single(),
    db.from('staff_categories').select('id').eq('tenant_id', TENANT_ID).limit(1).single(),
    db.from('asset_states').select('id').eq('tenant_id', TENANT_ID).eq('name', 'In Store').single(),
    db.from('asset_states').select('id').eq('tenant_id', TENANT_ID).eq('name', 'With Staff').single(),
    db.from('item_subtypes').select('id').eq('tenant_id', TENANT_ID).limit(1).single(),
  ])

  assertSeed('tenant', tenant)
  assertSeed('uniform_category', cat)
  assertSeed('uniform_item', item)
  assertSeed('staff_member', staff)
  assertSeed('staff_category', sCat)
  assertSeed('asset_state In Store', stateStore)
  assertSeed('asset_state With Staff', stateStaff)
  assertSeed('item_subtype', subtype)

  ctx.uniformCategoryId    = cat!.id
  ctx.uniformItemId        = item!.id
  ctx.staffMemberId        = staff!.id
  ctx.staffCategoryId      = sCat!.id
  ctx.assetStateInStoreId  = stateStore!.id
  ctx.assetStateWithStaffId = stateStaff!.id
  ctx.itemSubtypeId        = subtype!.id
}, 20000)

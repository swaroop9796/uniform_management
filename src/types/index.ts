// ── Roles ─────────────────────────────────────────────────
export type UserRole = 'owner' | 'store_manager'

// ── Legacy enums (kept for backwards compat during Phase 5 migration) ──
export type RoleCategory = 'chef' | 'counter' | 'cashier' | 'supervisor' | 'hk_boys' | 'hk_ladies'
export type UniformStatus = 'with_staff' | 'in_laundry' | 'in_store' | 'damaged' | 'lost'
export type ItemType = 'shirt' | 'pant' | 'apron'
export type Shift = '1' | '2' | 'both'

// ── Core entities ──────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  tenant_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  branch_id?: string | null  // deprecated — use user_branches table
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}

// ── Config tables (formerly hardcoded) ────────────────────
export interface StaffCategory {
  id: string
  tenant_id: string
  name: string
  color_hex: string
  sort_order: number
  created_at: string
}

export interface AssetState {
  id: string
  tenant_id: string
  name: string
  color_hex: string
  sort_order: number
  is_assigned_state: boolean  // true = "with a person" (drives staff picker logic)
  is_initial_state: boolean   // true = default for new items
  created_at: string
}

export interface ItemSubtype {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

// ── User management ────────────────────────────────────────
export interface UserBranch {
  user_id: string
  branch_id: string
  created_at: string
}

export interface UserInvitation {
  id: string
  tenant_id: string
  email: string
  role: 'store_manager'
  branch_ids: string[]
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// ── Operational entities ───────────────────────────────────
export interface StaffMember {
  id: string
  tenant_id: string
  branch_id: string
  employee_code: string
  name: string
  role_category: RoleCategory    // legacy text column
  shift: Shift
  is_active: boolean
  staff_category_id: string | null  // new FK → staff_categories
  created_at: string
  updated_at: string
  staff_category?: StaffCategory    // joined
}

export interface UniformCategory {
  id: string
  tenant_id: string
  name: string
  code_prefix: string
  has_shirt: boolean
  has_pant: boolean
  has_apron: boolean
  color_hex: string
}

export interface UniformItem {
  id: string
  tenant_id: string
  branch_id: string
  category_id: string
  item_type: ItemType           // legacy text column
  item_subtype_id: string | null  // new FK → item_subtypes
  position_code: string
  set_number: 1 | 2
  qr_code: string
  current_status: UniformStatus  // legacy text column
  asset_state_id: string | null  // new FK → asset_states
  current_staff_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  category?: UniformCategory
  current_staff?: StaffMember
  asset_state?: AssetState
  item_subtype?: ItemSubtype
}

export interface UniformTransition {
  id: string
  tenant_id: string
  uniform_item_id: string
  from_status: UniformStatus | null  // legacy
  to_status: UniformStatus           // legacy
  from_state_id: string | null       // new FK
  to_state_id: string | null         // new FK
  staff_id: string | null
  performed_by: string | null
  notes: string | null
  created_at: string
  staff?: StaffMember
  performer?: Profile
  uniform_item?: UniformItem
  from_state?: AssetState
  to_state?: AssetState
}

// ── Legacy label maps (used while app migrates to DB-driven config) ──
export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  chef: 'Chef',
  counter: 'Counter',
  cashier: 'Cashier',
  supervisor: 'Supervisor',
  hk_boys: 'HK Boys',
  hk_ladies: 'HK Ladies',
}

export const STATUS_LABELS: Record<UniformStatus, string> = {
  with_staff: 'With Staff',
  in_laundry: 'In Laundry',
  in_store: 'In Store',
  damaged: 'Damaged',
  lost: 'Lost',
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  shirt: 'Shirt',
  pant: 'Pant',
  apron: 'Apron',
}

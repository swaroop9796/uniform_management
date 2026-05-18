import { supabase } from '@/lib/supabase'

const from = () => supabase.from('uniform_items')

export const itemService = {
  list: (branchId: string) =>
    from()
      .select('*, category:category_id(*), current_staff:current_staff_id(name)')
      .is('deleted_at', null)
      .eq('branch_id', branchId)
      .order('position_code').order('set_number').order('item_type'),

  listAll: () =>
    from()
      .select('*, category:category_id(*), current_staff:current_staff_id(name)')
      .is('deleted_at', null)
      .order('position_code').order('set_number').order('item_type'),

  get: (id: string) =>
    from()
      .select('*, category:category_id(*), current_staff:current_staff_id(*)')
      .is('deleted_at', null)
      .eq('id', id).single(),

  byBarcode: (barcode: string) =>
    from()
      .select('*, category:category_id(*), current_staff:current_staff_id(*)')
      .is('deleted_at', null)
      .eq('barcode', barcode.trim()).single(),

  forStaff: (staffId: string) =>
    from()
      .select('*, category:category_id(*)')
      .is('deleted_at', null)
      .eq('current_staff_id', staffId)
      .order('position_code'),

  linkedViaTransitions: (itemIds: string[]) =>
    from()
      .select('*, category:category_id(*)')
      .is('deleted_at', null)
      .in('id', itemIds)
      .order('position_code'),

  countForStaffByType: (staffId: string, itemType: string) =>
    from()
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('current_staff_id', staffId)
      .eq('item_type', itemType),

  countForBranch: (branchId: string) =>
    from()
      .select('id, current_status, category_id')
      .is('deleted_at', null)
      .eq('branch_id', branchId),

  countAssigned: (branchId: string) =>
    from()
      .select('current_staff_id')
      .is('deleted_at', null)
      .eq('branch_id', branchId)
      .not('current_staff_id', 'is', null),

  search: (branchId: string, query: string) =>
    from()
      .select('barcode, position_code, item_type, set_number, current_status, category:category_id(name)')
      .is('deleted_at', null)
      .eq('branch_id', branchId)
      .ilike('barcode', `%${query}%`)
      .limit(8),

  insert: (data: Record<string, unknown>) =>
    from().insert(data).select().single(),

  update: (id: string, data: Record<string, unknown>) =>
    from().update(data).eq('id', id),

  softDelete: (id: string) =>
    from().update({ deleted_at: new Date().toISOString() }).eq('id', id),
}

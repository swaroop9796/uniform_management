import { supabase } from '@/lib/supabase'

export const staffService = {
  listActive: (branchId: string) =>
    supabase.from('staff_members')
      .select('*')
      .eq('is_active', true)
      .eq('branch_id', branchId)
      .order('name', { ascending: true }),

  listAll: (branchId: string) =>
    supabase.from('staff_members')
      .select('*')
      .eq('branch_id', branchId)
      .order('name', { ascending: true }),

  get: (staffId: string) =>
    supabase.from('staff_members')
      .select('*')
      .eq('id', staffId)
      .single(),

  insert: (data: Record<string, unknown>) =>
    supabase.from('staff_members').insert(data),

  update: (id: string, data: Record<string, unknown>) =>
    supabase.from('staff_members').update(data).eq('id', id),

  deactivate: (id: string) =>
    supabase.from('staff_members')
      .update({ is_active: false })
      .eq('id', id),
}

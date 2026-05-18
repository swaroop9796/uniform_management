import { createClient } from '@supabase/supabase-js'

// Use the current origin so the proxy works whether accessing from localhost or the network IP (phone)
const supabaseUrl = window.location.origin
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export const useSupabase = (): SupabaseClient<Database> => {
  const { $supabase } = useNuxtApp()
  return $supabase as SupabaseClient<Database>
}

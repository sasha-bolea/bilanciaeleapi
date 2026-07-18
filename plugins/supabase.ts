import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const supabase = createClient<Database>(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string
  )

  return {
    provide: { supabase }
  }
})

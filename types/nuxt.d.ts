import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database'

declare module '#app' {
  interface NuxtApp {
    $supabase: SupabaseClient<Database>
  }
}

export {}

import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const anonKey = config.public.supabaseAnonKey as string

  if (!url || !anonKey) {
    throw new Error(
      'Configurazione Supabase mancante: imposta le env vars NUXT_PUBLIC_SUPABASE_URL e ' +
        'NUXT_PUBLIC_SUPABASE_ANON_KEY (in locale nel .env, su Vercel nelle Environment Variables) ' +
        'e ridistribuisci.'
    )
  }

  const supabase = createClient<Database>(url, anonKey)

  return {
    provide: { supabase }
  }
})

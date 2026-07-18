export default defineNuxtConfig({
  compatibilityDate: '2024-08-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  // I valori vengono forniti a runtime dalle env vars NUXT_PUBLIC_SUPABASE_URL
  // e NUXT_PUBLIC_SUPABASE_ANON_KEY (override automatico di Nuxt). I default a
  // stringa vuota garantiscono che le chiavi esistano per l'override sul server.
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: ''
    }
  },

  app: {
    head: {
      title: 'Bilance Arnie',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
      meta: [
        { name: 'theme-color', content: '#f2a71b' },
        { name: 'description', content: 'Monitoraggio peso arnie IoT' }
      ]
    }
  },

  typescript: {
    strict: true
  }
})

export default defineNuxtConfig({
  compatibilityDate: '2024-08-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
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

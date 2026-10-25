// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-25',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@sentry/nuxt'],
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
  sentry: {
    configDir: 'sentry',
  },
  css: [
    '@fontsource-variable/inter',
    '@fontsource/jetbrains-mono/400.css',
    '@fontsource/jetbrains-mono/500.css',
    '~/assets/css/main.css',
  ],
  nitro: {
    // Proxy handled by server/middleware/proxy.ts
  },
  devServer: {
    host: '0.0.0.0',
  },
  vite: {
    server: {
      allowedHosts: ['example.com', '.example.com', 'example.net', '.example.net', 'localhost'],
    },
  },
  routeRules: {
    '/dashboard/**': { ssr: false },
    '/admin/**': { ssr: false },
    '/profile': { ssr: false },
    '/profile/**': { ssr: false },
    '/tickets': { ssr: false },
    '/tickets/**': { ssr: false },
  },
});

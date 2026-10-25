export default defineNuxtPlugin(() => {
  const api = $fetch.create({
    credentials: 'include',
    onResponseError: async ({ response }) => {
      if (response.status !== 401) return;

      const requestPath = new URL(response.url).pathname;
      if (requestPath === '/api/auth/login' || requestPath === '/api/auth/register' || requestPath === '/api/auth/me') return;

      const route = useRoute();
      if (route.path.startsWith('/shop/') || route.path === '/') return;

      const auth = useAuthStore();
      auth.user = null;
      await navigateTo('/login');
    },
  });
  globalThis.$fetch = api;
});

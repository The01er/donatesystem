export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore();
  if (!auth.user && !auth.loading) {
    await auth.initialize();
  }

  if (!auth.user) return navigateTo('/login');

  try {
    await $fetch('/api/admin/me', { credentials: 'include' });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; status?: number; response?: { status?: number } };
    const code = err?.statusCode || err?.status || err?.response?.status;
    if (code === 401) {
      auth.logout();
      return navigateTo('/login');
    }
    if (code === 403) {
      return abortNavigation('Access denied');
    }
  }
});

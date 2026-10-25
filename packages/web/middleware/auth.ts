export default defineNuxtRouteMiddleware(async (_to) => {
  const auth = useAuthStore();
  if (!auth.user && !auth.loading) {
    await auth.initialize();
  }
  if (!auth.user) {
    return navigateTo('/login');
  }
});

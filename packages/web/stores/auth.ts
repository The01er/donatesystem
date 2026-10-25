import { defineStore } from 'pinia';
import type { User } from '~/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  async function initialize() {
    loading.value = true;
    try {
      const data = await $fetch<User | null>('/api/auth/me', { credentials: 'include' });
      if (data?.id) {
        user.value = data;
      }
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  function setAuth(u: User) {
    user.value = u;
  }

  function loadFromStorage() {
    // User data is fetched via initialize() — no localStorage needed
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      console.error('Logout request failed');
    }
    user.value = null;
  }

  return { user, loading, initialize, setAuth, loadFromStorage, logout };
});

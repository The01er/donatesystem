<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200"
  >
    <header
      class="border-b border-slate-200 bg-white/80 dark:bg-slate-800/80 dark:border-slate-700/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40"
    >
      <NuxtLink to="/" class="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
        <span v-if="brandName">{{ brandName }}</span>
        <span v-else>Donate<span class="text-slate-900 dark:text-white">Platform</span></span>
      </NuxtLink>
      <nav class="flex items-center gap-6">
        <NuxtLink to="/guides" class="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition">Гайды</NuxtLink>
        <ClientOnly fallback-tag="span">
          <template v-if="auth.user">
            <NuxtLink
              to="/dashboard"
              class="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition"
              >Панель управления</NuxtLink
            >
            <button
              @click="auth.logout()"
              class="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition"
            >
              Выйти
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition"
              >Войти</NuxtLink
            >
            <NuxtLink
              to="/register"
              class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Регистрация
            </NuxtLink>
          </template>
        </ClientOnly>
      </nav>
    </header>
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const brandName = ref('');

onMounted(async () => {
  try {
    const cfg = await $fetch<{ brandName?: string | null }>('/api/auth/public-config');
    if (cfg.brandName) brandName.value = cfg.brandName;
  } catch {}
});
</script>

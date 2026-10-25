<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 flex transition-colors duration-200"
  >
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex flex-col transition-transform lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-0.5">
        <NuxtLink to="/admin" class="text-base font-bold tracking-tight text-red-650 dark:text-red-400">
          Super<span class="text-slate-900 dark:text-white">Admin</span>
        </NuxtLink>
        <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{{ auth.user?.email }}</p>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NuxtLink
          v-for="item in visibleMenu"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 border"
          :class="
            route.path === item.to || (item.to !== '/admin' && route.path.startsWith(item.to))
              ? 'bg-red-50 text-red-650 border-red-100 dark:bg-slate-700/50 dark:text-red-400 dark:border-slate-700 font-semibold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border-transparent'
          "
          @click="sidebarOpen = false"
        >
          <span class="w-5 text-center text-xs shrink-0">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="border-t border-slate-100 dark:border-slate-700 p-3 space-y-2">
        <div class="flex items-center justify-between px-2 mb-1">
          <span
            class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[130px]"
            :title="auth.user?.email"
            >{{ auth.user?.email }}</span
          >
          <span
            v-if="staffRole"
            class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 uppercase tracking-wider"
            >{{ staffRole }}</span
          >
        </div>
        <ThemeToggle />
        <button
          @click="
            auth.logout();
            navigateTo('/');
          "
          class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700 transition"
        >
          Выйти
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 min-w-0 flex flex-col">
      <header
        class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-30"
      >
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="font-semibold text-sm">Супер-админка</span>
      </header>
      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const route = useRoute();
const sidebarOpen = ref(false);
const staffRole = ref('');

const menu = [
  { icon: '📊', label: 'Обзор', to: '/admin' },
  { icon: '👥', label: 'Пользователи', to: '/admin/users' },
  { icon: '🖥', label: 'Серверы', to: '/admin/servers' },
  { icon: '💰', label: 'Транзакции', to: '/admin/transactions' },
  { icon: '💳', label: 'Финансы', to: '/admin/finance' },
  { icon: '📰', label: 'Новости', to: '/admin/news' },
  { icon: '📝', label: 'Гайды', to: '/admin/guides' },
  { icon: '❓', label: 'FAQ', to: '/admin/faq' },
  { icon: '🎫', label: 'Тикеты', to: '/admin/tickets' },
  { icon: '👨‍💼', label: 'Персонал', to: '/admin/staff', roles: ['SUPER_ADMIN'] },
  { icon: '🏠', label: 'Лендинг', to: '/admin/landing', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { icon: '📄', label: 'Документы', to: '/admin/legal', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { icon: '⚙', label: 'Настройки', to: '/admin/settings', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

const visibleMenu = computed(() => menu.filter((item) => !item.roles || item.roles.includes(staffRole.value)));

provide('staffRole', staffRole);

onMounted(async () => {
  try {
    const data = await $fetch<{ role: string }>('/api/admin/me', { credentials: 'include' });
    staffRole.value = data.role;
  } catch (e: unknown) {
    console.error(e);
  }
});
</script>

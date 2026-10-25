<template>
  <div
    v-if="server"
    class="px-6 lg:px-8 py-8 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200"
  >
    <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{{ server.name }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2">
          <span
            class="uppercase text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 font-semibold rounded"
            >{{ server.gameType }}</span
          >
          <span class="font-mono">{{ server.ipAddress }}</span>
        </p>
      </div>
      <div>
        <a
          :href="server.shopUrl || `/shop/${server.slug}`"
          target="_blank"
          class="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
        >
          Открыть витрину
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>

    <!-- Mobile tabs row (hidden on lg+) -->
    <div class="flex lg:hidden border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto scrollbar-none">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.path === '' ? `/dashboard/${server.id}` : `/dashboard/${server.id}/${tab.path}`"
        class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 -mb-px"
        :class="
          activeTab === tab.key
            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        "
      >
        {{ tab.label }}
      </NuxtLink>
    </div>

    <!-- Desktop: content left + sidebar right -->
    <div class="flex flex-col lg:flex-row gap-8">
      <main class="flex-1 min-w-0">
        <NuxtPage />
      </main>

      <aside class="hidden lg:block lg:w-60 shrink-0">
        <nav class="flex-col gap-1.5 lg:sticky lg:top-24">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.key"
            :to="tab.path === '' ? `/dashboard/${server.id}` : `/dashboard/${server.id}/${tab.path}`"
            class="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border"
            :class="[
              tab.color,
              activeTab === tab.key
                ? tab.activeClass
                : 'border-transparent text-slate-500 hover:scale-[1.02] hover:shadow-md',
            ]"
          >
            <span
              class="text-lg shrink-0"
              :class="activeTab === tab.key ? '' : 'opacity-60 group-hover:opacity-100'"
              v-html="tab.icon"
            ></span>
            <span class="truncate">{{ tab.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
    </div>
  </div>
  <div v-else class="px-4 lg:px-8 py-20 text-center text-slate-500 dark:text-slate-400">
    <div v-if="loading" class="flex flex-col items-center gap-3">
      <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>Загрузка данных сервера...</span>
    </div>
    <div v-else>Сервер не найден</div>
  </div>
</template>

<script setup lang="ts">
import type { Server } from '~/types';
useHead({ title: 'Панель управления' });

const route = useRoute();
const auth = useAuthStore();
const serverId = route.params.id as string;
const server = ref<Server | null>(null);
const loading = ref(true);

provide('currentServer', server);

const tabs = computed(() => {
  const allTabs = [
    {
      key: 'index',
      label: 'Обзор',
      color: 'text-indigo-600',
      activeClass:
        'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
      path: '',
    },
    {
      key: 'products',
      label: 'Товары',
      color: 'text-emerald-600',
      activeClass:
        'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
      path: 'products',
    },
    {
      key: 'orders',
      label: 'Заказы',
      color: 'text-blue-600',
      activeClass:
        'bg-blue-50 border-blue-200 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>',
      path: 'orders',
    },
    {
      key: 'finance',
      label: 'Финансы',
      color: 'text-amber-600',
      activeClass:
        'bg-amber-50 border-amber-200 text-amber-700 shadow-sm dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      path: 'finance',
    },
    {
      key: 'team',
      label: 'Команда',
      color: 'text-rose-600',
      activeClass:
        'bg-rose-50 border-rose-200 text-rose-700 shadow-sm dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>',
      path: 'team',
    },
    {
      key: 'domain',
      label: 'Домен',
      color: 'text-violet-600',
      activeClass:
        'bg-violet-50 border-violet-200 text-violet-700 shadow-sm dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>',
      path: 'domain',
    },
    {
      key: 'legal',
      label: 'Юридические',
      color: 'text-slate-600',
      activeClass:
        'bg-slate-100 border-slate-300 text-slate-800 shadow-sm dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>',
      path: 'legal',
    },
    {
      key: 'coupons',
      label: 'Купоны',
      color: 'text-pink-600',
      activeClass:
        'bg-pink-50 border-pink-200 text-pink-700 shadow-sm dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>',
      path: 'coupons',
    },
    {
      key: 'plugins',
      label: 'Плагины',
      color: 'text-cyan-600',
      activeClass:
        'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>',
      path: 'plugins',
    },
    {
      key: 'rcon',
      label: 'RCON',
      color: 'text-teal-600',
      activeClass:
        'bg-teal-50 border-teal-200 text-teal-700 shadow-sm dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
      path: 'rcon',
    },
    {
      key: 'notifications',
      label: 'Уведомления',
      color: 'text-rose-600',
      activeClass:
        'bg-rose-50 border-rose-200 text-rose-700 shadow-sm dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>',
      path: 'notifications',
    },
    {
      key: 'payments',
      label: 'Платёжные системы',
      color: 'text-orange-600',
      activeClass:
        'bg-orange-50 border-orange-200 text-orange-700 shadow-sm dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>',
      path: 'payments',
    },
    {
      key: 'branding',
      label: 'Оформление',
      color: 'text-purple-600',
      activeClass:
        'bg-purple-50 border-purple-200 text-purple-700 shadow-sm dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>',
      path: 'branding',
    },
    {
      key: 'settings',
      label: 'Настройки',
      color: 'text-slate-600',
      activeClass:
        'bg-slate-100 border-slate-300 text-slate-800 shadow-sm dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-200',
      icon: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
      path: 'settings',
    },
  ];
  if (server.value?.operatingMode === 'self_employed') {
    return allTabs.filter((t) => t.key !== 'finance');
  }
  return allTabs;
});

const activeTab = computed(() => {
  const p = route.path.split('/').pop();
  if (!p || p === serverId) return 'index';
  return p;
});

onMounted(async () => {
  const $api = useApi();
  try {
    const s = await $api<Server>(`/servers/${serverId}`);
    server.value = s;
  } catch (e: unknown) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

definePageMeta({ layout: 'app', middleware: ['auth'] });
</script>

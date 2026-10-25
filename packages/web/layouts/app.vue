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
      <!-- Logo -->
      <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-0.5">
        <NuxtLink to="/dashboard" class="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          <span class="text-slate-900 dark:text-slate-100">{{ platformName }}</span>
        </NuxtLink>
        <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{{ auth.user?.email }}</p>
        <NuxtLink
          v-if="auth.user?.balance !== undefined"
          to="/profile/balance"
          class="mt-2 bg-indigo-50 dark:bg-slate-700/30 border border-indigo-100 dark:border-slate-700 rounded-lg px-3 py-1.5 flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-slate-700/50 transition"
        >
          <span class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Баланс</span>
          <span class="text-sm font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
            {{ (auth.user?.balance ?? 0).toFixed(0) }} ₽
          </span>
        </NuxtLink>
      </div>

      <!-- Navigation -->
      <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <!-- Main nav -->
        <div class="space-y-1">
          <NuxtLink
            to="/profile"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            :class="
              isActive('/profile')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
            "
            @click="sidebarOpen = false"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <span>Личный кабинет</span>
          </NuxtLink>
          <NuxtLink
            to="/news"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            :class="
              isActive('/news')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
            "
            @click="sidebarOpen = false"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
              />
            </svg>
            <span>Новости</span>
          </NuxtLink>
          <NuxtLink
            to="/faq"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            :class="
              isActive('/faq')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
            "
            @click="sidebarOpen = false"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
            <span>FAQ</span>
          </NuxtLink>
          <NuxtLink
            to="/tickets"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            :class="
              isActive('/tickets')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
            "
            @click="sidebarOpen = false"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
            <span>Поддержка</span>
          </NuxtLink>
          <NuxtLink
            to="/profile/seller-info"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            :class="
              isActive('/profile/seller')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
            "
            @click="sidebarOpen = false"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
              />
            </svg>
            <span>Реквизиты</span>
          </NuxtLink>

          <!-- Admin link (only for staff) -->
          <NuxtLink
            v-if="staffRole"
            to="/admin"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            :class="
              isActive('/admin')
                ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
            "
            @click="sidebarOpen = false"
          >
            <span
              class="w-5 h-5 flex items-center justify-center text-xs rounded bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 font-bold"
            >
              A
            </span>
            <span>Панель администратора</span>
          </NuxtLink>
        </div>

        <!-- Onboarding progress -->
        <div v-if="auth.user && !auth.user.onboardingCompleted && route.path.startsWith('/dashboard')" class="px-2">
          <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Настройка</span>
              <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{{ servers.length }}/2</span>
            </div>
            <div class="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                :style="{ width: Math.min((servers.length / 2) * 100, 100) + '%' }"
              />
            </div>
          </div>
        </div>

        <!-- Servers -->
        <div>
          <div class="flex items-center justify-between px-2 mb-2">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
              >Мои серверы</span
            >
            <button
              @click="showCreate = true"
              class="h-5 w-5 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:border-indigo-400 transition"
              title="Создать магазин"
            >
              +
            </button>
          </div>

          <div class="space-y-1">
            <NuxtLink
              v-for="s in servers"
              :key="s.id"
              :to="`/dashboard/${s.id}`"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
              :class="
                activeServer === s.id
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-slate-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/40 border border-transparent'
              "
              @click="sidebarOpen = false"
            >
              <span class="w-5 h-5 flex items-center justify-center text-xs">
                {{ gameIcon(s.gameType) }}
              </span>
              <span class="truncate">{{ s.name }}</span>
            </NuxtLink>

            <div
              v-if="servers.length === 0"
              class="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"
            >
              Нет серверов
            </div>
          </div>
        </div>
      </div>

      <!-- Footer nav -->
      <div class="border-t border-slate-100 dark:border-slate-700 p-3 space-y-1">
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

    <!-- Main content -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Top bar (mobile) -->
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
        <span class="font-semibold text-sm truncate">{{ pageTitle }}</span>
      </header>

      <div class="flex-1 overflow-y-auto">
        <AppBanner
          :visible="auth.user !== null && !auth.user.emailVerified && !hideVerifyBanner"
          variant="warning"
          dismissible
          @dismiss="dismissBanner"
        >
          Подтвердите ваш email.
          <button
            @click="resendVerification"
            :disabled="resending"
            class="font-bold underline hover:no-underline disabled:opacity-50"
          >
            {{ resending ? 'Отправка...' : 'Отправить ссылку повторно' }}
          </button>
        </AppBanner>
        <slot />
      </div>
    </div>

    <CreateServerModal :visible="showCreate" @created="onCreated" @close="onCreateClose" />
  </div>
</template>

<script setup lang="ts">
import type { Server } from '~/types';

const auth = useAuthStore();

const { data: landingData } = await useAsyncData('sidebar-landing', () =>
  $fetch<{ platformName?: string }>('/api/landing').catch(() => ({ platformName: undefined })),
);
const platformName = computed(() => landingData.value?.platformName || 'DonatePlatform');

const route = useRoute();
const servers = ref<Server[]>([]);
const sidebarOpen = ref(false);
const showCreate = ref(false);
const staffRole = ref('');
const resending = ref(false);
const hideVerifyBanner = ref(false);

function dismissBanner() {
  hideVerifyBanner.value = true;
}

async function resendVerification() {
  if (resending.value) return;
  resending.value = true;
  try {
    const $api = useApi();
    await $api('/auth/resend-verification', { method: 'POST' });
    const notify = useNotify();
    notify.success('Ссылка отправлена на ваш email');
  } catch {
    const notify = useNotify();
    notify.error('Не удалось отправить письмо. Попробуйте позже');
  } finally {
    resending.value = false;
  }
}

const activeServer = computed(() => route.params.id as string | undefined);

const pageTitles: Record<string, string> = {
  '/profile': 'Личный кабинет',
  '/news': 'Новости',
  '/faq': 'FAQ',
  '/tickets': 'Поддержка',
};

const pageTitle = computed(() => {
  if (route.path.startsWith('/dashboard/')) {
    const s = servers.value.find((s) => s.id === route.params.id);
    return s?.name || 'Панель управления';
  }
  if (route.path.startsWith('/tickets')) return 'Поддержка';
  return pageTitles[route.path] || 'Панель управления';
});

function isActive(path: string) {
  if (path === '/admin') return route.path.startsWith('/admin');
  if (path === '/tickets') return route.path.startsWith('/tickets');
  return route.path === path;
}

function gameIcon(type: string) {
  const icons: Record<string, string> = {
    minecraft: '⛏',
  };
  return icons[type] || '🎮';
}

async function loadServers() {
  const $api = useApi();
  try {
    servers.value = await $api('/servers');
  } catch (e: unknown) {
    console.error(e);
  }
}

function onCreated() {
  showCreate.value = false;
  loadServers();
}

function onCreateClose() {
  showCreate.value = false;
}

onMounted(async () => {
  await loadServers();
  try {
    const data = await $fetch<{ role: string }>('/api/admin/me', { credentials: 'include' });
    staffRole.value = data.role;
  } catch {
    // not a staff member — hide admin link
  }
});
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Пользователи</h1>

    <div class="flex flex-wrap gap-4 mb-6">
      <input
        v-model="filters.email"
        placeholder="Поиск по email..."
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-64 transition"
        @input="debounceSearch"
      />
      <select
        v-model="filters.status"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      >
        <option value="">Все статусы</option>
        <option value="active">Активные</option>
        <option value="banned">Заблокированные</option>
      </select>
    </div>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm mb-6"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead
            class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs bg-slate-50 dark:bg-slate-900/50"
          >
            <tr>
              <th class="text-left py-3 px-4 font-semibold">Email</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Серверов</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Статус</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Регистрация</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
        </table>
        <RecycleScroller :items="users" :item-size="61" key-field="id" class="min-h-[100px]">
          <template #default="{ item: u }">
            <div
              class="flex items-center border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-sm px-4"
              style="min-height: 61px"
            >
              <div class="w-[20%] py-3.5 font-bold shrink-0">
                <NuxtLink
                  :to="`/admin/users/${u.id}`"
                  class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                >
                  {{ u.email }}
                </NuxtLink>
              </div>
              <div class="w-[12%] py-3.5 text-slate-500 dark:text-slate-400 hidden md:block tabular-nums shrink-0">
                {{ u._count?.servers ?? 0 }}
              </div>
              <div class="w-[12%] py-3.5 hidden md:block shrink-0">
                <span
                  v-if="u.bannedAt"
                  class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-150 dark:border-red-900"
                >
                  Забанен
                </span>
                <span
                  v-else
                  class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900"
                >
                  Активен
                </span>
              </div>
              <div
                class="w-[16%] py-3.5 text-slate-400 dark:text-slate-500 font-medium tabular-nums hidden md:block shrink-0"
              >
                {{ fmtDate(u.createdAt) }}
              </div>
              <div class="flex-1 py-3.5 text-right">
                <template v-if="isAdmin()">
                  <button
                    v-if="!u.bannedAt"
                    @click="toggleBan(u)"
                    class="text-red-500 hover:text-red-650 font-bold text-xs transition"
                  >
                    Забанить
                  </button>
                  <button
                    v-else
                    @click="unban(u.id)"
                    class="text-emerald-550 hover:text-emerald-650 font-bold text-xs transition"
                  >
                    Разбанить
                  </button>
                </template>
              </div>
            </div>
          </template>
        </RecycleScroller>
        <div
          v-if="!users.length"
          class="py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800"
        >
          Пользователи не найдены
        </div>
      </div>
    </div>

    <Pagination :page="page" :pages="pages" @go="goPage" />

    <div
      v-if="banUser"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="banUser = null"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Блокировка {{ banUser.email }}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Укажите причину для блокировки пользователя.</p>
        <div class="space-y-4">
          <input
            v-model="banReason"
            placeholder="Причина блокировки"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <div class="flex gap-3">
            <button
              @click="submitBan"
              class="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-500 shadow-sm transition"
            >
              Забанить
            </button>
            <button
              @click="banUser = null"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <p v-if="banError" class="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{{ banError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtDate } from '~/utils/format';
import { useStaffCan } from '~/composables/useStaffCan';
import type { AdminUser, PaginatedResponse } from '~/types/admin';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const RecycleScroller = defineAsyncComponent(() =>
  import('vue-virtual-scroller').then(m => m.RecycleScroller)
);

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Пользователи' });
const $admin = useAdmin();
const { isAdmin } = useStaffCan();
const users = ref<AdminUser[]>([]);
const page = ref(1);
const pages = ref(1);
const filters = ref({ email: '', status: '' });
const banUser = ref<AdminUser | null>(null);
const banReason = ref('');
const loadError = ref('');
const banError = ref('');
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null);

async function load() {
  loadError.value = '';
  try {
    const data = await $admin<PaginatedResponse<AdminUser>>('/users', {
      params: {
        page: page.value,
        limit: 20,
        email: filters.value.email || undefined,
        status: filters.value.status || undefined,
      },
    });
    users.value = data.users as AdminUser[];
    pages.value = data.pagination.pages;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки пользователей';
    console.error(e);
  }
}

function debounceSearch() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => {
    page.value = 1;
    load();
  }, 300);
}

onUnmounted(() => {
  if (searchTimer.value) clearTimeout(searchTimer.value);
});

function goPage(p: number) {
  page.value = p;
  load();
}

function toggleBan(u: AdminUser) {
  banUser.value = u;
  banReason.value = '';
  banError.value = '';
}

async function submitBan() {
  if (!banUser.value) return;
  try {
    await $admin(`/users/${banUser.value.id}/ban`, {
      method: 'POST',
      body: { banReason: banReason.value || 'Banned' },
    });
    banUser.value = null;
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    banError.value = err?.data?.error || 'Ошибка';
  }
}

async function unban(id: string) {
  try {
    banError.value = '';
    await $admin(`/users/${id}/unban`, { method: 'POST' });
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    console.error(e);
    banError.value = err?.data?.error || 'Ошибка разблокировки';
  }
}

onMounted(load);
</script>

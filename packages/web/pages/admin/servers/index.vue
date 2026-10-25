<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Серверы</h1>

    <div class="flex flex-wrap gap-4 mb-6">
      <input
        v-model="filters.search"
        placeholder="Поиск по названию или slug..."
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-64 transition"
        @input="debounceSearch"
      />
      <select
        v-model="filters.gameType"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      >
        <option value="">Все игры</option>
        <option v-for="g in GAME_TYPES" :key="g.value" :value="g.value">{{ g.label }}</option>
      </select>
      <select
        v-model="filters.status"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      >
        <option value="">Все статусы</option>
        <option value="active">Активные</option>
        <option value="blocked">Заблокированные</option>
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
              <th class="text-left py-3 px-4 font-semibold">Название</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Игра</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Владелец</th>
              <th class="text-left py-3 px-4 font-semibold hidden xl:table-cell">План</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Статус</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
        </table>
        <RecycleScroller :items="servers" :item-size="61" key-field="id" class="min-h-[100px]">
          <template #default="{ item: s }">
            <div
              class="flex items-center border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-sm px-4"
              style="min-height: 61px"
            >
              <div class="w-[22%] py-3.5 font-bold shrink-0">
                <NuxtLink
                  :to="`/admin/servers/${s.id}`"
                  class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                >
                  {{ s.name }}
                </NuxtLink>
                <div class="text-xs text-slate-400 dark:text-slate-500 font-mono font-medium mt-0.5">{{ s.slug }}</div>
              </div>
              <div
                class="w-[10%] py-3.5 text-slate-550 dark:text-slate-400 hidden md:block uppercase font-semibold text-xs shrink-0"
              >
                <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">{{ s.gameType }}</span>
              </div>
              <div class="w-[18%] py-3.5 text-slate-600 dark:text-slate-400 hidden md:block font-medium shrink-0">
                {{ s.owner?.email }}
              </div>
              <div class="w-[10%] py-3.5 hidden xl:block shrink-0">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-semibold"
                  :class="
                    s.planType === 'subscription'
                      ? 'bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700/50'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                  "
                >
                  {{ s.planType === 'subscription' ? 'Подписка' : 'Комиссия' }}
                </span>
              </div>
              <div class="w-[12%] py-3.5 hidden md:block shrink-0">
                <span
                  v-if="s.blockedAt"
                  class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-655 border border-red-150 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                >
                  Заблокирован
                </span>
                <span
                  v-else
                  class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-150 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                >
                  Активен
                </span>
              </div>
              <div class="flex-1 py-3.5 text-right">
                <template v-if="isAdmin()">
                  <button
                    v-if="s.planType === 'subscription' && s.subscription"
                    @click="openSubscription(s)"
                    class="text-purple-500 hover:text-purple-600 font-bold text-xs transition mr-3"
                  >
                    Подписка
                  </button>
                  <button
                    v-if="!s.blockedAt"
                    @click="openBlock(s)"
                    class="text-red-500 hover:text-red-600 font-bold text-xs transition"
                  >
                    Заблокировать
                  </button>
                  <button
                    v-else
                    @click="unblock(s.id)"
                    class="text-emerald-500 hover:text-emerald-600 font-bold text-xs transition"
                  >
                    Разблокировать
                  </button>
                </template>
              </div>
            </div>
          </template>
        </RecycleScroller>
        <div
          v-if="!servers.length"
          class="py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800"
        >
          Серверы не найдены
        </div>
      </div>
    </div>

    <Pagination :page="page" :pages="pages" @go="goPage" />

    <!-- Subscription modal -->
    <div
      v-if="subTarget"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="subTarget = null"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <p v-if="subError" class="mb-3 text-red-500 text-sm font-medium">{{ subError }}</p>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Подписка: {{ subTarget.name }}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Статус: <strong>{{ subTarget.subscription?.status }}</strong>
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Истекает:
          <strong>{{ subTarget.subscription?.expiresAt ? fmtDate(subTarget.subscription.expiresAt) : '—' }}</strong>
        </p>
        <div class="space-y-3">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Продлить на (дней)</label
            >
            <input
              v-model.number="extendDays"
              type="number"
              min="1"
              placeholder="30"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div class="flex gap-3">
            <button
              @click="extendSubscription"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 shadow-sm transition"
            >
              Продлить
            </button>
            <button
              @click="cancelSubscription"
              class="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-semibold hover:bg-red-600 shadow-sm transition"
            >
              Отменить подписку
            </button>
          </div>
          <button
            @click="subTarget = null"
            class="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="blockTarget"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="blockTarget = null"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <p v-if="blockError" class="mb-3 text-red-500 text-sm font-medium">{{ blockError }}</p>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Блокировка {{ blockTarget.name }}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Укажите причину блокировки игрового магазина.</p>
        <div class="space-y-4">
          <input
            v-model="blockReason"
            placeholder="Причина"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <div class="flex gap-3">
            <button
              @click="submitBlock"
              class="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-500 shadow-sm transition"
            >
              Блокировать
            </button>
            <button
              @click="blockTarget = null"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStaffCan } from '~/composables/useStaffCan';
import { fmtDate } from '~/utils/format';
import { GAME_TYPES } from '~/utils/constants';
import type { AdminServer, PaginatedResponse } from '~/types/admin';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const RecycleScroller = defineAsyncComponent(() =>
  import('vue-virtual-scroller').then(m => m.RecycleScroller)
);

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const $admin = useAdmin();
const { isAdmin } = useStaffCan();
const servers = ref<AdminServer[]>([]);
const page = ref(1);
const pages = ref(1);
const filters = ref({ search: '', gameType: '', status: '' });
const blockTarget = ref<AdminServer | null>(null);
const blockReason = ref('');
const loadError = ref('');
const subTarget = ref<AdminServer | null>(null);
const extendDays = ref(30);
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const subError = ref('');
const blockError = ref('');

async function load() {
  loadError.value = '';
  try {
    const data = await $admin<PaginatedResponse<AdminServer>>('/servers', {
      params: {
        page: page.value,
        limit: 20,
        search: filters.value.search || undefined,
        gameType: filters.value.gameType || undefined,
        status: filters.value.status || undefined,
      },
    });
    servers.value = data.servers as AdminServer[];
    pages.value = data.pagination.pages;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки серверов';
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

function openBlock(s: AdminServer) {
  blockTarget.value = s;
  blockReason.value = '';
}

function openSubscription(s: AdminServer) {
  subTarget.value = s;
  extendDays.value = 30;
}

async function extendSubscription() {
  if (!subTarget.value?.subscription) return;
  try {
    subError.value = '';
    await $admin(`/subscriptions/${subTarget.value.subscription.id}/extend`, {
      method: 'POST',
      body: { days: extendDays.value },
    });
    subTarget.value = null;
    load();
  } catch (e: unknown) {
    console.error(e);
    subError.value = 'Ошибка продления подписки';
  }
}

async function cancelSubscription() {
  if (!subTarget.value?.subscription) return;
  try {
    subError.value = '';
    await $admin(`/subscriptions/${subTarget.value.subscription.id}/cancel`, {
      method: 'POST',
    });
    subTarget.value = null;
    load();
  } catch (e: unknown) {
    console.error(e);
    subError.value = 'Ошибка отмены подписки';
  }
}

async function submitBlock() {
  if (!blockTarget.value) return;
  try {
    blockError.value = '';
    await $admin(`/servers/${blockTarget.value.id}/block`, {
      method: 'POST',
      body: { blockReason: blockReason.value || 'Blocked' },
    });
    blockTarget.value = null;
    load();
  } catch (e: unknown) {
    console.error(e);
    blockError.value = 'Ошибка блокировки сервера';
  }
}

async function unblock(id: string) {
  try {
    blockError.value = '';
    await $admin(`/servers/${id}/unblock`, { method: 'POST' });
    load();
  } catch (e: unknown) {
    console.error(e);
    blockError.value = 'Ошибка разблокировки сервера';
  }
}

onMounted(load);
</script>

<template>
  <div
    class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200"
    v-if="server"
  >
    <NuxtLink
      to="/admin/servers"
      class="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 flex items-center gap-1.5 transition"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Назад к списку
    </NuxtLink>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
      {{ server.name }}
      <span
        class="text-xs uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-650 dark:text-slate-400 rounded font-semibold ml-2"
        >{{ server.gameType }}</span
      >
      <span class="text-xs text-slate-400 dark:text-slate-500 font-mono ml-2">slug: {{ server.slug }}</span>
    </h1>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Заказы</div>
        <div class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ server._count?.orders ?? 0 }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Товары</div>
        <div class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ server._count?.products ?? 0 }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Участники
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ server._count?.members ?? 0 }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Выручка за месяц
        </div>
        <div class="text-2xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (server.monthlyRevenue ?? 0).toFixed(2) }}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Владелец
        </div>
        <div class="text-sm font-bold text-slate-900 dark:text-white mb-2">{{ server.owner?.email }}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          Статус магазина:
          <span
            v-if="server.blockedAt"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-655 border border-red-150 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
            >Заблокирован</span
          >
          <span
            v-else
            class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-150 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
            >Активен</span
          >
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Кошелек сервера
        </div>
        <div class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
          Баланс:
          <span class="text-indigo-600 dark:text-indigo-400 font-bold tabular-nums"
            >₽{{ server.wallet?.balance?.toFixed(2) ?? '0.00' }}</span
          >
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          Всего заработано:
          <span class="font-bold tabular-nums">₽{{ server.wallet?.totalEarned?.toFixed(2) ?? '0.00' }}</span>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 font-bold">
        Последние заказы
      </h3>
      <div v-if="!server.recentOrders?.length" class="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
        Нет заказов
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs"
            >
              <th class="text-left py-3 font-semibold">Игрок</th>
              <th class="text-left py-3 font-semibold">Товар</th>
              <th class="text-right py-3 font-semibold">Сумма</th>
              <th class="text-right py-3 font-semibold">Статус</th>
              <th class="text-right py-3 font-semibold">Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in server.recentOrders"
              :key="o.id"
              @click="navigateTo(`/admin/order/${o.id}`)"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
            >
              <td class="py-3 font-bold text-slate-900 dark:text-white">{{ o.playerName }}</td>
              <td class="py-3 text-slate-600 dark:text-slate-300">{{ o.product?.name }}</td>
              <td class="py-3 text-right text-emerald-500 dark:text-emerald-400 font-bold tabular-nums">
                ₽{{ o.totalAmount?.toFixed(2) ?? '—' }}
              </td>
              <td class="py-3 text-right">
                <span :class="orderStatusClass(o.status)">{{ o.status }}</span>
              </td>
              <td class="py-3 text-right text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                {{ fmtDate(o.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { orderStatusClass } from '~/utils/status';
import { fmtDate } from '~/utils/format';
import type { AdminServer } from '~/types/admin';
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Сервер' });

const route = useRoute();
const $admin = useAdmin();
const server = ref<AdminServer | null>(null);
const loadError = ref('');

async function load() {
  loadError.value = '';
  try {
    server.value = await $admin<AdminServer>(`/servers/${route.params.id}`);
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки данных сервера';
    console.error(e);
  }
}

onMounted(load);
</script>

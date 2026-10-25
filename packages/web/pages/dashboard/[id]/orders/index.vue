<template>
  <div>
    <h2 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Заказы</h2>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div
      v-if="orders.length === 0"
      class="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm"
    >
      <svg
        class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
      <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Заказы отсутствуют</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        На этом сервере еще не было совершено ни одной покупки.
      </p>
    </div>

    <div
      v-else
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead
            class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs bg-slate-50 dark:bg-slate-900/50"
          >
            <tr>
              <th class="py-3 px-4 font-semibold hidden md:table-cell">ID</th>
              <th class="py-3 px-4 font-semibold">Игрок</th>
              <th class="py-3 px-4 font-semibold">Товар</th>
              <th class="py-3 px-4 font-semibold">Стоимость</th>
              <th class="py-3 px-4 font-semibold">Статус</th>
              <th class="py-3 px-4 font-semibold">Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in orders"
              :key="o.id"
              :data-testid="`row-order-${o.id}`"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 hidden md:table-cell">
                <NuxtLink
                  :to="`/dashboard/${route.params.id}/orders/${o.id}`"
                  class="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {{ o.id.slice(0, 8) }}
                </NuxtLink>
              </td>
              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{{ o.playerName }}</td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">{{ o.product.name }}</td>
              <td class="py-3.5 px-4 text-emerald-500 dark:text-emerald-400 font-semibold tabular-nums">
                <span :data-testid="`order-amount-${o.id}`">₽{{ o.totalAmount.toFixed(2) }}</span>
              </td>
              <td class="py-3.5 px-4">
                <span :data-testid="`order-status-${o.id}`" :class="orderStatusClass(o.status)">{{ o.status }}</span>
              </td>
              <td class="py-3.5 px-4 text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                {{ fmtDate(o.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Pagination v-if="pagination.pages > 1" :page="pagination.page" :pages="pagination.pages" @go="goPage" />
  </div>
</template>

<script setup lang="ts">
import { orderStatusClass } from '~/utils/status';
import { fmtDate } from '~/utils/format';
import type { Order } from '~/types';
useHead({ title: 'Заказы' });

const route = useRoute();
const orders = ref<Order[]>([]);
const loadError = ref('');
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 });

async function load(page = 1) {
  loadError.value = '';
  try {
    const data = await $fetch<{
      items: Order[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/api/servers/${route.params.id}/orders`, {
      credentials: 'include',
      params: { page, limit: 20 },
    });
    orders.value = data.items;
    pagination.value = data.pagination;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки заказов';
    console.error(e);
  }
}

function goPage(p: number) {
  load(p);
}

onMounted(() => load());
</script>

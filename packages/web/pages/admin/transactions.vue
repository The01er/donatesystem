<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Транзакции платформы</h1>

    <div class="flex flex-wrap gap-4 mb-6">
      <select
        v-model="filters.type"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      >
        <option value="">Все типы</option>
        <option value="order_commission">Комиссия с заказа</option>
        <option value="payout">Выплата</option>
        <option value="refund">Возврат</option>
        <option value="correction">Корректировка</option>
      </select>
      <input
        v-model="filters.from"
        type="date"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium text-xs"
      />
      <input
        v-model="filters.to"
        type="date"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium text-xs"
      />
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
              <th class="text-left py-3 px-4 font-semibold">Дата</th>
              <th class="text-left py-3 px-4 font-semibold">Тип</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Магазин</th>
              <th class="text-right py-3 px-4 font-semibold">Сумма</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell pl-6">Примечание</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tx in transactions"
              :key="tx.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 text-slate-400 dark:text-slate-500 text-xs font-semibold tabular-nums">
                {{ fmtDate(tx.createdAt) }}
              </td>
              <td class="py-3.5 px-4">
                <span :class="transactionTypeClass(tx.type)">{{ tx.type }}</span>
              </td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs hidden md:table-cell font-medium">
                {{ tx.wallet?.server?.name }}
              </td>
              <td
                class="py-3.5 px-4 text-right font-bold tabular-nums"
                :class="tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'"
              >
                {{ tx.amount >= 0 ? '+' : '' }}₽{{ tx.amount.toFixed(2) }}
              </td>
              <td
                class="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate hidden md:table-cell pl-6"
              >
                {{ tx.note || '—' }}
              </td>
            </tr>
            <tr v-if="!transactions.length">
              <td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
                Транзакции не найдены
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Pagination :page="page" :pages="pages" @go="goPage" />
  </div>
</template>

<script setup lang="ts">
import { transactionTypeClass } from '~/utils/status';
import { fmtDate } from '~/utils/format';
import type { AdminTransaction, PaginatedResponse } from '~/types/admin';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Транзакции платформы' });
const $admin = useAdmin();
const transactions = ref<AdminTransaction[]>([]);
const page = ref(1);
const pages = ref(1);
const filters = ref({ type: '', from: '', to: '' });
const loadError = ref('');

async function load() {
  loadError.value = '';
  try {
    const data = await $admin<PaginatedResponse<AdminTransaction>>('/transactions', {
      params: {
        page: page.value,
        limit: 20,
        type: filters.value.type || undefined,
        from: filters.value.from || undefined,
        to: filters.value.to || undefined,
      },
    });
    transactions.value = data.transactions as AdminTransaction[];
    pages.value = data.pagination.pages;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки транзакций';
    console.error(e);
  }
}

function goPage(p: number) {
  page.value = p;
  load();
}

onMounted(load);
</script>

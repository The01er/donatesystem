<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Финансовые транзакции</h1>

    <div class="flex flex-wrap gap-4 mb-6">
      <select
        v-model="filters.type"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      >
        <option value="">Все типы</option>
        <option value="subscription">Подписки</option>
        <option value="deposit">Пополнения</option>
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
              <th class="text-left py-3 px-4 font-semibold">Пользователь</th>
              <th class="text-right py-3 px-4 font-semibold">Сумма</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Описание</th>
              <th class="text-left py-3 px-4 font-semibold hidden lg:table-cell">ID транзакции</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tx in items"
              :key="tx.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 text-slate-400 dark:text-slate-500 text-xs font-semibold tabular-nums">
                {{ fmtDate(tx.createdAt) }}
              </td>
              <td class="py-3.5 px-4">
                <span :class="typeClass(tx.type)" class="inline-block px-2 py-0.5 rounded-full text-xs font-bold">{{ typeLabel(tx.type) }}</span>
              </td>
              <td class="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-sm font-medium">
                {{ tx.userEmail }}
              </td>
              <td class="py-3.5 px-4 text-right font-bold tabular-nums text-emerald-500">
                +₽{{ tx.amount.toFixed(2) }}
              </td>
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs max-w-[250px] truncate hidden md:table-cell">
                {{ tx.description || '—' }}
              </td>
              <td class="py-3.5 px-4 text-slate-400 dark:text-slate-500 text-xs font-mono hidden lg:table-cell">
                {{ tx.transactionId || '—' }}
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="6" class="py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
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
import { fmtDate } from '~/utils/format';

interface FinanceTransaction {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  userEmail: string;
  description: string;
  transactionId?: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Финансовые транзакции' });

const $admin = useAdmin();
const items = ref<FinanceTransaction[]>([]);
const page = ref(1);
const pages = ref(1);
const filters = ref({ type: '', from: '', to: '' });
const loadError = ref('');

const TYPE_LABELS: Record<string, string> = {
  subscription_renew: 'Оплата подписки',
  admin_extend_subscription: 'Продление подписки (админ)',
  admin_deposit: 'Пополнение баланса (админ)',
  user_deposit: 'Пополнение баланса',
};

const TYPE_CLASSES: Record<string, string> = {
  subscription_renew: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
  admin_extend_subscription: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  admin_deposit: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  user_deposit: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

function typeClass(type: string): string {
  return TYPE_CLASSES[type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

async function load() {
  loadError.value = '';
  try {
    const data = await $admin<PaginatedResponse<FinanceTransaction>>('/finance/transactions', {
      params: {
        page: page.value,
        limit: 20,
        type: filters.value.type || undefined,
        from: filters.value.from || undefined,
        to: filters.value.to || undefined,
      },
    });
    items.value = data.items;
    pages.value = data.pagination.pages;
  } catch {
    loadError.value = 'Ошибка загрузки транзакций';
  }
}

function goPage(p: number) {
  page.value = p;
  load();
}

onMounted(load);
</script>

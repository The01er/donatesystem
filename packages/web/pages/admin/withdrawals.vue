<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Запросы на вывод средств</h1>

    <div class="flex flex-wrap gap-4 mb-6">
      <select
        v-model="filters.status"
        @change="load"
        class="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
      >
        <option value="">Все статусы</option>
        <option value="pending">В ожидании</option>
        <option value="approved">Одобрено</option>
        <option value="rejected">Отклонено</option>
        <option value="paid">Выплачено</option>
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
              <th class="text-left py-3 px-4 font-semibold">Получатель</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Магазин</th>
              <th class="text-right py-3 px-4 font-semibold">Сумма</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell pl-6">Способ</th>
              <th class="text-left py-3 px-4 font-semibold">Статус</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Дата</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
        </table>
        <RecycleScroller :items="withdrawals" :item-size="61" key-field="id" class="min-h-[100px]">
          <template #default="{ item: w }">
            <div
              class="flex items-center border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-sm px-4"
              style="min-height: 61px"
            >
              <div class="w-[18%] py-3.5 font-bold text-slate-900 dark:text-white truncate shrink-0">
                {{ w.wallet?.server?.owner?.email }}
              </div>
              <div class="w-[16%] py-3.5 text-slate-550 dark:text-slate-400 text-xs hidden md:block truncate shrink-0">
                {{ w.wallet?.server?.name }}
              </div>
              <div class="w-[12%] py-3.5 text-right text-red-500 font-bold tabular-nums shrink-0">
                ₽{{ w.amount.toFixed(2) }}
              </div>
              <div
                class="w-[10%] py-3.5 uppercase text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:block shrink-0 pl-6"
              >
                {{ w.method }}
              </div>
              <div class="w-[12%] py-3.5 shrink-0">
                <span :class="withdrawalStatusClass(w.status)">{{ w.status }}</span>
              </div>
              <div
                class="w-[14%] py-3.5 text-slate-400 dark:text-slate-500 text-xs hidden md:block tabular-nums shrink-0"
              >
                {{ fmtDate(w.createdAt) }}
              </div>
              <div class="flex-1 py-3.5 text-right">
                <template v-if="isAdmin() && w.status === WithdrawalStatus.PENDING">
                  <button
                    @click="approve(w.id)"
                    class="text-emerald-550 hover:text-emerald-650 font-bold text-xs mr-3 transition"
                  >
                    Одобрить
                  </button>
                  <button
                    @click="reject(w.id)"
                    class="text-red-500 hover:text-red-655 font-bold text-xs mr-3 transition"
                  >
                    Отклонить
                  </button>
                </template>
                <button
                  v-if="isFinance() && w.status === 'approved'"
                  @click="markPaid(w.id)"
                  class="bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400 border border-indigo-100 dark:border-slate-600 px-2.5 py-1 rounded text-xs font-semibold hover:bg-indigo-100 transition shadow-sm"
                >
                  Выплачено
                </button>
              </div>
            </div>
          </template>
        </RecycleScroller>
        <div
          v-if="!withdrawals.length"
          class="py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800"
        >
          Запросы отсутствуют
        </div>
      </div>
    </div>

    <Pagination :page="page" :pages="pages" @go="goPage" />

    <div
      v-if="rejectId"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="rejectId = null"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Отклонить вывод</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Укажите причину отклонения запроса на выплату.</p>
        <div class="space-y-4">
          <input
            v-model="rejectNote"
            placeholder="Причина (опционально)"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-955 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <div class="flex gap-3">
            <button
              @click="submitReject"
              class="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-500 shadow-sm transition"
            >
              Отклонить
            </button>
            <button
              @click="rejectId = null"
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
import { withdrawalStatusClass } from '~/utils/status';
import { WithdrawalStatus } from '~/utils/status-constants';
import { fmtDate } from '~/utils/format';
import { useStaffCan } from '~/composables/useStaffCan';
import type { AdminWithdrawal, PaginatedResponse } from '~/types/admin';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const RecycleScroller = defineAsyncComponent(() =>
  import('vue-virtual-scroller').then(m => m.RecycleScroller)
);

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Запросы на вывод' });
const $admin = useAdmin();
const { isAdmin, isFinance } = useStaffCan();
const withdrawals = ref<AdminWithdrawal[]>([]);
const page = ref(1);
const pages = ref(1);
const filters = ref({ status: '' });
const actionError = ref('');
const rejectId = ref<string | null>(null);
const rejectNote = ref('');
const loadError = ref('');

async function load() {
  loadError.value = '';
  try {
    const data = await $admin<PaginatedResponse<AdminWithdrawal>>('/withdrawals', {
      params: { page: page.value, limit: 20, status: filters.value.status || undefined },
    });
    withdrawals.value = data.withdrawals as AdminWithdrawal[];
    pages.value = data.pagination.pages;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки запросов на вывод';
    console.error(e);
  }
}

function goPage(p: number) {
  page.value = p;
  load();
}

async function approve(id: string) {
  if (!confirm('Одобрить выплату? Баланс пользователя будет списан.')) return;
  try {
    actionError.value = '';
    await $admin(`/withdrawals/${id}/approve`, { method: 'POST' });
    load();
  } catch (e: unknown) {
    console.error(e);
    actionError.value = 'Ошибка при выполнении действия с выплатой';
  }
}

function reject(id: string) {
  rejectId.value = id;
  rejectNote.value = '';
}

async function submitReject() {
  if (!rejectId.value) return;
  try {
    await $admin(`/withdrawals/${rejectId.value}/reject`, {
      method: 'POST',
      body: { note: rejectNote.value || undefined },
    });
    rejectId.value = null;
    load();
  } catch (e: unknown) {
    console.error(e);
    actionError.value = 'Ошибка при выполнении действия с выплатой';
  } finally {
    rejectId.value = null;
  }
}

async function markPaid(id: string) {
  if (!confirm('Отметить запрос как выплаченный?')) return;
  try {
    actionError.value = '';
    await $admin(`/withdrawals/${id}/pay`, { method: 'POST' });
    load();
  } catch (e: unknown) {
    console.error(e);
    actionError.value = 'Ошибка при отметке выплаты';
  }
}

onMounted(load);
</script>

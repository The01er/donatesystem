<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Купоны</h2>
      <button
        @click="showCreate = true"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
      >
        Создать купон
      </button>
    </div>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div
      v-if="coupons.length === 0"
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
          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
        />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 6h.008v.008H6V6z" />
      </svg>
      <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Купоны отсутствуют</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Создайте первый промокод для ваших игроков.</p>
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
              <th class="py-3 px-4 font-semibold">Код</th>
              <th class="py-3 px-4 font-semibold">Скидка</th>
              <th class="py-3 px-4 font-semibold">Использовано</th>
              <th class="py-3 px-4 font-semibold">Статус</th>
              <th class="py-3 px-4 font-semibold hidden md:table-cell">Истекает</th>
              <th class="py-3 px-4 font-semibold text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in coupons"
              :key="c.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{{ c.code }}</td>
              <td class="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                {{ c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue.toFixed(2)}` }}
              </td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300 tabular-nums">
                {{ c.usedCount }}{{ c.usageLimit !== null ? ` / ${c.usageLimit}` : '' }}
              </td>
              <td class="py-3.5 px-4">
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded"
                  :class="
                    c.isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  "
                >
                  {{ c.isActive ? 'Активен' : 'Неактивен' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-slate-400 dark:text-slate-500 text-xs hidden md:table-cell">
                {{ c.expiresAt ? fmtDate(c.expiresAt) : '—' }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <button
                  @click="toggleActive(c)"
                  class="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition mr-3"
                >
                  {{ c.isActive ? 'Деактивировать' : 'Активировать' }}
                </button>
                <button
                  @click="deleteCoupon(c.id)"
                  class="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition"
                >
                  Удалить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Pagination v-if="pagination.pages > 1" :page="pagination.page" :pages="pagination.pages" @go="goPage" />

    <!-- Create modal -->
    <div
      v-if="showCreate"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showCreate = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Создание купона</h3>
        <form @submit.prevent="createCoupon" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Код</label
            >
            <input
              v-model="form.code"
              placeholder="SUMMER2024"
              maxlength="20"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Тип скидки</label
            >
            <select
              v-model="form.discountType"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="percentage">Процент (%)</option>
              <option value="fixed">Фиксированная ($)</option>
            </select>
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >
              {{ form.discountType === 'percentage' ? 'Процент скидки (1-99)' : 'Сумма скидки ($)' }}
            </label>
            <input
              v-model.number="form.discountValue"
              type="number"
              :min="form.discountType === 'percentage' ? 1 : 0.01"
              :max="form.discountType === 'percentage' ? 99 : undefined"
              step="0.01"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Лимит использований (опционально)</label
            >
            <input
              v-model.number="form.usageLimit"
              type="number"
              min="1"
              placeholder="Без лимита"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Истекает (опционально)</label
            >
            <input
              v-model="form.expiresAt"
              type="date"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <p v-if="formError" class="text-red-500 text-sm">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
            >
              Создать
            </button>
            <button
              type="button"
              @click="showCreate = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtDate } from '~/utils/format';
import type { Coupon } from '~/types';
useHead({ title: 'Купоны' });

const route = useRoute();
const serverId = route.params.id as string;
const coupons = ref<Coupon[]>([]);
const loadError = ref('');
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 });
const showCreate = ref(false);
const formError = ref('');
const form = ref({
  code: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: 10,
  usageLimit: null as number | null,
  expiresAt: '',
});

async function load(page = 1) {
  loadError.value = '';
  try {
    const data = await $fetch<{ items: Coupon[]; pagination: typeof pagination.value }>(
      `/api/servers/${serverId}/coupons`,
      {
        credentials: 'include',
        params: { page, limit: 20 },
      },
    );
    coupons.value = data.items;
    pagination.value = data.pagination;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки купонов';
    console.error(e);
  }
}

function goPage(p: number) {
  load(p);
}

async function createCoupon() {
  formError.value = '';
  if (!/^[a-zA-Z0-9]+$/.test(form.value.code)) {
    formError.value = 'Код должен содержать только буквы и цифры';
    return;
  }
  try {
    await $fetch(`/api/servers/${serverId}/coupons`, {
      method: 'POST',
      credentials: 'include',
      body: {
        code: form.value.code,
        discountType: form.value.discountType,
        discountValue: form.value.discountValue,
        usageLimit: form.value.usageLimit || undefined,
        expiresAt: form.value.expiresAt || undefined,
      },
    });
    showCreate.value = false;
    form.value = { code: '', discountType: 'percentage', discountValue: 10, usageLimit: null, expiresAt: '' };
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string | { message?: string } } };
    const errorDetail = err?.data?.error;
    formError.value =
      (typeof errorDetail === 'object' ? errorDetail?.message : errorDetail) || 'Ошибка создания купона';
  }
}

async function toggleActive(c: Coupon) {
  try {
    await $fetch(`/api/servers/${serverId}/coupons/${c.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { isActive: !c.isActive },
    });
    await load();
  } catch (e: unknown) {
    console.error(e);
  }
}

async function deleteCoupon(id: string) {
  if (!confirm('Удалить этот купон?')) return;
  try {
    await $fetch(`/api/servers/${serverId}/coupons/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await load();
  } catch (e: unknown) {
    console.error(e);
  }
}

onMounted(() => load());
</script>

<script setup lang="ts">
import type { DepositTransaction } from '~/types';

definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Пополнение баланса' });

const auth = useAuthStore();
const $api = useApi();

onMounted(() => {
  if (auth.user && auth.user.balance === undefined) {
    navigateTo('/profile');
  }
});

const amount = ref<number>(500);
const method = ref<'card' | 'yoomoney'>('card');
const submitting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const deposits = ref<DepositTransaction[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });
const loadingDeposits = ref(true);
const loadDepositsError = ref('');

interface PaymentMethod {
  provider: string;
  label: string;
}

const paymentMethods = ref<PaymentMethod[]>([]);
const showPaymentSelector = ref(false);
const paymentError = ref('');
const selectedProvider = ref('');

async function loadPaymentMethods() {
  try {
    const data = await $fetch<{ methods: PaymentMethod[] }>('/api/payment/methods', { credentials: 'include' });
    paymentMethods.value = data.methods.filter((m) => m.provider !== 'mock');
  } catch {}
}

async function deposit() {
  await loadPaymentMethods();
  const realMethods = paymentMethods.value.filter((m) => m.provider !== 'mock');
  if (realMethods.length <= 1) {
    await doDeposit(realMethods[0]?.provider || '');
  } else {
    showPaymentSelector.value = true;
  }
}

async function depositWithProvider(provider: string) {
  showPaymentSelector.value = false;
  await doDeposit(provider);
}

async function doDeposit(provider: string) {
  submitting.value = true;
  message.value = null;
  paymentError.value = '';
  try {
    const body: Record<string, unknown> = { amount: amount.value, method: method.value };
    if (provider) body.provider = provider;
    const res = await $api<{ paymentUrl: string; depositId: string }>('/user/balance/deposit', {
      method: 'POST',
      body,
    });
    window.location.href = res.paymentUrl;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    message.value = { type: 'error', text: err?.data?.error || 'Ошибка пополнения' };
  } finally {
    submitting.value = false;
  }
}

async function loadDeposits(page = 1) {
  loadingDeposits.value = true;
  try {
    const res = await $api<{
      items: DepositTransaction[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/user/balance/transactions?page=${page}&limit=20`);
    deposits.value = res.items;
    pagination.value = res.pagination;
  } catch {
    loadDepositsError.value = 'Ошибка загрузки истории пополнений';
  } finally {
    loadingDeposits.value = false;
  }
}

function methodLabel(m: string) {
  return m === 'card' ? 'Банковская карта' : 'ЮMoney';
}

onMounted(async () => {
  const route = useRoute();
  const depositId = route.query.deposit as string | undefined;
  if (depositId) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const deposit = await $api<{ status: string }>(`/user/balance/deposit/${depositId}`);
        if (deposit.status === 'completed') {
          message.value = { type: 'success', text: 'Баланс успешно пополнен!' };
          if (auth.user) {
            try {
              const { personalBalance } = await $api<{ personalBalance: number }>('/user/balance');
              auth.user.balance = personalBalance;
            } catch {}
          }
          break;
        }
        if (deposit.status === 'failed') {
          message.value = { type: 'error', text: 'Платёж не прошёл. Попробуйте ещё раз.' };
          break;
        }
      } catch {
        message.value = { type: 'error', text: 'Ошибка проверки платежа. Свяжитесь с поддержкой.' };
        break;
      }
    }
    const query = { ...route.query };
    delete query.deposit;
    navigateTo({ path: route.path, query }, { replace: true });
  }
  await loadDeposits();
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Пополнение баланса</h1>

    <div class="bg-indigo-50 dark:bg-slate-700/30 rounded-xl p-4 border border-indigo-100 dark:border-slate-700">
      <span class="text-sm text-indigo-600 dark:text-indigo-400">Текущий баланс:</span>
      <span class="text-2xl font-bold text-indigo-700 dark:text-indigo-300 ml-2 tabular-nums">
        {{ (auth.user?.balance ?? 0).toFixed(0) }} ₽
      </span>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Сумма (₽)
        </label>
        <input
          v-model.number="amount"
          type="number"
          min="100"
          max="50000"
          step="100"
          class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Способ оплаты
        </label>
        <select
          v-model="method"
          class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="card">Банковская карта</option>
          <option value="yoomoney">ЮMoney</option>
        </select>
      </div>

      <div
        v-if="message"
        class="text-sm rounded-lg p-3 border"
        :class="
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
        "
      >
        {{ message.text }}
      </div>

      <button
        @click="deposit"
        :disabled="submitting"
        class="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-all duration-200 disabled:opacity-50 hover:-translate-y-0.5"
      >
        {{ submitting ? 'Пополнение...' : 'Пополнить' }}
      </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">История пополнений</h2>

      <p v-if="loadingDeposits" class="text-sm text-slate-500 dark:text-slate-400">Загрузка...</p>
      <p v-else-if="deposits.length === 0" class="text-sm text-slate-500 dark:text-slate-400">Нет пополнений</p>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
            <th class="pb-2 font-medium">Сумма</th>
            <th class="pb-2 font-medium">Способ</th>
            <th class="pb-2 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in deposits" :key="d.id" class="border-b border-slate-50 dark:border-slate-700/50">
            <td class="py-2 font-semibold tabular-nums">{{ d.amount }} ₽</td>
            <td class="py-2">{{ methodLabel(d.method) }}</td>
            <td class="py-2 text-slate-500 dark:text-slate-400">
              {{ new Date(d.createdAt).toLocaleDateString('ru-RU') }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="pagination.pages > 1" class="mt-4 flex justify-center gap-2">
        <button
          v-for="p in pagination.pages"
          :key="p"
          @click="loadDeposits(p)"
          :disabled="p === pagination.page"
          class="px-3 py-1 rounded text-xs transition"
          :class="
            p === pagination.page
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          "
        >
          {{ p }}
        </button>
      </div>
    </div>
  </div>

  <PaymentSelector
    :visible="showPaymentSelector"
    title="Выберите способ оплаты"
    description="Пополнение баланса личного кабинета"
    :methods="paymentMethods"
    :loading="submitting"
    :error="paymentError"
    @select="depositWithProvider"
    @cancel="showPaymentSelector = false"
  />
</template>

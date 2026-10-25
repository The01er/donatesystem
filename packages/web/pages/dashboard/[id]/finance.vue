<template>
  <div class="space-y-6">
    <!-- Finance cards -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-5">
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Баланс кошелька
        </div>
        <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          ₽{{ (wallet?.balance ?? 0).toFixed(2) }}
        </div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          В обработке
        </div>
        <div class="text-3xl font-bold tabular-nums" :class="pendingAmountClass">
          ₽{{ (wallet?.pendingAmount ?? 0).toFixed(2) }}
        </div>
      </div>
      <div
        v-if="!isSelfEmployed"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Доступно к выводу
        </div>
        <div class="text-3xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (wallet?.availableBalance ?? wallet?.balance ?? 0).toFixed(2) }}
        </div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Всего заработано
        </div>
        <div class="text-3xl font-bold text-slate-600 dark:text-slate-300 tabular-nums">
          ₽{{ (wallet?.totalEarned ?? 0).toFixed(2) }}
        </div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Комиссия (мес)
        </div>
        <div class="text-3xl font-bold text-amber-500 dark:text-amber-400 tabular-nums">
          ₽{{ (monthlyCommission ?? 0).toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Subscription banner -->
    <div
      v-if="serverPlan === 'subscription'"
      class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-2xl p-4 shadow-sm flex items-start gap-3"
    >
      <svg class="h-5 w-5 shrink-0 mt-0.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div class="text-sm text-indigo-800 dark:text-indigo-300">
        Вы используете подписочную модель. Вывод средств недоступен — все платежи проходят напрямую через вашу платёжную
        систему.
      </div>
    </div>

    <!-- Undelivered orders warning -->
    <div
      v-if="stats?.undeliveredOrders && stats.undeliveredOrders > 0"
      class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 shadow-sm flex items-start gap-3"
    >
      <svg class="h-5 w-5 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div class="text-sm text-amber-800 dark:text-amber-300">
        <span class="font-bold">{{ stats.undeliveredOrders }}</span>
        {{ stats.undeliveredOrders === 1 ? 'заказ оплачен' : 'заказов оплачено' }}, но ещё не выдан{{
          stats.undeliveredOrders === 1 ? '' : 'ы'
        }}
        в игре. Убедитесь, что плагин установлен и подключён к серверу.
      </div>
    </div>

    <!-- Revenue chart (compact) -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-6">
        График выручки — Последние 7 дней
      </h3>
      <div class="h-36 flex items-end gap-3 pt-6 border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div v-if="!dailyRevenue.length" class="text-slate-400 dark:text-slate-500 text-sm w-full text-center py-10">
          Нет данных
        </div>
        <div
          v-for="(day, i) in dailyRevenue"
          :key="i"
          class="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
        >
          <div
            class="text-[10px] font-semibold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 tabular-nums"
          >
            ₽{{ day.amount.toFixed(0) }}
          </div>
          <div
            class="w-full bg-indigo-100 group-hover:bg-indigo-500 dark:bg-slate-700 dark:group-hover:bg-indigo-400 rounded-t transition duration-200"
            :style="{ height: `${chartHeight(day.amount)}px` }"
          />
          <div class="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
            {{ day.date.slice(5) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="serverPlan !== 'subscription'" class="flex gap-4">
      <button
        @click="showWithdraw = true"
        class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
      >
        Вывести средства
      </button>
    </div>

    <!-- Transactions table & Withdrawal Requests -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col"
      >
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          История транзакций
        </h3>
        <div v-if="loading" class="text-slate-400 dark:text-slate-500 text-sm text-center py-10">Загрузка...</div>
        <div v-else-if="!transactions.length" class="text-slate-400 dark:text-slate-500 text-sm text-center py-10">
          Транзакций пока нет
        </div>
        <div v-else class="overflow-x-auto flex-1 flex flex-col justify-between">
          <table class="w-full text-sm">
            <thead>
              <tr
                class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs"
              >
                <th class="text-left py-3 font-semibold">Дата</th>
                <th class="text-left py-3 font-semibold">Тип</th>
                <th class="text-right py-3 font-semibold">Сумма</th>
                <th class="text-left py-3 font-semibold pl-4">Детали</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tx in transactions"
                :key="tx.id"
                class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td class="py-3 text-slate-400 dark:text-slate-500 text-xs tabular-nums">
                  {{ fmtDate(tx.createdAt) }}
                </td>
                <td class="py-3">
                  <span :class="transactionTypeClass(tx.type)">{{ tx.type }}</span>
                </td>
                <td
                  class="py-3 text-right font-semibold tabular-nums"
                  :class="tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'"
                >
                  {{ tx.amount >= 0 ? '+' : '' }}₽{{ tx.amount.toFixed(2) }}
                </td>
                <td class="py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[150px] truncate pl-4">
                  {{ tx.note || `Заказ #${tx.orderId?.slice(0, 8)}` || '—' }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div v-if="pagination.pages > 1" class="flex items-center justify-center gap-2 mt-6">
            <button
              v-for="p in pagination.pages"
              :key="p"
              @click="loadTxPage(p)"
              class="w-8 h-8 rounded-lg text-xs font-semibold border transition duration-200"
              :class="
                p === pagination.page
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
              "
            >
              {{ p }}
            </button>
          </div>
        </div>
      </div>

      <!-- Withdrawal requests -->
      <div
        v-if="serverPlan !== 'subscription'"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
      >
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Заявки на вывод средств
        </h3>
        <div v-if="!withdrawals.length" class="text-slate-400 dark:text-slate-500 text-sm text-center py-10">
          Заявки отсутствуют
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr
                class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs"
              >
                <th class="text-left py-3 font-semibold">Сумма</th>
                <th class="text-left py-3 font-semibold">Метод</th>
                <th class="text-left py-3 font-semibold">Статус</th>
                <th class="text-left py-3 font-semibold">Дата</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="w in withdrawals"
                :key="w.id"
                class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td class="py-3 text-red-500 font-bold tabular-nums">₽{{ w.amount.toFixed(2) }}</td>
                <td class="py-3 uppercase text-xs font-semibold text-slate-600 dark:text-slate-300">{{ w.method }}</td>
                <td class="py-3">
                  <span :class="withdrawalStatusClass(w.status)">{{ w.status }}</span>
                </td>
                <td class="py-3 text-slate-400 dark:text-slate-500 text-xs tabular-nums">
                  {{ fmtDate(w.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Withdraw modal -->
    <div
      v-if="showWithdraw"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showWithdraw = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Вывод средств</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Доступно:
          <span class="text-indigo-600 dark:text-indigo-400 font-bold tabular-nums"
            >₽{{ (wallet?.availableBalance ?? wallet?.balance ?? 0).toFixed(2) }}</span
          >
        </p>
        <form @submit.prevent="submitWithdraw" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Сумма вывода ($)</label
            >
            <input
              v-model.number="wForm.amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              :max="wallet?.availableBalance ?? wallet?.balance ?? 0"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Способ вывода</label
            >
            <select
              v-model="wForm.method"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            >
              <option value="card">Банковская карта</option>
              <option value="sbp">СБП (Система Быстрых Платежей)</option>
              <option value="crypto">Криптовалюта (USDT)</option>
            </select>
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Реквизиты</label
            >
            <input
              v-model="wForm.destination"
              placeholder="Номер карты / телефон / кошелек"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <p v-if="wError" class="text-red-500 text-sm font-medium flex items-center gap-1.5">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ wError }}
          </p>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="wSubmitting"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 shadow-sm transition hover:-translate-y-0.5 duration-200"
            >
              {{ wSubmitting ? 'Обработка...' : 'Создать запрос' }}
            </button>
            <button
              type="button"
              @click="showWithdraw = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition hover:-translate-y-0.5 duration-200"
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
import type { Server, ServerStats } from '~/types';
import { transactionTypeClass, withdrawalStatusClass } from '~/utils/status';
useHead({ title: 'Финансы' });

const route = useRoute();
const serverId = route.params.id as string;

const {
  wallet,
  transactions,
  withdrawals,
  pagination,
  loading,
  loadWallet,
  loadTransactions,
  loadWithdrawals,
  withdraw,
} = useWallet(serverId);

const currentServer = inject<Ref<Server | null>>('currentServer', ref(null));
const serverPlan = computed(() => currentServer.value?.planType ?? 'commission');
const isSelfEmployed = computed(() => currentServer.value?.operatingMode === 'self_employed');
const pendingAmountClass = computed(() =>
  (wallet.value?.pendingAmount ?? 0) > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400',
);
const showWithdraw = ref(false);
const wSubmitting = ref(false);
const wError = ref('');
const wForm = ref({ amount: 0, method: 'card', destination: '' });

// Stats for monthly commission
const { stats, loadStats } = useServerStats(serverId);
const monthlyCommission = computed(() => stats.value?.monthlyCommission ?? 0);
const dailyRevenue = computed(() => stats.value?.dailyRevenue ?? []);

function chartHeight(amount: number) {
  const max = Math.max(1, ...dailyRevenue.value.map((d) => d.amount));
  return Math.max(4, (amount / max) * 100);
}

function loadTxPage(page: number) {
  loadTransactions(page);
}

async function submitWithdraw() {
  wError.value = '';
  wSubmitting.value = true;
  try {
    await withdraw(wForm.value.amount, wForm.value.method, wForm.value.destination);
    showWithdraw.value = false;
    wForm.value = { amount: 0, method: 'card', destination: '' };
    await loadWithdrawals();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    wError.value = err?.data?.error || 'Withdrawal failed';
  } finally {
    wSubmitting.value = false;
  }
}

const router = useRouter();

watch(
  currentServer,
  (s) => {
    if (s && s.operatingMode === 'self_employed') {
      router.replace(`/dashboard/${serverId}`);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (currentServer.value?.operatingMode === 'self_employed') return;
  await Promise.all([loadWallet(), loadTransactions(), loadWithdrawals(), loadStats()]);
});
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-4xl mx-auto">
    <NuxtLink to="/admin/servers" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 inline-block">
      ← Назад к серверам
    </NuxtLink>

    <div v-if="loading" class="text-center py-20 text-slate-500">Загрузка...</div>
    <p v-if="loadError" class="text-red-500 text-sm font-medium">{{ loadError }}</p>

    <template v-if="order">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-4">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Информация о заказе</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-slate-400 text-xs block">ID</span>
            <span class="font-mono font-medium text-slate-900 dark:text-white">{{ order.id.slice(0, 8) }}...</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">Игрок</span>
            <span class="font-medium text-slate-900 dark:text-white">{{ order.playerName }}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">Товар</span>
            <span class="font-medium text-slate-900 dark:text-white">{{ order.product.name }}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">Сумма</span>
            <span class="font-medium text-emerald-500">₽{{ order.totalAmount.toFixed(2) }}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">Статус</span>
            <span :class="orderStatusClass(order.status)">{{ order.status }}</span>
          </div>
          <div v-if="order.paymentProvider">
            <span class="text-slate-400 text-xs block">Способ оплаты</span>
            <span class="font-medium text-slate-900 dark:text-white">{{ providerLabel(order.paymentProvider) }}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">Дата</span>
            <span class="font-medium text-slate-900 dark:text-white">{{ fmtDate(order.createdAt) }}</span>
          </div>
          <div v-if="order.commissionPct != null">
            <span class="text-slate-400 text-xs block">Комиссия</span>
            <span class="font-medium text-slate-900 dark:text-white">{{ order.commissionPct }}%</span>
          </div>
          <div v-if="order.retryCount != null">
            <span class="text-slate-400 text-xs block">Повторов</span>
            <span class="font-medium text-slate-900 dark:text-white">{{ order.retryCount }}</span>
          </div>
          <div v-if="order.lastError">
            <span class="text-slate-400 text-xs block">Последняя ошибка</span>
            <span class="font-medium text-red-500">{{ order.lastError }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-4">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Хронология</h3>
        <div v-if="timeline.length === 0" class="text-sm text-slate-500">Нет событий</div>
        <div v-else class="space-y-0">
          <div v-for="(event, i) in timeline" :key="i" class="relative pb-4 pl-6 border-l-2 border-slate-200 dark:border-slate-700 last:border-transparent last:pb-0">
            <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2" :class="event.color">
              <svg v-if="event.icon === 'success'" class="w-full h-full p-0.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              <svg v-else-if="event.icon === 'error'" class="w-full h-full p-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              <svg v-else-if="event.icon === 'pending'" class="w-full h-full p-0.5 text-yellow-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">{{ event.label }}</p>
            <p v-if="event.time" class="text-xs text-slate-400 mt-0.5">{{ event.time }}</p>
          </div>
        </div>
      </div>

      <div v-if="actions.length" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-4">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Действия</h3>
        <div class="space-y-2">
          <div v-for="(action, i) in actions" :key="i" class="flex items-center gap-2 text-sm">
            <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">{{ action.type }}</span>
            <span class="text-slate-600 dark:text-slate-300 truncate">{{ formatAction(action) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Управление</h3>
        <div class="flex flex-wrap gap-3">
          <button v-if="order.status === 'pending' || order.status === 'paid' || order.status === 'delivering'" @click="cancelOrder" :disabled="cancelling" class="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-500 disabled:opacity-50 transition">
            {{ cancelling ? 'Отмена...' : 'Отменить заказ' }}
          </button>
          <button v-if="order.status === 'failed'" @click="retryOrder" :disabled="retrying" class="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition">
            {{ retrying ? 'Повтор...' : 'Повторить выдачу' }}
          </button>
          <button v-if="canRevoke" @click="revokeOrder" :disabled="revoking" class="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-500 disabled:opacity-50 transition">
            {{ revoking ? 'Отзыв...' : 'Отозвать привилегию' }}
          </button>
          <button v-if="order.revokeStatus === 'revoked'" @click="regrantOrder" :disabled="regranting" class="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-500 disabled:opacity-50 transition">
            {{ regranting ? 'Выдача...' : 'Выдать привилегию снова' }}
          </button>
        </div>
        <p v-if="manageError" class="text-sm text-red-500 mt-3">{{ manageError }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { orderStatusClass } from '~/utils/status';
import { fmtDate } from '~/utils/format';
import type { OrderDetail } from '~/types';

function providerLabel(p: string): string {
  const labels: Record<string, string> = { anypay: 'AnyPay', yookassa: 'ЮKassa', enot: 'Enot.io', yoomoney: 'ЮMoney', mock: 'Тестовый платёж' };
  return labels[p] || p;
}

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Заказ' });

const route = useRoute();
const $admin = useAdmin();
const order = ref<OrderDetail | null>(null);
const loading = ref(true);
const loadError = ref('');
const cancelling = ref(false);
const retrying = ref(false);
const revoking = ref(false);
const regranting = ref(false);
const manageError = ref('');

const timeline = computed(() => {
  const events: { label: string; time: string; color: string; icon?: string }[] = [];
  if (!order.value) return events;
  if (order.value.createdAt) events.push({ label: 'Заказ создан', time: fmtDate(order.value.createdAt), color: 'border-indigo-400 bg-indigo-100 dark:bg-indigo-900', icon: 'success' });
  if (order.value.deliveryAttempts) {
    for (const a of order.value.deliveryAttempts) {
      events.push({
        label: `[${a.actionType || 'delivery'}] ${a.status === 'success' ? 'Выполнено' : a.status === 'failed' ? 'Ошибка' : a.status}`,
        time: fmtDate(a.createdAt),
        color: a.status === 'success' ? 'border-green-400 bg-green-100 dark:bg-green-900' : a.status === 'failed' ? 'border-red-400 bg-red-100 dark:bg-red-900' : 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900',
        icon: a.status === 'success' ? 'success' : a.status === 'failed' ? 'error' : 'pending',
      });
    }
  }
  if (order.value.status === 'cancelled') events.push({ label: 'Заказ отменён', time: '', color: 'border-red-400 bg-red-100 dark:bg-red-900', icon: 'error' });
  if (order.value.revokeStatus === 'revoked') events.push({ label: 'Привилегия отозвана', time: '', color: 'border-red-400 bg-red-100 dark:bg-red-900', icon: 'error' });
  return events;
});

const actions = computed(() => {
  if (!order.value?.product?.actionsJson) return [];
  try {
    const parsed = typeof order.value.product.actionsJson === 'string' ? JSON.parse(order.value.product.actionsJson) : order.value.product.actionsJson;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
});

const canRevoke = computed(() =>
  order.value && (order.value.status === 'delivered' || order.value.status === 'paid') && order.value.revokeStatus !== 'revoked' && order.value.revokeStatus !== 'pending' && order.value.product?.type === 'privilege' && order.value.product?.removeCommand,
);

function formatAction(a: { type: string; command?: string; description?: string }) {
  return a.description || a.command || a.type;
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await $admin<{ order: OrderDetail }>(`/orders/${route.params.orderId}`);
    order.value = data.order;
  } catch { loadError.value = 'Ошибка загрузки заказа'; } finally { loading.value = false; }
}

async function cancelOrder() {
  cancelling.value = true; manageError.value = '';
  try {
    const reason = prompt('Причина отмены:'); if (!reason) return;
    await $admin(`/orders/${route.params.orderId}/cancel`, { method: 'POST', body: { reason } }); await load();
  } catch { manageError.value = 'Ошибка отмены заказа'; } finally { cancelling.value = false; }
}

async function retryOrder() {
  retrying.value = true; manageError.value = '';
  try { await $admin(`/orders/${route.params.orderId}/retry`, { method: 'POST' }); await load(); }
  catch { manageError.value = 'Ошибка повтора выдачи'; } finally { retrying.value = false; }
}

async function revokeOrder() {
  revoking.value = true; manageError.value = '';
  try { await $admin(`/orders/${route.params.orderId}/revoke`, { method: 'POST' }); await load(); }
  catch { manageError.value = 'Ошибка отзыва привилегии'; } finally { revoking.value = false; }
}

async function regrantOrder() {
  regranting.value = true; manageError.value = '';
  try { await $admin(`/orders/${route.params.orderId}/re-grant`, { method: 'POST' }); await load(); }
  catch { manageError.value = 'Ошибка повторной выдачи'; } finally { regranting.value = false; }
}

onMounted(() => load());
</script>

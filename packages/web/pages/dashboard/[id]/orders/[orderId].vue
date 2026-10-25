<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <NuxtLink
      :to="`/dashboard/${route.params.id}/orders`"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6 transition"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Назад к заказам
    </NuxtLink>

    <p v-if="loadError" class="mb-6 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <template v-if="order">
      <!-- 1. Order Info Card -->
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 mb-6"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Информация о заказе
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >ID</span
            >
            <span class="text-sm font-mono text-slate-700 dark:text-slate-300">{{ order.id }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Товар</span
            >
            <span class="text-sm font-medium text-indigo-600 dark:text-indigo-400">{{ order.product.name }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Игрок</span
            >
            <span class="text-sm font-bold text-slate-900 dark:text-white">{{ order.playerName }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Сумма</span
            >
            <span class="text-sm font-bold text-emerald-500 dark:text-emerald-400 tabular-nums"
              >₽{{ order.totalAmount.toFixed(2) }}</span
            >
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Комиссия</span
            >
            <span class="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              {{ order.commissionPct }}% (₽{{ order.commissionAmt.toFixed(2) }})
            </span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Доход</span
            >
            <span class="text-sm font-bold text-emerald-500 dark:text-emerald-400 tabular-nums"
              >₽{{ order.ownerAmount.toFixed(2) }}</span
            >
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Статус</span
            >
            <span :class="orderStatusClass(order.status)" class="text-sm font-semibold">{{ order.status }}</span>
          </div>
          <div v-if="order.paymentProvider">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Способ оплаты</span
            >
            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ providerLabel(order.paymentProvider) }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Дата</span
            >
            <span class="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{{ fmtDate(order.createdAt) }}</span>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Тип товара</span
            >
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ productTypeLabel(order.product.type) }}</span>
          </div>
          <div v-if="order.revokeStatus">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Статус отзыва</span
            >
            <span class="text-sm font-medium" :class="revokeStatusClass">{{ order.revokeStatus }}</span>
          </div>
          <div v-if="order.lastError">
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5"
              >Последняя ошибка</span
            >
            <span class="text-sm text-red-500 font-mono">{{ order.lastError }}</span>
          </div>
        </div>
      </div>

      <!-- 2. Timeline -->
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 mb-6"
      >
        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Хронология</h3>
        <div class="relative">
          <div class="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
          <div class="space-y-4">
            <div v-for="(event, i) in timeline" :key="i" class="relative flex gap-4">
              <div class="shrink-0 w-6 flex items-start justify-center pt-0.5 z-10">
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm"
                  :class="timelineIcon(event.type)"
                >
                  <TimelineSvg :type="event.type" />
                </div>
              </div>
              <div class="flex-1 min-w-0 pt-0.5 pb-2">
                <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ event.text }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">{{ event.time }}</p>
                <p v-if="event.error" class="text-xs text-red-500 mt-1 font-mono">{{ event.error }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Actions accordion -->
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 mb-6"
      >
        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Действия</h3>
        <p v-if="committedActionObjects.length === 0" class="text-sm text-slate-400 dark:text-slate-500">Нет данных о действиях</p>
        <div v-else class="space-y-2">
          <div
            v-for="(item, i) in committedActionObjects"
            :key="i"
            class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <button
              @click="toggleAction(i)"
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-lg shrink-0">{{ actionIcon(item.action.type) }}</span>
                <span class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{{
                  actionLabel(item.action)
                }}</span>
              </div>
              <svg
                class="w-4 h-4 shrink-0 text-slate-400 transition-transform"
                :class="openActions[i] ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openActions[i]" class="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <pre class="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto">{{
                formatAction(item.action, 0, order?.playerName, order?.id)
              }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Management -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 mb-6">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Управление</h3>
        <div class="flex flex-wrap gap-3">
          <button
            v-if="order.status === OrderStatus.PAID || order.status === OrderStatus.DELIVERING"
            @click="cancelOrder"
            class="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Отменить заказ
          </button>
          <button
            v-if="order.status === OrderStatus.FAILED"
            @click="retryOrder"
            :disabled="loading"
            class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {{ loading ? 'Повтор...' : 'Повторить доставку' }}
          </button>
          <button
            v-if="canRevoke"
            data-testid="btn-revoke"
            @click="revokeOrder"
            :disabled="loading"
            class="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {{ revokeButtonLabel }}
          </button>
          <button
            v-if="canRegrant"
            data-testid="btn-regrant"
            @click="regrantOrder"
            :disabled="loading"
            class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {{ loading ? 'Выдача...' : 'Выдать привилегию снова' }}
          </button>
        </div>
      </div>
    </template>

    <ConfirmModal ref="confirmModal" />
  </div>
</template>

<script setup lang="ts">
import { orderStatusClass } from '~/utils/status';
import { OrderStatus, RevokeStatus } from '~/utils/status-constants';
import { fmtDate } from '~/utils/format';
import { PRODUCT_TYPES } from '~/utils/constants';
import type { OrderDetail } from '~/types';
useHead({ title: 'Заказ' });

const { fmtDateTime, timelineIcon, timelineSvg, actionIcon, actionLabel, formatAction, buildTimeline, parseActions } =
  useOrderDetail();

function productTypeLabel(type: string): string {
  return PRODUCT_TYPES.find((t) => t.value === type)?.label || type;
}

function providerLabel(p: string): string {
  const labels: Record<string, string> = { anypay: 'AnyPay', yookassa: 'ЮKassa', enot: 'Enot.io', yoomoney: 'ЮMoney', mock: 'Тестовый платёж' };
  return labels[p] || p;
}

const route = useRoute();
const order = ref<OrderDetail | null>(null);
const loadError = ref('');
const loading = ref(false);
const openActions = ref<Record<number, boolean>>({});

const timeline = computed(() => {
  if (!order.value) return [];
  return buildTimeline(order.value.createdAt, order.value.status, order.value.deliveryAttempts, order.value.revokeStatus);
});

const actionsData = computed(() => parseActions(order.value?.committedActions));
const parsedActions = computed(() => actionsData.value.parsed);
const hasCommittedActions = computed(() => !!order.value?.committedActions);
const parsedActionsError = computed(() => actionsData.value.error);

const allProductActions = computed(() => {
  if (!order.value?.product.actionsJson) return [];
  try {
    return JSON.parse(order.value.product.actionsJson) as Record<string, unknown>[];
  } catch {
    return [];
  }
});

const committedActionObjects = computed(() => {
  const indices = parsedActions.value;
  const actions = allProductActions.value;
  if (!Array.isArray(indices) || actions.length === 0) return [];
  return indices
    .map((idx) => {
      if (typeof idx !== 'number' || idx < 0 || idx >= actions.length) return null;
      return { index: idx, action: actions[idx] as Record<string, unknown> };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
});

function toggleAction(i: number) {
  openActions.value[i] = !openActions.value[i];
}

async function load() {
  loadError.value = '';
  const $api = useApi();
  try {
    const data = await $api<{ order: OrderDetail }>(`/servers/${route.params.id}/orders/${route.params.orderId}`);
    order.value = data.order;
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки заказа';
    console.error(e);
  }
}

interface ConfirmModalOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  confirmColor?: string;
}

const confirmModal = ref<{ show: (opts: ConfirmModalOptions) => Promise<boolean> } | null>(null);

async function cancelOrder() {
  const ok = await confirmModal.value?.show({ title: 'Отмена заказа', message: 'Отменить этот заказ?' });
  if (!ok) return;
  loading.value = true;
  const $api = useApi();
  try {
    await $api(`/servers/${route.params.id}/orders/${route.params.orderId}/cancel`, {
      method: 'POST',
    });
    await load();
  } catch (e: unknown) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function retryOrder() {
  loading.value = true;
  const $api = useApi();
  try {
    await $api(`/servers/${route.params.id}/orders/${route.params.orderId}/retry`, {
      method: 'POST',
    });
    await load();
  } catch (e: unknown) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

const canRevoke = computed(() => {
  if (!order.value) return false;
  if (order.value.revokeStatus === RevokeStatus.PENDING) return false;
  if (order.value.revokeStatus === RevokeStatus.REVOKED) return false;
  return (
    (order.value.status === OrderStatus.DELIVERED || order.value.status === OrderStatus.PAID) &&
    order.value.product.type === 'privilege' &&
    !!order.value.product.removeCommand
  );
});

const revokeStatusClass = computed(() => {
  if (order.value?.revokeStatus === RevokeStatus.REVOKED) return 'text-emerald-500';
  if (order.value?.revokeStatus === RevokeStatus.FAILED) return 'text-red-500';
  if (order.value?.revokeStatus === RevokeStatus.PENDING) return 'text-amber-500';
  return '';
});

const revokeButtonLabel = computed(() => {
  if (order.value?.revokeStatus === RevokeStatus.PENDING) return 'Отзыв привилегии...';
  if (order.value?.revokeStatus === RevokeStatus.FAILED) return 'Повторить отзыв';
  return 'Отозвать привилегию';
});

async function revokeOrder() {
  const ok = await confirmModal.value?.show({ title: 'Отзыв привилегии', message: 'Отозвать привилегию у игрока ' + order.value?.playerName + '?' });
  if (!ok) return;
  loading.value = true;
  const $api = useApi();
  try {
    await $api(`/servers/${route.params.id}/orders/${route.params.orderId}/revoke`, {
      method: 'POST',
    });
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string } };
    loadError.value = err?.data?.error || 'Ошибка отзыва привилегии';
  } finally {
    loading.value = false;
  }
}

const canRegrant = computed(() => {
  return !!order.value && order.value.revokeStatus === RevokeStatus.REVOKED && order.value.product.type === 'privilege';
});

async function regrantOrder() {
  const ok = await confirmModal.value?.show({ title: 'Выдача привилегии', message: 'Выдать привилегию снова игроку ' + order.value?.playerName + '?' });
  if (!ok) return;
  loading.value = true;
  const $api = useApi();
  try {
    await $api(`/servers/${route.params.id}/orders/${route.params.orderId}/re-grant`, {
      method: 'POST',
    });
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string } };
    loadError.value = err?.data?.error || 'Ошибка выдачи привилегии';
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>

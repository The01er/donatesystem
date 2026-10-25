<template>
  <div class="space-y-8">
    <!-- Upgrade section -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Доплата (upgrade)
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Автоматическая доплата — игрок может доплатить до более дорогой привилегии, если у него уже есть более дешёвая.
      </p>

      <div class="flex items-center justify-between mb-6">
        <div>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Включить доплату</span>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Глобальное включение для всех привилегий сервера
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input v-model="upgradeEnabled" type="checkbox" class="sr-only peer" />
          <div
            class="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"
          ></div>
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Срок действия (дней)</label
          >
          <input
            v-model.number="upgradeMaxDays"
            type="number"
            min="0"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
            0 = вечно (учитываются все купленные привилегии)
          </p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Максимальная скидка ($)</label
          >
          <input
            v-model.number="upgradeMaxDiscount"
            type="number"
            min="0"
            step="0.01"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">0 = без ограничений</p>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-4">
        <input
          id="upgradeNoCoupon"
          v-model="upgradeNoCoupon"
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label for="upgradeNoCoupon" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Запретить использование промокодов при доплате
        </label>
      </div>
    </div>

    <!-- Plan section -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Тарифный план
      </h3>

      <div v-if="isSelfEmployed" class="text-sm text-slate-500 dark:text-slate-400 mb-4">
        В режиме самозанятого доступна только подписочная модель. Переключение на комиссионный тариф недоступно.
      </div>

      <div class="grid grid-cols-1 gap-4" :class="isSelfEmployed ? 'md:grid-cols-1' : 'md:grid-cols-2'">
        <div
          v-if="!isSelfEmployed"
          class="border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer"
          :class="
            planType === 'commission'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          "
          @click="planType = 'commission'"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-slate-900 dark:text-white">Комиссионный</h4>
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="planType === 'commission' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'"
            >
              <div v-if="planType === 'commission'" class="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            </div>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Платформа удерживает комиссию с каждого заказа. Вывод средств доступен.
          </p>
        </div>
        <div
          class="border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer"
          :class="
            planType === 'subscription'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          "
          @click="planType = 'subscription'"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold text-slate-900 dark:text-white">Подписочный</h4>
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="planType === 'subscription' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'"
            >
              <div v-if="planType === 'subscription'" class="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            </div>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            <template v-if="subPrice > 0">Фиксированная плата — <strong>₽{{ subPrice.toFixed(2) }}</strong> в месяц.</template>
            <template v-else><strong>Бесплатно</strong>.</template>
            {{ isSelfEmployed ? 'Оплата через платёжный шлюз.' : 'Оплата списывается с баланса кошелька.' }}
            Вывод средств недоступен.
          </p>
        </div>
      </div>

      <button
        v-if="planType !== currentPlan"
        @click="confirmPlanChange"
        :disabled="saving"
        class="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ saving ? 'Сохранение...' : 'Сохранить' }}
      </button>
      <p v-if="saveError" class="text-red-500 text-xs mt-2">{{ saveError }}</p>
      <p v-if="refundAmount > 0" class="text-emerald-500 text-sm font-semibold mt-2">
        Возвращено ₽{{ refundAmount.toFixed(2) }} на личный баланс
      </p>
    </div>

    <!-- Confirmation modal -->
    <div
      v-if="showConfirm"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showConfirm = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Смена тарифа</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Вы переключаетесь с подписки на комиссионную модель. Вам будет возвращено
          <strong class="text-indigo-600 dark:text-indigo-400">₽{{ estimatedRefund.toFixed(2) }}</strong> за
          {{ estimatedDays }} неиспользованных дней на личный баланс.
        </p>
        <div class="flex gap-3">
          <button
            @click="savePlan"
            class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition"
          >
            Подтвердить
          </button>
          <button
            @click="showConfirm = false"
            class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>

    <!-- Subscription status -->
    <div
      v-if="subscription"
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
    >
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Статус подписки
      </h3>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500 dark:text-slate-400 w-32">Статус:</span>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="statusBadgeClass">
            {{ subscriptionStatusLabel }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500 dark:text-slate-400 w-32">Действует до:</span>
          <span class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
            {{ fmtDate(subscription.expiresAt) }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-500 dark:text-slate-400 w-32">Цена в месяц:</span>
          <span class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
            <template v-if="subscription.price > 0">₽{{ subscription.price.toFixed(2) }}</template>
            <template v-else>Бесплатно</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtDate } from '~/utils/format';
import type { SubscriptionInfo } from '~/types';
useHead({ title: 'Настройки' });

interface ServerSettings {
  planType: string;
  subscription: SubscriptionInfo | null;
  slug: string;
  shopUrl?: string;
  gameType?: string;
  upgradeEnabled: boolean;
  upgradeMaxDays: number;
  upgradeMaxDiscount: number;
  upgradeNoCoupon: boolean;
  operatingMode?: 'self_employed' | 'individual';
  globalSubscriptionPrice?: number;
}

const route = useRoute();
const serverId = route.params.id as string;

const api = useApi();

const currentPlan = ref('commission');
const planType = ref('commission');
const subscription = ref<SubscriptionInfo | null>(null);
const subPrice = ref(9.99);
const saving = ref(false);
const saveError = ref('');
const refundAmount = ref(0);
const showConfirm = ref(false);
const estimatedRefund = ref(0);
const estimatedDays = ref(0);

const upgradeEnabled = ref(true);
const upgradeMaxDays = ref(30);
const upgradeMaxDiscount = ref(0);
const upgradeNoCoupon = ref(false);
const upgradeSaving = ref(false);
const loaded = ref(false);
const operatingMode = ref<'self_employed' | 'individual'>('self_employed');
const isSelfEmployed = computed(() => operatingMode.value === 'self_employed');

const subscriptionStatusLabel = computed(() => {
  const labels: Record<string, string> = { active: 'Активна', cancelled: 'Отменена', expired: 'Истекла' };
  return labels[subscription.value?.status ?? ''] || subscription.value?.status;
});

const statusBadgeClass = computed(() => {
  if (subscription.value?.status === 'active') return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
  if (subscription.value?.status === 'expired') return 'bg-red-50 text-red-600 border border-red-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300';
});

onMounted(async () => {
  try {
    const data = await api<ServerSettings & { slug: string; shopUrl?: string; gameType?: string }>(`/servers/${serverId}`);
    currentPlan.value = data.planType;
    planType.value = data.planType;
    subscription.value = data.subscription || null;
    if (data.operatingMode) operatingMode.value = data.operatingMode;
    if (data.subscription) subPrice.value = data.subscription.chargedFrom ? data.subscription.price : (data.globalSubscriptionPrice ?? 9.99);
    upgradeEnabled.value = data.upgradeEnabled ?? true;
    upgradeMaxDays.value = data.upgradeMaxDays ?? 30;
    upgradeMaxDiscount.value = data.upgradeMaxDiscount ?? 0;
    upgradeNoCoupon.value = data.upgradeNoCoupon ?? false;
    loaded.value = true;
  } catch (e: unknown) {
    console.error(e);
  }
});

let upgradeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function saveUpgradeSettings() {
  if (upgradeDebounceTimer) clearTimeout(upgradeDebounceTimer);
  upgradeDebounceTimer = setTimeout(async () => {
    if (!loaded.value) return;
    upgradeSaving.value = true;
    try {
      await api(`/servers/${serverId}`, {
        method: 'PATCH',
        body: {
          upgradeEnabled: upgradeEnabled.value,
          upgradeMaxDays: upgradeMaxDays.value,
          upgradeMaxDiscount: upgradeMaxDiscount.value,
          upgradeNoCoupon: upgradeNoCoupon.value,
        },
      });
    } catch (e: unknown) {
      console.error(e);
    } finally {
      upgradeSaving.value = false;
    }
  }, 400);
}

watch([upgradeEnabled, upgradeMaxDays, upgradeMaxDiscount, upgradeNoCoupon], () => {
  saveUpgradeSettings();
});

function confirmPlanChange() {
  if (
    planType.value === 'commission' &&
    currentPlan.value === 'subscription' &&
    subscription.value?.status === 'active'
  ) {
    const diffMs = new Date(subscription.value.expiresAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    estimatedDays.value = daysLeft;
    estimatedRefund.value = Math.round((subPrice.value / 30) * daysLeft * 100) / 100;
    showConfirm.value = true;
  } else {
    savePlan();
  }
}

async function savePlan() {
  saving.value = true;
  saveError.value = '';
  refundAmount.value = 0;
  try {
    const res = await api<{ planType: string; refund?: { refund: number }; subscription?: SubscriptionInfo | null }>(
      `/servers/${serverId}`,
      {
        method: 'PATCH',
        body: { planType: planType.value },
      },
    );
    currentPlan.value = planType.value;
    showConfirm.value = false;
    if (res.refund) {
      refundAmount.value = res.refund.refund;
    }
    if (planType.value === 'subscription') {
      const sub = await api<SubscriptionInfo | null>(`/servers/${serverId}/subscription`);
      subscription.value = sub || null;
    } else {
      subscription.value = res.subscription || null;
    }
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

onUnmounted(() => {
  if (upgradeDebounceTimer) clearTimeout(upgradeDebounceTimer);
});
</script>

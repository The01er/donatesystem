<template>
  <div class="space-y-6">
    <p v-if="loadError" class="text-red-500 text-sm font-medium">{{ loadError }}</p>

    <!-- Trial banner (self_employed, active subscription with < 3 days left) -->
    <div
      v-if="trialBanner"
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
      <div class="text-sm text-indigo-800 dark:text-indigo-300 flex-1">
        <span class="font-bold">Пробный период.</span> Осталось
        <span class="font-bold tabular-nums">{{ trialDaysLeft }}</span>
        {{ pluralize(trialDaysLeft, 'день', 'дня', 'дней') }}.
        <span v-if="isSelfEmployed">Оплатите тариф, чтобы продолжить пользоваться платформой.</span>
      </div>
      <button
        v-if="isSelfEmployed"
        @click="payTariff"
        :disabled="paying"
        class="shrink-0 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition"
      >
        {{ paying ? 'Оплата...' : 'Оплатить тариф' }}
      </button>
    </div>

    <!-- Expired subscription banner (self_employed) -->
    <div
      v-if="expiredBanner"
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
      <div v-if="isSelfEmployed" class="text-sm text-amber-800 dark:text-amber-300 flex-1">
        Подписка истекла. Магазин временно недоступен для покупателей.
        <span class="font-bold">Оплатите тариф, чтобы восстановить доступ.</span>
      </div>
      <div v-else class="text-sm text-amber-800 dark:text-amber-300 flex-1">
        Подписка истекла. Вы переключены на комиссионную модель.
        <NuxtLink :to="`/dashboard/${serverId}/settings`" class="font-bold underline hover:no-underline"
          >Продлить подписку</NuxtLink
        >
      </div>
      <button
        v-if="isSelfEmployed"
        @click="payTariff"
        :disabled="paying"
        class="shrink-0 bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-amber-500 shadow-sm transition"
      >
        {{ paying ? 'Оплата...' : 'Оплатить тариф' }}
      </button>
    </div>

    <!-- Out of stock banner -->
    <div
      v-if="stats?.outOfStockProducts && stats.outOfStockProducts > 0"
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
        {{ stats.outOfStockProducts }}
        {{ pluralize(stats.outOfStockProducts, 'товар распродан', 'товара распродано', 'товаров распродано') }}.
        <NuxtLink :to="`/dashboard/${serverId}/products`" class="font-bold underline hover:no-underline"
          >Пополнить запасы</NuxtLink
        >
      </div>
    </div>

    <!-- Period selector -->
    <div class="flex gap-2">
      <button
        v-for="p in periods"
        :key="p.value"
        @click="switchPeriod(p.value)"
        class="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition border"
        :class="period === p.value
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- Stats cards grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Заказы сегодня
        </div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ stats?.ordersToday ?? '—' }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Доход сегодня
        </div>
        <div class="text-3xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (stats?.revenueToday ?? 0).toFixed(2) }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Выручка за месяц</div>
        <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          ₽{{ (stats?.monthlyRevenue ?? 0).toFixed(2) }}
        </div>
      </div>
      <div v-if="!isSelfEmployed" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Комиссия (мес)</div>
        <div class="text-3xl font-bold text-amber-500 dark:text-amber-400 tabular-nums">
          ₽{{ (stats?.monthlyCommission ?? 0).toFixed(2) }}
        </div>
      </div>
      <div v-if="!isSelfEmployed" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Баланс кошелька</div>
        <div class="text-3xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (stats?.balance ?? 0).toFixed(2) }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Заработано всего</div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          ₽{{ (stats?.totalEarned ?? 0).toFixed(2) }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Заказы {{ periodLabel }}</div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ stats?.currentOrders ?? '—' }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Тренд {{ periodLabel }}</div>
        <div class="flex items-baseline gap-2">
          <div class="text-3xl font-bold tabular-nums" :class="trendClass">
            {{ stats ? (stats.momsTrend >= 0 ? '+' : '') + stats.momsTrend.toFixed(1) + '%' : '—' }}
          </div>
          <svg v-if="stats && stats.momsTrend !== 0" class="h-4 w-4" :class="trendClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="stats.momsTrend > 0" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div class="text-xs text-slate-400 mt-0.5">к предыдущему периоду</div>
      </div>
    </div>

    <!-- Views stats -->
    <div v-if="viewsStats" class="grid grid-cols-2 gap-5">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Просмотры витрины
        </div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ viewsStats.totalViews }}
        </div>
        <div class="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {{ viewsStats.uniqueVisitors }} уник. за {{ periodLabel }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col">
        <h3 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Посещения по дням
        </h3>
        <div
          v-if="!viewsStats.viewsByDay.length"
          class="text-slate-400 dark:text-slate-500 text-sm text-center py-6 flex-1 flex items-center justify-center"
        >
          Данные отсутствуют
        </div>
        <div
          v-else
          class="h-32 flex items-end gap-2 pt-2 border-b border-slate-100 dark:border-slate-700/60 pb-2 flex-1"
        >
          <div
            v-for="(d, i) in viewsStats.viewsByDay"
            :key="i"
            class="flex-1 flex flex-col items-center gap-1 group h-full justify-end"
          >
            <div
              class="text-[10px] font-semibold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 tabular-nums"
            >
              {{ d.total }}
            </div>
            <div
              class="w-full bg-indigo-100 group-hover:bg-indigo-500 dark:bg-slate-700 dark:group-hover:bg-indigo-400 rounded-t transition duration-200"
              :style="{ height: `${viewsBarHeight(d.total)}px` }"
            />
            <div class="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
              {{ d.date.slice(5) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Revenue chart -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-6">
        График выручки — {{ periodLabel }}
      </h3>
      <div class="h-44 flex items-end gap-3 pt-6 border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div
          v-if="!stats?.dailyRevenue?.length"
          class="text-slate-400 dark:text-slate-500 text-sm w-full text-center py-10"
        >
          Данные отсутствуют
        </div>
        <div
          v-for="(day, i) in stats?.dailyRevenue || []"
          :key="i"
          class="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
        >
          <div
            class="text-xs font-semibold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 tabular-nums"
          >
            ₽{{ day.amount.toFixed(0) }}
          </div>
          <div
            class="w-full bg-indigo-100 group-hover:bg-indigo-500 dark:bg-slate-700 dark:group-hover:bg-indigo-400 rounded-t transition duration-200"
            :style="{ height: `${barHeight(day.amount)}px` }"
          />
          <div class="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
            {{ day.date.slice(5) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Conversion + Top products -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Conversion widget -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Конверсия
        </h3>
        <div v-if="!conversion" class="text-slate-400 text-sm text-center py-6">Загрузка...</div>
        <div v-else class="space-y-4">
          <div class="text-center">
            <div class="text-4xl font-bold tabular-nums"
              :class="conversion.conversionRate > 2 ? 'text-emerald-500' : conversion.conversionRate > 0.5 ? 'text-amber-500' : 'text-slate-500'">
              {{ conversion.conversionRate }}%
            </div>
            <div class="text-xs text-slate-400 mt-1">посетителей совершили покупку</div>
          </div>
          <div class="flex justify-between text-sm border-t border-slate-100 dark:border-slate-700/60 pt-3">
            <span class="text-slate-500">Визитов</span>
            <span class="font-semibold tabular-nums">{{ conversion.totalViews }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Заказов</span>
            <span class="font-semibold tabular-nums">{{ conversion.totalOrders }}</span>
          </div>
        </div>
      </div>

      <!-- Top products -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Топ товаров
        </h3>
        <div
          v-if="!topProducts.length"
          class="text-slate-400 dark:text-slate-500 text-sm text-center py-6"
        >
          Нет данных за период
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(item, i) in topProducts.slice(0, 5)"
            :key="item.productId"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
          >
            <span class="text-xs font-bold text-slate-400 w-5 text-right tabular-nums">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ item.productName }}</div>
              <div class="text-xs text-slate-400">{{ item.orders }} {{ pluralize(item.orders, 'заказ', 'заказа', 'заказов') }}</div>
            </div>
            <div class="text-sm font-semibold text-emerald-500 tabular-nums">₽{{ Number(item.revenue).toFixed(0) }}</div>
          </div>
        </div>
      </div>

      <!-- Recent orders + Shop link -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Последние заказы
          </h3>
          <div
            v-if="!stats?.recentOrders?.length"
            class="text-slate-400 dark:text-slate-500 text-sm text-center py-6 flex-1 flex items-center justify-center"
          >
            Нет заказов
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/50 uppercase tracking-wider text-xs">
                  <th class="text-left py-3 font-semibold">Игрок</th>
                  <th class="text-left py-3 font-semibold">Товар</th>
                  <th class="text-right py-3 font-semibold">Сумма</th>
                  <th class="text-right py-3 font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="o in stats.recentOrders"
                  :key="o.id"
                  class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td class="py-3 font-semibold text-slate-900 dark:text-white">{{ o.playerName }}</td>
                  <td class="py-3 text-slate-600 dark:text-slate-300">{{ o.product.name }}</td>
                  <td class="py-3 text-right text-emerald-500 dark:text-emerald-400 font-medium tabular-nums">
                    ₽{{ (o.totalAmount ?? o.product.price).toFixed(2) }}
                  </td>
                  <td class="py-3 text-right">
                    <span :class="orderStatusClass(o.status)">{{ o.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Витрина магазина
          </h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            Адрес вашей витрины для игроков. Вы можете привязать собственный домен во вкладке «Домен».
          </p>
          <div class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <code class="text-indigo-600 dark:text-indigo-400 text-xs font-mono truncate flex-1 select-all">
              {{ currentServer?.shopUrl || `https://${serverSlug}.${PLATFORM_DOMAIN}` }}
            </code>
          </div>
          <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <a
              :href="currentServer?.shopUrl || `/shop/${serverSlug}`"
              target="_blank"
              class="w-full flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 dark:bg-slate-700/50 dark:text-indigo-400 px-4 py-2.5 rounded-lg text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Открыть витрину
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <PaymentSelector
    :visible="showPaymentSelector"
    title="Выберите способ оплаты"
    description="Оплата подписки на тариф"
    :methods="paymentMethods"
    :loading="paying"
    :error="payError"
    @select="payWithProvider"
    @cancel="showPaymentSelector = false"
  />
</template>

<script setup lang="ts">
import { orderStatusClass } from '~/utils/status';
import { PLATFORM_DOMAIN } from '~/utils/constants';
import type { Server } from '~/types';
useHead({ title: 'Статистика' });

const route = useRoute();
const serverId = route.params.id as string;
const serverSlug = ref<string>(serverId);
const loadError = ref('');
const expiredBanner = ref(false);
const trialBanner = ref(false);
const trialDaysLeft = ref(0);
const paying = ref(false);

const periods = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'all', label: 'Всё время' },
];

const { stats, viewsStats, conversion, topProducts, period, loadAll } = useServerStats(serverId);

const periodLabel = computed(() => {
  const p = period.value;
  if (p === '7d') return ' (7д)';
  if (p === '30d') return ' (30д)';
  return '';
});

const trendClass = computed(() => {
  if (!stats.value) return '';
  return stats.value.momsTrend > 0 ? 'text-emerald-500' : stats.value.momsTrend < 0 ? 'text-red-500' : 'text-slate-500';
});

const currentServer = inject<Ref<Server | null>>('currentServer', ref(null));
watch(
  currentServer,
  (s) => {
    if (s?.slug) serverSlug.value = s.slug;
    if (s?.subscription) {
      const now = Date.now();
      const expires = new Date(s.subscription.expiresAt).getTime();
      const diff = expires - now;
      const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      trialDaysLeft.value = daysLeft;
      if (s.subscription.status === 'active' && daysLeft <= 3) {
        trialBanner.value = true;
      }
      if (s.subscription.status === 'expired') {
        expiredBanner.value = true;
      }
    }
    if (route.query.payment === 'success') {
      const query = { ...route.query };
      delete query.payment;
      navigateTo({ path: route.path, query }, { replace: true });
      (async () => {
        const $api = useApi();
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const updated = await $api<Server>(`/servers/${serverId}`);
            if (currentServer.value) {
              Object.assign(currentServer.value, updated);
            }
            if (updated.subscription?.status === 'active') break;
          } catch {}
        }
      })();
    }
  },
  { immediate: true },
);

const isSelfEmployed = computed(() => currentServer.value?.operatingMode === 'self_employed');

interface PaymentMethod {
  provider: string;
  label: string;
}

const paymentMethods = ref<PaymentMethod[]>([]);
const showPaymentSelector = ref(false);
const payError = ref('');
const selectedProvider = ref('');

async function loadPaymentMethods() {
  try {
    const data = await $fetch<{ methods: PaymentMethod[] }>('/api/payment/methods', { credentials: 'include' });
    paymentMethods.value = data.methods.filter((m) => m.provider !== 'mock');
  } catch {}
}

function switchPeriod(p: string) {
  period.value = p;
  loadAll();
}

async function payTariff() {
  await loadPaymentMethods();
  const realMethods = paymentMethods.value.filter((m) => m.provider !== 'mock');
  if (realMethods.length <= 1) {
    await doPay(realMethods[0]?.provider || '');
  } else {
    showPaymentSelector.value = true;
  }
}

async function payWithProvider(provider: string) {
  showPaymentSelector.value = false;
  await doPay(provider);
}

async function doPay(provider: string) {
  paying.value = true;
  payError.value = '';
  try {
    const $api = useApi();
    const body: Record<string, unknown> = { serverId };
    if (provider) body.provider = provider;
    const res = await $api<{ paymentUrl?: string; free?: boolean }>('/subscriptions/renew', {
      method: 'POST',
      body,
    });
    if (res.free) {
      const updated = await $api<Server>(`/servers/${serverId}`);
      if (currentServer.value) {
        Object.assign(currentServer.value, updated);
      }
      expiredBanner.value = false;
      trialBanner.value = false;
    } else if (res.paymentUrl) {
      window.location.href = res.paymentUrl;
    }
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    loadError.value = err?.data?.error || 'Ошибка создания платежа';
  } finally {
    paying.value = false;
  }
}

function pluralize(n: number, one: string, few: string, many: string): string {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}

function barHeight(amount: number) {
  const max = Math.max(1, ...(stats.value?.dailyRevenue?.map((d) => d.amount) || [1]));
  return Math.max(4, (amount / max) * 120);
}

function viewsBarHeight(total: number) {
  const max = Math.max(1, ...(viewsStats.value?.viewsByDay?.map((d) => d.total) || [1]));
  return Math.max(4, (total / max) * 90);
}

onMounted(async () => {
  loadAll();
  if (currentServer.value?.slug) {
    serverSlug.value = currentServer.value.slug;
  }
  if (
    currentServer.value?.subscription &&
    (currentServer.value.subscription.status === 'expired' ||
      (currentServer.value.subscription.status === 'cancelled' && currentServer.value.planType === 'commission'))
  ) {
    expiredBanner.value = true;
  }
});
</script>

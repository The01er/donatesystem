<script setup lang="ts">
import type { AdminViewsStats } from '~/types';

const ChartCard = defineAsyncComponent(() => import('~/components/ChartCard.vue'));

interface AdminStats {
  totalUsers: number;
  totalServers: number;
  totalOrders: number;
  ordersToday: number;
  revenueToday: number;
  totalVolume: number;
  changes: {
    usersPct: number;
    serversPct: number;
    ordersPct: number;
    revenuePct: number;
  };
  registrationsByDay: { date: string; count: number }[];
  revenueByDay: { date: string; amount: number }[];
  topServers: { id: string; name: string; game: string; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  activeSubscriptions: number;
  subscriptionRevenue: number;
  subscriptionRevenue30d: number;
  subscriptionsByStatus: { status: string; count: number }[];
}

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Обзор платформы' });

const $admin = useAdmin();
const stats = ref<AdminStats | null>(null);
const viewsStats = ref<AdminViewsStats | null>(null);
const loadError = ref('');

onMounted(async () => {
  try {
    const [adminStats, viewsData] = await Promise.all([
      $admin<AdminStats>('/stats'),
      $admin<AdminViewsStats>('/stats/views'),
    ]);
    stats.value = adminStats;
    viewsStats.value = viewsData;
  } catch {
    loadError.value = 'Ошибка загрузки статистики';
  }
});

const gameColors: Record<string, string> = {
  minecraft: '#22c55e',
  cs16: '#ef4444',
  cs2: '#ef4444',
  rust: '#f59e0b',
  gta5: '#6366f1',
  other: '#94a3b8',
};

function platformBarHeight(total: number) {
  const max = Math.max(1, ...(viewsStats.value?.viewsByDay?.map((d) => d.total) || [1]));
  return Math.max(3, (total / max) * 100);
}
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Обзор платформы</h1>

    <p v-if="loadError" class="mb-6 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Пользователи
        </div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{{ stats?.totalUsers ?? '—' }}</div>
        <div
          v-if="stats"
          class="mt-1.5 text-xs font-semibold"
          :class="stats.changes.usersPct >= 0 ? 'text-emerald-500' : 'text-red-500'"
        >
          <template v-if="stats.changes.usersPct > 0">▲</template>
          <template v-else-if="stats.changes.usersPct < 0">▼</template>
          {{ Math.abs(stats.changes.usersPct) }}% с начала дня
        </div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Серверы
        </div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ stats?.totalServers ?? '—' }}
        </div>
        <div
          v-if="stats"
          class="mt-1.5 text-xs font-semibold"
          :class="stats.changes.serversPct >= 0 ? 'text-emerald-500' : 'text-red-500'"
        >
          <template v-if="stats.changes.serversPct > 0">▲</template>
          <template v-else-if="stats.changes.serversPct < 0">▼</template>
          {{ Math.abs(stats.changes.serversPct) }}% с начала дня
        </div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Заказы сегодня
        </div>
        <div class="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {{ stats?.ordersToday ?? '—' }}
        </div>
        <div
          v-if="stats"
          class="mt-1.5 text-xs font-semibold"
          :class="stats.changes.ordersPct >= 0 ? 'text-emerald-500' : 'text-red-500'"
        >
          <template v-if="stats.changes.ordersPct > 0">▲</template>
          <template v-else-if="stats.changes.ordersPct < 0">▼</template>
          {{ Math.abs(stats.changes.ordersPct) }}% чем вчера
        </div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow transition duration-200"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Выручка сегодня
        </div>
        <div class="text-3xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (stats?.revenueToday ?? 0).toFixed(2) }}
        </div>
        <div
          v-if="stats"
          class="mt-1.5 text-xs font-semibold"
          :class="stats.changes.revenuePct >= 0 ? 'text-emerald-500' : 'text-red-500'"
        >
          <template v-if="stats.changes.revenuePct > 0">▲</template>
          <template v-else-if="stats.changes.revenuePct < 0">▼</template>
          {{ Math.abs(stats.changes.revenuePct) }}% чем вчера
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Всего заказов
        </div>
        <div class="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{{ stats?.totalOrders ?? '—' }}</div>
      </div>
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm sm:col-span-2"
      >
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Общий оборот
        </div>
        <div class="text-xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (stats?.totalVolume ?? 0).toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Subscription stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Активных подписок
        </div>
        <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          {{ stats?.activeSubscriptions ?? '—' }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Доход с подписок (всего)
        </div>
        <div class="text-xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (stats?.subscriptionRevenue ?? 0).toFixed(2) }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Доход с подписок (30 дн.)
        </div>
        <div class="text-xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
          ₽{{ (stats?.subscriptionRevenue30d ?? 0).toFixed(2) }}
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          По статусам
        </div>
        <div class="space-y-1 mt-1">
          <div
            v-for="s in stats?.subscriptionsByStatus"
            :key="s.status"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-slate-500 dark:text-slate-400 capitalize">{{ s.status }}</span>
            <span class="font-bold tabular-nums" :class="s.status === 'active' ? 'text-emerald-500' : 'text-slate-400'">
              {{ s.count }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top-5 shops by views -->
    <div v-if="viewsStats" class="mb-8">
      <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Топ-5 магазинов по просмотрам (30 дн.)
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="(s, i) in viewsStats.topServers"
          :key="s.id"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex items-center gap-4"
        >
          <div
            class="text-2xl font-bold tabular-nums shrink-0"
            :class="
              i === 0
                ? 'text-amber-500'
                : i === 1
                  ? 'text-slate-400'
                  : i === 2
                    ? 'text-amber-700'
                    : 'text-slate-300 dark:text-slate-600'
            "
          >
            #{{ i + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ s.name }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">{{ s.game }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{{ s.totalViews }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ s.uniqueVisitors }} уник.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Platform views chart -->
    <div
      v-if="viewsStats"
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-8"
    >
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Посещения платформы — 30 дней
        </h3>
        <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
          {{ viewsStats.totalPlatformViews }} уник. посетителей
        </span>
      </div>
      <div class="h-40 flex items-end gap-1.5 pt-4 border-b border-slate-100 dark:border-slate-700/60 pb-2">
        <div
          v-if="!viewsStats.viewsByDay.length"
          class="text-slate-400 dark:text-slate-500 text-sm w-full text-center py-10"
        >
          Данные отсутствуют
        </div>
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
            :style="{ height: `${platformBarHeight(d.total)}px` }"
          />
          <div
            v-if="i % 7 === 0"
            class="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1"
          >
            {{ d.date.slice(5) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div v-if="stats" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <ChartCard
        title="Регистрации за 30 дней"
        type="area"
        :series="[{ name: 'Регистрации', data: stats.registrationsByDay.map((d) => d.count) }]"
        :categories="stats.registrationsByDay.map((d) => d.date)"
        :colors="['#6366f1']"
      />

      <ChartCard
        title="Доход по дням"
        type="bar"
        :series="[{ name: 'Доход', data: stats.revenueByDay.map((d) => d.amount) }]"
        :categories="stats.revenueByDay.map((d) => d.date)"
        :colors="['#10b981']"
      />

      <ChartCard
        title="Топ-10 серверов"
        type="bar"
        :series="[{ name: 'Выручка', data: stats.topServers.map((s) => s.revenue) }]"
        :categories="stats.topServers.map((s) => s.name)"
        :colors="stats.topServers.map((s) => gameColors[s.game] || '#94a3b8')"
      />

      <ChartCard
        title="Статусы заказов"
        type="donut"
        :series="stats.ordersByStatus.map((s) => s.count)"
        :categories="stats.ordersByStatus.map((s) => s.status)"
        :colors="['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#94a3b8', '#3b82f6']"
      />
    </div>
  </div>
</template>

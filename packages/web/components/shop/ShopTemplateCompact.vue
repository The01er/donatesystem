<template>
  <div>
    <!-- Minimal header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div
            v-if="shop?.server.logoUrl"
            class="w-10 h-10 rounded-lg bg-white/90 dark:bg-slate-800/90 p-0.5 shadow shrink-0"
          >
            <img :src="shop.server.logoUrl" :alt="shop.server.name" class="w-full h-full object-contain rounded" />
          </div>
          <div
            v-else
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow shrink-0"
            :style="{ backgroundColor: brandColors.primary }"
          >
            {{ shop?.server.name?.charAt(0)?.toUpperCase() || 'S' }}
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-bold text-slate-900 dark:text-white truncate">{{ shop?.server.name }}</h1>
            <span
              class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: brandColors.bgLight, color: brandColors.textPrimary }"
            >
              {{ shop?.server.gameType }}
            </span>
            <ServerStatus
              v-if="shop?.server"
              :online="shop.server.online"
              :players="shop.server.onlinePlayers ?? 0"
              :max="shop.server.maxPlayers ?? 0"
              colorClass="text-slate-400 dark:text-slate-500 mt-0.5"
            />
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <input
            v-if="shop?.upgradeEnabled"
            v-model="playerNameGlobal"
            placeholder="Ваш ник"
            maxlength="50"
            class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-950 dark:text-white text-xs w-28 outline-none transition"
          />
        </div>
      </div>
    </div>

    <!-- Payment result -->
    <div v-if="paymentResult" class="max-w-4xl mx-auto px-4 pt-4">
      <div
        class="text-xs p-3 rounded-xl flex items-center gap-2"
        :class="{
          'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300': paymentResult === 'success',
          'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300': paymentResult === 'failed',
          'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-300': paymentResult === 'pending',
        }"
      >
        <template v-if="paymentResult === 'success'">✓ Платёж прошёл успешно! Товар будет выдан в ближайшее время.</template>
        <template v-else-if="paymentResult === 'failed'">✗ Платёж не прошёл. Попробуйте ещё раз.</template>
        <template v-else>⏳ Ожидание подтверждения платежа...</template>
      </div>
    </div>

    <!-- No shop -->
    <div v-if="!shop" class="max-w-4xl mx-auto px-4 py-20 text-center">
      <div class="text-4xl mb-3">📭</div>
      <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Магазин не найден</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ shopErrorMessage }}</p>
    </div>

    <!-- Main -->
    <div v-if="shop" class="max-w-4xl mx-auto px-4 py-6">
      <!-- Collapsible top panel -->
      <div class="mb-6">
        <button
          @click="showPanel = !showPanel"
          class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          <svg class="h-3.5 w-3.5 transition-transform" :class="showPanel ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Фильтры и промокоды
        </button>

        <div v-if="showPanel" class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Coupon -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <h4 class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Промокод</h4>
            <div class="flex gap-2">
              <input
                v-model="couponInput"
                placeholder="SAVE20"
                maxlength="20"
                class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-950 dark:text-white outline-none transition"
                @keyup.enter="applyCoupon()"
              />
              <button
                @click="applyCoupon()"
                :disabled="couponLoading"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                :style="{ backgroundColor: brandColors.primary }"
              >
                {{ couponLoading ? '...' : 'OK' }}
              </button>
            </div>
            <p v-if="couponSuccess" class="mt-1 text-[10px] font-medium text-emerald-500">Промокод применён</p>
            <p v-if="couponError" class="mt-1 text-[10px] font-medium text-red-500">{{ couponError }}</p>
          </div>

          <!-- Type filter -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <h4 class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Фильтр</h4>
            <div v-if="shouldGroup" class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in productTypeOptions"
                :key="opt.value"
                @click="activeTypeFilter = opt.value"
                class="px-2 py-1 rounded text-[10px] font-semibold transition"
                :class="
                  activeTypeFilter === opt.value
                    ? 'border shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                "
                :style="
                  activeTypeFilter === opt.value
                    ? { backgroundColor: brandColors.bgLight, color: brandColors.textPrimary, borderColor: brandColors.primaryBorder }
                    : {}
                "
              >
                {{ opt.icon }} {{ opt.label }}
              </button>
            </div>
            <p v-else class="text-[10px] text-slate-400 dark:text-slate-500">Один тип товаров</p>
          </div>

          <!-- Top donators condensed -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <h4 class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Топ донатеров</h4>
            <div class="flex gap-1 mb-2">
              <button
                v-for="p in periods"
                :key="p.key"
                @click="donatorPeriod = p.key; loadDonators()"
                class="px-1.5 py-0.5 rounded text-[9px] font-semibold transition"
                :class="donatorPeriod === p.key ? 'text-white' : 'text-slate-400 dark:text-slate-500'"
                :style="donatorPeriod === p.key ? { backgroundColor: brandColors.primary } : {}"
              >
                {{ p.label }}
              </button>
            </div>
            <div v-if="!donators.length" class="text-[10px] text-slate-400 dark:text-slate-500">Пока нет донатов</div>
            <div v-else class="space-y-1">
              <div
                v-for="(d, i) in donators.slice(0, 3)"
                :key="d.playerName"
                class="flex items-center gap-1.5 animate-fade-in"
                :style="{ animationDelay: `${i * 50}ms` }"
              >
                <span class="text-xs shrink-0">{{ medal(i) }}</span>
                <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{{ d.playerName }}</span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 ml-auto shrink-0 tabular-nums">₽{{ d.totalAmount.toFixed(0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Product list -->
      <div v-if="!shop.products.length" class="text-center py-16 text-slate-400 dark:text-slate-500">
        <div class="text-3xl mb-2">📦</div>
        <p class="text-xs">Товаров пока нет</p>
      </div>

      <div v-for="group in groupedProducts" :key="group.type" class="mb-8">
        <div v-if="group.type" class="flex items-center gap-1.5 mb-3">
          <span class="text-sm">{{ group.icon }}</span>
          <h3 class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {{ group.label }}
            <span class="text-[10px] font-normal">({{ group.products.length }})</span>
          </h3>
        </div>

        <div class="space-y-3">
          <div
            v-for="product in group.products"
            :key="product.id"
            class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row overflow-hidden"
            @mouseenter="hoveredProduct = product.id"
            @mouseleave="hoveredProduct = null"
          >
            <!-- Small image area -->
            <div class="h-24 sm:h-auto sm:w-24 shrink-0 bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
              <span class="text-2xl opacity-30">{{ typeMeta[product.type]?.icon || '📦' }}</span>
              <span
                v-if="product.soldOut"
                class="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
              >
                Распродано
              </span>
              <span
                v-else-if="product.stock != null && product.stock <= 5"
                class="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
              >
                {{ product.stock }} шт.
              </span>
            </div>

            <!-- Content -->
            <div class="p-3 sm:p-4 flex flex-col flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h4
                    class="text-sm font-bold text-slate-900 dark:text-white truncate transition-colors"
                    :class="hoveredProduct === product.id ? 'text-indigo-600 dark:text-indigo-400' : ''"
                  >
                    {{ product.name }}
                  </h4>
                  <span
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-1"
                    :class="typeMeta[product.type]?.badgeClass || 'bg-slate-100 text-slate-600'"
                  >
                    {{ typeMeta[product.type]?.label || product.type }}
                  </span>
                </div>
                <div class="text-right shrink-0">
                  <div v-if="getUpgrade(product.id)" class="mb-0.5">
                    <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}
                    </span>
                  </div>
                  <span
                    class="text-base font-bold tabular-nums"
                    :class="getUpgrade(product.id) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'"
                  >
                    ₽{{ product.price.toFixed(2) }}
                  </span>
                </div>
              </div>

              <p v-if="product.description" class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {{ product.description }}
              </p>

              <div class="flex items-center justify-between mt-3">
                <div v-if="getUpgrade(product.id)" class="text-[10px] text-slate-400 dark:text-slate-500">
                  Доплата от {{ getUpgrade(product.id)?.fromProductName }}
                </div>
                <div class="ml-auto">
                  <button
                    :disabled="product.soldOut"
                    @click="openBuy(product)"
                    class="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    :style="{ backgroundColor: product.type === 'roulette' ? '#ea580c' : brandColors.primary }"
                    @mouseenter="onBuyMouseEnter"
                    @mouseleave="onBuyMouseLeave"
                  >
                    {{ product.soldOut ? 'Нет' : product.type === 'roulette' ? '🎲' : 'Купить' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <p class="text-[10px] text-slate-400 dark:text-slate-500">
          © {{ new Date().getFullYear() }} {{ shop?.server.name || 'Магазин' }}
        </p>
        <div class="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          <NuxtLink :to="`/shop-legal/${slug}/store-offer`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Оферта</NuxtLink>
          <NuxtLink :to="`/shop-legal/${slug}/store-privacy`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Политика</NuxtLink>
          <NuxtLink :to="`/shop-legal/${slug}/store-terms`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Правила</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { ShopState } from '~/composables/useShop';

const props = defineProps<{
  slug: string;
  state: ShopState;
}>();

const {
  shop,
  shopErrorMessage,
  paymentResult,
  brandColors,
  typeMeta,
  productTypeOptions,
  groupedProducts,
  activeTypeFilter,
  hoveredProduct,
  shouldGroup,
  playerNameGlobal,
  getUpgrade,
  openBuy,
  couponInput,
  couponLoading,
  couponError,
  couponSuccess,
  applyCoupon,
  donatorPeriod,
  donatorMetric,
  donators,
  periods,
  loadDonators,
  medal,
} = props.state;

const showPanel = ref(false);

function onBuyMouseEnter(e: MouseEvent) {
  (e.target as HTMLElement).style.backgroundColor = brandColors.value.primaryHover;
}
function onBuyMouseLeave(e: MouseEvent) {
  (e.target as HTMLElement).style.backgroundColor = brandColors.value.primary;
}
</script>

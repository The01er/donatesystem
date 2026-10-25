<template>
  <div>
    <!-- Shop Header -->
    <div
      class="relative overflow-hidden"
      :class="shop?.server.coverUrl ? 'bg-transparent' : 'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'"
    >
      <div
        v-if="shop?.server.coverUrl"
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${shop.server.coverUrl})` }"
      />
      <div
        v-if="shop?.server.coverUrl"
        class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <div class="relative max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div
            v-if="shop?.server.logoUrl"
            class="w-14 h-14 rounded-xl bg-white/90 dark:bg-slate-800/90 p-1 shadow-md shrink-0"
          >
            <img :src="shop.server.logoUrl" :alt="shop.server.name" class="w-full h-full object-contain rounded-lg" />
          </div>
          <div
            v-else
            class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0"
            :style="{ backgroundColor: brandColors.primary }"
          >
            {{ shop?.server.name?.charAt(0)?.toUpperCase() || 'S' }}
          </div>
          <div>
            <h1
              class="text-2xl font-bold tracking-tight"
              :class="shop?.server.coverUrl ? 'text-white' : 'text-slate-900 dark:text-white'"
            >
              {{ shop?.server.name }}
            </h1>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span
                class="uppercase text-xs px-2.5 py-1 font-semibold rounded-md"
                :style="{
                  backgroundColor: brandColors.bgLight,
                  color: brandColors.textPrimary,
                }"
              >
                {{ shop?.server.gameType }}
              </span>
              <span
                class="text-xs flex items-center gap-1"
                :class="shop?.server.coverUrl ? 'text-slate-200' : 'text-slate-400 dark:text-slate-500'"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                {{ shop?.server.ipAddress }}
              </span>
              <ServerStatus
                v-if="shop?.server"
                :online="shop.server.online"
                :players="shop.server.onlinePlayers ?? 0"
                :max="shop.server.maxPlayers ?? 0"
                :colorClass="shop?.server.coverUrl ? 'text-slate-200' : 'text-slate-400 dark:text-slate-500'"
              />
            </div>
          </div>
        </div>
        <div v-if="shop?.upgradeEnabled" class="flex items-center gap-2">
          <input
            v-model="playerNameGlobal"
            placeholder="Ваш игровой ник"
            maxlength="50"
            class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm w-48 outline-none transition"
          />
        </div>
      </div>
    </div>

    <!-- Payment result banner -->
    <div v-if="paymentResult" class="max-w-6xl mx-auto px-6 pt-6">
      <div
        v-if="paymentResult === 'success'"
        class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-sm p-4 rounded-xl flex items-center gap-2"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Платёж прошёл успешно! Товар будет выдан в ближайшее время.
      </div>
      <div
        v-else-if="paymentResult === 'failed'"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 text-sm p-4 rounded-xl flex items-center gap-2"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Платёж не прошёл. Попробуйте ещё раз.
      </div>
      <div
        v-else
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 text-sm p-4 rounded-xl flex items-center gap-2"
      >
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Ожидание подтверждения платежа...
      </div>
    </div>

    <!-- No shop -->
    <div v-if="!shop" class="max-w-6xl mx-auto px-6 py-20 text-center">
      <div class="text-5xl mb-4">📭</div>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Магазин не найден</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ shopErrorMessage }}</p>
    </div>

    <!-- Main content -->
    <div v-if="shop" class="max-w-6xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8">
      <!-- Products grid -->
      <div class="flex-1">
        <div v-if="!shop.products.length" class="text-center py-20 text-slate-400 dark:text-slate-500">
          <div class="text-4xl mb-3">📦</div>
          <p>Товаров пока нет</p>
        </div>

        <div v-for="group in groupedProducts" :key="group.type" class="mb-10">
          <div v-if="group.type" class="flex items-center gap-2 mb-4">
            <span class="text-lg">{{ group.icon }}</span>
            <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {{ group.label }}
              <span class="text-xs font-normal text-slate-400 dark:text-slate-500">({{ group.products.length }})</span>
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <div
              v-for="product in group.products"
              :key="product.id"
              class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
              @mouseenter="hoveredProduct = product.id"
              @mouseleave="hoveredProduct = null"
            >
              <!-- Image area -->
              <div class="h-36 bg-slate-100 dark:bg-slate-700 relative overflow-hidden flex items-center justify-center">
                <span class="text-5xl opacity-30">{{ typeMeta[product.type]?.icon || '📦' }}</span>
                <span
                  class="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
                  :class="typeMeta[product.type]?.badgeClass || 'bg-slate-100 text-slate-600'"
                >
                  {{ typeMeta[product.type]?.label || product.type }}
                </span>
                <span
                  v-if="product.soldOut"
                  data-testid="product-soldout"
                  class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md"
                >
                  Распродано
                </span>
                <span
                  v-else-if="product.stock != null && product.stock <= 5"
                  class="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md"
                >
                  Осталось {{ product.stock }} шт.
                </span>
              </div>

              <!-- Content -->
              <div class="p-4 flex flex-col flex-1">
                <h4
                  :data-testid="`product-name-${product.id}`"
                  class="text-sm font-bold text-slate-900 dark:text-white mb-1.5 transition-colors duration-200"
                  :class="hoveredProduct === product.id ? 'text-indigo-600 dark:text-indigo-400' : ''"
                >
                  {{ product.name }}
                </h4>
                <p
                  v-if="product.description"
                  class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-3"
                >
                  {{ product.description }}
                </p>

                <!-- Upgrade price -->
                <div v-if="getUpgrade(product.id)" class="mb-1">
                  <span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Доплата от {{ getUpgrade(product.id)?.fromProductName }} —
                  </span>
                  <span class="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}
                  </span>
                </div>

                <div class="mt-auto pt-3 flex items-center justify-between gap-3">
                  <div>
                    <span
                      v-if="getUpgrade(product.id)"
                      class="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                    >
                      ₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}
                    </span>
                    <span
                      :data-testid="`product-price-${product.id}`"
                      :class="
                        getUpgrade(product.id)
                          ? 'text-xs text-slate-400 line-through ml-1'
                          : 'text-lg font-bold text-slate-900 dark:text-white tabular-nums'
                      "
                    >
                      ₽{{ product.price.toFixed(2) }}
                    </span>
                  </div>
                  <button
                    :data-testid="`btn-buy-${product.id}`"
                    :disabled="product.soldOut"
                    @click="openBuy(product)"
                    class="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    :style="{
                      backgroundColor: product.type === 'roulette' ? '#ea580c' : brandColors.primary,
                    }"
                    @mouseenter="onBuyMouseEnter"
                    @mouseleave="onBuyMouseLeave"
                  >
                    {{ product.soldOut ? 'Нет в наличии' : product.type === 'roulette' ? '🎲 Испытать' : 'Купить' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="lg:w-72 shrink-0 space-y-6">
        <!-- Coupon -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <h4 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Промокод</h4>
          <div class="flex gap-2">
            <input
              v-model="couponInput"
              data-testid="input-coupon"
              placeholder="SAVE20"
              maxlength="20"
              class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm outline-none transition"
              :class="couponFocused ? 'border-indigo-500 ring-1 ring-indigo-500' : ''"
              @focus="couponFocused = true"
              @blur="couponFocused = false"
              @keyup.enter="applyCoupon()"
            />
            <button
              data-testid="btn-apply-coupon"
              @click="applyCoupon()"
              :disabled="couponLoading"
              class="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              :style="{ backgroundColor: brandColors.primary }"
            >
              {{ couponLoading ? '...' : 'OK' }}
            </button>
          </div>
          <p v-if="couponSuccess" data-testid="coupon-status" class="mt-2 text-xs font-medium text-emerald-500">Промокод применён</p>
          <p v-if="couponError" data-testid="coupon-status" class="mt-2 text-xs font-medium text-red-500">{{ couponError }}</p>
        </div>

        <!-- Filter by type -->
        <div v-if="shouldGroup" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <h4 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Фильтр</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in productTypeOptions"
              :key="opt.value"
              @click="activeTypeFilter = opt.value"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              :class="
                activeTypeFilter === opt.value
                  ? 'border shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              "
              :style="
                activeTypeFilter === opt.value
                  ? {
                      backgroundColor: brandColors.bgLight,
                      color: brandColors.textPrimary,
                      borderColor: brandColors.primaryBorder,
                    }
                  : {}
              "
            >
              {{ opt.icon }} {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Top donators -->
        <div data-testid="block-top-donators" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <h4 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Топ донатеров
          </h4>
          <div class="flex gap-1 mb-3">
            <button
              v-for="p in periods"
              :key="p.key"
              @click="donatorPeriod = p.key; loadDonators()"
              class="px-2 py-1 rounded text-[10px] font-semibold transition"
              :class="donatorPeriod === p.key ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
              :style="donatorPeriod === p.key ? { backgroundColor: brandColors.primary } : {}"
            >
              {{ p.label }}
            </button>
          </div>
          <div class="flex gap-1 mb-3">
            <button
              @click="donatorMetric = 'paid'; loadDonators()"
              class="px-2 py-1 rounded text-[10px] font-semibold transition"
              :class="donatorMetric === 'paid' ? 'text-white' : 'text-slate-400 dark:text-slate-500'"
              :style="donatorMetric === 'paid' ? { backgroundColor: brandColors.primary } : {}"
            >
              Сумма
            </button>
            <button
              @click="donatorMetric = 'earned'; loadDonators()"
              class="px-2 py-1 rounded text-[10px] font-semibold transition"
              :class="donatorMetric === 'earned' ? 'text-white' : 'text-slate-400 dark:text-slate-500'"
              :style="donatorMetric === 'earned' ? { backgroundColor: brandColors.primary } : {}"
            >
              Кол-во
            </button>
          </div>
          <div v-if="!donators.length" class="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
            Пока нет донатов
          </div>
          <div v-else class="space-y-1.5">
            <div
              v-for="(d, i) in donators"
              :key="d.playerName"
              :data-testid="`donator-${i}`"
              class="flex items-center gap-2 py-1.5 animate-fade-in"
              :style="{ animationDelay: `${i * 50}ms` }"
            >
              <span class="w-6 text-center text-lg shrink-0" :class="medalAnimClass(i)">
                {{ medal(i) }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{{ d.playerName }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">
                  ₽{{ d.totalAmount.toFixed(2) }} · {{ d.orderCount }} зак.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Footer -->
    <footer class="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <div class="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p class="text-xs text-slate-400 dark:text-slate-500">
          © {{ new Date().getFullYear() }} {{ shop?.server.name || 'Магазин' }}
        </p>
        <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <NuxtLink :to="`/shop-legal/${slug}/store-offer`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition whitespace-nowrap">
            Оферта
          </NuxtLink>
          <NuxtLink :to="`/shop-legal/${slug}/store-privacy`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition whitespace-nowrap">
            Политика
          </NuxtLink>
          <NuxtLink :to="`/shop-legal/${slug}/store-terms`" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition whitespace-nowrap">
            Правила
          </NuxtLink>
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
  shopError,
  shopErrorMessage,
  paymentResult,
  brandColors,
  typeMeta,
  productTypeOptions,
  filteredProducts,
  groupedProducts,
  activeTypeFilter,
  hoveredProduct,
  couponFocused,
  shouldGroup,
  playerName,
  playerNameGlobal,
  useUpgrade,
  upgrades,
  currentUpgrade,
  currentPrice,
  getUpgrade,
  checkUpgrades,
  selectedProduct,
  buyerEmail,
  consentChecked,
  cardConsentChecked,
  buying,
  buyError,
  buySuccess,
  isRouletteProduct,
  rouletteVariants,
  openBuy,
  closeBuy,
  confirmBuy,
  couponInput,
  couponLoading,
  couponError,
  couponSuccess,
  appliedCoupon,
  applyCoupon,
  donatorPeriod,
  donatorMetric,
  donators,
  periods,
  loadDonators,
  medal,
  medalAnimClass,
} = props.state;

function onBuyMouseEnter(e: MouseEvent) {
  (e.target as HTMLElement).style.backgroundColor = brandColors.value.primaryHover;
}
function onBuyMouseLeave(e: MouseEvent) {
  (e.target as HTMLElement).style.backgroundColor = brandColors.value.primary;
}
</script>

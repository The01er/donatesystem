<template>
  <div class="min-h-screen bg-white text-slate-900">
    <!-- Top navbar -->
    <nav class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-end">
        <div class="flex items-center gap-4">
          <a href="#shop-section" class="text-xs font-semibold text-slate-500 hover:text-slate-800 transition">Магазин</a>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative overflow-hidden text-white">
      <div
        v-if="shop?.server.coverUrl"
        class="absolute inset-0 bg-cover bg-center"
        :style="{ backgroundImage: `url(${shop.server.coverUrl})` }"
      />
      <div
        class="absolute inset-0"
        :class="shop?.server.coverUrl ? 'bg-slate-900/40' : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'"
      />
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-24">
        <div class="flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
          <div class="flex-1 text-center lg:text-left">
            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-lg mb-4 text-white">
              {{ shop?.server.name }}
            </h1>
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <span
                class="uppercase text-xs px-3 py-1.5 font-bold rounded-lg"
                :style="{
                  backgroundColor: brandColors.primary + '30',
                  color: brandColors.textPrimary,
                  border: `1px solid ${brandColors.primaryBorder}`,
                }"
              >
                {{ shop?.server.gameType }}
              </span>
              <span class="text-sm flex items-center gap-1.5 text-slate-300">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                {{ shop?.server.ipAddress }}
              </span>
              <ServerStatus
                v-if="shop?.server"
                :online="shop.server.online"
                :players="shop.server.onlinePlayers ?? 0"
                :max="shop.server.maxPlayers ?? 0"
                colorClass="text-slate-300"
              />
            </div>
          </div>
          <div class="shrink-0">
            <img
              v-if="shop?.server.logoUrl"
              :src="shop.server.logoUrl"
              :alt="shop.server.name"
              width="288" height="288"
              loading="lazy"
              class="w-36 h-36 sm:w-72 sm:h-72 object-contain"
            />
            <div
              v-else
              class="w-36 h-36 sm:w-72 sm:h-72 rounded-3xl flex items-center justify-center text-white text-3xl sm:text-7xl font-black shadow-2xl"
              :style="{ backgroundColor: brandColors.primary }"
            >
              {{ getInitial() }}
            </div>
          </div>
        </div>
      </div>
      <!-- Bottom wave -->
      <div class="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" class="w-full h-12">
          <path d="M0,20 C360,55 720,0 1440,30 L1440,60 L0,60 Z" fill="#f8fafc" />
        </svg>
      </div>
    </section>

    <!-- Payment result banner -->
    <div v-if="paymentResult" class="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
      <div
        class="text-sm p-4 rounded-xl flex items-center gap-2 border shadow-sm"
        :class="{
          'bg-emerald-50 border-emerald-200 text-emerald-700': paymentResult === 'success',
          'bg-red-50 border-red-200 text-red-700': paymentResult === 'failed',
          'bg-amber-50 border-amber-200 text-amber-700': paymentResult === 'pending',
        }"
      >
        <svg v-if="paymentResult === 'success'" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="paymentResult === 'failed'" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <svg v-else class="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <template v-if="paymentResult === 'success'">Платёж прошёл успешно! Товар будет выдан в ближайшее время.</template>
        <template v-else-if="paymentResult === 'failed'">Платёж не прошёл. Попробуйте ещё раз.</template>
        <template v-else>Ожидание подтверждения платежа...</template>
      </div>
    </div>

    <!-- No shop -->
    <div v-if="!shop" class="max-w-6xl mx-auto px-6 py-20 text-center">
      <div class="text-5xl mb-4">📭</div>
      <h2 class="text-xl font-bold text-slate-700 mb-2">Магазин не найден</h2>
      <p class="text-sm text-slate-500">{{ shopErrorMessage }}</p>
    </div>

    <!-- Product section -->
    <div v-if="shop" id="shop-section" class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <!-- Top row: coupon + filter bar -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
        <div v-if="shouldGroup" class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in productTypeOptions"
            :key="opt.value"
            @click="activeTypeFilter = opt.value"
            class="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            :class="
              activeTypeFilter === opt.value
                ? 'text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 shadow-sm'
            "
            :style="
              activeTypeFilter === opt.value
                ? {
                    backgroundColor: brandColors.primary,
                    borderColor: brandColors.primaryBorder,
                  }
                : {}
            "
          >
            {{ opt.icon }} {{ opt.label }}
          </button>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input
            v-model="couponInput"
            data-testid="input-coupon"
            placeholder="Промокод"
            maxlength="20"
            class="flex-1 sm:flex-none bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 w-full sm:w-28 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30"
            @keyup.enter="applyCoupon()"
          />
          <button
            data-testid="btn-apply-coupon"
            @click="applyCoupon()"
            :disabled="couponLoading"
            class="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
            :style="{ backgroundColor: brandColors.primary }"
          >
            {{ couponLoading ? '...' : 'OK' }}
          </button>
          <p v-if="couponSuccess" data-testid="coupon-status" class="text-xs font-medium text-emerald-600 ml-1 hidden sm:block">✓</p>
          <p v-if="couponError" data-testid="coupon-status" class="text-xs font-medium text-red-500 ml-1 hidden sm:block">{{ couponError }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!shop.products.length" class="text-center py-20 text-slate-400">
        <div class="text-4xl mb-3">📦</div>
        <p class="text-sm">Товаров пока нет</p>
      </div>

      <!-- Product groups -->
      <div v-for="group in groupedProducts" :key="group.type" class="mb-10">
        <div v-if="group.type" class="flex items-center gap-2 mb-5">
          <span class="text-base">{{ group.icon }}</span>
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {{ group.label }}
            <span class="text-xs font-normal text-slate-400">({{ group.products.length }})</span>
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="product in group.products"
            :key="product.id"
            class="card border-0 shadow-lg rounded-xl text-center mb-0 product-card overflow-hidden bg-white"
          >
            <!-- Card image -->
            <div class="card-header text-center p-0 bg-slate-100 flex items-center justify-center relative" style="height: 152px">
              <img
                v-if="product.imageUrl"
                :src="product.imageUrl"
                :alt="product.name"
                width="400" height="152"
                loading="lazy"
                class="w-full h-full object-contain"
              />
              <span v-else class="text-5xl opacity-25">{{ typeMeta[product.type]?.icon || '📦' }}</span>
              <span
                v-if="product.soldOut"
                data-testid="product-soldout"
                class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded"
              >
                Распродано
              </span>
              <span
                v-else-if="product.stock != null && product.stock <= 5"
                class="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded"
              >
                {{ product.stock }} шт.
              </span>
            </div>

            <!-- Card body -->
            <div class="card-body pt-2 pb-1 px-3">
              <h5 :data-testid="`product-name-${product.id}`" class="text-sm font-bold text-slate-900 text-truncate mb-1">{{ product.name }}</h5>
              <div v-if="getUpgrade(product.id)" class="text-xs text-emerald-600 font-semibold mb-0.5">
                ₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}
                <span class="text-[10px] text-slate-400 line-through ml-1">₽{{ product.price.toFixed(2) }}</span>
              </div>
              <h4 :data-testid="`product-price-${product.id}`" class="mb-0 font-bold text-base text-slate-900 tabular-nums">
                <template v-if="getUpgrade(product.id)">
                  <span class="text-emerald-600">₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}</span>
                  <span class="text-xs text-slate-400 line-through ml-1">₽{{ product.price.toFixed(2) }}</span>
                </template>
                <template v-else>
                  ₽{{ product.price.toFixed(2) }}
                </template>
              </h4>
            </div>

            <!-- Card footer -->
            <div class="card-footer border-0 p-2 pt-0">
            <button
              :data-testid="`btn-buy-${product.id}`"
              :disabled="product.soldOut"
                @click="openBuy(product)"
                class="w-full py-2 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                :style="{
                  backgroundColor: product.type === 'roulette' ? '#ea580c' : brandColors.primary,
                }"
                @mouseenter="onBuyMouseEnter"
                @mouseleave="onBuyMouseLeave"
              >
                <template v-if="product.soldOut">Нет в наличии</template>
                <template v-else-if="product.type === 'roulette'">🎲 Испытать удачу</template>
                <template v-else>В корзину</template>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Top donators section -->
      <div v-if="donators.length && shop?.server.showTopDonators !== false" data-testid="block-top-donators" class="mt-12 mb-8">
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div class="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-xs sm:text-sm font-bold text-slate-700">🏆 Топ донатеров</h3>
            <div class="flex gap-1">
              <button
                v-for="p in periods"
                :key="p.key"
                @click="donatorPeriod = p.key; loadDonators()"
                class="px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold transition"
                :class="donatorPeriod === p.key ? 'text-white' : 'text-slate-400 hover:text-slate-600'"
                :style="donatorPeriod === p.key ? { backgroundColor: brandColors.primary } : {}"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="px-4 sm:px-6 py-4">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <div
              v-for="(d, i) in donators"
              :key="d.playerName"
              :data-testid="`donator-${i}`"
              class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 animate-fade-in"
                :style="{ animationDelay: `${i * 50}ms` }"
              >
                <span class="w-7 text-center text-base shrink-0" :class="getMedalAnimClass(i)">
                  {{ medal(i) }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 truncate">{{ d.playerName }}</p>
                  <p class="text-[10px] text-slate-400">₽{{ d.totalAmount.toFixed(2) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="relative bg-slate-900 text-slate-400 mt-12">
      <!-- Top wave -->
      <div class="absolute top-0 left-0 right-0 -translate-y-[1px]">
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" class="w-full h-10">
          <path d="M0,24 C360,48 720,0 1440,24 L1440,0 L0,0 Z" fill="#0f172a" />
        </svg>
      </div>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col items-center gap-4 sm:gap-3">
        <p class="text-xs text-center sm:text-left">
          © {{ getCurrentYear() }} {{ shop?.server.name || 'Магазин' }}.
        </p>
        <div class="flex items-center gap-3 sm:gap-4 text-xs">
          <a :href="`/shop-legal/${slug}/store-offer`" target="_blank" class="hover:text-indigo-400 transition whitespace-nowrap">Оферта</a>
          <a :href="`/shop-legal/${slug}/store-privacy`" target="_blank" class="hover:text-indigo-400 transition whitespace-nowrap">Политика</a>
          <a :href="`/shop-legal/${slug}/store-terms`" target="_blank" class="hover:text-indigo-400 transition whitespace-nowrap">Правила</a>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-500">Создано с помощью</span>
          <NuxtLink to="/" class="hover:text-indigo-400 transition font-semibold">DonatePlatform</NuxtLink>
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

function getInitial(): string {
  return shop.value?.server.name?.charAt(0)?.toUpperCase() || 'S';
}

function getBadgeClass(type: string): string {
  const meta = typeMeta[type];
  return meta?.badgeClass || 'bg-slate-100 text-slate-600';
}

function getMedalAnimClass(i: number): string {
  return medalAnimClass(i);
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function onBuyMouseEnter(e: MouseEvent) {
  const el = getTarget(e);
  if (el) {
    el.style.backgroundColor = brandColors.value.primaryHover;
  }
}

function onBuyMouseLeave(e: MouseEvent) {
  const el = getTarget(e);
  if (el) {
    el.style.backgroundColor = brandColors.value.primary;
  }
}

function getTarget(e: MouseEvent): HTMLElement | null {
  return e.target as HTMLElement | null;
}
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.4s ease-out both;
}
@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.15); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-bounce-in {
  animation: bounce-in 0.5s ease-out both;
}
</style>

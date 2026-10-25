<template>
  <div class="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
    <!-- Animated background particles -->
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        v-for="i in 20"
        :key="i"
        class="absolute rounded-full blur-3xl opacity-[0.03] animate-float"
        :style="{
          width: `${60 + Math.random() * 200}px`,
          height: `${60 + Math.random() * 200}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${12 + Math.random() * 16}s`,
          backgroundColor: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#06b6d4' : '#f472b6',
        }"
      />
    </div>

    <!-- Navbar -->
    <nav class="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img
            v-if="shop?.server.logoUrl"
            :src="shop.server.logoUrl"
            :alt="shop.server.name"
            class="h-8 w-8 rounded-lg object-contain"
          />
          <div
            v-else
            class="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-black"
            :style="{ backgroundColor: brandColors.primary }"
          >
            {{ getInitial() }}
          </div>
          <span class="text-sm font-bold text-white/80 hidden sm:block">{{ shop?.server.name }}</span>
        </div>
        <div class="flex items-center gap-6">
          <a href="#shop-section" class="text-xs font-medium text-white/50 hover:text-white/90 transition">Магазин</a>
          <a href="#top-section" v-if="donators.length" class="text-xs font-medium text-white/50 hover:text-white/90 transition">Топ</a>
        </div>
      </div>
    </nav>

    <!-- Premium Hero -->
    <section class="relative z-10 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/60 to-[#0a0a0f]" />
      <div
        class="relative max-w-7xl mx-auto px-4 sm:px-8 pt-16 sm:pt-28 pb-20 sm:pb-32"
      >
        <div class="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <!-- Logo -->
          <div class="shrink-0 order-1 lg:order-2">
            <div class="relative">
              <div
                class="absolute inset-0 rounded-3xl blur-2xl opacity-40 animate-pulse-slow"
                :style="{ backgroundColor: brandColors.primary }"
              />
              <img
                v-if="shop?.server.logoUrl"
                :src="shop.server.logoUrl"
                :alt="shop.server.name"
                class="relative w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain"
              />
              <div
                v-else
                class="relative w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-3xl flex items-center justify-center text-4xl sm:text-6xl lg:text-7xl font-black shadow-2xl"
                :style="{ backgroundColor: brandColors.primary }"
              >
                {{ getInitial() }}
              </div>
            </div>
          </div>

          <!-- Text -->
          <div class="flex-1 text-center lg:text-left order-2 lg:order-1">
            <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 leading-tight">
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
                {{ shop?.server.name }}
              </span>
            </h1>
            <p class="text-base sm:text-lg text-white/40 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
              Покупайте привилегии, валюту и предметы для незабываемой игры на нашем сервере
            </p>
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <span
                class="uppercase text-xs px-4 py-2 rounded-full font-bold tracking-wider"
                :style="{
                  backgroundColor: brandColors.primary + '25',
                  color: brandColors.textPrimary,
                  border: `1px solid ${brandColors.primaryBorder}`,
                  boxShadow: `0 0 20px ${brandColors.primary}20`,
                }"
              >
                Minecraft
              </span>
              <span class="text-sm flex items-center gap-2 text-white/30">
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
                colorClass="text-white/30"
              />
            </div>
            <div class="mt-8">
              <a
                href="#shop-section"
                class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
                :style="{
                  backgroundColor: brandColors.primary,
                  color: '#fff',
                  boxShadow: `0 0 30px ${brandColors.primary}40`,
                }"
              >
                Смотреть товары
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      <!-- Hero bottom gradient fade -->
      <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
    </section>

    <!-- Payment result banner -->
    <div v-if="paymentResult" class="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 -mt-8 mb-8">
      <div
        class="text-sm p-4 rounded-xl flex items-center gap-3 border backdrop-blur-xl shadow-xl"
        :class="{
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400': paymentResult === 'success',
          'bg-red-500/10 border-red-500/20 text-red-400': paymentResult === 'failed',
          'bg-amber-500/10 border-amber-500/20 text-amber-400': paymentResult === 'pending',
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
    <div v-if="!shop" class="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-20 text-center">
      <div class="text-6xl mb-6 opacity-50">📭</div>
      <h2 class="text-2xl font-bold text-white/60 mb-2">Магазин не найден</h2>
      <p class="text-sm text-white/30">{{ shopErrorMessage }}</p>
    </div>

    <!-- Products section -->
    <div v-if="shop" id="shop-section" class="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8">
      <!-- Section header -->
      <div class="text-center mb-12">
        <h2 class="text-3xl sm:text-4xl font-black mb-3">
          <span class="text-transparent bg-clip-text bg-gradient-to-r" :style="{ backgroundImage: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.primaryHover})` }">
            Товары и услуги
          </span>
        </h2>
        <p class="text-white/30 text-sm">Выберите то, что сделает вашу игру незабываемой</p>
      </div>

      <!-- Filters + coupon -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div v-if="shouldGroup" class="flex flex-wrap gap-2">
          <button
            v-for="opt in productTypeOptions"
            :key="opt.value"
            @click="activeTypeFilter = opt.value"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 backdrop-blur-sm"
            :class="
              activeTypeFilter === opt.value
                ? 'text-white shadow-lg'
                : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
            "
            :style="
              activeTypeFilter === opt.value
                ? {
                    backgroundColor: brandColors.primary,
                    borderColor: brandColors.primaryBorder,
                    boxShadow: `0 0 20px ${brandColors.primary}30`,
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
            class="flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/20 w-full sm:w-32 focus:border-white/20 focus:ring-1 focus:ring-white/10 backdrop-blur-sm"
            @keyup.enter="applyCoupon()"
          />
          <button
            data-testid="btn-apply-coupon"
            @click="applyCoupon()"
            :disabled="couponLoading"
            class="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95"
            :style="{ backgroundColor: brandColors.primary, boxShadow: `0 0 20px ${brandColors.primary}30` }"
          >
            {{ couponLoading ? '...' : 'Применить' }}
          </button>
          <p v-if="couponSuccess" data-testid="coupon-status" class="text-xs font-medium text-emerald-400 ml-1">✓</p>
          <p v-if="couponError" data-testid="coupon-status" class="text-xs font-medium text-red-400 ml-1">{{ couponError }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!shop.products.length" class="text-center py-20">
        <div class="text-5xl mb-4 opacity-30">📦</div>
        <p class="text-white/30">Товаров пока нет</p>
      </div>

      <!-- Product groups -->
      <div v-for="(group, gi) in groupedProducts" :key="group.type" class="mb-12">
        <div v-if="group.type" class="flex items-center gap-3 mb-6">
          <div
            class="h-8 w-8 rounded-lg flex items-center justify-center text-sm"
            :style="{ backgroundColor: brandColors.primary + '25' }"
          >
            {{ group.icon }}
          </div>
          <h3 class="text-sm font-bold text-white/70 uppercase tracking-wider">
            {{ group.label }}
            <span class="text-xs font-normal text-white/20">({{ group.products.length }})</span>
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <div
            v-for="(product, pi) in group.products"
            :key="product.id"
            class="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02]"
            :style="{
              animationDelay: `${pi * 80}ms`,
            }"
          >
            <!-- Card glow on hover -->
            <div
              class="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
              :style="{ backgroundColor: brandColors.primary + '20' }"
            />
            <!-- Card body -->
            <div class="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden h-full flex flex-col">
              <!-- Image header -->
              <div class="h-40 bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center relative overflow-hidden">
                <img
                  v-if="product.imageUrl"
                  :src="product.imageUrl"
                  :alt="product.name"
                  class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                />
                <span v-else class="text-6xl opacity-20 transition-transform duration-500 group-hover:scale-125">{{ typeMeta[product.type]?.icon || '📦' }}</span>
                <!-- Type badge -->
                <div
                  class="absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider backdrop-blur-sm"
                  :style="{
                    backgroundColor: brandColors.primary + '30',
                    color: brandColors.textPrimary,
                    border: `1px solid ${brandColors.primaryBorder}50`,
                  }"
                >
                  {{ typeMeta[product.type]?.label || product.type }}
                </div>
                <!-- Sold out badge -->
                <span
                  v-if="product.soldOut"
                  data-testid="product-soldout"
                  class="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"
                >
                  Распродано
                </span>
                <span
                  v-else-if="product.stock != null && product.stock <= 5"
                  class="absolute top-3 right-3 bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"
                >
                  {{ product.stock }} шт.
                </span>
              </div>

              <!-- Content -->
              <div class="p-4 flex flex-col flex-1">
                <h5 :data-testid="`product-name-${product.id}`" class="text-sm font-bold text-white mb-1 truncate">{{ product.name }}</h5>
                <p v-if="product.description" class="text-xs text-white/30 mb-3 line-clamp-2">{{ product.description }}</p>

                <!-- Price -->
                <div class="mt-auto pt-3">
                  <div v-if="getUpgrade(product.id)" class="mb-2">
                    <span class="text-lg font-bold text-emerald-400 tabular-nums">₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}</span>
                    <span class="text-sm text-white/30 line-through ml-2">₽{{ product.price.toFixed(2) }}</span>
                  </div>
                  <div v-else>
                    <span :data-testid="`product-price-${product.id}`" class="text-2xl font-black tabular-nums" :style="{ color: brandColors.textPrimary }">
                      ₽{{ product.price.toFixed(2) }}
                    </span>
                  </div>
                </div>

                <!-- Buy button -->
                <button
                  :data-testid="`btn-buy-${product.id}`"
                  :disabled="product.soldOut"
                  @click="openBuy(product)"
                  class="mt-3 w-full py-2.5 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  :style="{
                    backgroundColor: product.type === 'roulette' ? '#ea580c' : brandColors.primary,
                    boxShadow: `0 4px 15px ${brandColors.primary}30`,
                  }"
                  @mouseenter="onBuyMouseEnter"
                  @mouseleave="onBuyMouseLeave"
                >
                  <template v-if="product.soldOut">Нет в наличии</template>
                  <template v-else-if="product.type === 'roulette'">🎲 Испытать удачу</template>
                  <template v-else>Купить</template>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top donators section -->
      <div v-if="donators.length" id="top-section" data-testid="block-top-donators" class="mt-16 mb-8">
        <div class="relative rounded-3xl overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10">
          <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <h3 class="text-sm font-bold text-white/70">🏆 Топ донатеров</h3>
            <div class="flex gap-1">
              <button
                v-for="p in periods"
                :key="p.key"
                @click="donatorPeriod = p.key; loadDonators()"
                class="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                :class="donatorPeriod === p.key ? 'text-white shadow-lg' : 'text-white/30 hover:text-white/60'"
                :style="donatorPeriod === p.key ? { backgroundColor: brandColors.primary } : {}"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="px-6 py-5">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div
                v-for="(d, i) in donators"
                :key="d.playerName"
                :data-testid="`donator-${i}`"
                class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] animate-fade-in border border-white/5"
                :style="{ animationDelay: `${i * 60}ms` }"
              >
                <span class="w-8 text-center text-lg shrink-0" :class="getMedalAnimClass(i)">
                  {{ medal(i) }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-white/80 truncate">{{ d.playerName }}</p>
                  <p class="text-[10px] text-white/30">₽{{ d.totalAmount.toFixed(2) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="mt-12 flex items-center justify-center gap-8 sm:gap-12 py-8 border-t border-white/5 text-center">
        <div>
          <p class="text-2xl font-black text-white tabular-nums">{{ shop.products.length }}</p>
          <p class="text-[10px] text-white/30 uppercase tracking-widest">Товаров</p>
        </div>
        <div class="h-10 w-px bg-white/10" />
        <div>
          <p class="text-2xl font-black text-white tabular-nums">{{ donators.length }}</p>
          <p class="text-[10px] text-white/30 uppercase tracking-widest">Донатеров</p>
        </div>
        <div class="h-10 w-px bg-white/10" />
        <div>
          <p class="text-2xl font-black text-white tabular-nums">24/7</p>
          <p class="text-[10px] text-white/30 uppercase tracking-widest">Поддержка</p>
        </div>
      </div>
    </div>

    <!-- Premium Footer -->
    <footer class="relative z-10 bg-white/[0.02] border-t border-white/5 mt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div class="flex flex-col items-center gap-4">
          <div class="flex items-center gap-2">
            <div
              class="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black"
              :style="{ backgroundColor: brandColors.primary }"
            >
              {{ getInitial() }}
            </div>
            <span class="text-sm font-bold text-white/40">{{ shop?.server.name }}</span>
          </div>
          <p class="text-xs text-white/20">© {{ getCurrentYear() }} {{ shop?.server.name || 'Магазин' }}. Все права защищены.</p>
          <div class="flex items-center gap-4 text-xs">
            <a :href="`/shop-legal/${slug}/store-offer`" target="_blank" class="text-white/30 hover:text-white/60 transition">Оферта</a>
            <a :href="`/shop-legal/${slug}/store-privacy`" target="_blank" class="text-white/30 hover:text-white/60 transition">Политика</a>
            <a :href="`/shop-legal/${slug}/store-terms`" target="_blank" class="text-white/30 hover:text-white/60 transition">Правила</a>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-white/20">Создано с помощью</span>
            <NuxtLink to="/" class="text-white/40 hover:text-white/70 transition font-semibold">DonatePlatform</NuxtLink>
          </div>
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
@keyframes float {
  0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
  25% { transform: translateY(-30px) translateX(15px) scale(1.05); }
  50% { transform: translateY(-15px) translateX(-10px) scale(0.95); }
  75% { transform: translateY(-40px) translateX(20px) scale(1.02); }
}
.animate-float {
  animation: float ease-in-out infinite;
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.05); }
}
.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out both;
}
</style>

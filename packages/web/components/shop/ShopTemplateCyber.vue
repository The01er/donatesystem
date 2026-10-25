<template>
  <div class="min-h-screen" style="background:#f0f0f8; background-image:linear-gradient(rgba(120,80,200,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(120,80,200,0.04) 1px,transparent 1px); background-size:40px 40px; animation:gridScroll 12s linear infinite;">
    <div class="max-w-6xl mx-auto bg-white/70 backdrop-blur-xl border-2 border-[#d43bd4]/15 rounded-3xl p-5 md:p-8 shadow-[0_8px_60px_rgba(120,80,200,0.06)]" style="margin:20px auto;">

      <!-- Header -->
      <header class="flex flex-wrap justify-between items-center pb-5 gap-3" style="border-bottom:2px solid rgba(212,59,212,0.1);">
        <a href="/" class="text-2xl md:text-3xl font-extrabold" style="background:linear-gradient(135deg,#d43bd4,#0099cc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; text-decoration:none;">
          {{ shop?.server.name }}
        </a>

        <div class="flex items-center gap-4 flex-wrap">
          <a href="#shop-section" class="font-semibold text-sm transition" style="color:#555577; text-decoration:none;">Магазин</a>
          <a :href="`/shop-legal/${slug}/store-offer`" target="_blank" class="font-semibold text-sm transition" style="color:#555577; text-decoration:none;">Правила</a>
          <div class="cart-badge relative">
            <a href="#shop-section" class="cyber-btn cyber-btn-sm cyber-btn-cyan flex items-center gap-2" style="font-size:12px; padding:8px 18px; text-decoration:none;">
              🛒 Товары
            </a>
          </div>
        </div>
      </header>

      <!-- Hero -->
      <section class="text-center py-8 md:py-12">
        <div class="flex flex-col items-center gap-4 mb-4">
          <img v-if="shop?.server.logoUrl" :src="shop.server.logoUrl" :alt="shop.server.name" width="80" height="80" loading="lazy" class="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-contain" style="box-shadow:0 0 30px rgba(200,50,200,0.15);" />
          <div v-else class="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl font-black" :style="{ backgroundColor: brandColors.primary + '25', color: brandColors.primary }">
            {{ getInitial() }}
          </div>
        </div>
        <h1 class="text-3xl md:text-5xl font-extrabold">
          <span class="gradient-text">{{ shop?.server.name }}</span>
        </h1>
        <p class="mt-2 max-w-2xl mx-auto" style="color:#555577;">
          Покупайте привилегии, валюту и предметы для вашего сервера
        </p>
      </section>

      <!-- No shop -->
      <div v-if="!shop" class="py-16 text-center">
        <div class="text-6xl mb-4" style="opacity:0.4;">📭</div>
        <h2 class="text-2xl font-bold" style="color:#555577;">Магазин не найден</h2>
        <p class="text-sm" style="color:#777799;">{{ shopErrorMessage }}</p>
      </div>

      <!-- Products -->
      <div v-if="shop" id="shop-section">
        <!-- Category tabs -->
        <div class="flex flex-wrap justify-center gap-2 md:gap-3 mb-8">
          <button
            v-for="opt in productTypeOptions"
            :key="opt.value"
            @click="activeTypeFilter = opt.value"
            class="category-tab"
            :class="{ active: activeTypeFilter === opt.value }"
          >
            {{ opt.icon }} {{ opt.label }}
          </button>
        </div>

        <!-- Coupon row -->
        <div class="flex items-center justify-center gap-2 mb-8">
          <input
            v-model="couponInput"
            placeholder="Промокод"
            maxlength="20"
            class="px-4 py-2.5 rounded-xl text-sm outline-none"
            style="background:rgba(255,255,255,0.6); border:2px solid rgba(180,120,255,0.12); color:#1a1a2e; width:160px;"
            @keyup.enter="applyCoupon()"
          />
          <button
            @click="applyCoupon()"
            :disabled="couponLoading"
            class="cyber-btn cyber-btn-sm"
            style="font-size:12px; padding:8px 18px;"
          >
            {{ couponLoading ? '...' : 'Применить' }}
          </button>
          <span v-if="couponSuccess" class="text-sm font-bold" style="color:#00aa77;">✓</span>
          <span v-if="couponError" class="text-sm" style="color:#d43bd4;">{{ couponError }}</span>
        </div>

        <!-- Empty state -->
        <div v-if="!filteredProducts.length" class="text-center py-12">
          <div class="text-5xl mb-3" style="opacity:0.3;">📦</div>
          <p style="color:#777799;">Товаров нет</p>
        </div>

        <!-- Product grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
          >
            <span v-if="product.soldOut" class="badge">Распродано</span>
            <span v-else-if="product.stock != null && product.stock <= 5" class="badge" style="background:linear-gradient(135deg,#e88844,#cc6600);">Ост. {{ product.stock }}</span>
            <span v-else-if="product.type === 'roulette'" class="badge" style="background:linear-gradient(135deg,#d43bd4,#8a2a8a); color:#fff;">🎲 Рандом</span>
            <span class="icon">{{ typeMeta[product.type]?.icon || '📦' }}</span>
            <h3>{{ product.name }}</h3>
            <p class="desc">{{ product.description || typeMeta[product.type]?.label || '' }}</p>
            <div v-if="getUpgrade(product.id)" class="mb-2">
              <span class="price" style="color:#00aa77;">₽{{ getUpgrade(product.id)?.upgradePrice.toFixed(2) }}</span>
              <span class="text-sm line-through ml-2" style="color:#8888aa;">₽{{ product.price.toFixed(2) }}</span>
            </div>
            <div v-else class="price">
              ₽{{ product.price.toFixed(2) }} <small v-if="product.type === 'privilege'">/мес</small>
            </div>
            <button
              :disabled="product.soldOut"
              @click="openBuy(product)"
              class="cyber-btn w-full text-center"
              :class="product.type === 'roulette' ? 'cyber-btn-cyan' : ''"
              style="font-size:13px; padding:10px 20px;"
            >
              <template v-if="product.soldOut">Нет в наличии</template>
              <template v-else-if="product.type === 'roulette'">🎲 Испытать удачу</template>
              <template v-else>В корзину</template>
            </button>
          </div>
        </div>

        <!-- Top donators -->
        <div v-if="donators.length && shop?.server.showTopDonators !== false" class="mt-12">
          <div class="rounded-2xl p-5" style="background:rgba(255,255,255,0.5); backdrop-filter:blur(4px); border:1px solid rgba(180,120,255,0.1);">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-extrabold" style="color:#1a1a2e;">🏆 Топ донатеров</h3>
              <div class="flex gap-1">
                <button
                  v-for="p in periods"
                  :key="p.key"
                  @click="donatorPeriod = p.key; loadDonators()"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  :class="donatorPeriod === p.key ? 'text-white' : ''"
                  :style="donatorPeriod === p.key ? { background:'linear-gradient(135deg,#d43bd4,#8a2a8a)' } : { background:'rgba(200,50,200,0.06)', color:'#555577' }"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div
                v-for="(d, i) in donators"
                :key="d.playerName"
                class="flex items-center gap-3 p-3 rounded-xl"
                style="background:rgba(255,255,255,0.6); border:1px solid rgba(180,120,255,0.08);"
              >
                <span class="w-8 text-center text-lg shrink-0" :class="getMedalAnimClass(i)">{{ medal(i) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold truncate" style="color:#1a1a2e;">{{ d.playerName }}</p>
                  <p class="text-[10px]" style="color:#8888aa;">₽{{ d.totalAmount.toFixed(2) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent purchases -->
        <section v-if="shop?.server.showRecentPurchases !== false" class="mt-12">
          <h2 class="text-xl font-extrabold flex items-center gap-2" style="color:#1a1a2e;">
            🔥 Последние покупки на сервере
          </h2>
          <div class="mt-3 space-y-2">
            <div
              v-for="(d, i) in donators.slice(0, 4)"
              :key="i"
              class="flex flex-wrap justify-between items-center rounded-xl px-4 py-3"
              style="background:rgba(255,255,255,0.4); backdrop-filter:blur(4px); border:1px solid rgba(212,59,212,0.05);"
            >
              <span class="font-semibold" style="color:#1a1a2e;">✧ {{ d.playerName }}</span>
              <span class="text-sm" style="color:#555577;">купил(а) <span class="font-bold" style="color:#d43bd4;">товар</span></span>
              <span class="text-xs" style="color:#8888aa;">только что</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Payment result banner -->
      <div v-if="paymentResult" class="mt-6">
        <div
          class="text-sm p-4 rounded-xl flex items-center gap-3"
          :class="{
            'bg-emerald-50 border border-emerald-200 text-emerald-700': paymentResult === 'success',
            'bg-red-50 border border-red-200 text-red-600': paymentResult === 'failed',
            'bg-amber-50 border border-amber-200 text-amber-600': paymentResult === 'pending',
          }"
        >
          <template v-if="paymentResult === 'success'">✅ Платёж прошёл успешно! Товар будет выдан в ближайшее время.</template>
          <template v-else-if="paymentResult === 'failed'">❌ Платёж не прошёл. Попробуйте ещё раз.</template>
          <template v-else>⏳ Ожидание подтверждения платежа...</template>
        </div>
      </div>

      <!-- Footer -->
      <footer class="mt-12 pt-6 flex flex-wrap justify-between items-center gap-4 text-sm" style="border-top:2px solid rgba(212,59,212,0.1); color:#777799;">
        <span>© 2026 <span style="color:#d43bd4; font-weight:700;">DonatePlatform</span> — Игровая витрина</span>
        <div>
          <a :href="`/shop-legal/${slug}/store-offer`" target="_blank" style="color:#8888aa; text-decoration:none; margin:0 8px;">Оферта</a>
          <a :href="`/shop-legal/${slug}/store-privacy`" target="_blank" style="color:#8888aa; text-decoration:none; margin:0 8px;">Политика</a>
          <a :href="`/shop-legal/${slug}/store-terms`" target="_blank" style="color:#8888aa; text-decoration:none; margin:0 8px;">Правила</a>
        </div>
      </footer>
      <div class="mt-3 text-center text-xs" style="color:#8888aa;">
        Создано с помощью <a href="/" style="color:#d43bd4; text-decoration:none; font-weight:600;">DonatePlatform</a>
      </div>

    </div>

    <!-- Checkout modal -->
    <ShopCheckout :slug="slug" :state="state" />
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
  activeTypeFilter,
  playerName,
  upgrades,
  getUpgrade,
  openBuy,
  couponInput,
  couponLoading,
  couponError,
  couponSuccess,
  appliedCoupon,
  applyCoupon,
  donatorPeriod,
  donators,
  periods,
  loadDonators,
  medal,
  medalAnimClass,
  selectedProduct,
} = props.state;

function getInitial(): string {
  return shop.value?.server.name?.charAt(0)?.toUpperCase() || 'S';
}

function getMedalAnimClass(i: number): string {
  return medalAnimClass(i);
}
</script>

<style scoped>
@keyframes gridScroll {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}
.category-tab {
  padding: 8px 20px;
  border-radius: 30px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
  border: 2px solid transparent;
  background: rgba(255,255,255,0.4);
  color: #555577;
  user-select: none;
}
.category-tab:hover {
  background: rgba(200,50,200,0.08);
  color: #d43bd4;
}
.category-tab.active {
  border-color: #d43bd4;
  background: rgba(200,50,200,0.1);
  color: #d43bd4;
}
.product-card {
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(180,120,255,0.12);
  border-radius: 16px;
  padding: 24px 20px 20px;
  text-align: center;
  transition: 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
.product-card:hover {
  transform: translateY(-6px);
  border-color: #d43bd4;
  box-shadow: 0 8px 40px rgba(200,50,200,0.12);
}
.product-card .badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #ffdd44, #cc9900);
  color: #1a1a2e;
  padding: 4px 14px;
  font-weight: 700;
  font-size: 11px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.product-card .icon { font-size: 48px; display: block; margin-bottom: 10px; }
.product-card h3 { font-size: 18px; font-weight: 800; color: #1a1a2e; margin-bottom: 4px; }
.product-card .desc { font-size: 13px; color: #666688; margin-bottom: 12px; line-height: 1.4; }
.product-card .price { font-size: 28px; font-weight: 900; color: #d43bd4; margin-bottom: 14px; }
.product-card .price small { font-size: 16px; font-weight: 400; color: #8888aa; }
.cart-badge { position: relative; display: inline-block; }
@media (max-width: 640px) {
  .category-tab { padding: 6px 14px; font-size: 12px; }
  .product-card .price { font-size: 22px; }
}
</style>

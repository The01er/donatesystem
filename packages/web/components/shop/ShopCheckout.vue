<template>
  <div
    v-if="selectedProduct"
    data-testid="block-checkout"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="closeBuy()"
  >
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700 transition-all duration-200 max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-6 pb-3 border-b border-slate-100 dark:border-slate-700">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Корзина</h2>
        <button data-testid="btn-close-checkout" @click="closeBuy()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="overflow-y-auto px-6 py-4 space-y-4 flex-1">
        <!-- Product info row -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-lg shrink-0">{{ isRouletteProduct ? '🎲' : typeMeta[selectedProduct.type]?.icon || '📦' }}</span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ selectedProduct.name }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">{{ playerName || '—' }}</p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span v-if="useUpgrade" class="text-sm font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
              ₽{{ currentPrice.toFixed(2) }}
            </span>
            <span
              class="text-sm font-bold tabular-nums"
              :class="useUpgrade ? 'text-slate-400 line-through text-xs ml-1' : 'text-slate-900 dark:text-white'"
            >
              ₽{{ selectedProduct.price.toFixed(2) }}
            </span>
          </div>
        </div>

        <!-- Upgrade block -->
        <div
          v-if="currentUpgrade"
          class="p-3 rounded-lg border"
          :style="{ backgroundColor: brandColors.bgLight, borderColor: brandColors.primaryBorder }"
        >
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              :checked="useUpgrade"
              @change="onUseUpgradeChange"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-slate-300"
              :style="{ color: brandColors.primary }"
            />
            <div>
              <div class="text-sm font-semibold" :style="{ color: brandColors.textPrimary }">
                У вас уже есть {{ currentUpgrade.fromProductName }}. Доплатите до {{ selectedProduct.name }}!
              </div>
              <p class="text-xs mt-0.5" :style="{ color: brandColors.primary }">
                Всего <strong>₽{{ currentUpgrade.upgradePrice.toFixed(2) }}</strong> вместо ₽{{
                  selectedProduct.price.toFixed(2)
                }}
              </p>
            </div>
          </label>
        </div>

        <!-- Roulette variants -->
        <div
          v-if="isRouletteProduct && rouletteVariants.length"
          class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800"
        >
          <div class="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
            Возможные выигрыши
          </div>
          <div class="space-y-1.5">
            <div
              v-for="(variant, vi) in rouletteVariants"
              :key="vi"
              class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <span>•</span>
              <span>{{ variant.description }}</span>
            </div>
          </div>
        </div>

        <!-- Instruction -->
        <div class="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-3">
          <p class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Инструкция по покупке
          </p>
          <div class="space-y-2.5">
            <div class="flex gap-3">
              <span class="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0 mt-0.5">1</span>
              <div>
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Выбор товара</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Добавьте необходимые товары в корзину и заполните предлагаемую форму.</p>
              </div>
            </div>
            <div class="flex gap-3">
              <span class="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0 mt-0.5">2</span>
              <div>
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Оплата товара</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Оплатите товары, добавленные в корзину.</p>
              </div>
            </div>
            <div class="flex gap-3">
              <span class="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0 mt-0.5">3</span>
              <div>
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">Активация</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">После оплаты товары выдаются на выбранном Вами сервере автоматически.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div data-testid="checkout-total" class="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
          <span class="text-sm font-semibold text-slate-900 dark:text-white">Итого:</span>
          <div class="text-right">
            <span v-if="useUpgrade" class="text-lg font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
              ₽{{ currentPrice.toFixed(2) }}
            </span>
            <span
              class="text-lg font-bold tabular-nums"
              :class="useUpgrade ? 'text-slate-400 line-through text-sm ml-2' : 'text-slate-900 dark:text-white'"
            >
              ₽{{ selectedProduct.price.toFixed(2) }}
            </span>
          </div>
        </div>

        <!-- Warning -->
        <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50 flex items-start gap-2.5">
          <svg class="h-4 w-4 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-xs text-amber-700 dark:text-amber-300">
            Внимание! Некоторые товары (например блоки) могут быть выданы только в том случае, если Вы находитесь на сервере.
          </p>
        </div>

        <!-- Form -->
        <div class="space-y-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Для покупки товара заполните форму.
          </p>
          <input
            data-testid="input-player-name"
            :value="playerName"
            @input="onNameInput"
            placeholder="Ваш игровой никнейм"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            required
            maxlength="50"
          />
          <input
            data-testid="input-email"
            :value="buyerEmail"
            @input="onEmailInput"
            type="email"
            placeholder="Ваш E-mail"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />

          <!-- Payment method -->
          <div v-if="paymentMethods.length > 1">
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Способ оплаты
            </label>
            <div class="space-y-2">
              <label
                v-for="pm in paymentMethods"
                :key="pm.provider"
                class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                :class="selectedProvider === pm.provider
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              >
                <input
                  type="radio"
                  :value="pm.provider"
                  :checked="selectedProvider === pm.provider"
                  @change="onProviderChange(pm.provider)"
                  class="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span class="text-sm text-slate-900 dark:text-white font-medium">{{ pm.label }}</span>
              </label>
            </div>
          </div>

          <label data-testid="label-consent" class="flex items-start gap-3 cursor-pointer">
            <input
              data-testid="input-consent"
              :checked="consentChecked"
              @change="onConsentChange"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Я принимаю условия
              <a :href="`/shop-legal/${slug}/store-terms`" target="_blank" class="text-indigo-600 dark:text-indigo-400 underline hover:no-underline">пользовательского соглашения</a>
              и
              <a :href="`/shop-legal/${slug}/store-offer`" target="_blank" class="text-indigo-600 dark:text-indigo-400 underline hover:no-underline">оказания услуг</a>
            </span>
          </label>
          <label data-testid="label-card-consent" class="flex items-start gap-3 cursor-pointer">
            <input
              data-testid="input-card-consent"
              :checked="cardConsentChecked"
              @change="onCardConsentChange"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Я подтверждаю, что банковская карта принадлежит мне
            </span>
          </label>
        </div>

        <!-- Error / Success -->
        <p v-if="buyError" class="text-red-500 text-sm font-medium flex items-center gap-1.5">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {{ buyError }}
        </p>
        <p v-if="buySuccess" class="text-emerald-500 text-sm font-medium flex items-center gap-1.5">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ buySuccess }}
        </p>
      </div>

      <!-- Footer actions -->
      <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
        <div class="flex gap-3">
          <button
            data-testid="btn-submit-order"
            type="submit"
            :disabled="buying || !consentChecked || !cardConsentChecked || !playerName.trim()"
            @click="confirmBuy()"
            class="flex-1 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:scale-95"
            :style="{ backgroundColor: brandColors.primary }"
            @mouseenter="onPayEnter"
            @mouseleave="onPayLeave"
          >
            {{ buying ? 'Обработка...' : isRouletteProduct ? '🎲 Испытать удачу' : 'Оплатить' }}
          </button>
          <button
            type="button"
            @click="closeBuy()"
            class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Отмена
          </button>
        </div>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
          Храним и обрабатываем персональные данные в соответствии с
          <a :href="`/shop-legal/${slug}/store-privacy`" target="_blank" class="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 underline hover:no-underline">Политикой конфиденциальности</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShopState } from '~/composables/useShop';

const props = defineProps<{
  slug: string;
  state: ShopState;
}>();

const {
  selectedProduct,
  playerName,
  buyerEmail,
  consentChecked,
  cardConsentChecked,
  buying,
  buyError,
  buySuccess,
  useUpgrade,
  currentUpgrade,
  currentPrice,
  isRouletteProduct,
  rouletteVariants,
  brandColors,
  typeMeta,
  paymentMethods,
  selectedProvider,
  openBuy,
  closeBuy,
  confirmBuy,
} = props.state;

function onNameInput(e: Event) { playerName.value = (e.target as HTMLInputElement).value; }
function onEmailInput(e: Event) { buyerEmail.value = (e.target as HTMLInputElement).value; }
function onUseUpgradeChange(e: Event) { useUpgrade.value = (e.target as HTMLInputElement).checked; }
function onConsentChange(e: Event) { consentChecked.value = (e.target as HTMLInputElement).checked; }
function onCardConsentChange(e: Event) { cardConsentChecked.value = (e.target as HTMLInputElement).checked; }
function onProviderChange(provider: string) { selectedProvider.value = provider; }
function onPayEnter(e: MouseEvent) {
  if (!buying.value) (e.target as HTMLElement).style.backgroundColor = brandColors.value.primaryHover;
}
function onPayLeave(e: MouseEvent) {
  if (!buying.value) (e.target as HTMLElement).style.backgroundColor = brandColors.value.primary;
}
</script>

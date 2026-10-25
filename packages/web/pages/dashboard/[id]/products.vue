<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Товары сервера</h2>
      <button
        @click="openCreate"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
      >
        + Добавить товар
      </button>
    </div>

    <!-- Product form modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
      >
        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-6">
          {{ editing ? 'Редактировать товар' : 'Новый товар' }}
        </h2>

        <form @submit.prevent="save" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Название товара</label
            >
            <input
              v-model="form.name"
              placeholder="Название (например, VIP привилегия)"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Тип товара</label
            >
            <select
              v-model="form.type"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            >
              <option v-for="t in productTypes" :key="t.value" :value="t.value">{{ t.icon }} {{ t.label }}</option>
            </select>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Цена ($)</label
            >
            <input
              v-model.number="form.price"
              type="number"
              min="0"
              step="0.01"
              placeholder="9.99"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Команды</label
            >
            <textarea
              v-if="!isRoulette"
              v-model="form.command"
              placeholder="give {player} diamond 1&#10;broadcast {player} купил алмаз!&#10;add_group {player} vip&#10;give_money {player} 1000"
              rows="6"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            ></textarea>

            <!-- Roulette variant editor -->
            <div v-else class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs text-slate-500 dark:text-slate-400">Варианты выпадения (сумма шансов = 100%)</p>
                <span
                  class="text-xs font-bold px-2 py-1 rounded-full"
                  :class="
                    chanceSum === 100
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  "
                >
                  Сумма: {{ chanceSum }}%
                </span>
              </div>
              <div
                v-for="(v, vi) in form.rouletteVariants"
                :key="vi"
                class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase"
                    >Вариант {{ vi + 1 }}</span
                  >
                  <button
                    type="button"
                    @click="removeRouletteVariant(vi)"
                    class="text-xs text-red-500 hover:text-red-600 font-semibold"
                  >
                    Удалить
                  </button>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1"
                    >Описание (что увидит игрок)</label
                  >
                  <input
                    v-model="v.description"
                    placeholder="VIP на 30 дней"
                    maxlength="200"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1"
                    >Команда на сервере</label
                  >
                  <textarea
                    v-model="v.command"
                    placeholder="give {player} diamond 1"
                    rows="2"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  ></textarea>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    Несколько команд через <code class="text-indigo-500">;</code>
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Шанс %</label>
                  <input
                    v-model.number="v.chance"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
              <button
                type="button"
                @click="addRouletteVariant"
                class="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition"
              >
                + Добавить вариант
              </button>
            </div>

            <div v-if="isPrivilege" class="mt-3">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Команда снятия привилегии</label
              >
              <textarea
                v-model="form.removeCommand"
                placeholder="lp user {player} parent remove vip&#10;permission remove {player} vip.*"
                rows="3"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              ></textarea>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Выполняется при откате/отмене заказа для снятия привилегии с игрока.
              </p>
            </div>

            <p v-if="!isRoulette" class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              Каждая строка — одна команда. Поддерживаются плейсхолдеры:
              <code class="text-indigo-500">{player}</code>, <code class="text-indigo-500">{order_id}</code>,
              <code class="text-indigo-500">{server}</code>. Также поддерживаются
              <code class="text-indigo-500">broadcast</code>, <code class="text-indigo-500">add_group</code>,
              <code class="text-indigo-500">give_money</code> и другие действия.
            </p>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Описание</label
            >
            <textarea
              v-model="form.description"
              placeholder="Подробное описание товара"
              rows="3"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            ></textarea>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Ограничение запаса</label
            >
            <input
              v-model.number="form.stock"
              type="number"
              min="0"
              placeholder="Пусто = безлимит"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Оставьте пустым для безлимитных товаров. 0 = распродано.
            </p>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Ссылка на изображение</label
            >
            <input
              v-model="form.imageUrl"
              placeholder="https://example.com/image.png"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
            <img
              v-if="form.imageUrl"
              :src="form.imageUrl"
              class="mt-2 h-24 w-24 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
              alt="preview"
              @error="imageError = true"
            />
          </div>

          <p v-if="formError" class="text-red-500 text-sm font-medium flex items-center gap-1.5">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ formError }}
          </p>

          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
            >
              Сохранить
            </button>
            <button
              type="button"
              @click="showForm = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition hover:-translate-y-0.5 duration-200"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Product grid -->
    <div
      v-if="products.length === 0"
      class="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm"
    >
      <svg
        class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Товары отсутствуют</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Начните с добавления первого товара для продажи.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="p in products"
        :key="p.id"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition duration-200 hover:-translate-y-0.5"
      >
        <div
          v-if="p.imageUrl"
          class="h-40 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-700/50"
        >
          <img :src="p.imageUrl" :alt="p.name" loading="lazy" class="w-full h-full object-cover" />
        </div>
        <div
          v-else
          class="h-40 bg-slate-50 dark:bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-700/50"
        >
          <span class="text-4xl">{{ productTypeIcon(p.type) }}</span>
        </div>
        <div class="p-5 flex flex-col flex-1 gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded-full font-semibold border" :class="typeBadgeClass(p.type)">
              {{ productTypeIcon(p.type) }} {{ productTypeLabel(p.type) }}
            </span>
          </div>
          <div class="font-bold text-lg text-slate-900 dark:text-white">{{ p.name }}</div>
          <div
            v-if="p.description"
            class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4 flex-1"
          >
            {{ p.description }}
          </div>
          <div v-else class="flex-1"></div>
          <div class="flex items-center justify-between mb-3">
            <div class="text-2xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
              ₽{{ p.price.toFixed(2) }}
            </div>
            <div
              v-if="p.stock !== null && p.stock !== undefined"
              class="text-xs font-semibold tabular-nums"
              :class="
                p.stock === 0 ? 'text-red-500' : p.stock <= 5 ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
              "
            >
              {{ p.stock === 0 ? 'Нет в наличии' : `Осталось: ${p.stock}` }}
            </div>
            <div v-else class="text-xs font-semibold text-slate-400">∞</div>
          </div>
          <div class="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              @click="openEdit(p)"
              class="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
            >
              Редактировать
            </button>
            <button
              v-if="p.stock !== null && p.stock !== undefined"
              @click="openRestock(p)"
              class="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition"
            >
              Пополнить
            </button>
            <button
              @click="remove(p.id)"
              class="text-sm font-semibold text-red-500 hover:text-red-600 transition ml-auto"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Restock modal -->
    <div
      v-if="restockTarget"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="restockTarget = null"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Пополнение запаса</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">{{ restockTarget.name }}</p>
        <form @submit.prevent="submitRestock" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Новое количество</label
            >
            <input
              v-model.number="restockAmount"
              type="number"
              min="0"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              class="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-500 transition"
            >
              Сохранить
            </button>
            <button
              type="button"
              @click="restockTarget = null"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product, ProductType } from '~/types';
useHead({ title: 'Товары' });

const route = useRoute();
const auth = useAuthStore();
const products = ref<Product[]>([]);
const showForm = ref(false);
const editing = ref<Product | null>(null);
const formError = ref('');
const loadError = ref('');
const imageError = ref(false);

const restockTarget = ref<Product | null>(null);
const restockAmount = ref(0);

const productTypes: { value: ProductType; label: string; icon: string }[] = [
  { value: 'item', label: 'Предмет', icon: '🎁' },
  { value: 'privilege', label: 'Привилегия', icon: '👑' },
  { value: 'currency', label: 'Валюта', icon: '💰' },
  { value: 'roulette', label: 'Рулетка', icon: '🎰' },
  { value: 'other', label: 'Другое', icon: '📦' },
];

interface RouletteVariant {
  chance: number;
  description: string;
  command: string;
}

const form = ref<{
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number | null;
  type: ProductType;
  command: string;
  removeCommand: string;
  rouletteVariants: RouletteVariant[];
}>({
  name: '',
  description: '',
  imageUrl: '',
  price: 0,
  stock: null,
  type: 'item',
  command: '',
  removeCommand: '',
  rouletteVariants: [],
});

function productTypeIcon(type: ProductType): string {
  const found = productTypes.find((t) => t.value === type);
  return found?.icon ?? '📦';
}

function productTypeLabel(type: ProductType): string {
  const found = productTypes.find((t) => t.value === type);
  return found?.label ?? 'Другое';
}

const typeBadgeClassMap: Record<ProductType, string> = {
  item: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800',
  privilege:
    'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800',
  currency:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800',
  roulette:
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800',
  other: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

function typeBadgeClass(type: ProductType): string {
  return typeBadgeClassMap[type] || typeBadgeClassMap.other;
}

const isRoulette = computed(() => form.value.type === 'roulette');
const isPrivilege = computed(() => form.value.type === 'privilege');

const chanceSum = computed(() => {
  const sum = form.value.rouletteVariants.reduce((s, v) => s + (v.chance || 0), 0);
  return Math.round(sum * 10) / 10;
});

function addRouletteVariant() {
  form.value.rouletteVariants.push({ chance: 50, description: '', command: '' });
}

function removeRouletteVariant(index: number) {
  form.value.rouletteVariants.splice(index, 1);
}

function parseActionsToVariants(actionsJson: string | null | undefined): RouletteVariant[] {
  if (!actionsJson) return [];
  try {
    const parsed = JSON.parse(actionsJson);
    if (Array.isArray(parsed) && parsed[0]?.type === 'roulette' && Array.isArray(parsed[0].variants)) {
      return parsed[0].variants.map((x: { chance: number; description?: string; command: string }) => ({
        chance: x.chance,
        description: x.description || '',
        command: x.command,
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

function actionsToCommand(actionsJson: string | null | undefined): string {
  if (!actionsJson) return '';
  try {
    const parsed = JSON.parse(actionsJson);
    if (!Array.isArray(parsed)) return '';
    const lines: string[] = [];
    for (const a of parsed) {
      if (a.type === 'command') {
        lines.push(a.value);
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

function resetForm() {
  form.value = {
    name: '',
    description: '',
    imageUrl: '',
    price: 0,
    stock: null,
    type: 'item',
    command: '',
    removeCommand: '',
    rouletteVariants: [],
  };
  editing.value = null;
  formError.value = '';
  imageError.value = false;
}

function openCreate() {
  resetForm();
  showForm.value = true;
}

function openEdit(p: Product) {
  editing.value = p;
  const variants = parseActionsToVariants(p.actionsJson);
  form.value = {
    name: p.name,
    description: p.description || '',
    imageUrl: p.imageUrl || '',
    price: p.price,
    stock: p.stock ?? null,
    type: p.type as ProductType,
    command: p.command || actionsToCommand(p.actionsJson),
    removeCommand: p.removeCommand || '',
    rouletteVariants: variants.length > 0 ? variants : [],
  };
  showForm.value = true;
  imageError.value = false;
}

async function save() {
  formError.value = '';

  if (!form.value.name.trim()) {
    formError.value = 'Укажите название товара';
    return;
  }

  if (form.value.price < 0) {
    formError.value = 'Цена не может быть отрицательной';
    return;
  }

  if (isRoulette.value) {
    if (form.value.rouletteVariants.length < 2) {
      formError.value = 'Добавьте минимум 2 варианта для рулетки';
      return;
    }
    if (chanceSum.value !== 100) {
      formError.value = 'Сумма шансов должна быть 100%';
      return;
    }
  } else if (!form.value.command.trim()) {
    formError.value = 'Укажите команды для товара';
    return;
  }

  const body: Record<string, any> = {
    name: form.value.name.trim(),
    description: form.value.description || undefined,
    imageUrl: form.value.imageUrl || undefined,
    price: form.value.price,
    stock: form.value.stock ?? null,
    type: form.value.type,
  };

  if (form.value.removeCommand.trim()) {
    body.removeCommand = form.value.removeCommand.trim();
  }

  if (isRoulette.value) {
    body.actionsJson = JSON.stringify([
      {
        type: 'roulette',
        variants: form.value.rouletteVariants
          .map((v) => ({ chance: v.chance, description: v.description.trim(), command: v.command.trim() }))
          .filter((v) => v.command),
      },
    ]);
  } else {
    body.command = form.value.command.trim();
  }

  try {
    if (editing.value) {
      await $fetch(`/api/servers/${route.params.id}/products/${editing.value.id}`, {
        method: 'PATCH',
        credentials: 'include',
        body,
      });
    } else {
      await $fetch(`/api/servers/${route.params.id}/products`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
    }
    showForm.value = false;
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    formError.value = err?.data?.error || 'Ошибка сохранения';
  }
}

function openRestock(p: Product) {
  restockTarget.value = p;
  restockAmount.value = p.stock ?? 0;
}

async function submitRestock() {
  if (!restockTarget.value) return;
  try {
    await $fetch(`/api/servers/${route.params.id}/products/${restockTarget.value.id}/restock`, {
      method: 'PUT',
      credentials: 'include',
      body: { stock: restockAmount.value },
    });
    restockTarget.value = null;
    await load();
  } catch (e: unknown) {
    console.error(e);
    loadError.value = 'Ошибка загрузки товаров';
  }
}

async function remove(id: string) {
  if (!confirm('Удалить товар?')) return;
  try {
    await $fetch(`/api/servers/${route.params.id}/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await load();
  } catch (e: unknown) {
    console.error(e);
    formError.value = 'Ошибка удаления товара';
  }
}

async function load() {
  try {
    loadError.value = '';
    products.value = await $fetch(`/api/servers/${route.params.id}/products`, {
      credentials: 'include',
    });
  } catch (e: unknown) {
    console.error(e);
    loadError.value = 'Ошибка загрузки товаров';
  }
}

onMounted(load);
</script>

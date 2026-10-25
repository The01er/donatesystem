<template>
  <div class="space-y-8">
    <div
      v-if="server?.planType !== 'subscription'"
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
        Платёжные ключи доступны только при подписочной модели.
        <NuxtLink :to="`/dashboard/${serverId}/settings`" class="font-bold underline hover:no-underline"
          >Переключить план</NuxtLink
        >
      </div>
    </div>

    <div class="space-y-6">
      <!-- Тестовый платёж (доступен всем) -->
      <div
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 shadow-sm flex items-start gap-3"
      >
        <svg class="h-5 w-5 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm text-amber-800 dark:text-amber-300">
          Тестовый платёж — покупатель не платит реальные деньги. Подходит для отладки витрины.
        </div>
      </div>

      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            T
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-slate-950 dark:text-white">Тестовый платёж</div>
            <div class="text-xs text-slate-400 dark:text-slate-500">Без реального списания. Мгновенное подтверждение.</div>
          </div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" class="sr-only peer" :checked="mockEnabled" @change="toggleMock" />
          <div class="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      <template v-if="server?.planType === 'subscription'">

        <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Платёжные системы
        </h3>
        <button
          @click="showAddForm = !showAddForm"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          + Добавить
        </button>
      </div>

      <div v-if="keysList.length === 0 && !showAddForm" class="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
        Платёжные системы не подключены. Нажмите «+ Добавить», чтобы настроить AnyPay, ЮKassa, Enot.io или ЮMoney.
        Или включите <strong>тестовый платёж</strong> выше.
      </div>

      <div class="space-y-3">
        <div
          v-for="(k, i) in keysList"
          :key="k.provider"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
              :class="providerBadge(k.provider)"
            >
              {{ providerInitial(k.provider) }}
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-950 dark:text-white">{{ providerLabel(k.provider) }}</div>
              <div class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ k.publicKey }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" :checked="k.enabled !== false" @change="toggleProvider(k.provider)" />
              <div class="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <button
              @click="editProvider(k)"
              class="text-slate-400 hover:text-indigo-500 transition-colors"
              title="Редактировать"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button
              @click="deleteProvider(k.provider)"
              class="text-slate-400 hover:text-red-500 transition-colors"
              title="Удалить"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>

      <form v-if="showAddForm" @submit.prevent="saveEntry" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h4 class="text-sm font-semibold text-slate-950 dark:text-white">
          {{ editingProvider ? 'Редактировать ' + providerLabel(editingProvider) : 'Добавить платёжную систему' }}
        </h4>

        <div v-if="!editingProvider">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Провайдер</label>
          <select
            v-model="form.provider"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="anypay">AnyPay</option>
            <option value="yookassa">ЮKassa</option>
            <option value="enot">Enot.io</option>
            <option value="yoomoney">ЮMoney</option>
          </select>
        </div>
        <div v-else class="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
          Провайдер: <strong>{{ providerLabel(editingProvider) }}</strong>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{{ fieldLabel }}</label>
          <input
            v-model="form.publicKey"
            :placeholder="fieldPlaceholder"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Секретный ключ</label>
          <input
            v-model="form.secret"
            type="password"
            :placeholder="editingProvider ? 'Оставьте пустым, чтобы не менять' : secretPlaceholder"
            :required="!editingProvider"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div v-if="form.provider === 'enot' || editingProvider === 'enot'">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Дополнительный ключ (webhookSecret)</label>
          <input
            v-model="form.extraSecret"
            type="password"
            placeholder="Для проверки подписи вебхука"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Сохранение...' : (editingProvider ? 'Сохранить' : 'Добавить') }}
          </button>
          <button
            type="button"
            @click="cancelAdd"
            class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Отмена
          </button>
        </div>
        <p v-if="saveError" class="text-red-500 text-xs">{{ saveError }}</p>
      </form>

      </template>

      <div class="border-t border-slate-200 dark:border-slate-800 pt-6">
        <h4 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Инструкции по подключению
        </h4>

        <div class="space-y-3">
          <div
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              @click="openSection = openSection === 'anypay' ? '' : 'anypay'"
              class="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-950 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              AnyPay
              <svg class="w-4 h-4 transition-transform" :class="openSection === 'anypay' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-if="openSection === 'anypay'" class="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
              <p>1. Зарегистрируйтесь на <a href="https://anypay.io" target="_blank" class="text-indigo-500 hover:underline">anypay.io</a> и создайте проект.</p>
              <p>2. В настройках проекта укажите URL оповещения (webhook):<br>
                <code class="block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1 text-indigo-500 break-all">{{ webhookUrl }}</code>
              </p>
              <p>3. Укажите <strong>ID проекта</strong> (merchant_id) и <strong>секретный ключ</strong> из настроек проекта AnyPay.</p>
              <p>4. Настройте <strong>success URL</strong> и <strong>fail URL</strong> в проекте AnyPay — туда будут возвращаться покупатели после оплаты.</p>
              <p>5. Включите платёжную систему в списке выше.</p>
            </div>
          </div>

          <div
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              @click="openSection = openSection === 'enot' ? '' : 'enot'"
              class="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-950 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              Enot.io
              <svg class="w-4 h-4 transition-transform" :class="openSection === 'enot' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-if="openSection === 'enot'" class="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
              <p>1. Зарегистрируйтесь на <a href="https://enot.io" target="_blank" class="text-indigo-500 hover:underline">enot.io</a> и создайте кассу.</p>
              <p>2. В разделе «Кассы» → «Интеграция» скопируйте <strong>ID кассы</strong> (shop_id), <strong>API ключ</strong> и <strong>дополнительный ключ</strong>.</p>
              <p>3. URL для уведомлений (webhook) укажите в настройках кассы:<br>
                <code class="block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1 text-indigo-500 break-all">{{ webhookUrl }}</code>
              </p>
              <p>4. Заполните поля выше: ID кассы, API ключ (x-api-key). Дополнительный ключ укажите в «Extra» (webhookSecret).</p>
              <p>5. Включите платёжную систему в списке выше.</p>
            </div>
          </div>

          <div
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              @click="openSection = openSection === 'yookassa' ? '' : 'yookassa'"
              class="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-950 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              ЮKassa
              <svg class="w-4 h-4 transition-transform" :class="openSection === 'yookassa' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-if="openSection === 'yookassa'" class="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
              <p>1. Зарегистрируйтесь в <a href="https://yookassa.ru" target="_blank" class="text-indigo-500 hover:underline">ЮKassa</a> и создайте магазин.</p>
              <p>2. В личном кабинете ЮKassa настройте HTTP-уведомления:<br>
                <code class="block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1 text-indigo-500 break-all">{{ webhookUrl }}</code>
              </p>
              <p>3. Укажите <strong>ID магазина</strong> (shopId) и <strong>секретный ключ</strong> из личного кабинета ЮKassa.</p>
              <p>4. Настройте <strong>return URL</strong> в магазине ЮKassa — туда вернётся покупатель после оплаты.</p>
              <p>5. Включите платёжную систему в списке выше.</p>
            </div>
          </div>

          <div
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <button
              @click="openSection = openSection === 'yoomoney' ? '' : 'yoomoney'"
              class="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-950 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              ЮMoney
              <svg class="w-4 h-4 transition-transform" :class="openSection === 'yoomoney' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div v-if="openSection === 'yoomoney'" class="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
              <p>1. Зайдите в свой кошелёк <a href="https://yoomoney.ru" target="_blank" class="text-indigo-500 hover:underline">yoomoney.ru</a>.</p>
              <p>2. Перейдите в «Настройки» → «Уведомления» → «HTTP-уведомления» и укажите URL:<br>
                <code class="block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1 text-indigo-500 break-all">{{ webhookUrl }}</code>
              </p>
              <p>3. Скопируйте <strong>секретный ключ</strong> из настроек HTTP-уведомлений.</p>
              <p>4. Укажите <strong>номер кошелька</strong> (например, 410011234567890) и <strong>секретный ключ</strong> в полях выше.</p>
              <p>5. Покупатель будет перенаправлен на форму ЮMoney для оплаты. После оплаты товар выдастся автоматически.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
useHead({ title: 'Платёжные системы' });
const serverId = route.params.id as string;
import type { Server } from '~/types';

interface PaymentKeyEntry {
  provider: string;
  publicKey: string | null;
  enabled: boolean;
}

const api = useApi();

const server = ref<Server | null>(null);
const keysList = ref<PaymentKeyEntry[]>([]);
const saving = ref(false);
const saveError = ref('');
const showAddForm = ref(false);
const editingProvider = ref<string | null>(null);
const openSection = ref('');

const form = ref({ provider: 'anypay', publicKey: '', secret: '', extraSecret: '' });

const mockEnabled = computed(() => keysList.value.some((k) => k.provider === 'mock' && k.enabled !== false));

async function toggleMock() {
  if (mockEnabled.value) {
    await deleteProvider('mock');
  } else {
    const newKey = { provider: 'mock', publicKey: '', enabled: true };
    const updated = [...keysList.value.filter((k) => k.provider !== 'mock').map((k) => ({ provider: k.provider, publicKey: k.publicKey || '', enabled: k.enabled })), newKey];
    await api(`/servers/${serverId}/payment-keys`, { method: 'PUT', body: updated });
    await loadKeys();
  }
}

const webhookUrl = computed(() => {
  const base = import.meta.client ? window.location.origin : 'https://example.com';
  const slug = server.value?.slug || serverId;
  const shopUrl = `${slug}.${new URL(base).hostname}`;
  return `https://${shopUrl}/api/payment-webhook`;
});

function providerLabel(provider: string): string {
  const labels: Record<string, string> = { anypay: 'AnyPay', yookassa: 'ЮKassa', enot: 'Enot.io', yoomoney: 'ЮMoney', mock: 'Тестовый платёж' };
  return labels[provider] || provider;
}

function providerInitial(provider: string): string {
  const initials: Record<string, string> = { anypay: 'AP', yookassa: 'ЮК', enot: 'EN', yoomoney: 'ЮМ', mock: 'T' };
  return initials[provider] || '??';
}

function providerBadge(provider: string): string {
  const badges: Record<string, string> = {
    anypay: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    yookassa: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    enot: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    yoomoney: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    mock: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return badges[provider] || 'bg-slate-100 text-slate-600';
}

const fieldLabel = computed(() => {
  const p = editingProvider.value || form.value.provider;
  if (p === 'anypay') return 'ID проекта (merchant_id)';
  if (p === 'yookassa') return 'ID магазина (shopId)';
  if (p === 'enot') return 'ID кассы (shop_id)';
  if (p === 'yoomoney') return 'Номер кошелька ЮMoney';
  return 'Публичный ключ';
});

const fieldPlaceholder = computed(() => {
  const p = editingProvider.value || form.value.provider;
  if (p === 'anypay') return 'Например: 1399';
  if (p === 'yookassa') return 'Например: 1379352';
  if (p === 'enot') return 'UUID кассы';
  if (p === 'yoomoney') return 'Например: 410011234567890';
  return 'Введите ключ';
});

const secretPlaceholder = computed(() => {
  const p = editingProvider.value || form.value.provider;
  if (p === 'anypay') return 'Секретный ключ AnyPay';
  if (p === 'yookassa') return 'Секретный ключ ЮKassa';
  if (p === 'enot') return 'API ключ (x-api-key)';
  if (p === 'yoomoney') return 'Секретный ключ из HTTP-уведомлений';
  return 'Введите секретный ключ';
});

onMounted(async () => {
  try {
    server.value = await api<Server>(`/servers/${serverId}`);
    await loadKeys();
  } catch (e: unknown) {
    console.error(e);
  }
});

async function loadKeys() {
  try {
    const resp = await api<{ keys: PaymentKeyEntry[] }>(`/servers/${serverId}/payment-keys`);
    keysList.value = resp.keys || [];
  } catch { }
}

function cancelAdd() {
  showAddForm.value = false;
  editingProvider.value = null;
  form.value = { provider: 'anypay', publicKey: '', secret: '', extraSecret: '' };
  saveError.value = '';
}

function editProvider(k: PaymentKeyEntry) {
  editingProvider.value = k.provider;
  const extra = (k as unknown as Record<string, unknown>).extra as Record<string, string> | undefined;
  form.value = { provider: k.provider, publicKey: k.publicKey || '', secret: '', extraSecret: extra?.webhookSecret || '' };
  showAddForm.value = true;
}

async function saveEntry() {
  saving.value = true;
  saveError.value = '';

  try {
    const provider = editingProvider.value || form.value.provider;
    const updated: Array<Record<string, unknown>> = keysList.value
      .filter((k) => k.provider !== provider)
      .map((k) => ({
        provider: k.provider,
        publicKey: k.publicKey || '',
        enabled: k.enabled,
      }));

    const newEntry: Record<string, unknown> = {
      provider,
      publicKey: form.value.publicKey,
      enabled: true,
    };
    if (form.value.secret) {
      newEntry.secret = form.value.secret;
    }
    if (form.value.extraSecret) {
      newEntry.extra = { webhookSecret: form.value.extraSecret };
    }

    updated.push(newEntry);

    await api(`/servers/${serverId}/payment-keys`, {
      method: 'PUT',
      body: updated,
    });

    cancelAdd();
    await loadKeys();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function toggleProvider(provider: string) {
  try {
    await api(`/servers/${serverId}/payment-keys/${provider}/toggle`, { method: 'PATCH' });
    await loadKeys();
  } catch { }
}

async function deleteProvider(provider: string) {
  if (!confirm(`Удалить ${providerLabel(provider)}? Ключи будут безвозвратно удалены.`)) return;
  try {
    await api(`/servers/${serverId}/payment-keys/${provider}`, { method: 'DELETE' });
    await loadKeys();
  } catch { }
}
</script>

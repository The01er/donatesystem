<template>
  <div class="px-6 lg:px-8 py-8 max-w-5xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Настройки платформы</h1>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="px-4 py-2.5 text-sm font-medium transition rounded-t-lg -mb-px"
        :class="tab === t.key
          ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm"
    >
      <!-- ════ Tab: Основные ════ -->
      <template v-if="tab === 'main'">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Комиссия по умолчанию (%)</label>
          <input v-model.number="form.defaultCommissionPct" type="number" step="0.1" min="0" max="100"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Цена подписки ($/мес)</label>
          <input v-model.number="form.subscriptionPrice" type="number" step="0.01" min="0"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">URL платформы</label>
          <input v-model="form.platformUrl" placeholder="https://example.com"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">CORS (через запятую)</label>
          <input v-model="form.corsOrigins" placeholder="https://example.com,https://www.example.com"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Домен платформы</label>
          <input v-model="form.platformDomain" placeholder="example.com"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">CNAME таргет</label>
          <input v-model="form.cnameTarget" placeholder="example.com"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>

        <!-- Operating mode -->
        <div class="pt-4 border-t border-slate-200 dark:border-slate-700">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Режим работы</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer"
              :class="form.operatingMode === 'self_employed' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              @click="selectMode('self_employed')">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-slate-900 dark:text-white">Самозанятый</h4>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  :class="form.operatingMode === 'self_employed' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'">
                  <div v-if="form.operatingMode === 'self_employed'" class="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                </div>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400">Только подписка, прямая оплата тарифа, без комиссии, без вывода средств.</p>
            </div>
            <div class="border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer"
              :class="form.operatingMode === 'individual' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
              @click="selectMode('individual')">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-slate-900 dark:text-white">ИП</h4>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  :class="form.operatingMode === 'individual' ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'">
                  <div v-if="form.operatingMode === 'individual'" class="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                </div>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400">Полный функционал: комиссия/подписка, вывод средств, пополнение баланса.</p>
            </div>
          </div>
        </div>

        <!-- Legal info -->
        <div class="pt-4 border-t border-slate-200 dark:border-slate-700">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Реквизиты платформы</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Название платформы</label>
              <input v-model="form.brandName" placeholder="DonatePlatform"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">ФИО / Название</label>
              <input v-model="form.platformName" placeholder="Иванов Иван Иванович"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">ИНН</label>
              <input v-model="form.platformInn" placeholder="10 или 12 цифр"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">ОГРН / ОГРНИП</label>
              <input v-model="form.platformOgrn" placeholder="15 цифр"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Email</label>
              <input v-model="form.platformEmail" placeholder="support@example.com" type="email"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Телефон</label>
              <input v-model="form.platformPhone" placeholder="+7 (999) 123-45-67"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs text-slate-400 mb-1">Юридический адрес</label>
              <input v-model="form.platformAddress" placeholder="г. Москва, ул. Примерная, д. 1"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
            </div>
          </div>
        </div>
      </template>

      <!-- ════ Tab: Платёжные шлюзы ════ -->
      <template v-if="tab === 'payment'">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">URL вебхука</label>
          <input v-model="form.paymentWebhookUrl" placeholder="https://example.com/api/payment/webhook"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div class="mb-6">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Белый список IP вебхуков (через запятую)</label>
          <input v-model="form.paymentWebhookIps" placeholder="178.204.0.0/16,5.181.0.0/16"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>

        <div class="space-y-4">
          <div v-for="gw in gateways" :key="gw.key"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold" :class="gw.badge">
                  {{ gw.initial }}
                </div>
                <div>
                  <div class="text-sm font-semibold text-slate-950 dark:text-white">{{ gw.label }}</div>
                  <div class="text-xs text-slate-400" v-if="gw.desc">{{ gw.desc }}</div>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" :checked="isEnabled(gw.key)" @change="toggleGateway(gw.key)" />
                <div class="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <template v-if="gw.key === 'yookassa'">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Shop ID</label>
                  <input v-model="form.yookassaShopId" placeholder="123456"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Secret Key</label>
                  <input v-model="form.yookassaSecretKey" placeholder="live_xxxxx" type="password"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
              </div>
            </template>

            <template v-if="gw.key === 'anypay'">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Merchant ID</label>
                  <input v-model="form.anypayMerchantId" placeholder="12345"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Secret Key</label>
                  <input v-model="form.anypaySecretKey" placeholder="your_secret" type="password"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
              </div>
            </template>

            <template v-if="gw.key === 'enot'">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div>
                  <label class="block text-xs text-slate-400 mb-1">ID кассы (shop_id)</label>
                  <input v-model="form.enotShopId" placeholder="UUID"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
                <div>
                  <label class="block text-xs text-slate-400 mb-1">API ключ (x-api-key)</label>
                  <input v-model="form.enotApiKey" placeholder="key" type="password"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
              </div>
            </template>

            <template v-if="gw.key === 'yoomoney'">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Номер кошелька</label>
                  <input v-model="form.yoomoneyReceiver" placeholder="410011234567890"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
                <div>
                  <label class="block text-xs text-slate-400 mb-1">Секретный ключ вебхука</label>
                  <input v-model="form.yoomoneySecret" placeholder="secret" type="password"
                    class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none transition" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- ════ Tab: Уведомления ════ -->
      <template v-if="tab === 'notify'">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">HTTP/SOCKS5 прокси для уведомлений</label>
          <input v-model="form.notificationProxy" placeholder="http://user:pass@proxy:3128"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Relay URL (внешний сервер)</label>
          <input v-model="form.notificationRelayUrl" placeholder="https://relay.example.com"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Relay Token</label>
          <input v-model="form.notificationRelayToken" placeholder="token"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
      </template>

      <!-- ════ Tab: Защита ════ -->
      <template v-if="tab === 'security'">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cloudflare Turnstile — Ключ сайта (Site Key)</label>
          <input v-model="form.turnstileSiteKey" placeholder="0x4AAAAAA..."
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cloudflare Turnstile — Секретный ключ (Secret Key)</label>
          <input v-model="form.turnstileSecretKey" placeholder="0x4AAAAAA..." type="password"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
          <p class="text-xs text-slate-400 mt-1.5">После сохранения капча появится на страницах регистрации и входа. Ключи можно получить в <a href="https://dash.cloudflare.com/?to=%2F%3Faccount%3Dturnstile" target="_blank" class="text-indigo-500 hover:underline">Cloudflare Dashboard → Turnstile</a>.</p>
        </div>
      </template>

      <!-- ════ Tab: AI генерация ════ -->
      <template v-if="tab === 'ai'">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">URL API</label>
          <input v-model="form.aiApiUrl" placeholder="https://routerai.ru/api/v1/chat/completions"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
          <p class="text-xs text-slate-400 mt-1.5">Endpoint совместимый с OpenAI API (Chat Completions).</p>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">API ключ</label>
          <input v-model="form.aiApiKey" placeholder="sk-..." type="password"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Модель</label>
          <input v-model="form.aiModel" placeholder="deepseek/deepseek-v4-flash"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-medium" />
        </div>
      </template>

      <div v-if="loadError"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
        {{ loadError }}
      </div>

      <button @click="confirmSave"
        class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200">
        Сохранить настройки
      </button>
    </div>

    <!-- Modal -->
    <div v-if="showConfirm" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showConfirm = false">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Изменение режима работы</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">{{ confirmMessage }}</p>
        <div class="flex gap-3">
          <button @click="save"
            class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition">
            Подтвердить
          </button>
          <button @click="showConfirm = false"
            class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition">
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Настройки платформы' });

const $admin = useAdmin();
const notify = useNotify();
const tab = ref('main');

const tabs = [
  { key: 'main', label: 'Основные' },
  { key: 'payment', label: 'Платёжные шлюзы' },
  { key: 'notify', label: 'Уведомления' },
  { key: 'security', label: 'Защита' },
  { key: 'ai', label: '🤖 AI генерация' },
];

const form = ref({
  defaultCommissionPct: 10,
  subscriptionPrice: 9.99,
  platformDomain: '',
  cnameTarget: '',
  operatingMode: 'self_employed' as 'self_employed' | 'individual',
  platformName: '',
  brandName: '',
  platformInn: '',
  platformOgrn: '',
  platformAddress: '',
  platformEmail: '',
  platformPhone: '',

  // Из .env
  platformUrl: '',
  corsOrigins: '',
  paymentGateway: 'mock',
  paymentWebhookUrl: '',
  paymentWebhookIps: '',
  yookassaShopId: '',
  yookassaSecretKey: '',
  anypayMerchantId: '',
  anypaySecretKey: '',
  enotShopId: '',
  enotApiKey: '',
  yoomoneyReceiver: '',
  yoomoneySecret: '',
  notificationProxy: '',
  notificationRelayUrl: '',
  notificationRelayToken: '',
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  aiApiUrl: '',
  aiApiKey: '',
  aiModel: '',
});

const gateways = [
  { key: 'mock', label: 'Тестовый платёж', initial: 'T', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', desc: 'Без реального списания' },
  { key: 'yookassa', label: 'ЮKassa', initial: 'ЮК', badge: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', desc: 'Банковские карты, СБП' },
  { key: 'anypay', label: 'AnyPay', initial: 'AP', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400', desc: 'Карты, криптовалюты' },
  { key: 'enot', label: 'Enot.io', initial: 'EN', badge: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', desc: 'Карты, криптовалюты' },
  { key: 'yoomoney', label: 'ЮMoney', initial: 'ЮМ', badge: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400', desc: 'Кошелёк ЮMoney, банковские карты' },
];

const enabledGateways = ref<string[]>([]);

function isEnabled(key: string): boolean {
  return enabledGateways.value.includes(key);
}

function toggleGateway(key: string) {
  const idx = enabledGateways.value.indexOf(key);
  if (idx === -1) {
    if (key === 'mock' && process.env.NODE_ENV === 'production') return;
    enabledGateways.value.push(key);
  } else {
    enabledGateways.value.splice(idx, 1);
  }
  form.value.paymentGateway = enabledGateways.value.join(',') || 'mock';
}

const loadError = ref('');
const showConfirm = ref(false);
const pendingMode = ref<'self_employed' | 'individual' | null>(null);
const confirmMessage = ref('');

const FIELD_LABELS: Record<string, string> = {
  defaultCommissionPct: 'Комиссия по умолчанию',
  subscriptionPrice: 'Цена подписки',
  platformDomain: 'Домен платформы',
  cnameTarget: 'CNAME таргет',
  operatingMode: 'Режим работы',
  platformName: 'ФИО / Название',
  brandName: 'Название платформы',
  platformInn: 'ИНН',
  platformOgrn: 'ОГРН / ОГРНИП',
  platformAddress: 'Юридический адрес',
  platformEmail: 'Email',
  platformPhone: 'Телефон',
  platformUrl: 'URL платформы',
  corsOrigins: 'CORS',
  paymentGateway: 'Платёжный шлюз',
  paymentWebhookUrl: 'URL вебхука',
  paymentWebhookIps: 'IP вебхуков',
  yookassaShopId: 'ЮKassa Shop ID',
  yookassaSecretKey: 'ЮKassa Secret Key',
  anypayMerchantId: 'AnyPay Merchant ID',
  anypaySecretKey: 'AnyPay Secret Key',
  enotShopId: 'Enot.io ID кассы',
  enotApiKey: 'Enot.io API ключ',
  yoomoneyReceiver: 'ЮMoney кошелёк',
  yoomoneySecret: 'ЮMoney секретный ключ',
  notificationProxy: 'Прокси уведомлений',
  notificationRelayUrl: 'Relay URL',
  notificationRelayToken: 'Relay Token',
  turnstileSiteKey: 'Turnstile — ключ сайта',
  turnstileSecretKey: 'Turnstile — секретный ключ',
  aiApiUrl: 'URL AI API',
  aiApiKey: 'AI API ключ',
  aiModel: 'AI модель',
};

function formatValidationError(err: unknown): string {
  const data = (err as { data?: { fieldErrors?: Record<string, string[]>; error?: string } })?.data;
  if (data?.fieldErrors) {
    const msgs = Object.entries(data.fieldErrors).map(([field, errors]) => {
      const label = FIELD_LABELS[field] || field;
      return `${label}: ${errors.join(', ')}`;
    });
    return msgs.join('; ');
  }
  if (data?.error) return data.error;
  return 'Ошибка сохранения';
}

function selectMode(mode: 'self_employed' | 'individual') {
  if (mode === form.value.operatingMode) return;
  pendingMode.value = mode;
  confirmMessage.value = mode === 'individual'
    ? 'Переключение на режим ИП откроет полный функционал платформы — комиссионные тарифы, вывод средств и пополнение баланса. Продолжить?'
    : 'Переключение на режим самозанятого ограничит функционал: только подписка, без комиссии, без вывода средств. Продолжить?';
  showConfirm.value = true;
}

async function load() {
  try {
    loadError.value = '';
    const data = await $admin<any>('/settings');
    form.value = {
      defaultCommissionPct: data.defaultCommissionPct,
      subscriptionPrice: data.subscriptionPrice ?? 9.99,
      platformDomain: data.platformDomain,
      cnameTarget: data.cnameTarget,
      operatingMode: data.operatingMode || 'self_employed',
      platformName: data.platformName || '',
      brandName: data.brandName || '',
      platformInn: data.platformInn || '',
      platformOgrn: data.platformOgrn || '',
      platformAddress: data.platformAddress || '',
      platformEmail: data.platformEmail || '',
      platformPhone: data.platformPhone || '',

      platformUrl: data.platformUrl || '',
      corsOrigins: data.corsOrigins || '',
      paymentGateway: data.paymentGateway || 'mock',
      paymentWebhookUrl: data.paymentWebhookUrl || '',
      paymentWebhookIps: data.paymentWebhookIps || '',
      yookassaShopId: data.yookassaShopId || '',
      yookassaSecretKey: data.yookassaSecretKey || '',
      anypayMerchantId: data.anypayMerchantId || '',
      anypaySecretKey: data.anypaySecretKey || '',
      enotShopId: data.enotShopId || '',
      enotApiKey: data.enotApiKey || '',
      yoomoneyReceiver: data.yoomoneyReceiver || '',
      yoomoneySecret: data.yoomoneySecret || '',
      notificationProxy: data.notificationProxy || '',
      notificationRelayUrl: data.notificationRelayUrl || '',
      notificationRelayToken: data.notificationRelayToken || '',
      turnstileSiteKey: data.turnstileSiteKey || '',
      turnstileSecretKey: data.turnstileSecretKey || '',
      aiApiUrl: data.aiApiUrl || '',
      aiApiKey: data.aiApiKey || '',
      aiModel: data.aiModel || '',
    };
    enabledGateways.value = (data.paymentGateway || 'mock').split(',').filter(Boolean);
    if (enabledGateways.value.length === 0) enabledGateways.value = ['mock'];
  } catch {
    notify.error('Ошибка загрузки настроек');
  }
}

async function save() {
  showConfirm.value = false;
  const body = { ...form.value };
  if (pendingMode.value) {
    body.operatingMode = pendingMode.value;
    form.value.operatingMode = pendingMode.value;
    pendingMode.value = null;
  }
  try {
    await $admin('/settings', { method: 'PUT', body });
    notify.success('Настройки сохранены');
  } catch (e: unknown) {
    notify.error(formatValidationError(e));
  }
}

function confirmSave() {
  showConfirm.value = false;
  save();
}

onMounted(load);
</script>

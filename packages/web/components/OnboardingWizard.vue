<template>
  <div data-testid="block-onboarding" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
    >
      <!-- Header with progress -->
      <div class="px-6 pt-6 pb-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ stepTitle }}</h2>
          <button
            @click="$emit('skip')"
            class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            Пропустить
          </button>
        </div>
        <div class="flex gap-1.5">
          <div
            v-for="i in 3"
            :key="i"
            class="flex-1 h-1.5 rounded-full transition-colors duration-300"
            :class="i <= step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'"
          />
        </div>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">Шаг {{ step }} из 3</p>
      </div>

      <!-- Step content -->
      <div class="px-6 py-4">
        <!-- Step 1: Create server -->
        <div v-if="step === 1">
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Создайте ваш первый игровой сервер, чтобы начать приём донатов.
          </p>
          <form @submit.prevent="handleCreateServer" class="space-y-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Название сервера</label
              >
              <input
                v-model="serverForm.name"
                placeholder="Например, My Awesome MC"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                required
                @input="autoSlug"
              />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Тип игры</label
              >
              <select
                v-model="serverForm.gameType"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              >
                <option v-for="g in GAME_TYPES" :key="g.value" :value="g.value">{{ g.label }}</option>
              </select>
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >IP адрес</label
              >
              <input
                v-model="serverForm.ipAddress"
                placeholder="play.myserver.com:25565"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                required
              />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Адрес витрины</label
              >
              <div class="flex items-center gap-2">
                <input
                  v-model="serverForm.slug"
                  placeholder="my-awesome-mc"
                  class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  required
                  pattern="[a-z0-9-]+"
                  minlength="3"
                  maxlength="30"
                />
                <span class="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">.{{ PLATFORM_DOMAIN }}</span>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                data-testid="btn-next-step"
                :disabled="creating"
                class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ creating ? 'Создание...' : 'Далее' }}
              </button>
            </div>
          </form>
          <p v-if="serverError" class="text-red-500 text-xs mt-2">{{ serverError }}</p>
        </div>

        <!-- Step 2: Showcase ready -->
        <div v-if="step === 2">
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Ваша витрина готова! Вот ссылка на магазин и токен для подключения плагина.
          </p>
          <div class="space-y-4">
            <div class="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2"
                >Ссылка на витрину</label
              >
              <div class="flex items-center gap-2">
                <a
                  :href="shopUrl"
                  target="_blank"
                  class="text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:underline truncate"
                >
                  {{ shopUrl }}
                </a>
                <a
                  :href="shopUrl"
                  target="_blank"
                  class="shrink-0 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition"
                >
                  Открыть
                </a>
              </div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2"
                >Токен плагина</label
              >
              <div class="flex items-center gap-2">
                <code
                  class="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300 truncate"
                >
                  {{ pluginToken || 'Загрузка...' }}
                </code>
                <button
                  v-if="pluginToken"
                  @click="copyToken"
                  class="shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  {{ copied ? 'Скопировано' : 'Копировать' }}
                </button>
              </div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Инструкция
              </h4>
              <ol class="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                <li>Скачайте плагин для вашей игры</li>
                <li>Установите его на сервер</li>
                <li>Вставьте токен в конфиг плагина</li>
                <li>Перезапустите сервер</li>
              </ol>
            </div>
          </div>
          <div class="flex gap-3 pt-5">
            <button
              data-testid="btn-next-step"
              @click="step = 3"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Далее
            </button>
          </div>
        </div>

        <!-- Step 3: Done -->
        <div v-if="step === 3" class="text-center py-6">
          <div
            class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Ваш магазин готов к приёму донатов!</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Вы можете управлять товарами, следить за заказами и выводить средства в панели управления.
          </p>
          <button
            data-testid="btn-finish-onboarding"
            @click="finish"
            class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            В дашборд
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PLATFORM_DOMAIN, GAME_TYPES } from '~/utils/constants';
import type { Server } from '~/types';

interface PluginToken {
  id: string;
  serverId: string;
  token: string;
  name?: string | null;
}

const emit = defineEmits<{
  skip: [];
  complete: [serverId: string];
}>();

const auth = useAuthStore();
const api = useApi();

const step = ref(1);
const creating = ref(false);
const serverError = ref('');

const serverForm = ref({ name: '', gameType: GAME_TYPES[0].value, ipAddress: '', slug: '' });
const createdServerId = ref('');
const serverSlug = ref('');

const pluginToken = ref('');
const copied = ref(false);

const shopUrl = ref('');

const stepTitle = computed(() => {
  const titles = ['', 'Создание сервера', 'Витрина готова', 'Готово!'];
  return titles[step.value];
});

function autoSlug() {
  const slug = serverForm.value.name
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, '-')
    .replace(/[а-яё]+/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/[^a-z0-9-]/g, '');
  serverForm.value.slug = slug || 'my-server';
}

async function handleCreateServer() {
  creating.value = true;
  serverError.value = '';
  try {
    const server = await api<Server & { pluginToken: string; shopUrl: string }>('/servers', {
      method: 'POST',
      body: {
        name: serverForm.value.name,
        gameType: serverForm.value.gameType,
        ipAddress: serverForm.value.ipAddress,
        slug: serverForm.value.slug,
      },
    });
    createdServerId.value = server.id;
    serverSlug.value = server.slug;
    pluginToken.value = server.pluginToken || 'Ошибка загрузки токена';
    // Shop URL may come from API or fallback
    shopUrl.value = server.shopUrl || `https://${server.slug}.${PLATFORM_DOMAIN}`;
    step.value = 2;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    serverError.value = err?.data?.error || 'Не удалось создать сервер';
  } finally {
    creating.value = false;
  }
}

function copyToken() {
  navigator.clipboard.writeText(pluginToken.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}

async function finish() {
  try {
    await api('/auth/onboarding', { method: 'POST' });
  } catch {
    // ignore
  }
  await auth.initialize();
  emit('complete', createdServerId.value);
}
</script>

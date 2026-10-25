<template>
  <div class="space-y-6">
    <!-- Plugin download -->
    <div
      v-if="pluginDownloadUrl"
      class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-2xl p-5 shadow-sm"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Плагин для сервера
          </h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Скачайте и установите плагин на ваш сервер, затем подключите его с помощью токена.
          </p>
        </div>
        <a
          :href="pluginDownloadUrl"
          download
          class="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200 shrink-0"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Скачать .JAR
        </a>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">Токены плагинов</h2>
      <button
        @click="showCreate = true"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
      >
        + Создать токен
      </button>
    </div>

    <p class="text-sm text-slate-500 dark:text-slate-400">
      Токены используются для подключения плагина к вашему серверу. Храните их в безопасности.
    </p>

    <div
      v-if="!tokens.length"
      class="text-slate-400 dark:text-slate-500 text-sm text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl"
    >
      Токены не найдены. Создайте первый токен.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="t in tokens"
        :key="t.id"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-900 dark:text-white truncate">{{ t.name }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              :class="
                t.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              "
            >
              {{ t.isActive ? 'Active' : 'Disabled' }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <code
              class="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300"
            >
              {{ t.maskedToken }}
            </code>
            <span v-if="t.lastSeen">Последнее использование: {{ fmtDate(t.lastSeen) }}</span>
            <span>Создан: {{ fmtDate(t.createdAt) }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="toggleActive(t)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
            :class="
              t.isActive
                ? 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20'
                : 'border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
            "
          >
            {{ t.isActive ? 'Выключить' : 'Включить' }}
          </button>
          <button
            @click="copyMasked(t.maskedToken)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            {{ copiedId === t.id ? 'Скопировано' : 'Копировать' }}
          </button>
          <button
            @click="confirmRegenerate(t)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition"
          >
            Перегенерировать
          </button>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div
      v-if="showCreate"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showCreate = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Новый токен</h3>
        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Название</label
            >
            <input
              v-model="createName"
              placeholder="Default"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="creating"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200 disabled:opacity-50"
            >
              {{ creating ? 'Создание...' : 'Создать' }}
            </button>
            <button
              type="button"
              @click="showCreate = false"
              class="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Regenerate confirm modal -->
    <div
      v-if="regenerating"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="regenerating = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Перегенерировать токен</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Токен <strong>{{ regenTarget?.name }}</strong> будет заменён. Старый токен перестанет работать. Продолжить?
        </p>
        <div
          v-if="newTokenValue"
          class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 mb-4"
        >
          <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
            Новый токен:
          </p>
          <code
            class="block text-sm font-mono bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 break-all select-all"
          >
            {{ newTokenValue }}
          </code>
          <p class="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            ⚠ Сохраните токен, он больше не будет показан
          </p>
          <button
            @click="copyNewToken"
            class="mt-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500 transition"
          >
            {{ copiedNew ? 'Скопировано' : 'Копировать' }}
          </button>
        </div>
        <div v-if="!newTokenValue" class="flex gap-3">
          <button
            @click="handleRegenerate"
            :disabled="regenLoading"
            class="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-500 shadow-sm transition disabled:opacity-50"
          >
            {{ regenLoading ? '...' : 'Перегенерировать' }}
          </button>
          <button
            @click="
              regenerating = false;
              newTokenValue = '';
            "
            class="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PluginTokenItem, PluginTokenFull } from '~/types';
import { fmtDate } from '~/utils/format';
useHead({ title: 'Плагины' });

const route = useRoute();
const serverId = route.params.id as string;
const api = useApi();

const PLUGIN_DOWNLOADS: Record<string, string> = {
  minecraft: '/uploads/plugins/minecraft.jar',
};

const server = ref<{ gameType: string } | null>(null);

const pluginDownloadUrl = computed(() => {
  if (!server.value) return null;
  return PLUGIN_DOWNLOADS[server.value.gameType] || null;
});

const tokens = ref<PluginTokenItem[]>([]);
const showCreate = ref(false);
const createName = ref('Default');
const creating = ref(false);
const copiedId = ref<string | null>(null);
const regenerating = ref(false);
const regenTarget = ref<PluginTokenItem | null>(null);
const regenLoading = ref(false);
const newTokenValue = ref('');
const copiedNew = ref(false);

async function loadTokens() {
  try {
    tokens.value = await api<PluginTokenItem[]>(`/servers/${serverId}/plugin-tokens`);
  } catch (e: unknown) {
    console.error(e);
  }
}

async function toggleActive(t: PluginTokenItem) {
  try {
    await api(`/servers/${serverId}/plugin-tokens/${t.id}`, {
      method: 'PATCH',
      body: { isActive: !t.isActive },
    });
    t.isActive = !t.isActive;
  } catch {
    // ignore
  }
}

function copyMasked(masked: string) {
  const t = tokens.value.find((x) => x.maskedToken === masked);
  if (!t) return;
  navigator.clipboard.writeText(masked);
  copiedId.value = t.id;
  setTimeout(() => {
    copiedId.value = null;
  }, 2000);
}

function confirmRegenerate(t: PluginTokenItem) {
  regenTarget.value = t;
  newTokenValue.value = '';
  regenerating.value = true;
}

async function handleRegenerate() {
  if (!regenTarget.value) return;
  regenLoading.value = true;
  try {
    const result = await api<PluginTokenFull>(`/servers/${serverId}/plugin-tokens/${regenTarget.value.id}/regenerate`, {
      method: 'POST',
    });
    newTokenValue.value = result.token;
    await loadTokens();
  } catch {
    // ignore
  } finally {
    regenLoading.value = false;
  }
}

function copyNewToken() {
  navigator.clipboard.writeText(newTokenValue.value);
  copiedNew.value = true;
  setTimeout(() => {
    copiedNew.value = false;
  }, 2000);
}

async function handleCreate() {
  creating.value = true;
  try {
    const result = await api<PluginTokenFull>(`/servers/${serverId}/plugin-tokens`, {
      method: 'POST',
      body: { name: createName.value || 'Default' },
    });
    showCreate.value = false;
    createName.value = 'Default';
    await loadTokens();

    newTokenValue.value = result.token;
    regenerating.value = true;
    regenTarget.value = {
      id: result.id,
      serverId: result.serverId,
      name: result.name,
      isActive: result.isActive,
      maskedToken: '',
      lastSeen: result.lastSeen,
      createdAt: result.createdAt,
    };
  } catch {
    // ignore
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  try {
    const srv = await api<Record<string, unknown>>(`/servers/${serverId}`);
    server.value = { gameType: (srv.gameType as string) || '' };
  } catch {
    // ignore
  }
  await loadTokens();
});
</script>

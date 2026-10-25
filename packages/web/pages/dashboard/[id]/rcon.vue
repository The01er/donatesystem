<template>
  <div class="space-y-6">
    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
    >
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        RCON подключение
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
        RCON позволяет выдавать товары напрямую, без установки плагина на сервер.
        Убедитесь, что в <code class="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">server.properties</code>
        вашего сервера включён RCON: <code class="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">enable-rcon=true</code>.
      </p>

      <div v-if="testResult !== null" class="mb-4">
        <div
          v-if="testResult.ok"
          class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Подключение успешно
        </div>
        <div
          v-else
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl flex items-start gap-2"
        >
          <svg class="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Ошибка: {{ testResult.error }}</span>
        </div>
      </div>

      <form @submit.prevent="saveRcon" class="space-y-4 max-w-md">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Хост</label
          >
          <input
            v-model="form.host"
            placeholder="127.0.0.1 или play.myserver.com"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Порт</label
          >
          <input
            v-model.number="form.port"
            type="number"
            min="1"
            max="65535"
            placeholder="25575"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Пароль RCON</label
          >
          <input
            v-model="form.password"
            type="password"
            :placeholder="hasPassword ? '•••••••• (введите новый для смены)' : 'rcon.password из server.properties'"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
          />
        </div>
        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="flex-1 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button
            type="button"
            @click="testConnection"
            :disabled="testing"
            class="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ testing ? 'Проверка...' : 'Проверить' }}
          </button>
        </div>
        <p v-if="saveError" class="text-red-500 text-xs">{{ saveError }}</p>
        <p v-if="saveOk" class="text-emerald-500 text-xs">RCON настройки сохранены</p>
      </form>
    </div>

    <div
      v-if="hasConfig"
      class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
    >
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        Как это работает
      </h3>
      <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-2">
        <li class="flex items-start gap-2">
          <span class="text-emerald-500 font-bold shrink-0">1.</span>
          <span>Покупатель оплачивает заказ на витрине</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-emerald-500 font-bold shrink-0">2.</span>
          <span>Система сразу подключается к вашему серверу по RCON</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-emerald-500 font-bold shrink-0">3.</span>
          <span>Команды товара выполняются напрямую — без плагина</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-emerald-500 font-bold shrink-0">4.</span>
          <span>Статус заказа обновляется автоматически</span>
        </li>
      </ul>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-4">
        Если RCON недоступен, заказ остаётся в статусе PAID и будет выдан плагином при следующем опросе.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
useHead({ title: 'RCON' });
const serverId = route.params.id as string;
const api = useApi();

const form = ref({ host: '', port: 25575, password: '' });
const hasPassword = ref(false);
const hasConfig = ref(false);
const saving = ref(false);
const testing = ref(false);
const saveError = ref('');
const saveOk = ref(false);
const testResult = ref<{ ok: boolean; error?: string } | null>(null);

async function loadRconConfig() {
  try {
    const data = await api<{ host: string; port: number; hasPassword: boolean }>(`/servers/${serverId}/rcon`);
    form.value.host = data.host;
    form.value.port = data.port;
    hasPassword.value = data.hasPassword;
    hasConfig.value = !!data.host;
  } catch {
    // not configured yet
  }
}

async function saveRcon() {
  saving.value = true;
  saveError.value = '';
  saveOk.value = false;
  try {
    await api(`/servers/${serverId}/rcon`, {
      method: 'PUT',
      body: form.value,
    });
    saveOk.value = true;
    hasPassword.value = true;
    hasConfig.value = true;
    testResult.value = null;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  testing.value = true;
  testResult.value = null;
  try {
    const data = await api<{ ok: boolean; error?: string }>(`/servers/${serverId}/rcon/test`, {
      method: 'POST',
    });
    testResult.value = data;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    testResult.value = { ok: false, error: err?.data?.error || 'Ошибка подключения' };
  } finally {
    testing.value = false;
  }
}

onMounted(loadRconConfig);
</script>

<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Уведомления
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Настройте получение уведомлений о новых заказах, выплатах и событиях на сервере.
        Поддерживаются Discord webhook и Telegram.
      </p>

      <div v-if="testResult !== null" class="mb-4">
        <div
          v-if="testResult.ok"
          class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Уведомление отправлено
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

      <form @submit.prevent="saveNotifications" class="space-y-5 max-w-lg">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Discord Webhook URL
          </label>
          <input
            v-model="form.discordUrl"
            placeholder="https://discord.com/api/webhooks/..."
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <p class="text-xs text-slate-400 mt-1">
            Создайте webhook в канале Discord: Настройки канала → Интеграции → Webhook → Создать webhook
          </p>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Telegram (опционально)
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Bot token
              </label>
              <input
                v-model="form.telegramToken"
                placeholder="123456:ABC-DEF..."
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Chat ID
              </label>
              <input
                v-model="form.telegramChatId"
                placeholder="-1001234567890"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Создайте бота через <span class="font-mono">@BotFather</span>, получите token.
            Chat ID — <span class="font-mono">@getmyid_bot</span> или ID канала с минусом.
          </p>
        </div>

        <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            События
          </h4>
          <div class="space-y-2">
            <label
              v-for="ev in availableEvents"
              :key="ev.value"
              class="flex items-center gap-3 cursor-pointer group"
            >
              <input
                :checked="selectedEvents.includes(ev.value)"
                type="checkbox"
                class="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                @change="toggleEvent(ev.value)"
              />
              <span class="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">{{ ev.label }}</span>
            </label>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="submit"
            :disabled="saving"
            class="flex-1 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button
            type="button"
            @click="sendTest"
            :disabled="testing || !hasAnyChannel"
            class="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ testing ? 'Отправка...' : 'Тест' }}
          </button>
        </div>
        <p v-if="saveError" class="text-red-500 text-xs">{{ saveError }}</p>
        <p v-if="saveOk" class="text-emerald-500 text-xs">Настройки уведомлений сохранены</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
useHead({ title: 'Уведомления' });
const serverId = route.params.id as string;
const api = useApi();

interface NotificationEvent {
  value: string;
  label: string;
}

const form = ref({ discordUrl: '', telegramToken: '', telegramChatId: '' });
const selectedEvents = ref<string[]>([]);
const availableEvents = ref<NotificationEvent[]>([]);
const saving = ref(false);
const testing = ref(false);
const saveError = ref('');
const saveOk = ref(false);
const testResult = ref<{ ok: boolean; error?: string } | null>(null);

const hasAnyChannel = computed(() => form.value.discordUrl || (form.value.telegramToken && form.value.telegramChatId));

async function loadConfig() {
  try {
    const data = await api<{
      discordUrl: string;
      telegramToken: string;
      telegramChatId: string;
      events: string[];
      availableEvents: NotificationEvent[];
    }>(`/servers/${serverId}/notifications`);
    form.value.discordUrl = data.discordUrl;
    form.value.telegramToken = data.telegramToken;
    form.value.telegramChatId = data.telegramChatId;
    selectedEvents.value = data.events;
    availableEvents.value = data.availableEvents;
  } catch {
    // not configured
  }
}

function toggleEvent(value: string) {
  const idx = selectedEvents.value.indexOf(value);
  if (idx === -1) {
    selectedEvents.value.push(value);
  } else {
    selectedEvents.value.splice(idx, 1);
  }
}

async function saveNotifications() {
  saving.value = true;
  saveError.value = '';
  saveOk.value = false;
  try {
    await api(`/servers/${serverId}/notifications`, {
      method: 'PUT',
      body: {
        discordUrl: form.value.discordUrl || '',
        telegramToken: form.value.telegramToken || '',
        telegramChatId: form.value.telegramChatId || '',
        events: selectedEvents.value,
      },
    });
    saveOk.value = true;
    testResult.value = null;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function sendTest() {
  testing.value = true;
  testResult.value = null;
  try {
    const data = await api<{ ok: boolean; error?: string }>(`/servers/${serverId}/notifications/test`, {
      method: 'POST',
    });
    testResult.value = data;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    testResult.value = { ok: false, error: err?.data?.error || 'Ошибка отправки' };
  } finally {
    testing.value = false;
  }
}

onMounted(loadConfig);
</script>

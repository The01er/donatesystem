<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  >
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
    >
      <p v-if="error" class="mb-3 text-red-500 text-sm font-medium">{{ error }}</p>
      <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Создание магазина</h2>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label
            class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
          >Название магазина</label>
          <input
            v-model="form.name"
            data-testid="input-server-name"
            placeholder="Например, My Awesome MC"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
          />
        </div>
        <div>
          <label
            class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
          >Тип игры</label>
          <select
            v-model="form.gameType"
            data-testid="select-game-type"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          >
            <option v-for="g in GAME_TYPES" :key="g.value" :value="g.value">{{ g.label }}</option>
          </select>
        </div>
        <div>
          <label
            class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
          >IP адрес</label>
          <input
            v-model="form.ipAddress"
            placeholder="play.myserver.com:25565"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
          />
        </div>
        <div>
          <label
            class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
          >Адрес витрины</label>
          <div class="flex items-center gap-2">
            <input
              v-model="form.slug"
              data-testid="input-server-slug"
              placeholder="myserver"
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
            data-testid="btn-submit-create-server"
            class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Создать
          </button>
          <button
            type="button"
            @click="close"
            class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PLATFORM_DOMAIN, GAME_TYPES } from '~/utils/constants';
import type { Server } from '~/types';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: []; created: [server: Server] }>();

const $api = useApi();

const form = ref({ name: '', gameType: GAME_TYPES[0].value, ipAddress: '', slug: '' });
const error = ref('');

function close() {
  error.value = '';
  emit('close');
}

async function submit() {
  error.value = '';
  try {
    const server = await $api<Server>('/servers', {
      method: 'POST',
      body: form.value,
    });
    form.value = { name: '', gameType: GAME_TYPES[0].value, ipAddress: '', slug: '' };
    emit('created', server);
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Не удалось создать магазин';
  }
}
</script>

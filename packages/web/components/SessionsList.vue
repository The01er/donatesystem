<script setup lang="ts">
import type { Session } from '~/types';

const sessions = ref<Session[]>([]);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    sessions.value = await $fetch<Session[]>('/api/auth/sessions', { credentials: 'include' });
  } catch {
    error.value = 'Не удалось загрузить сессии';
  } finally {
    loading.value = false;
  }
}

async function revoke(id: string) {
  try {
    await $fetch(`/api/auth/sessions/${id}`, { method: 'DELETE', credentials: 'include' });
    sessions.value = sessions.value.filter((s) => s.id !== id);
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Ошибка при отзыве сессии';
  }
}

async function revokeAll() {
  try {
    await $fetch('/api/auth/sessions?all=true', { method: 'DELETE', credentials: 'include' });
    sessions.value = sessions.value.filter((s) => s.isCurrent);
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Ошибка при отзыве сессий';
  }
}

onMounted(load);
</script>

<template>
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white">Активные сессии</h2>
      <button
        v-if="sessions.length > 1"
        @click="revokeAll"
        class="text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition"
      >
        Завершить все остальные
      </button>
    </div>

    <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Загрузка...</p>
    <p v-if="error" class="text-sm text-red-500 font-medium">{{ error }}</p>

    <div v-if="!loading && sessions.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
      Нет активных сессий
    </div>

    <div v-if="!loading" class="space-y-3">
      <div
        v-for="s in sessions"
        :key="s.id"
        class="flex items-center justify-between py-3 px-4 rounded-xl border border-slate-100 dark:border-slate-700"
        :class="{ 'bg-indigo-50 dark:bg-slate-700/50 border-indigo-200 dark:border-indigo-800': s.isCurrent }"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span
              v-if="s.isCurrent"
              class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded"
            >
              Текущая
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{{ s.ipAddress || '—' }}</span>
          </div>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
            {{ s.userAgent || 'Неизвестное устройство' }}
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Последняя активность: {{ fmtDate(s.lastUsedAt) }}
          </p>
        </div>
        <button
          v-if="!s.isCurrent"
          @click="revoke(s.id)"
          class="text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition ml-3"
        >
          Отозвать
        </button>
      </div>
    </div>
  </div>
</template>

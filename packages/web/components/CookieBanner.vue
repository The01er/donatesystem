<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm border-t border-slate-700/50 px-4 py-4 sm:py-3"
    >
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p class="text-xs sm:text-sm text-slate-300 leading-relaxed flex-1">
          Мы используем Яндекс.Метрику и Google Analytics для анализа посещаемости. Продолжая использовать сайт, вы соглашаетесь на
          обработку данных.
          <NuxtLink to="/legal/privacy" class="text-indigo-400 hover:text-indigo-300 underline ml-1 whitespace-nowrap">
            Подробнее
          </NuxtLink>
        </p>
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            @click="decline"
          >
            Отклонить
          </button>
          <button
            class="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            @click="accept"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const CONSENT_KEY = 'donate_metrika_consent';
const GA_CONSENT_KEY = 'donate_analytics_consent';

function hasConsent(): boolean {
  if (!import.meta.client) return true;
  const stored = localStorage.getItem(CONSENT_KEY);
  const gaStored = localStorage.getItem(GA_CONSENT_KEY);
  return (stored === 'true' || stored === 'false') && (gaStored === 'true' || gaStored === 'false');
}

const visible = ref(!hasConsent());

function accept() {
  localStorage.setItem(CONSENT_KEY, 'true');
  localStorage.setItem(GA_CONSENT_KEY, 'true');
  visible.value = false;
}

function decline() {
  localStorage.setItem(CONSENT_KEY, 'false');
  localStorage.setItem(GA_CONSENT_KEY, 'false');
  visible.value = false;
}
</script>

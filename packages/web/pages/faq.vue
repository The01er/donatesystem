<script setup lang="ts">
import type { FaqItem } from '~/types';

definePageMeta({ layout: 'app', middleware: ['auth'] });

useSeoHead({ title: 'FAQ', description: 'Ответы на часто задаваемые вопросы о платформе DonatePlatform для Minecraft серверов.', canonical: 'https://example.com/faq' });

const faq = ref<FaqItem[]>([]);
const loading = ref(true);
const openId = ref<string | null>(null);

onMounted(async () => {
  try {
    faq.value = await $fetch<FaqItem[]>('/api/faq', { credentials: 'include' });
  } catch {
    // show empty
  } finally {
    loading.value = false;
  }
});

function toggle(id: string) {
  openId.value = openId.value === id ? null : id;
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-10">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">FAQ</h1>

    <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Загрузка...</p>

    <div
      v-else-if="faq.length === 0"
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm"
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
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
      <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-white">FAQ в разработке</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Здесь будут собраны ответы на частые вопросы по платформе.
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="item in faq"
        :key="item.id"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
      >
        <button
          @click="toggle(item.id)"
          class="w-full flex items-center justify-between px-6 py-4 text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/30"
        >
          <span class="font-semibold text-sm text-slate-900 dark:text-white pr-4">{{ item.question }}</span>
          <svg
            class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200"
            :class="openId === item.id ? 'rotate-180' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          v-if="openId === item.id"
          class="px-6 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line"
        >
          {{ item.answer }}
        </div>
      </div>
    </div>
  </div>
</template>

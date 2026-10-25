<script setup lang="ts">
import type { NewsItem } from '~/types';

definePageMeta({ layout: 'app' });

const news = ref<NewsItem[]>([]);
const loading = ref(true);
const error = ref(false);

const { data: landingData } = await useAsyncData('news-landing', () =>
  $fetch<{ platformName?: string }>('/api/landing').catch(() => ({ platformName: undefined })),
);
const platformName = computed(() => landingData.value?.platformName || 'DonatePlatform');

onMounted(async () => {
  try {
    news.value = await $fetch<NewsItem[]>('/api/news');
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});

useSeoHead({
  title: 'Новости',
  description: 'Новости и обновления платформы DonatePlatform — новые функции, изменения тарифов и важные объявления.',
  canonical: 'https://example.com/news',
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-10">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Новости</h1>

    <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Загрузка...</p>

    <p v-else-if="error" class="text-sm text-red-500">Не удалось загрузить новости.</p>

    <div
      v-else-if="news.length === 0"
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
          d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
        />
      </svg>
      <h2 class="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Новости пока пусты</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Здесь будут публиковаться обновления платформы и важные объявления.
      </p>
    </div>

    <div v-else class="space-y-6">
      <article
        v-for="item in news"
        :key="item.id"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ item.title }}</h2>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ fmtDate(item.createdAt) }}</p>
        <div class="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {{ item.content }}
        </div>
      </article>
    </div>
  </div>
</template>

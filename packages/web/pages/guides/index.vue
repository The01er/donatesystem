<script setup lang="ts">
import type { GuideListItem } from '~/types';

definePageMeta({ layout: 'default' });

const route = useRoute();
const category = computed(() => (route.query.category as string) || '');

const { data: guidesData, pending } = await useAsyncData('guides', () =>
  $fetch<{ items: GuideListItem[]; total: number; page: number; totalPages: number }>(
    `/api/guides${category.value ? `?category=${category.value}` : ''}`,
  ),
);

const { data: categoriesData } = await useAsyncData('guide-categories', () =>
  $fetch<string[]>('/api/guides/categories').catch(() => []),
);

const categories = computed(() => categoriesData.value || []);

const canonical = computed(() => `https://example.com${route.path}`);

useSeoHead({
  title: 'Гайды по донатам для Minecraft',
  description: 'Полезные гайды по настройке донат-магазина, подключению платёжных систем и продвижению Minecraft сервера.',
  canonical: canonical.value,
});

const CATEGORY_LABELS: Record<string, string> = {
  setup: 'Настройка',
  payment: 'Платёжные системы',
  minecraft: 'Minecraft',
  marketing: 'Продвижение',
  general: 'Общее',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat;
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Гайды</h1>
      <p class="text-slate-500 dark:text-slate-400 mb-8 text-sm sm:text-base">
        Полезные статьи по настройке донат-магазина, приёму платежей и развитию сервера
      </p>

      <!-- Category filter -->
      <div v-if="categories.length > 0" class="flex flex-wrap gap-2 mb-8">
        <NuxtLink
          to="/guides"
          class="px-4 py-2 text-sm font-semibold rounded-lg transition"
          :class="!category ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'"
        >
          Все
        </NuxtLink>
        <NuxtLink
          v-for="cat in categories"
          :key="cat"
          :to="`/guides?category=${cat}`"
          class="px-4 py-2 text-sm font-semibold rounded-lg transition"
          :class="category === cat ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'"
        >
          {{ categoryLabel(cat) }}
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-12">
        <p class="text-slate-400">Загрузка...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="!guidesData?.items?.length" class="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-slate-500 dark:text-slate-400">Гайды пока не опубликованы</p>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="guide in guidesData!.items"
          :key="guide.id"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <NuxtLink :to="`/guides/${guide.slug}`" class="block p-6">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {{ categoryLabel(guide.category) }}
              </span>
              <span class="text-xs text-slate-400">{{ fmtDate(guide.createdAt) }}</span>
            </div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{{ guide.title }}</h2>
            <p v-if="guide.excerpt" class="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
              {{ guide.excerpt }}
            </p>
          </NuxtLink>
        </article>
      </div>
    </div>
  </div>
</template>

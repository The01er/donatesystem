<script setup lang="ts">
import type { GuideDetail } from '~/types';

definePageMeta({ layout: 'default' });

const route = useRoute();
const slug = route.params.slug as string;

const { data: guide, pending, error } = await useAsyncData(`guide-${slug}`, () =>
  $fetch<GuideDetail>(`/api/guides/${slug}`),
);

if (error.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

const title = computed(() => {
  const raw = guide.value?.metaTitle || guide.value?.title || 'Гайд';
  const max = 65;
  return raw.length > max ? raw.slice(0, max - 3) + '...' : raw;
});
const description = computed(() => {
  const raw = guide.value?.metaDescription || guide.value?.excerpt || '';
  return raw.length > 170 ? raw.slice(0, 167) + '...' : raw;
});
const canonical = computed(() => `https://example.com${route.path}`);

useHead({
  title,
  titleTemplate: '%s | DonatePlatform',
  meta: [
    { name: 'description', content: description },
    { property: 'og:locale', content: 'ru_RU' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ],
  link: [{ rel: 'canonical', href: canonical }],
  script: guide.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.value.metaTitle || guide.value.title,
            description: guide.value.metaDescription || guide.value.excerpt || '',
            datePublished: guide.value.createdAt,
            dateModified: guide.value.updatedAt,
            author: { '@type': 'Organization', name: 'DonatePlatform' },
            publisher: { '@type': 'Organization', name: 'DonatePlatform' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical.value },
          }),
        },
      ]
    : [],
});

const CATEGORY_LABELS: Record<string, string> = {
  setup: 'Настройка',
  payment: 'Платёжные системы',
  minecraft: 'Minecraft',
  marketing: 'Продвижение',
  general: 'Общее',
};
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-200">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <NuxtLink to="/" class="hover:text-indigo-600 transition">Главная</NuxtLink>
        <span>/</span>
        <NuxtLink to="/guides" class="hover:text-indigo-600 transition">Гайды</NuxtLink>
        <span v-if="guide">/</span>
        <span v-if="guide" class="text-slate-600 dark:text-slate-300 truncate">{{ guide.title }}</span>
      </nav>

      <div v-if="pending" class="text-center py-12 text-slate-400">Загрузка...</div>

      <div v-else-if="error" class="text-center py-12">
        <p class="text-slate-500">Гайд не найден</p>
        <NuxtLink to="/guides" class="text-indigo-600 hover:text-indigo-500 text-sm mt-2 inline-block">
          ← Все гайды
        </NuxtLink>
      </div>

      <article v-else-if="guide">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            {{ CATEGORY_LABELS[guide.category] || guide.category }}
          </span>
          <span class="text-xs text-slate-400">{{ fmtDate(guide.createdAt) }}</span>
          <span v-if="guide.tags" class="text-xs text-slate-400">• {{ guide.tags }}</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-6">
          {{ guide.title }}
        </h1>

        <div
          class="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed"
          v-html="guide.content"
        />
      </article>
    </div>
  </div>
</template>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900">
    <nav
      class="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto border-b border-slate-200 dark:border-slate-700"
    >
      <NuxtLink :to="`/shop/${slug}`" class="text-base sm:text-lg font-bold text-slate-900 dark:text-white shrink-0">
        {{ serverName || 'Магазин' }}
      </NuxtLink>
      <div class="flex items-center gap-2 sm:gap-4">
        <NuxtLink
          :to="`/shop/${slug}`"
          class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition whitespace-nowrap"
        >
          ← Назад в магазин
        </NuxtLink>
      </div>
    </nav>
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div v-if="pending" class="text-center text-slate-400 py-12">Загрузка...</div>
      <div v-else-if="error" class="text-center py-12">
        <p class="text-slate-500">Документ не найден</p>
        <NuxtLink :to="`/shop/${slug}`" class="text-indigo-600 hover:text-indigo-500 text-sm mt-2 inline-block">
          В магазин
        </NuxtLink>
      </div>
      <article v-else-if="doc">
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8">{{ doc.title }}</h1>
        <div
          class="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
          v-html="sanitizedContent"
        />
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const slug = route.params.slug as string;
const docSlug = route.params.docSlug as string;

const serverName = ref('');

const {
  data: doc,
  pending,
  error,
} = await useAsyncData(`shop-legal-${slug}-${docSlug}`, async () => {
  const doc = await $fetch<{ title: string; content: string }>(`/api/shop/${slug}/legal/${docSlug}`);
  try {
    const shop = await $fetch<{ server: { name: string } }>(`/api/shop/${slug}`);
    serverName.value = shop.server.name;
  } catch {}
  return doc;
});

if (error.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = computed(() => DOMPurify.sanitize(doc.value?.content || ''));

const seoTitle = computed(() => doc.value?.title || 'Документ');
const seoDesc = computed(() =>
  doc.value?.title
    ? `${doc.value.title} — юридический документ магазина ${serverName.value || slug}`
    : 'Юридический документ',
);

useSeoHead({
  title: seoTitle.value,
  description: seoDesc.value,
  canonical: `https://example.com/shop-legal/${slug}/${docSlug}`,
});
</script>

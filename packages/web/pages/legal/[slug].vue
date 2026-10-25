<template>
  <div class="min-h-screen bg-white dark:bg-slate-900">
    <!-- Shop subdomain nav -->
    <nav
      v-if="shopSlug"
      class="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto border-b border-slate-200 dark:border-slate-700"
    >
      <NuxtLink
        :to="`/shop/${shopSlug}`"
        class="text-base sm:text-lg font-bold text-slate-900 dark:text-white shrink-0"
      >
        {{ serverName || 'Магазин' }}
      </NuxtLink>
      <div class="flex items-center gap-2 sm:gap-4">
        <NuxtLink
          :to="`/shop/${shopSlug}`"
          class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition whitespace-nowrap"
        >
          ← Назад в магазин
        </NuxtLink>
      </div>
    </nav>
    <!-- Platform nav -->
    <nav
      v-else
      class="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto border-b border-slate-200 dark:border-slate-700"
    >
      <NuxtLink to="/" class="text-base sm:text-lg font-bold text-slate-900 dark:text-white shrink-0"
        >{{ platformName }}</NuxtLink
      >
      <div class="flex items-center gap-2 sm:gap-4">
        <NuxtLink
          to="/login"
          class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition whitespace-nowrap"
          >Войти</NuxtLink
        >
        <NuxtLink
          to="/register"
          class="text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition whitespace-nowrap"
          >Начать</NuxtLink
        >
      </div>
    </nav>
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div v-if="pending" class="text-center text-slate-400 py-12">Загрузка...</div>
      <div v-else-if="error" class="text-center py-12">
        <p class="text-slate-500">Документ не найден</p>
        <NuxtLink
          :to="shopSlug ? `/shop/${shopSlug}` : '/'"
          class="text-indigo-600 hover:text-indigo-500 text-sm mt-2 inline-block"
        >
          {{ shopSlug ? 'В магазин' : 'На главную' }}
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
const platformName = ref('DonatePlatform');

const serverName = ref('');
const shopSlug = ref<string | null>(null);

const {
  data: doc,
  pending,
  error,
} = await useAsyncData(`legal-${slug}`, async () => {
  const host = process.server ? useRequestHeader('host') || '' : window.location.host || '';

  let resolvedSlug: string | null = null;
  if (host) {
    try {
      const hostClean = host.split(':')[0];
      const resolved = await $fetch<{ slug: string }>('/api/shop/resolve-host', {
        headers: { 'X-Forwarded-Host': hostClean },
      });
      resolvedSlug = resolved.slug;
    } catch {}
  }

  if (resolvedSlug && slug.startsWith('store-')) {
    shopSlug.value = resolvedSlug;
    const doc = await $fetch<{ title: string; content: string }>(`/api/shop/${resolvedSlug}/legal/${slug}`);
    try {
      const shop = await $fetch<{ server: { name: string } }>(`/api/shop/${resolvedSlug}`);
      serverName.value = shop.server.name;
    } catch {}
    return doc;
  }

  try {
    const landing = await $fetch<{ platformName?: string }>('/api/landing');
    if (landing?.platformName) platformName.value = landing.platformName;
  } catch {}

  return await $fetch<{ title: string; content: string }>(`/api/legal/${slug}`);
});

if (error.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = computed(() => DOMPurify.sanitize(doc.value?.content || ''));

useSeoHead({
  title: doc.value?.title || 'Документ',
  description: `Юридический документ платформы DonatePlatform — ${doc.value?.title || slug}`,
  canonical: `https://example.com/legal/${slug}`,
});
</script>

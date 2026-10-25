<template>
  <ShopContent :slug="slug" />
</template>

<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;

definePageMeta({ layout: false });

const { data: shop, error: shopError } = await useAsyncData(`shop-seo-${slug}`, () =>
  $fetch<{ server: { name: string; gameType?: string } }>(`/api/shop/${slug}`),
);

if (shopError.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

const title = computed(() => shop.value?.server?.name || 'Магазин');
const description = computed(() =>
  shop.value?.server?.name
    ? `Магазин донатов для Minecraft сервера ${shop.value.server.name}. Привилегии, предметы, кейсы и многое другое.`
    : 'Магазин донатов для Minecraft',
);

useHead({
  title,
  titleTemplate: `%s | DonatePlatform`,
  meta: [
    { name: 'description', content: description },
    { property: 'og:locale', content: 'ru_RU' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: 'https://example.com/og-image.png' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: 'https://example.com/og-image.png' },
  ],
  link: [{ rel: 'canonical', href: `https://example.com/shop/${slug}` }],
});
</script>

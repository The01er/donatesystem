<template>
  <ShopContent v-if="shopSlug" :slug="shopSlug" />
  <div v-else class="min-h-screen landing-grid" style="padding:20px;">
    <div class="max-w-6xl mx-auto bg-white/70 backdrop-blur-xl border-2 border-[#d43bd4]/15 rounded-3xl p-5 md:p-8 shadow-[0_8px_60px_rgba(120,80,200,0.06)] relative overflow-hidden">
      <LandingHero
        :title="landingData?.sections?.hero?.title || 'Принимайте донаты легко'"
        :subtitle="
          landingData?.sections?.hero?.subtitle || 'Профессиональное решение для серверов Minecraft.'
        "
        :cta-text="landingData?.sections?.hero?.ctaText || 'Создать магазин'"
        :cta-link="landingData?.sections?.hero?.ctaLink || '/register'"
        :bg-image="landingData?.sections?.hero?.bgImage"
        :platform-name="platformName"
      />

      <LandingFeatures
        v-if="landingData?.sections?.features?.items?.length"
        :items="landingData.sections.features.items"
      />

      <LandingHowItWorks />

      <LandingSocialProof
        :server-count="landingData?.serverCount ?? 0"
        :featured-shops="landingData?.featuredShops ?? []"
        :platform-domain="landingData?.platformDomain ?? 'example.com'"
      />

      <LandingPricing
        :subscription-price="landingData?.subscriptionPrice ?? 9.99"
        :currency="landingData?.currency || 'RUB'"
        :operating-mode="landingData?.operatingMode ?? 'self_employed'"
      />

      <LandingTestimonials
        v-if="landingData?.sections?.testimonials?.items?.length"
        :items="landingData.sections.testimonials.items"
      />

      <LandingFaq v-if="landingData?.faq?.length" :items="landingData.faq" />

      <LandingRoadmap
        v-if="landingData?.sections?.roadmap?.items?.length"
        :title="landingData.sections.roadmap.title"
        :items="landingData.sections.roadmap.items"
      />

      <LandingCta
        :title="landingData?.sections?.cta?.title || 'Готовы начать?'"
        :subtitle="landingData?.sections?.cta?.subtitle || 'Создайте магазин за 5 минут и начните принимать донаты.'"
        :btn-text="landingData?.sections?.cta?.btnText || 'Создать магазин'"
        :btn-link="landingData?.sections?.cta?.btnLink || '/register'"
      />

      <LandingFooter
        :copyright="landingData?.sections?.footer?.copyright || `© 2026 ${platformName}. Все права защищены.`"
        :links="landingData?.sections?.footer?.links || []"
        :email="landingData?.platformEmail"
        :phone="landingData?.platformPhone"
        :inn="landingData?.platformInn"
        :address="landingData?.platformAddress"
        :name="platformName"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaqItem, LandingResponse } from '~/types';

definePageMeta({ layout: false });

const host = process.server ? (useRequestHeader('host') || '') : (import.meta.client ? window.location.host : '');

function emptyLanding(): LandingResponse {
  return {
    sections: {}, subscriptionPrice: 0, currency: 'RUB', faq: [],
    serverCount: 0, featuredShops: [], platformDomain: '',
    operatingMode: '', platformName: '', platformEmail: null,
    platformPhone: null, platformInn: null, platformAddress: null,
  };
}

const platformName = computed(() => landingData.value?.platformName || 'DonatePlatform');

const { data: resolved } = await useAsyncData<{ slug: string }>('resolveShop', async () => {
  if (!host) return { slug: '' };
  const hostClean = host.split(':')[0];
  if (!hostClean || hostClean === 'example.com') return { slug: '' };
  try {
    return await $fetch<{ slug: string }>(`/api/shop/resolve-host?domain=${hostClean}`);
  } catch {
    return { slug: '' };
  }
});

const shopSlug = computed(() => resolved.value?.slug || null);

const { data: landingData } = await useAsyncData<LandingResponse>('landing', async () => {
  if (shopSlug.value) return emptyLanding();
  try {
    return await $fetch<LandingResponse>('/api/landing');
  } catch {
    return emptyLanding();
  }
});

const { data: shopSeo } = await useAsyncData<{ server: { name: string } } | null>('shopSeoLanding', async () => {
  if (!shopSlug.value) return null;
  try {
    return await $fetch<{ server: { name: string } }>(`/api/shop/${shopSlug.value}`);
  } catch {
    return null;
  }
});

const seoTitle = computed(() => {
  if (shopSlug.value) {
    return shopSeo.value?.server?.name
      ? `Магазин ${shopSeo.value.server.name}`
      : 'Магазин донатов для Minecraft';
  }
  return `${platformName.value} — Монетизация игровых серверов`;
});

const seoDescription = computed(() => {
  if (shopSlug.value) {
    return shopSeo.value?.server?.name
      ? `Магазин донатов для Minecraft сервера ${shopSeo.value.server.name}. Привилегии, предметы, кейсы и многое другое.`
      : 'Магазин донатов для Minecraft';
  }
  return 'Платформа для приёма донатов на серверах Minecraft. Создайте магазин за 5 минут, принимайте платежи через ЮKassa, AnyPay, Enot.io и ЮMoney.';
});

useHead({
  title: seoTitle,
  titleTemplate: '',
  meta: [
    { name: 'description', content: seoDescription },
    { property: 'og:locale', content: 'ru_RU' },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:image', content: 'https://example.com/og-image.png' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seoTitle },
    { name: 'twitter:description', content: seoDescription },
    { name: 'twitter:image', content: 'https://example.com/og-image.png' },
  ],
  link: [{ rel: 'canonical', href: 'https://example.com/' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'DonatePlatform',
        url: 'https://example.com/',
        description: 'Платформа для приёма донатов на серверах Minecraft',
        inLanguage: 'ru',
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'DonatePlatform',
        url: 'https://example.com/',
        logo: 'https://example.com/og-image.png',
      }),
    },
  ],
});

onMounted(() => {
  if (import.meta.client) {
    $fetch('/api/analytics/pageview', { method: 'POST', body: {} }).catch(() => {});
  }
});
</script>

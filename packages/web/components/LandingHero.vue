<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgImage?: string;
  platformName?: string;
}>();

const auth = useAuthStore();

onMounted(() => {
  if (!auth.user && !auth.loading) auth.initialize();
});
</script>

<template>
  <section>
    <header class="flex flex-wrap justify-between items-center pb-5 gap-3" style="border-bottom:2px solid rgba(212,59,212,0.1);">
      <div class="text-3xl md:text-4xl font-extrabold" style="background:linear-gradient(135deg,#d43bd4,#0099cc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">
        {{ platformName ? platformName.charAt(0) : '2' }}<span style="background:linear-gradient(135deg,#e8a000,#ffdd44); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">DONATE</span>
      </div>
      <nav class="flex items-center gap-4 md:gap-6 flex-wrap">
        <a href="#features" class="text-[#555577] hover:text-[#d43bd4] font-semibold text-sm md:text-base transition relative" style="text-decoration:none;">Возможности</a>
        <a href="#pricing" class="text-[#555577] hover:text-[#d43bd4] font-semibold text-sm md:text-base transition relative" style="text-decoration:none;">Тарифы</a>
        <a href="/guides" class="text-[#555577] hover:text-[#d43bd4] font-semibold text-sm md:text-base transition relative" style="text-decoration:none;">Гайды</a>
        <a href="#faq" class="text-[#555577] hover:text-[#d43bd4] font-semibold text-sm md:text-base transition relative" style="text-decoration:none;">FAQ</a>
        <ClientOnly fallback-tag="span">
          <template v-if="auth.user">
            <NuxtLink to="/dashboard" class="cyber-btn cyber-btn-sm">Панель управления</NuxtLink>
          </template>
          <template v-else>
            <a href="/register" class="cyber-btn cyber-btn-sm">Создать магазин</a>
          </template>
        </ClientOnly>
      </nav>
    </header>

    <section class="text-center py-12 md:py-16">
      <h1 class="text-4xl md:text-7xl font-extrabold leading-tight">
        <span class="neon-pink">{{ title }}</span>
      </h1>
      <p class="text-lg md:text-xl max-w-2xl mx-auto mt-4 mb-10" style="color:#555577;">
        {{ subtitle }}
        <span class="neon-cyan">✦</span>
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <a :href="ctaLink" class="cyber-btn">▶ {{ ctaText }}</a>
        <ClientOnly fallback-tag="span">
          <a v-if="!auth.user" href="/login" class="cyber-btn cyber-btn-cyan">▶ Войти</a>
        </ClientOnly>
      </div>
    </section>
  </section>
</template>

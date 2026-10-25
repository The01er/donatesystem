<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ToastContainer />
    <CookieBanner />
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'ru' },
  titleTemplate: '%s | DonatePlatform',
});
</script>

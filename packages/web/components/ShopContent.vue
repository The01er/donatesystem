<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-200">
    <Transition name="shop-template" mode="out-in">
      <component :is="currentTemplate" v-if="currentTemplate" :slug="slug" :state="state" />
    </Transition>
    <ShopCheckout :slug="slug" :state="state" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import type { ShopState } from '~/composables/useShop';
import { useShop } from '~/composables/useShop';

const { slug } = defineProps<{ slug: string }>();
const state: ShopState = useShop(slug);

const templateComponents: Record<string, Component> = {
  gaming: defineAsyncComponent(() => import('./shop/ShopTemplateGaming.vue')),
  cyber: defineAsyncComponent(() => import('./shop/ShopTemplateCyber.vue')),
};

const currentTemplate = computed(() => {
  const t = state.shop.value?.server.template || 'classic';
  return templateComponents[t] || templateComponents.gaming;
});
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.4s ease-out both;
}
@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.15); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-bounce-in {
  animation: bounce-in 0.5s ease-out both;
}
.shop-template-enter-active,
.shop-template-leave-active {
  transition: opacity 0.2s ease;
}
.shop-template-enter-from,
.shop-template-leave-to {
  opacity: 0;
}
</style>

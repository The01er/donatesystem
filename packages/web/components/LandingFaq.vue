<script setup lang="ts">
import type { FaqItem } from '~/types';
defineProps<{ items: FaqItem[] }>();
const openId = ref<string | null>(null);
function toggle(id: string) {
  openId.value = openId.value === id ? null : id;
}
</script>

<template>
  <section id="faq" v-if="items.length > 0">
    <h2 class="text-2xl md:text-4xl font-extrabold text-center mt-16 mb-8">
      <span class="neon-gold">FAQ</span>
    </h2>
    <div class="max-w-3xl mx-auto space-y-3">
      <div
        v-for="item in items"
        :key="item.id"
        class="cyber-card !text-left !p-0 overflow-hidden"
      >
        <button
          @click="toggle(item.id)"
          class="w-full flex items-center justify-between px-6 py-4 text-left font-bold text-sm md:text-base transition"
          style="color:#1a1a2e; background:none; border:none; cursor:pointer;"
        >
          <span>{{ item.question }}</span>
          <svg
            class="w-4 h-4 shrink-0 transition-transform duration-200"
            :class="openId === item.id ? 'rotate-180' : ''"
            style="color:#d43bd4;"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="openId === item.id" class="px-6 pb-4">
          <p style="font-size:14px; color:#555577; line-height:1.6;">{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface FeatureItem { icon: string; title: string; desc: string; }
defineProps<{ items: FeatureItem[] }>();
</script>

<template>
  <section id="features">
    <h2 class="text-2xl md:text-4xl font-extrabold text-center mt-12 md:mt-16 mb-8">
      <span class="neon-cyan">Всё</span>
      для вашего
      <span class="neon-purple">магазина</span>
    </h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="(item, idx) in items" :key="idx" class="cyber-card">
        <div class="scan-line"></div>
        <span class="icon">{{ item.icon }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>

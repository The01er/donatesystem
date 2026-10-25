<template>
  <section v-if="items.length">
    <h2 class="text-2xl md:text-4xl font-extrabold text-center mt-16 mb-8">
      <span class="neon-purple">План</span>
      развития
    </h2>

    <div class="max-w-3xl mx-auto space-y-3">
      <div v-for="(item, idx) in items" :key="idx" class="roadmap-item">
        <span class="status" :class="statusClass(item.status)">{{ statusIcon(item.status) }}</span>
        <span class="date">{{ item.date || '' }}</span>
        <span class="desc">{{ item.text }} <small v-if="item.note">({{ item.note }})</small></span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface RoadmapItem {
  status: 'done' | 'in_progress' | 'planned';
  text: string;
  date?: string;
  note?: string;
}
defineProps<{ title: string; items: RoadmapItem[] }>();

function statusIcon(s: string): string {
  return s === 'done' ? '✓' : '○';
}
function statusClass(s: string): string {
  return s === 'done' ? 'status-done' : 'status-planned';
}
</script>

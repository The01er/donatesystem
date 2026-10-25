<template>
  <div class="flex items-center gap-2 text-sm" :class="colorClass">
    <span
      class="inline-block w-2 h-2 rounded-full"
      :class="online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"
    />
    <span v-if="online">
      {{ players }} / {{ max }} онлайн
    </span>
    <span v-else>
      Сервер офлайн
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  online: boolean;
  players: number;
  max: number;
  colorClass?: string;
}>();
</script>

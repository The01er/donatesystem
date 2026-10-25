<template>
  <div
    v-if="visible"
    :class="[
      'px-4 py-3 text-sm flex items-center gap-3 border-b',
      variant === 'warning'
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-300'
        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300',
    ]"
  >
    <svg
      v-if="variant === 'warning'"
      class="h-5 w-5 shrink-0 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <span class="flex-1"><slot /></span>
    <button
      v-if="dismissible"
      @click="$emit('dismiss')"
      class="shrink-0 text-current opacity-60 hover:opacity-100 transition"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  variant?: 'warning' | 'success';
  dismissible?: boolean;
}>();

defineEmits<{
  dismiss: [];
}>();
</script>

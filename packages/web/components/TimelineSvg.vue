<template>
  <svg
    v-if="type === 'created'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <svg
    v-else-if="type === 'success'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="3"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
  </svg>
  <svg
    v-else-if="type === 'error'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
  <svg
    v-else-if="type === 'rollback_success'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a5 5 0 015 5v2m-6-7l-3-3m0 0l3-3m-3 3h12" />
  </svg>
  <svg
    v-else-if="type === 'rollback_error'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
  <svg v-else-if="type === 'current'" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="6" />
  </svg>
  <svg
    v-else-if="type === 'revoke_success'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <svg
    v-else-if="type === 'revoke_failed'"
    class="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
</template>

<script setup lang="ts">
export type TimelineEventType = 'created' | 'success' | 'error' | 'rollback_success' | 'rollback_error' | 'current' | 'revoke_success' | 'revoke_failed';

defineProps<{
  type: TimelineEventType;
}>();
</script>

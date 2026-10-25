<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto min-w-[280px] max-w-sm rounded-xl shadow-lg border px-4 py-3 flex items-start gap-3 backdrop-blur-sm"
          :class="styleFor(t.type)"
          role="alert"
        >
          <span class="shrink-0 mt-0.5" v-html="iconFor(t.type)" />
          <p class="flex-1 text-sm font-medium leading-5">{{ t.message }}</p>
          <button class="shrink-0 opacity-60 hover:opacity-100 transition" aria-label="Закрыть" @click="dismiss(t.id)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ToastType } from '~/composables/useNotify';

const { toasts, dismiss } = useNotify();

function styleFor(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100';
    case 'error':
      return 'bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100';
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-900/80 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-100';
    case 'info':
      return 'bg-indigo-50 dark:bg-indigo-900/80 border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-100';
  }
}

function iconFor(type: ToastType): string {
  switch (type) {
    case 'success':
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    case 'error':
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    case 'warning':
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    case 'info':
      return '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>

<template>
  <div class="flex items-center justify-center gap-2 py-6">
    <button
      :disabled="page <= 1"
      @click="$emit('go', page - 1)"
      class="px-4 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
    >
      Назад
    </button>
    <template v-for="p in pages" :key="p">
      <button
        v-if="p < 5 || p > pages - 3 || Math.abs(p - page) < 2"
        @click="$emit('go', p)"
        class="w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5"
        :class="
          p === page
            ? 'bg-indigo-600 text-white shadow-sm border border-indigo-650'
            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/60'
        "
      >
        {{ p }}
      </button>
      <span v-else-if="p === 5 || p === pages - 3" class="text-slate-400 dark:text-slate-600 text-xs px-1">…</span>
    </template>
    <button
      :disabled="page >= pages"
      @click="$emit('go', page + 1)"
      class="px-4 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
    >
      Вперед
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ page: number; pages: number }>();
defineEmits<{ go: [page: number] }>();
</script>

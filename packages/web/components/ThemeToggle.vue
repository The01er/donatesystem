<script setup lang="ts">
const isDark = ref(false);

function syncTheme(dark: boolean) {
  if (import.meta.client) {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

onMounted(() => {
  if (import.meta.client) {
    isDark.value =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    syncTheme(isDark.value);
  }
});

const toggleTheme = () => {
  if (import.meta.client) {
    isDark.value = !isDark.value;
    syncTheme(isDark.value);
    localStorage.theme = isDark.value ? 'dark' : 'light';
  }
};
</script>

<template>
  <button
    @click="toggleTheme"
    class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors w-full"
    aria-label="Toggle theme"
  >
    <template v-if="isDark">
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
      <span>Светлая тема</span>
    </template>
    <template v-else>
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>
      <span>Тёмная тема</span>
    </template>
  </button>
</template>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <div class="text-7xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
        {{ error.statusCode }}
      </div>
      <h1 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        {{ statusMessage }}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">
        {{ description }}
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 transition"
      >
        На главную
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage?: string; description?: string; url?: string } }>();

const statusMessage = computed(() => {
  if (props.error.statusCode === 404) return 'Страница не найдена';
  if (props.error.statusCode === 403) return 'Доступ запрещён';
  if (props.error.statusCode === 500) return 'Внутренняя ошибка сервера';
  return props.error.statusMessage || 'Ошибка';
});

const description = computed(() => {
  if (props.error.statusCode === 404) return 'Страница, которую вы ищете, не существует или была перемещена.';
  if (props.error.statusCode === 500) return 'Что-то пошло не так. Попробуйте обновить страницу позже.';
  return props.error.description || '';
});

useHead({
  title: `${props.error.statusCode} — ${statusMessage.value}`,
  titleTemplate: '%s | DonatePlatform',
  meta: [
    { name: 'robots', content: props.error.statusCode === 404 ? 'noindex' : 'noindex, nofollow' },
  ],
});
</script>

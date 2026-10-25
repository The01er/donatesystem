<template>
  <div
    class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center py-12 px-6 transition-colors duration-200"
  >
    <div
      class="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 space-y-6"
    >
      <div class="text-center">
        <NuxtLink to="/" class="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          <span v-if="brandName">{{ brandName }}</span>
          <span v-else>Donate<span class="text-slate-900 dark:text-white">Platform</span></span>
        </NuxtLink>
        <h2 class="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Новый пароль</h2>
      </div>

      <div v-if="success" class="text-center space-y-4">
        <div
          class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300"
        >
          Пароль изменён. Войдите с новым паролем.
        </div>
        <NuxtLink
          to="/login"
          class="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition"
        >
          Войти
        </NuxtLink>
      </div>

      <form v-else @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Новый пароль</label
          >
          <input
            v-model="newPassword"
            type="password"
            minlength="8"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
            placeholder="Минимум 8 символов"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Подтвердите пароль</label
          >
          <input
            v-model="confirmPassword"
            type="password"
            minlength="8"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
            placeholder="Повторите пароль"
          />
        </div>
        <p v-if="error" class="text-red-500 text-sm font-medium">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:scale-95"
        >
          {{ loading ? 'Сохранение...' : 'Сохранить пароль' }}
        </button>
        <p class="text-sm text-slate-500 dark:text-slate-400 text-center">
          <NuxtLink to="/login" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >Вернуться ко входу</NuxtLink
          >
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const auth = useAuthStore();
const router = useRouter();
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);
const success = ref(false);
const brandName = ref('');

const token = computed(() => route.query.token as string);

onMounted(async () => {
  if (!auth.user && !auth.loading) {
    await auth.initialize();
  }
  if (auth.user) {
    router.push('/dashboard');
    return;
  }
  try {
    const cfg = await $fetch<{ brandName?: string | null }>('/api/auth/public-config');
    if (cfg.brandName) brandName.value = cfg.brandName;
  } catch {}
});

async function submit() {
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, newPassword: newPassword.value },
    });
    success.value = true;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Ошибка сброса пароля';
  } finally {
    loading.value = false;
  }
}

definePageMeta({ layout: 'default' });

useSeoHead({ title: 'Новый пароль', description: 'Установите новый пароль для вашего аккаунта DonatePlatform.', canonical: 'https://example.com/reset-password' });
</script>

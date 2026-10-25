<script setup lang="ts">
import type { UserProfile } from '~/types';

definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Настройки аккаунта' });

const $api = useApi();
const profile = ref<UserProfile | null>(null);
const loading = ref(true);
const loadError = ref('');

onMounted(async () => {
  try {
    profile.value = await $api<UserProfile>('/auth/me');
  } catch {
    loadError.value = 'Ошибка загрузки профиля';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Настройки аккаунта</h1>

    <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Загрузка...</p>
    <p v-if="loadError" class="text-sm text-red-500">{{ loadError }}</p>

    <template v-if="!loading && profile">
      <ProfileInfo :profile="profile" />
      <ChangePassword />
      <SessionsList />

      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Пополнение баланса</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Пополните баланс для оплаты подписок серверов
            </p>
          </div>
          <NuxtLink
            to="/profile/balance"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          >
            Пополнить
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

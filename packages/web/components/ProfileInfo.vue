<script setup lang="ts">
import type { UserProfile } from '~/types';

defineProps<{
  profile: UserProfile;
}>();
</script>

<template>
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
    <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Профиль</h2>
    <dl class="space-y-3 text-sm">
      <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
        <dt class="text-slate-500 dark:text-slate-400">ID</dt>
        <dd class="font-mono text-slate-900 dark:text-white">{{ profile.id }}</dd>
      </div>
      <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
        <dt class="text-slate-500 dark:text-slate-400">Email</dt>
        <dd class="text-slate-900 dark:text-white font-medium">{{ profile.email }}</dd>
      </div>
      <div class="flex items-center justify-between py-2">
        <dt class="text-slate-500 dark:text-slate-400">Зарегистрирован</dt>
        <dd class="text-slate-900 dark:text-white">{{ fmtDate(profile.createdAt) }}</dd>
      </div>
    </dl>
  </div>
</template>

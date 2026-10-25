<script setup lang="ts">
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  success.value = '';

  if (newPassword.value.length < 8) {
    error.value = 'Новый пароль должен быть не менее 8 символов';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают';
    return;
  }

  loading.value = true;
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    });
    success.value = 'Пароль успешно изменён';
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Ошибка при смене пароля';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
    <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Смена пароля</h2>

    <form @submit.prevent="submit" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Текущий пароль
        </label>
        <input
          v-model="currentPassword"
          type="password"
          required
          class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Новый пароль
        </label>
        <input
          v-model="newPassword"
          type="password"
          required
          minlength="8"
          class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Подтвердите новый пароль
        </label>
        <input
          v-model="confirmPassword"
          type="password"
          required
          class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm font-medium">{{ error }}</p>
      <p v-if="success" class="text-green-500 text-sm font-medium">{{ success }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:scale-95"
      >
        {{ loading ? 'Сохранение...' : 'Сменить пароль' }}
      </button>
    </form>
  </div>
</template>

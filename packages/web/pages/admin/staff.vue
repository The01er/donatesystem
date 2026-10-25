<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Персонал платформы</h1>
      <button
        @click="showAdd = true"
        class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
      >
        + Добавить сотрудника
      </button>
    </div>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead
            class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs bg-slate-50 dark:bg-slate-900/50"
          >
            <tr>
              <th class="text-left py-3 px-4 font-semibold">Email</th>
              <th class="text-left py-3 px-4 font-semibold">Роль</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Статус</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Дата добавления</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in staff"
              :key="s.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{{ s.user?.email }}</td>
              <td class="py-3.5 px-4">
                <select
                  :value="s.role"
                  @change="(e) => changeRole(s.id, (e.target as HTMLSelectElement).value)"
                  class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-950 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="FINANCE">FINANCE</option>
                </select>
              </td>
              <td class="py-3.5 px-4 hidden md:table-cell">
                <span
                  v-if="s.isActive"
                  class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-150 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                >
                  Активен
                </span>
                <span
                  v-else
                  class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-655 border border-red-150 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                >
                  Неактивен
                </span>
              </td>
              <td
                class="py-3.5 px-4 text-slate-400 dark:text-slate-500 text-xs hidden md:table-cell font-medium tabular-nums"
              >
                {{ fmtDate(s.createdAt) }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <button @click="deactivate(s.id)" class="text-red-500 hover:text-red-655 font-bold text-xs transition">
                  Деактивировать
                </button>
              </td>
            </tr>
            <tr v-if="!staff.length">
              <td colspan="5" class="py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
                Сотрудники не найдены
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="showAdd"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showAdd = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Добавить сотрудника</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Укажите UUID пользователя и выберите его системную роль.
        </p>
        <div class="space-y-4">
          <input
            v-model="form.userId"
            placeholder="UUID пользователя"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <select
            v-model="form.role"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          >
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="FINANCE">FINANCE</option>
          </select>
          <div class="flex gap-3">
            <button
              @click="submitAdd"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 shadow-sm transition"
            >
              Добавить
            </button>
            <button
              @click="showAdd = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <p v-if="saveError" class="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{{ saveError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtDate } from '~/utils/format';
import type { AdminStaff } from '~/types/admin';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Персонал' });
const $admin = useAdmin();
const staff = ref<AdminStaff[]>([]);
const showAdd = ref(false);
const form = ref({ userId: '', role: 'SUPPORT' });
const loadError = ref('');
const saveError = ref('');

async function load() {
  loadError.value = '';
  try {
    staff.value = await $admin<AdminStaff[]>('/staff');
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки списка сотрудников';
    console.error(e);
  }
}

async function submitAdd() {
  try {
    await $admin('/staff', { method: 'POST', body: { userId: form.value.userId, role: form.value.role } });
    showAdd.value = false;
    form.value = { userId: '', role: 'SUPPORT' };
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка';
  }
}

async function changeRole(id: string, role: string) {
  try {
    saveError.value = '';
    await $admin(`/staff/${id}`, { method: 'PUT', body: { role } });
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    console.error(e);
    saveError.value = err?.data?.error || 'Ошибка изменения роли';
  }
}

async function deactivate(id: string) {
  if (!confirm('Deactivate this staff member?')) return;
  try {
    saveError.value = '';
    await $admin(`/staff/${id}`, { method: 'DELETE' });
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    console.error(e);
    saveError.value = err?.data?.error || 'Ошибка деактивации';
  }
}

onMounted(load);
</script>

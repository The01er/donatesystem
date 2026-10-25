<script setup lang="ts">
import type { FaqItem } from '~/types';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'FAQ' });

const $api = useApi();
const items = ref<FaqItem[]>([]);
const loading = ref(true);
const loadError = ref('');
const showEditor = ref(false);
const editing = ref<string | null>(null);
const form = ref({ question: '', answer: '', sortOrder: 0 });
const saving = ref(false);
const saveError = ref('');

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await $api<{ faq: FaqItem[] }>('/admin/faq');
    items.value = data.faq;
  } catch {
    loadError.value = 'Не удалось загрузить FAQ';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { question: '', answer: '', sortOrder: items.value.length };
  saveError.value = '';
  showEditor.value = true;
}

function openEdit(id: string) {
  const item = items.value.find((i) => i.id === id);
  if (!item) return;
  editing.value = id;
  form.value = { question: item.question, answer: item.answer, sortOrder: item.sortOrder };
  saveError.value = '';
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
  editing.value = null;
  saveError.value = '';
}

async function save() {
  saving.value = true;
  try {
    if (editing.value) {
      await $api(`/faq/${editing.value}`, {
        method: 'PUT',
        body: form.value,
      });
    } else {
      await $api('/faq', {
        method: 'POST',
        body: form.value,
      });
    }
    closeEditor();
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  if (!confirm('Удалить вопрос?')) return;
  try {
    await $api(`/faq/${id}`, { method: 'DELETE' });
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка удаления';
  }
}

onMounted(load);
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">FAQ</h1>
      <button
        @click="openCreate"
        class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
      >
        + Создать
      </button>
    </div>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div
      v-if="!loading && items.length === 0"
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm"
    >
      <p class="text-slate-500 dark:text-slate-400 text-sm">FAQ пока пуст</p>
    </div>

    <div
      v-if="!loading && items.length > 0"
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead
            class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs bg-slate-50 dark:bg-slate-900/50"
          >
            <tr>
              <th class="text-left py-3 px-4 font-semibold w-16">Пор.</th>
              <th class="text-left py-3 px-4 font-semibold">Вопрос</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 tabular-nums">{{ item.sortOrder }}</td>
              <td class="py-3.5 px-4 text-slate-900 dark:text-white font-medium">{{ item.question }}</td>
              <td class="py-3.5 px-4 text-right space-x-3">
                <button
                  @click="openEdit(item.id)"
                  class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-xs transition"
                >
                  Ред.
                </button>
                <button @click="remove(item.id)" class="text-red-500 hover:text-red-650 font-bold text-xs transition">
                  Уд.
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Editor modal -->
    <div
      v-if="showEditor"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="closeEditor"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {{ editing ? 'Редактировать' : 'Создать' }} вопрос
        </h2>
        <form @submit.prevent="save" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Вопрос</label
            >
            <input
              v-model="form.question"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Ответ</label
            >
            <textarea
              v-model="form.answer"
              required
              rows="6"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Порядок сортировки</label
            >
            <input
              v-model.number="form.sortOrder"
              type="number"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              {{ saving ? 'Сохранение...' : 'Сохранить' }}
            </button>
            <button
              type="button"
              @click="closeEditor"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              Отмена
            </button>
          </div>
          <p v-if="saveError" class="text-sm text-red-600 dark:text-red-400 mt-2">{{ saveError }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

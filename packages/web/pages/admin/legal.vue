<script setup lang="ts">
interface LegalDoc {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
}

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Документы' });

const $api = useApi();
const items = ref<LegalDoc[]>([]);
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const saveError = ref('');
const showEditor = ref(false);

const form = ref<{ slug: string; title: string; content: string }>({ slug: '', title: '', content: '' });

const SLUGS = [
  { value: 'privacy', label: 'Политика конфиденциальности' },
  { value: 'terms', label: 'Пользовательское соглашение' },
  { value: 'offer', label: 'Агентский договор / Оферта' },
  { value: 'refund', label: 'Политика возврата' },
  { value: 'cookie', label: 'Cookie Policy' },
];

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await $api<{ items: LegalDoc[] }>('/admin/legal');
    items.value = data.items;
  } catch {
    loadError.value = 'Не удалось загрузить документы';
  } finally {
    loading.value = false;
  }
}

function openEditor(slug?: string) {
  saveError.value = '';
  if (slug) {
    const doc = items.value.find((d) => d.slug === slug);
    if (doc) {
      form.value = { slug: doc.slug, title: doc.title, content: doc.content };
    }
  } else {
    form.value = { slug: '', title: '', content: '' };
  }
  showEditor.value = true;
}

async function save() {
  saving.value = true;
  saveError.value = '';
  try {
    await $api(`/admin/legal/${form.value.slug}`, {
      method: 'PUT',
      body: { title: form.value.title, content: form.value.content },
    });
    showEditor.value = false;
    await load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function remove(slug: string) {
  if (!confirm('Удалить документ?')) return;
  try {
    await $api(`/admin/legal/${slug}`, { method: 'DELETE' });
    await load();
  } catch {
    saveError.value = 'Ошибка удаления';
  }
}

onMounted(load);
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Документы</h1>
      <button
        @click="openEditor()"
        class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition"
      >
        + Создать
      </button>
    </div>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div
      v-if="!loading && items.length === 0"
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm"
    >
      <p class="text-slate-500 dark:text-slate-400 text-sm">Документов пока нет</p>
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
              <th class="text-left py-3 px-4 font-semibold">Slug</th>
              <th class="text-left py-3 px-4 font-semibold">Название</th>
              <th class="text-left py-3 px-4 font-semibold">Обновлён</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3.5 px-4 font-mono text-xs text-slate-500">{{ item.slug }}</td>
              <td class="py-3.5 px-4 text-slate-900 dark:text-white font-medium">{{ item.title }}</td>
              <td class="py-3.5 px-4 text-slate-500 text-xs">{{ new Date(item.updatedAt).toLocaleDateString() }}</td>
              <td class="py-3.5 px-4 text-right space-x-3">
                <button
                  @click="openEditor(item.slug)"
                  class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-xs transition"
                >
                  Ред.
                </button>
                <button @click="remove(item.slug)" class="text-red-500 hover:text-red-600 font-bold text-xs transition">
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
      @click.self="showEditor = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-3xl shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {{ form.slug ? 'Редактировать' : 'Создать' }} документ
        </h2>
        <form @submit.prevent="save" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Slug</label
              >
              <input
                v-model="form.slug"
                list="slug-suggestions"
                required
                :disabled="!!items.find((d) => d.slug === form.slug)"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 outline-none disabled:opacity-50"
              />
              <datalist id="slug-suggestions">
                <option v-for="s in SLUGS" :key="s.value" :value="s.value">{{ s.label }}</option>
              </datalist>
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Название</label
              >
              <input
                v-model="form.title"
                required
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Содержание (HTML)</label
            >
            <textarea
              v-model="form.content"
              required
              rows="20"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono focus:border-indigo-500 outline-none"
            />
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {{ saving ? 'Сохранение...' : 'Сохранить' }}
            </button>
            <button
              type="button"
              @click="showEditor = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <p v-if="saveError" class="text-sm text-red-600 dark:text-red-400">{{ saveError }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

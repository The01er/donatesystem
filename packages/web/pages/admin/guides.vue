<script setup lang="ts">
import type { GuideDetail } from '~/types';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });

const $api = useApi();
const notify = useNotify();
const items = ref<GuideDetail[]>([]);
const loading = ref(true);
const loadError = ref('');
const showEditor = ref(false);
const editing = ref<GuideDetail | null>(null);
const form = ref({
  slug: '',
  title: '',
  content: '',
  excerpt: '',
  imageUrl: '',
  category: 'general',
  tags: '',
  published: false,
  metaTitle: '',
  metaDescription: '',
});
const saving = ref(false);

// AI generation state
const showAiModal = ref(false);
const aiTopic = ref('');
const aiGenerating = ref(false);
const seoGenerating = ref(false);

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await $api<{ items: GuideDetail[] }>('/admin/guides');
    items.value = data.items;
  } catch {
    loadError.value = 'Не удалось загрузить гайды';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { slug: '', title: '', content: '', excerpt: '', imageUrl: '', category: 'general', tags: '', published: false, metaTitle: '', metaDescription: '' };
  showEditor.value = true;
}

function openEdit(item: GuideDetail) {
  editing.value = item;
  form.value = {
    slug: item.slug,
    title: item.title,
    content: item.content,
    excerpt: item.excerpt || '',
    imageUrl: item.imageUrl || '',
    category: item.category,
    tags: item.tags || '',
    published: item.published,
    metaTitle: item.metaTitle || '',
    metaDescription: item.metaDescription || '',
  };
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
  editing.value = null;
}

async function save() {
  saving.value = true;
  try {
    const body: Record<string, unknown> = { ...form.value };
    if (!body.imageUrl) body.imageUrl = null;
    if (!body.excerpt) body.excerpt = null;
    if (!body.tags) body.tags = null;
    if (!body.metaTitle) body.metaTitle = null;
    if (!body.metaDescription) body.metaDescription = null;

    if (editing.value) {
      await $api(`/admin/guides/${editing.value.id}`, { method: 'PUT', body });
    } else {
      await $api('/admin/guides', { method: 'POST', body });
    }
    closeEditor();
    await load();
    notify.success(editing.value ? 'Гайд сохранён' : 'Гайд создан');
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    notify.error(err?.data?.error || 'Ошибка сохранения');
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  if (!confirm('Удалить гайд?')) return;
  try {
    await $api(`/admin/guides/${id}`, { method: 'DELETE' });
    await load();
    notify.success('Гайд удалён');
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    notify.error(err?.data?.error || 'Ошибка удаления');
  }
}

function togglePublished(item: GuideDetail) {
  $api(`/admin/guides/${item.id}`, { method: 'PUT', body: { published: !item.published } })
    .then(() => {
      item.published = !item.published;
      notify.success(item.published ? 'Гайд опубликован' : 'Гайд снят с публикации');
    })
    .catch(() => notify.error('Ошибка'));
}

// AI generation
function openAiModal() {
  aiTopic.value = '';
  showAiModal.value = true;
}

async function generateWithAi() {
  if (!aiTopic.value.trim()) return;
  aiGenerating.value = true;
  try {
    const result = await $api<GuideDetail>('/admin/guides/generate', {
      method: 'POST',
      body: { topic: aiTopic.value, language: 'ru' },
    });
    showAiModal.value = false;
    editing.value = result;
    form.value = {
      slug: result.slug,
      title: result.title,
      content: result.content,
      excerpt: result.excerpt || '',
      imageUrl: result.imageUrl || '',
      category: result.category,
      tags: result.tags || '',
      published: result.published,
      metaTitle: result.metaTitle || '',
      metaDescription: result.metaDescription || '',
    };
    showEditor.value = true;
    notify.success('Черновик сгенерирован. Отредактируйте перед публикацией.');
  } catch (e: unknown) {
    const err = e as { data?: { error?: string; details?: string; raw?: string }; message?: string };
    const msg = err?.data?.error || err?.data?.details || err?.data?.raw || 'Ошибка генерации';
    notify.error(msg.slice(0, 300));
  } finally {
    aiGenerating.value = false;
  }
}

async function generateSeo() {
  if (!editing.value) return;
  seoGenerating.value = true;
  try {
    const result = await $api<GuideDetail>(`/admin/guides/${editing.value.id}/generate-seo`, {
      method: 'POST',
    });
    editing.value = result;
    form.value.metaTitle = result.metaTitle || '';
    form.value.metaDescription = result.metaDescription || '';
    notify.success('SEO-метаданные сгенерированы');
  } catch (e: unknown) {
    const err = e as { data?: { error?: string; details?: string; raw?: string }; message?: string };
    const msg = err?.data?.error || err?.data?.details || err?.data?.raw || 'Ошибка генерации SEO';
    notify.error(msg.slice(0, 300));
  } finally {
    seoGenerating.value = false;
  }
}

onMounted(load);

const CATEGORIES = ['setup', 'payment', 'minecraft', 'marketing', 'general'];
const CATEGORY_LABELS: Record<string, string> = {
  setup: 'Настройка',
  payment: 'Платёжные системы',
  minecraft: 'Minecraft',
  marketing: 'Продвижение',
  general: 'Общее',
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9а-яё]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 100);
}

watch(() => form.value.title, (val) => {
  if (!editing.value && !form.value.slug) {
    form.value.slug = slugify(val);
  }
});
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Гайды</h1>
      <div class="flex items-center gap-3">
        <button
          @click="openAiModal"
          class="bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          🤖 Сгенерировать AI
        </button>
        <button
          @click="openCreate"
          class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          + Создать
        </button>
      </div>
    </div>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <!-- Empty -->
    <div v-if="!loading && items.length === 0" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
      <p class="text-slate-500 dark:text-slate-400 text-sm">Гайдов пока нет</p>
    </div>

    <!-- Table -->
    <div v-if="!loading && items.length > 0" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th class="text-left py-3 px-4 font-semibold">Заголовок</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Категория</th>
              <th class="text-left py-3 px-4 font-semibold hidden md:table-cell">Дата</th>
              <th class="text-center py-3 px-4 font-semibold hidden md:table-cell">Статус</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <td class="py-3.5 px-4 text-slate-900 dark:text-white font-medium max-w-xs truncate">{{ item.title }}</td>
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                {{ CATEGORY_LABELS[item.category] || item.category }}
              </td>
              <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell tabular-nums">
                {{ fmtDate(item.createdAt) }}
              </td>
              <td class="py-3.5 px-4 text-center hidden md:table-cell">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-semibold"
                  :class="item.published ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-150 dark:border-amber-900'"
                >
                  {{ item.published ? 'Опубликован' : 'Черновик' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openEdit(item)" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-semibold">Ред.</button>
                  <button @click="togglePublished(item)" class="text-xs font-semibold" :class="item.published ? 'text-amber-600 hover:text-amber-500' : 'text-emerald-600 hover:text-emerald-500'">
                    {{ item.published ? 'Снять' : 'Опубл.' }}
                  </button>
                  <button @click="remove(item.id)" class="text-red-500 hover:text-red-400 text-xs font-semibold">Удал.</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Editor modal -->
    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" @click.self="closeEditor">
        <div class="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="p-6 sm:p-8 space-y-5">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ editing ? 'Редактировать гайд' : 'Новый гайд' }}</h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Заголовок</label>
                <input v-model="form.title" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Slug</label>
                <input v-model="form.slug" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Категория</label>
                <select v-model="form.category" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                  <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ CATEGORY_LABELS[cat] }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Теги (через запятую)</label>
                <input v-model="form.tags" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Краткое описание (excerpt)</label>
              <input v-model="form.excerpt" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Содержание (HTML)</label>
              <textarea v-model="form.content" rows="14" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"></textarea>
            </div>

            <details class="border border-slate-200 dark:border-slate-700 rounded-lg">
              <summary class="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg">SEO-настройки</summary>
              <div class="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Meta Title</label>
                  <div class="flex gap-2">
                    <input v-model="form.metaTitle" class="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                    <button
                      v-if="editing"
                      @click="generateSeo"
                      :disabled="seoGenerating"
                      class="shrink-0 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                      {{ seoGenerating ? '...' : 'AI' }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Meta Description</label>
                  <textarea v-model="form.metaDescription" rows="3" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">URL изображения</label>
                  <input v-model="form.imageUrl" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
                </div>
              </div>
            </details>

            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="form.published" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span class="text-sm text-slate-700 dark:text-slate-300">Опубликовать</span>
              </label>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button @click="closeEditor" class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                Отмена
              </button>
              <button
                @click="save"
                :disabled="saving || !form.title || !form.content || !form.slug"
                class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {{ saving ? 'Сохранение...' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- AI generate modal -->
    <Teleport to="body">
      <div v-if="showAiModal" class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm" @click.self="showAiModal = false">
        <div class="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-1">🤖 Сгенерировать гайд через AI</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Напишите тему — AI создаст черновик статьи. Вы сможете отредактировать перед публикацией.</p>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Тема гайда</label>
              <input
                v-model="aiTopic"
                placeholder="Например: Как подключить ЮKassa к магазину донатов"
                class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                @keyup.enter="generateWithAi"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6">
            <button @click="showAiModal = false" class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
              Отмена
            </button>
            <button
              @click="generateWithAi"
              :disabled="aiGenerating || !aiTopic.trim()"
              class="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {{ aiGenerating ? 'Генерация...' : 'Сгенерировать' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

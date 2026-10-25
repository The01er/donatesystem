<script setup lang="ts">
import type { Server, ServerLegalDoc } from '~/types';
useHead({ title: 'Юридические документы' });

const route = useRoute();
const serverId = route.params.id as string;
const server = inject('currentServer') as Ref<Server | null>;
const $api = useApi();

const docs = ref<ServerLegalDoc[]>([]);
const loading = ref(true);
const loadError = ref('');

const editing = ref<{ slug: string; title: string; content: string } | null>(null);
const editingTitle = ref('');
const editingContent = ref('');
const saving = ref(false);
const saveError = ref('');
const saveSuccess = ref(false);

const regenerating = ref(false);

const DOC_LABELS: Record<string, string> = {
  'store-offer': 'Оферта',
  'store-privacy': 'Политика конфиденциальности',
  'store-terms': 'Правила покупки',
};

async function loadDocs() {
  loading.value = true;
  loadError.value = '';
  try {
    docs.value = await $api<ServerLegalDoc[]>(`/servers/${serverId}/legal`);
  } catch {
    loadError.value = 'Ошибка загрузки документов';
  } finally {
    loading.value = false;
  }
}

async function editDoc(slug: string) {
  saveError.value = '';
  saveSuccess.value = false;
  try {
    const doc = await $api<{ title: string; content: string }>(`/servers/${serverId}/legal/${slug}`);
    editing.value = { slug, title: doc.title, content: doc.content };
    editingTitle.value = doc.title;
    editingContent.value = doc.content;
  } catch {
    saveError.value = 'Ошибка загрузки документа';
  }
}

async function saveDoc() {
  if (!editing.value) return;
  saving.value = true;
  saveError.value = '';
  saveSuccess.value = false;
  try {
    await $api(`/servers/${serverId}/legal/${editing.value.slug}`, {
      method: 'PUT',
      body: { title: editingTitle.value, content: editingContent.value },
    });
    saveSuccess.value = true;
    editing.value = null;
    await loadDocs();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string } };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function regenerate() {
  regenerating.value = true;
  try {
    await $api(`/servers/${serverId}/legal/regenerate`, { method: 'POST' });
    await loadDocs();
  } catch {
    loadError.value = 'Ошибка перегенерации';
  } finally {
    regenerating.value = false;
  }
}

onMounted(loadDocs);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Юридические документы магазина
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Документы доступны покупателям в футере витрины. Данные продавца подставляются из
          <NuxtLink to="/profile/seller-info" class="text-indigo-600 dark:text-indigo-400 underline"
            >реквизитов</NuxtLink
          >.
        </p>
      </div>
      <button
        @click="regenerate"
        :disabled="regenerating"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition disabled:opacity-50"
      >
        {{ regenerating ? 'Генерация...' : 'Сбросить к шаблону' }}
      </button>
    </div>

    <p v-if="loadError" class="text-red-500 text-sm">{{ loadError }}</p>
    <p v-if="loading" class="text-sm text-slate-500">Загрузка...</p>

    <div v-else class="space-y-3">
      <div
        v-for="doc in docs"
        :key="doc.slug"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex items-center justify-between"
      >
        <div>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">{{ DOC_LABELS[doc.slug] || doc.title }}</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {{
              doc.exists
                ? 'Изменён ' + new Date(doc.updatedAt!).toLocaleDateString('ru-RU')
                : 'Не создан (будет создан при первом просмотре)'
            }}
          </p>
        </div>
        <button
          @click="editDoc(doc.slug)"
          class="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
        >
          Редактировать
        </button>
      </div>
    </div>

    <!-- Edit modal -->
    <div
      v-if="editing"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="editing = null"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Редактировать: {{ DOC_LABELS[editing.slug] }}
          </h3>
          <button
            @click="editing = null"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Название</label
            >
            <input
              v-model="editingTitle"
              maxlength="200"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Содержание (HTML)</label
            >
            <textarea
              v-model="editingContent"
              rows="20"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition resize-y"
            />
          </div>
          <p v-if="saveError" class="text-red-500 text-sm">{{ saveError }}</p>
          <p v-if="saveSuccess" class="text-emerald-500 text-sm">Сохранено</p>
        </div>
        <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            @click="editing = null"
            class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Отмена
          </button>
          <button
            @click="saveDoc"
            :disabled="saving"
            class="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition disabled:opacity-50"
          >
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

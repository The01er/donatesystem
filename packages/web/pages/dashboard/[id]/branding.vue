<template>
  <div class="space-y-8">
    <!-- Logo section -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Логотип</h3>

      <div class="flex items-start gap-6 mb-4">
        <div
          class="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-600"
        >
          <img v-if="logoPreview" :src="logoPreview" alt="Logo" loading="lazy" class="w-full h-full object-contain" />
          <span v-else class="text-2xl font-bold text-slate-400 dark:text-slate-500">{{
            server?.name?.charAt(0) || '?'
          }}</span>
        </div>
        <div class="flex-1 space-y-3">
          <div class="flex items-center gap-2">
            <button
              @click="logoMode = logoMode === 'file' ? 'url' : 'file'"
              class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {{ logoMode === 'file' ? 'Ввести ссылку' : 'Загрузить файл' }}
            </button>
          </div>

          <div v-if="logoMode === 'file'">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="onLogoFile" />
              <div
                class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:border-indigo-500 transition"
              >
                Выбрать файл
              </div>
              <span class="text-xs text-slate-400">{{ logoFileName || 'PNG, JPG, WebP до 2MB' }}</span>
            </label>
          </div>

          <div v-else>
            <input
              v-model="logoUrlInput"
              placeholder="https://example.com/logo.png"
              maxlength="500"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              @change="applyLogoUrl"
            />
          </div>

          <div v-if="server?.logoUrl" class="flex gap-2">
            <button
              @click="removeLogo"
              :disabled="saving"
              class="text-xs font-semibold text-red-500 hover:text-red-400 transition"
            >
              Удалить логотип
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cover section -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Обложка</h3>

      <div class="mb-4">
        <div
          class="w-full h-40 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600"
        >
          <img v-if="coverPreview" :src="coverPreview" alt="Cover" loading="lazy" class="w-full h-full object-cover" />
          <div v-else class="text-center text-slate-400 dark:text-slate-500">
            <svg class="mx-auto h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span class="text-xs">Нет обложки</span>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <button
            @click="coverMode = coverMode === 'file' ? 'url' : 'file'"
            class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {{ coverMode === 'file' ? 'Ввести ссылку' : 'Загрузить файл' }}
          </button>
        </div>

        <div v-if="coverMode === 'file'">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="onCoverFile" />
            <div
              class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:border-indigo-500 transition"
            >
              Выбрать файл
            </div>
            <span class="text-xs text-slate-400">{{ coverFileName || 'PNG, JPG, WebP до 5MB' }}</span>
          </label>
        </div>

        <div v-else>
          <input
            v-model="coverUrlInput"
            placeholder="https://example.com/cover.png"
            maxlength="500"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            @change="applyCoverUrl"
          />
        </div>

        <div v-if="server?.coverUrl" class="flex gap-2">
          <button
            @click="removeCover"
            :disabled="saving"
            class="text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            Удалить обложку
          </button>
        </div>
      </div>
    </div>

    <!-- Color scheme -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Цветовая схема
      </h3>

      <div class="flex flex-wrap gap-3">
        <button
          v-for="c in colorOptions"
          :key="c.value"
          @click="
            selectedColor = c.value;
            saveColor();
          "
          class="w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center"
          :class="[
            c.value === selectedColor
              ? 'border-indigo-600 dark:border-indigo-400 scale-110'
              : 'border-transparent hover:scale-105',
          ]"
          :style="{ backgroundColor: c.hex }"
        >
          <svg
            v-if="c.value === selectedColor"
            class="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <span class="text-sm text-slate-500 dark:text-slate-400 self-center ml-1">{{ currentColorLabel }}</span>
      </div>
    </div>

    <!-- Template selector -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Шаблон витрины
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Выберите оформление для вашего магазина. Доступные шаблоны зависят от типа игры.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          v-for="t in availableTemplates"
          :key="t.slug"
          @click="templateSlug = t.slug"
          class="relative text-left p-4 rounded-xl border-2 transition-all duration-200"
          :class="
            templateSlug === t.slug
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          "
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white">{{ t.name }}</h4>
            <div
              class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="templateSlug === t.slug ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600'"
            >
              <div v-if="templateSlug === t.slug" class="w-2 h-2 rounded-full bg-indigo-500" />
            </div>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{{ t.description }}</p>
        </button>
      </div>
      <p v-if="templateSaving" class="text-xs text-indigo-500 mt-3">
        Сохранение...
      </p>
    </div>

    <!-- Виджеты витрины -->
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Виджеты
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Включите или отключите блоки на витрине
      </p>
      <div class="space-y-4">
        <label class="flex items-center justify-between cursor-pointer">
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">🏆 Топ донатеров</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Показывать список лучших донатеров на витрине</p>
          </div>
          <button
            @click="toggleWidget('showTopDonators')"
            class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4"
            :class="server?.showTopDonators !== false ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'"
          >
            <div
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="server?.showTopDonators !== false ? 'translate-x-5' : ''"
            />
          </button>
        </label>
        <label class="flex items-center justify-between cursor-pointer">
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">🔥 Последние покупки</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Показывать последние покупки на витрине</p>
          </div>
          <button
            @click="toggleWidget('showRecentPurchases')"
            class="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4"
            :class="server?.showRecentPurchases !== false ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'"
          >
            <div
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="server?.showRecentPurchases !== false ? 'translate-x-5' : ''"
            />
          </button>
        </label>
      </div>
      <p v-if="widgetSaving" class="text-xs text-indigo-500 mt-3">Сохранение...</p>
    </div>

    <p v-if="saveMessage" class="text-sm font-medium" :class="saveError ? 'text-red-500' : 'text-emerald-500'">
      {{ saveMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Server } from '~/types';
import { getTemplatesForGame } from '~/utils/shop-templates';
import { GAME_TYPES } from '~/utils/constants';
const route = useRoute();
const serverId = route.params.id as string;
const server = inject<Ref<Server | null>>('currentServer');
const api = useApi();

const logoMode = ref<'file' | 'url'>('file');
const coverMode = ref<'file' | 'url'>('file');
const logoUrlInput = ref('');
const coverUrlInput = ref('');
const logoFileName = ref('');
const coverFileName = ref('');
const logoPreview = ref<string | null>(null);
const coverPreview = ref<string | null>(null);
const saving = ref(false);
const saveMessage = ref('');
const saveError = ref(false);
const selectedColor = ref('indigo');
const templateSlug = ref('classic');
const templateSaving = ref(false);
const widgetSaving = ref(false);
const serverGameType = ref<string>(GAME_TYPES[0].value);
let templateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const availableTemplates = computed(() => getTemplatesForGame(serverGameType.value));

const colorOptions: { value: string; label: string; hex: string }[] = [
  { value: 'indigo', label: 'Индиго', hex: '#6366f1' },
  { value: 'blue', label: 'Синий', hex: '#3b82f6' },
  { value: 'green', label: 'Зелёный', hex: '#22c55e' },
  { value: 'red', label: 'Красный', hex: '#ef4444' },
  { value: 'purple', label: 'Фиолетовый', hex: '#a855f7' },
  { value: 'amber', label: 'Янтарный', hex: '#f59e0b' },
];

const currentColorLabel = computed(() => colorOptions.find((c) => c.value === selectedColor.value)?.label || '');

watch(
  () => server?.value,
  (s) => {
    if (!s) return;
    selectedColor.value = s.primaryColor || 'indigo';
    logoUrlInput.value = s.logoUrl || '';
    coverUrlInput.value = s.coverUrl || '';
    if (s.logoUrl) logoPreview.value = s.logoUrl;
    if (s.coverUrl) coverPreview.value = s.coverUrl;
    serverGameType.value = s.gameType || GAME_TYPES[0].value;
    templateSlug.value = s.template || 'classic';
  },
  { immediate: true },
);

async function toggleWidget(field: 'showTopDonators' | 'showRecentPurchases') {
  if (!server?.value) return;
  const newValue = server.value[field] === false ? true : false;
  widgetSaving.value = true;
  try {
    await api(`/servers/${serverId}`, {
      method: 'PATCH',
      body: { [field]: newValue },
    });
    (server.value as unknown as Record<string, unknown>)[field] = newValue;
  } catch {
    // ignore
  } finally {
    widgetSaving.value = false;
  }
}

async function uploadFile(file: File, type: 'logo' | 'cover'): Promise<string | null> {
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api<{ url: string }>(`/servers/${serverId}/upload-${type}`, {
      method: 'POST',
      body: formData,
    });
    return res.url;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveMessage.value = err?.data?.error || 'Ошибка загрузки';
    saveError.value = true;
    return null;
  } finally {
    saving.value = false;
  }
}

async function onLogoFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  logoFileName.value = file.name;
  logoPreview.value = URL.createObjectURL(file);
  const url = await uploadFile(file, 'logo');
  if (url && server?.value) {
    server.value.logoUrl = url;
    saveMessage.value = 'Логотип обновлён';
    saveError.value = false;
  }
}

async function onCoverFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  coverFileName.value = file.name;
  coverPreview.value = URL.createObjectURL(file);
  const url = await uploadFile(file, 'cover');
  if (url && server?.value) {
    server.value.coverUrl = url;
    saveMessage.value = 'Обложка обновлена';
    saveError.value = false;
  }
}

async function applyLogoUrl() {
  if (!server?.value) return;
  const url = logoUrlInput.value.trim();
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    await api(`/servers/${serverId}`, {
      method: 'PATCH',
      body: { logoUrl: url || null },
    });
    server.value.logoUrl = url || null;
    logoPreview.value = url || null;
    saveMessage.value = url ? 'Логотип обновлён' : 'Логотип удалён';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveMessage.value = err?.data?.error || 'Ошибка сохранения';
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

async function applyCoverUrl() {
  if (!server?.value) return;
  const url = coverUrlInput.value.trim();
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    await api(`/servers/${serverId}`, {
      method: 'PATCH',
      body: { coverUrl: url || null },
    });
    server.value.coverUrl = url || null;
    coverPreview.value = url || null;
    saveMessage.value = url ? 'Обложка обновлена' : 'Обложка удалена';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveMessage.value = err?.data?.error || 'Ошибка сохранения';
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

async function removeLogo() {
  if (!server?.value) return;
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    await api(`/servers/${serverId}/logo`, { method: 'DELETE' });
    server.value.logoUrl = null;
    logoPreview.value = null;
    logoUrlInput.value = '';
    saveMessage.value = 'Логотип удалён';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveMessage.value = err?.data?.error || 'Ошибка удаления';
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

async function removeCover() {
  if (!server?.value) return;
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    await api(`/servers/${serverId}/cover`, { method: 'DELETE' });
    server.value.coverUrl = null;
    coverPreview.value = null;
    coverUrlInput.value = '';
    saveMessage.value = 'Обложка удалена';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveMessage.value = err?.data?.error || 'Ошибка удаления';
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

async function saveColor() {
  if (!server?.value) return;
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    await api(`/servers/${serverId}`, {
      method: 'PATCH',
      body: { primaryColor: selectedColor.value },
    });
    server.value.primaryColor = selectedColor.value;
    saveMessage.value = 'Цвет сохранён';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    saveMessage.value = err?.data?.error || 'Ошибка сохранения';
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

function saveTemplate() {
  if (templateDebounceTimer) clearTimeout(templateDebounceTimer);
  templateDebounceTimer = setTimeout(async () => {
    if (!server?.value) return;
    templateSaving.value = true;
    try {
      await api(`/servers/${serverId}`, {
        method: 'PATCH',
        body: { template: templateSlug.value },
      });
      saveMessage.value = 'Шаблон сохранён';
      saveError.value = false;
    } catch (e: unknown) {
      const err = e as { data?: { error?: string }; message?: string };
      saveMessage.value = err?.data?.error || 'Ошибка сохранения шаблона';
      saveError.value = true;
    } finally {
      templateSaving.value = false;
    }
  }, 400);
}

watch(templateSlug, () => {
  saveTemplate();
});

definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Оформление' });
</script>

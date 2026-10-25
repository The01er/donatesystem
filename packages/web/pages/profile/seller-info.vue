<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Реквизиты продавца' });

const $api = useApi();

const legalStatus = ref<'individual' | 'self_employed' | 'entrepreneur' | ''>('');
const legalName = ref('');
const inn = ref('');
const legalAddress = ref('');
const saving = ref(false);
const loading = ref(true);
const loadError = ref('');
const saveError = ref('');
const saveSuccess = ref(false);

const STATUS_OPTIONS = [
  { value: '', label: 'Не выбран' },
  { value: 'individual', label: 'Физическое лицо' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'entrepreneur', label: 'Индивидуальный предприниматель' },
];

onMounted(async () => {
  try {
    const profile = await $api<any>('/auth/me');
    legalStatus.value = profile.legalStatus || '';
    legalName.value = profile.legalName || '';
    inn.value = profile.inn || '';
    legalAddress.value = profile.legalAddress || '';
  } catch {
    loadError.value = 'Ошибка загрузки данных';
  } finally {
    loading.value = false;
  }
});

async function save() {
  saveError.value = '';
  saveSuccess.value = false;
  saving.value = true;
  try {
    const body: Record<string, string> = {};
    if (legalStatus.value) body.legalStatus = legalStatus.value;
    if (legalName.value) body.legalName = legalName.value;
    if (inn.value) body.inn = inn.value;
    if (legalAddress.value) body.legalAddress = legalAddress.value;
    await $api('/auth/seller-info', { method: 'PUT', body });
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (e: unknown) {
    const err = e as { data?: { error?: string } };
    saveError.value = err?.data?.error || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-10 space-y-6">
    <!-- Header with status badge -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Реквизиты продавца</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Эти данные подставляются в юридические документы ваших магазинов
        </p>
      </div>
      <div
        v-if="legalStatus"
        class="hidden sm:block px-3 py-1.5 rounded-lg text-xs font-semibold"
        :class="{
          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300': legalStatus === 'individual',
          'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400': legalStatus === 'self_employed',
          'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400': legalStatus === 'entrepreneur',
        }"
      >
        {{ STATUS_OPTIONS.find((o) => o.value === legalStatus)?.label }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <svg class="animate-spin h-8 w-8 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p class="text-sm text-slate-400 mt-3">Загрузка реквизитов...</p>
    </div>

    <!-- Error -->
    <p
      v-else-if="loadError"
      class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4"
    >
      {{ loadError }}
    </p>

    <!-- Form -->
    <form v-else @submit.prevent="save" class="space-y-6">
      <!-- Status card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Статус</h2>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            type="button"
            @click="legalStatus = opt.value as typeof legalStatus"
            class="px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200"
            :class="
              legalStatus === opt.value
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600'
            "
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Details card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
            />
          </svg>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Данные</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >ФИО / Наименование</label
            >
            <input
              v-model="legalName"
              placeholder="Иванов Иван Иванович"
              maxlength="200"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >ИНН</label
            >
            <input
              v-model="inn"
              placeholder="1234567890"
              maxlength="12"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-mono tracking-wider"
            />
            <p class="text-xs text-slate-400 mt-1">10 цифр для ИП, 12 цифр для физического лица</p>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Адрес регистрации</label
            >
            <input
              v-model="legalAddress"
              placeholder="г. Москва, ул. Примерная, д. 1"
              maxlength="500"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div
        v-if="saveError"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4 flex items-start gap-3"
      >
        <svg class="h-5 w-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p class="text-sm text-red-700 dark:text-red-300">{{ saveError }}</p>
      </div>

      <div
        v-if="saveSuccess"
        class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-4 flex items-start gap-3"
      >
        <svg class="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Реквизиты сохранены</p>
          <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            Данные обновлены в документах ваших магазинов
          </p>
        </div>
      </div>

      <!-- Save button -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <NuxtLink
          to="/profile"
          class="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition px-4 py-2"
        >
          Отмена
        </NuxtLink>
        <button
          type="submit"
          :disabled="saving"
          class="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <svg v-if="saving" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ saving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </div>
</template>

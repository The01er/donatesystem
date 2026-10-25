<template>
  <div class="space-y-8">
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Адрес витрины
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Ваша витрина доступна по адресу <strong class="text-indigo-600 dark:text-indigo-400">{{ shopUrl }}</strong>.
      </p>
      <div class="flex items-center gap-2 mb-3">
        <input
          v-model="slug"
          placeholder="myserver"
          class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          pattern="[a-z0-9-]+"
          minlength="3"
          maxlength="30"
        />
        <span class="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">.{{ PLATFORM_DOMAIN }}</span>
      </div>
      <p class="text-xs text-amber-600 dark:text-amber-400 mb-3">Внимание: старый адрес перестанет работать.</p>
      <button
        @click="saveSlug"
        :disabled="slugSaving || slug === originalSlug"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ slugSaving ? 'Сохранение...' : 'Изменить' }}
      </button>
      <p v-if="slugError" class="text-red-500 text-xs mt-2">{{ slugError }}</p>
      <p v-if="slugSuccess" class="text-emerald-500 text-xs mt-2">{{ slugSuccess }}</p>
    </div>

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Собственный домен
      </h3>

      <div class="mb-5 space-y-3">
        <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
          :class="domainType === 'sub' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'"
        >
          <input type="radio" v-model="domainType" value="sub" class="accent-indigo-600" />
          <div>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Поддомен</span>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">shop.example.com</p>
          </div>
        </label>
        <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
          :class="domainType === 'root' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'"
        >
          <input type="radio" v-model="domainType" value="root" class="accent-indigo-600" />
          <div>
            <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Корневой домен</span>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">example.com</p>
          </div>
        </label>
      </div>

      <div class="mb-5 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
        <p class="font-semibold text-slate-700 dark:text-slate-300">Инструкция для DNS-провайдера:</p>
        <template v-if="domainType === 'sub'">
          <p>Создайте CNAME-запись:</p>
          <code class="block bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded text-indigo-600 dark:text-indigo-400 text-xs font-mono mt-1 mb-1 break-all select-all">
            {{ domainDisplay }} &rarr; {{ PLATFORM_DOMAIN }}
          </code>
        </template>
        <template v-else>
          <p>Создайте A-запись:</p>
          <code class="block bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded text-indigo-600 dark:text-indigo-400 text-xs font-mono mt-1 mb-1 break-all select-all">
            {{ domainDisplay }} &rarr; 203.0.113.10
          </code>
        </template>
        <p class="text-amber-600 dark:text-amber-400 font-medium">После настройки DNS может потребоваться до 24 часов для распространения.</p>
      </div>

      <div class="mb-4">
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Ваш домен
        </label>
        <div class="flex gap-2">
          <input
            v-model="domain"
            :placeholder="domainType === 'sub' ? 'shop.example.com' : 'example.com'"
            class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <button
            @click="saveDomain"
            :disabled="saving || !domainValid"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </div>
        <p v-if="domainError" class="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{{ domainError }}</p>
        <p v-if="domainSuccess" class="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-medium">{{ domainSuccess }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Server } from '~/types';
import { PLATFORM_DOMAIN } from '~/utils/constants';
useHead({ title: 'Домен' });

const route = useRoute();
const currentServer = inject<Ref<Server | null>>('currentServer', ref(null));

const api = useApi();

const cnameTarget = ref('');

const domainType = ref<'sub' | 'root'>('sub');
const domain = ref('');
const saving = ref(false);
const domainError = ref('');
const domainSuccess = ref('');
const originalDomain = ref('');

const slug = ref('');
const originalSlug = ref('');
const slugSaving = ref(false);
const slugError = ref('');
const slugSuccess = ref('');
const shopUrl = ref('');

const domainDisplay = computed(() => domain.value || (domainType.value === 'sub' ? 'shop.example.com' : 'example.com'));

const domainValid = computed(() => {
  if (!domain.value) return true;
  return domain.value.includes('.') && domain.value.length >= 4;
});

async function saveSlug() {
  slugSaving.value = true;
  slugError.value = '';
  slugSuccess.value = '';
  try {
    const res = await api<{ slug: string; shopUrl?: string }>(`/servers/${route.params.id}`, {
      method: 'PATCH',
      body: { slug: slug.value },
    });
    originalSlug.value = res.slug;
    slug.value = res.slug;
    shopUrl.value = res.shopUrl || `https://${res.slug}.${PLATFORM_DOMAIN}`;
    slugSuccess.value = 'Адрес витрины изменён. Обновите DNS-записи при необходимости.';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    slugError.value = err?.data?.error || 'Ошибка сохранения адреса';
  } finally {
    slugSaving.value = false;
  }
}

async function saveDomain() {
  domainError.value = '';
  domainSuccess.value = '';
  saving.value = true;
  try {
    const body: Record<string, unknown> = { customDomain: domain.value || null };
    await api(`/servers/${route.params.id}`, {
      method: 'PATCH',
      body,
    });
    originalDomain.value = domain.value;
    domainSuccess.value = 'Домен сохранён. Настройте DNS-записи по инструкции выше.';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    domainError.value = err?.data?.error || 'Ошибка сохранения домена';
  } finally {
    saving.value = false;
  }
}

async function loadServer() {
  try {
    const data = await api<{
      customDomain?: string | null;
      slug: string;
      shopUrl?: string;
      cnameTarget?: string;
    }>(`/servers/${route.params.id}`);
    domain.value = data.customDomain || '';
    originalDomain.value = data.customDomain || '';
    slug.value = data.slug;
    originalSlug.value = data.slug;
    shopUrl.value = data.shopUrl || `https://${data.slug}.${PLATFORM_DOMAIN}`;
    if (data.cnameTarget) cnameTarget.value = data.cnameTarget;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    slugError.value = err?.data?.error || 'Ошибка загрузки данных сервера';
  }
}

onMounted(loadServer);
</script>

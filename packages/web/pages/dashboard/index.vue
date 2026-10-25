<template>
  <div class="max-w-4xl mx-auto px-6 py-10">
    <OnboardingWizard v-if="showWizard" @skip="showWizard = false" @complete="onComplete" />

    <div v-else>
      <div class="flex items-center justify-between mb-8">
        <h1 data-testid="dashboard-title" class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Мои серверы</h1>
        <button
          data-testid="btn-create-server"
          @click="showCreate = true"
          class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          + Создать магазин
        </button>
      </div>

      <CreateServerModal :visible="showCreate" @created="onCreated" @close="showCreate = false" />

      <!-- Server list -->
      <div
        v-if="servers.length === 0"
        class="text-center py-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm"
      >
        <svg
          class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <h3 class="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Серверы отсутствуют</h3>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Создайте ваш первый игровой сервер, чтобы начать продажи.
        </p>
        <div class="mt-6">
          <button
            @click="showCreate = true"
            class="inline-flex items-center bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 text-sm shadow-sm transition"
          >
            Создать первый магазин
          </button>
        </div>
      </div>

      <div v-else class="grid gap-4">
        <NuxtLink
          v-for="s in servers"
          :key="s.id"
          :to="`/dashboard/${s.id}`"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md flex items-center justify-between group"
        >
          <div>
            <div
              class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
            >
              {{ s.name }}
            </div>
            <div class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span
                class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs uppercase font-medium"
                >{{ s.gameType }}</span
              >
              <span>&middot;</span>
              <span class="font-mono text-xs">{{ s.ipAddress }}</span>
            </div>
            <div class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-2">
              {{ s.shopUrl || `https://${s.slug}.${PLATFORM_DOMAIN}` }}
            </div>
          </div>
          <span
            class="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-1"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PLATFORM_DOMAIN } from '~/utils/constants';
import type { Server } from '~/types';

definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Мои серверы' });

const $api = useApi();
const auth = useAuthStore();
const router = useRouter();

const servers = ref<Server[]>([]);
const showCreate = ref(false);
const showWizard = ref(false);
const loadError = ref('');

async function loadServers() {
  try {
    loadError.value = '';
    servers.value = await $api<Server[]>('/servers');
  } catch (e: unknown) {
    console.error(e);
    loadError.value = 'Ошибка загрузки серверов';
  }
}

function onCreated() {
  showCreate.value = false;
  loadServers();
}

function onComplete(serverId: string) {
  router.push(`/dashboard/${serverId}`);
}

onMounted(async () => {
  await loadServers();
  if (servers.value.length === 0 && auth.user && !auth.user.onboardingCompleted) {
    showWizard.value = true;
  }
});
</script>

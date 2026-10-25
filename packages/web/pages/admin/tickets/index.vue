<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Тикеты</h1>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        @click="
          activeStatus = f.value === activeStatus ? '' : f.value;
          page = 1;
        "
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition border"
        :class="
          activeStatus === f.value
            ? 'bg-red-50 text-red-650 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
        "
      >
        {{ f.label }}
      </button>
      <span class="w-px bg-slate-200 dark:bg-slate-700 mx-1" />
      <button
        v-for="f in priorityFilters"
        :key="f.value"
        @click="
          activePriority = f.value === activePriority ? '' : f.value;
          page = 1;
        "
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition border"
        :class="
          activePriority === f.value
            ? 'bg-red-50 text-red-650 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
        "
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <input
        v-model="search"
        @input="onSearchInput"
        placeholder="Поиск по теме..."
        class="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-slate-950 dark:text-white"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>
    <div v-if="loadError" class="text-center py-12 text-red-500">{{ loadError }}</div>

    <!-- Table -->
    <div
      v-else-if="tickets.length > 0"
      class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Тема</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Пользователь</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Статус</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Приоритет</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Сервер</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Сообщений</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in tickets"
            :key="ticket.id"
            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition"
            @click="navigateTo(`/admin/tickets/${ticket.id}`)"
          >
            <td class="px-4 py-3 text-slate-900 dark:text-white font-medium truncate max-w-[200px]">
              {{ ticket.subject }}
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-400">{{ ticket.user.email }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="ticketStatusClass(ticket.status)">
                {{ ticketStatusLabel(ticket.status) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="ticketPriorityClass(ticket.priority)"
              >
                {{ ticketPriorityLabel(ticket.priority) }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400">
              {{ ticket.server?.name || '—' }}
            </td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{{ ticket._count.messages }}</td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400">
              {{ fmtDate(ticket.updatedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
    >
      <p class="text-slate-500 dark:text-slate-400">Нет тикетов</p>
    </div>

    <!-- Pagination -->
    <Pagination
      v-if="pagination.pages > 1"
      :page="pagination.page"
      :pages="pagination.pages"
      class="mt-4"
      @go="
        (p: number) => {
          page = p;
          loadTickets();
        }
      "
    />
  </div>
</template>

<script setup lang="ts">
import type { AdminTicket } from '~/types/admin';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });

const $admin = useAdmin();

const tickets = ref<AdminTicket[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 });
const loading = ref(false);
const loadError = ref('');
const page = ref(1);
const activeStatus = ref('');
const activePriority = ref('');
const search = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const statusFilters = [
  { label: 'Все', value: '' },
  { label: 'Открытые', value: 'open' },
  { label: 'Отвеченные', value: 'answered' },
  { label: 'Закрытые', value: 'closed' },
];

const priorityFilters = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
];

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadTickets();
  }, 300);
}

async function loadTickets() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: page.value, limit: 20 };
    if (activeStatus.value) params.status = activeStatus.value;
    if (activePriority.value) params.priority = activePriority.value;
    if (search.value) params.search = search.value;

    const data = await $admin<{ tickets: AdminTicket[]; pagination: typeof pagination.value }>('/tickets', { params });
    tickets.value = data.tickets;
    pagination.value = data.pagination;
  } catch (e: unknown) {
    console.error(e);
    loadError.value = 'Ошибка загрузки тикетов';
  } finally {
    loading.value = false;
  }
}

watch([activeStatus, activePriority], () => {
  page.value = 1;
  loadTickets();
});

onMounted(() => {
  loadTickets();
});

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

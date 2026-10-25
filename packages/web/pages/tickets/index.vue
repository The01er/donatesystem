<template>
  <div class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Поддержка</h1>
      <button
        @click="showCreate = true"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition shadow-sm"
      >
        Создать тикет
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="f in filters"
        :key="f.value"
        @click="
          activeFilter = f.value;
          page = 1;
        "
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition border"
        :class="
          activeFilter === f.value
            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
        "
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>

    <!-- Empty -->
    <div
      v-else-if="tickets.length === 0"
      class="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
    >
      <p class="text-slate-500 dark:text-slate-400 mb-4">У вас пока нет тикетов</p>
      <button
        @click="showCreate = true"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition"
      >
        Создать первый тикет
      </button>
    </div>

    <!-- Table -->
    <div
      v-else
      class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Тема</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Статус</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Приоритет</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Сервер</th>
            <th class="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in tickets"
            :key="ticket.id"
            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition"
            @click="navigateTo(`/tickets/${ticket.id}`)"
          >
            <td class="px-4 py-3 text-slate-900 dark:text-white font-medium truncate max-w-[250px]">
              {{ ticket.subject }}
            </td>
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
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400">
              {{ fmtDate(ticket.updatedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
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

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Создать тикет</h2>
        <form @submit.prevent="createTicket" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Тема</label
            >
            <input
              v-model="form.subject"
              placeholder="Кратко опишите проблему"
              required
              minlength="5"
              maxlength="200"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-950 dark:text-white"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Сообщение</label
            >
            <textarea
              v-model="form.message"
              placeholder="Опишите проблему подробно"
              required
              minlength="10"
              rows="4"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-950 dark:text-white resize-none"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Сервер (необяз.)</label
              >
              <select
                v-model="form.serverId"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-950 dark:text-white"
              >
                <option value="">Не выбрано</option>
                <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >Приоритет</label
              >
              <select
                v-model="form.priority"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-950 dark:text-white"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="creating"
              class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition shadow-sm disabled:opacity-50"
            >
              {{ creating ? 'Создание...' : 'Создать' }}
            </button>
            <button
              type="button"
              @click="
                showCreate = false;
                createErrorMsg = '';
              "
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <div v-if="createErrorMsg" class="text-sm text-red-600 dark:text-red-400">{{ createErrorMsg }}</div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ticket, Server, Paginated } from '~/types';

definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Поддержка' });

const tickets = ref<Ticket[]>([]);
const servers = ref<Server[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 });
const loading = ref(false);
const page = ref(1);
const activeFilter = ref('');
const showCreate = ref(false);
const creating = ref(false);
const createErrorMsg = ref('');

const form = ref({
  subject: '',
  message: '',
  serverId: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
});

const filters = [
  { label: 'Все', value: '' },
  { label: 'Открытые', value: 'open' },
  { label: 'Отвеченные', value: 'answered' },
  { label: 'Закрытые', value: 'closed' },
];

async function loadTickets() {
  loading.value = true;
  const $api = useApi();
  try {
    const params: Record<string, string | number> = { page: page.value, limit: 20 };
    if (activeFilter.value) params.status = activeFilter.value;

    const data = await $api<Paginated<Ticket, 'tickets'>>('/tickets', { params });
    tickets.value = data.tickets;
    pagination.value = data.pagination;
  } catch (e: unknown) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function createTicket() {
  createErrorMsg.value = '';
  creating.value = true;
  const $api = useApi();
  try {
    await $api('/tickets', {
      method: 'POST',
      body: {
        subject: form.value.subject,
        message: form.value.message,
        serverId: form.value.serverId || undefined,
        priority: form.value.priority,
      },
    });
    showCreate.value = false;
    form.value = { subject: '', message: '', serverId: '', priority: 'medium' };
    page.value = 1;
    await loadTickets();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    createErrorMsg.value = err?.data?.error || 'Не удалось создать тикет';
  } finally {
    creating.value = false;
  }
}

onMounted(async () => {
  await loadTickets();
  try {
    const $api = useApi();
    servers.value = await $api('/servers');
  } catch {
    /* ignore */
  }
});
</script>

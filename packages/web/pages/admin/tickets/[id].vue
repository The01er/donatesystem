<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <NuxtLink
        to="/admin/tickets"
        class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        ← К списку
      </NuxtLink>
      <div class="flex items-center gap-3">
        <select
          v-model="editableStatus"
          @change="updateField('status', editableStatus)"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-red-500 text-slate-700 dark:text-slate-300"
        >
          <option value="open">Открыт</option>
          <option value="answered">Отвечен</option>
          <option value="closed">Закрыт</option>
        </select>
        <select
          v-model="editablePriority"
          @change="updateField('priority', editablePriority)"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-red-500 text-slate-700 dark:text-slate-300"
        >
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
        </select>
      </div>
    </div>

    <!-- Ticket info -->
    <div
      v-if="ticket"
      class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6"
    >
      <h1 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">{{ ticket.subject }}</h1>
      <div class="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Пользователь: {{ ticket.userId }}</span>
        <span v-if="ticket.server">Сервер: {{ ticket.server.name }}</span>
        <span>{{ fmtDate(ticket.createdAt) }}</span>
      </div>
    </div>

    <!-- Messages -->
    <div class="space-y-4 mb-6">
      <div v-if="allMessages.length === 0 && loading" class="text-center py-8 text-slate-500 dark:text-slate-400">
        Загрузка...
      </div>

      <div
        v-for="msg in allMessages"
        :key="msg.id"
        class="flex flex-col gap-1"
        :class="isOwnMessage(msg) ? 'items-end' : 'items-start'"
      >
        <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1">
          {{ senderLabel(msg) }}
        </span>
        <div
          class="max-w-[75%] rounded-2xl px-4 py-3 text-sm"
          :class="
            isOwnMessage(msg)
              ? 'bg-red-600 text-white rounded-br-md'
              : 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100 rounded-bl-md'
          "
        >
          <p class="whitespace-pre-wrap break-words">{{ msg.message }}</p>
          <p class="text-[10px] mt-1 opacity-60">{{ fmtDate(msg.createdAt) }}</p>
        </div>
      </div>

      <div v-if="allMessages.length === 0 && !loading" class="text-center py-8 text-slate-500 dark:text-slate-400">
        Нет сообщений
      </div>
    </div>

    <!-- Reply form -->
    <div
      v-if="ticket && ticket.status !== 'closed'"
      class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
    >
      <form @submit.prevent="sendMessage" class="flex gap-3">
        <input
          v-model="replyText"
          placeholder="Введите ответ..."
          required
          class="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-slate-950 dark:text-white"
        />
        <button
          type="submit"
          :disabled="sending"
          class="bg-red-650 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
        >
          {{ sending ? '...' : 'Отправить' }}
        </button>
      </form>
    </div>

    <div v-if="ticket && ticket.status === 'closed'" class="mt-4 text-center">
      <span class="text-sm text-slate-400 dark:text-slate-500">Тикет закрыт</span>
    </div>

    <div v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Ticket, TicketMessage } from '~/types';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Тикет' });

const auth = useAuthStore();
const $admin = useAdmin();
const route = useRoute();
const ticketId = route.params.id as string;

const ticket = ref<Ticket | null>(null);
const loadedMessages = ref<TicketMessage[]>([]);
const replyText = ref('');
const loading = ref(true);
const sending = ref(false);
const error = ref('');

const editableStatus = ref('');
const editablePriority = ref('');

const lastMessageId = ref<string | undefined>(undefined);

const { newMessages, markClosed } = useTicketPolling(ticketId, lastMessageId);

const allMessages = computed(() => {
  const existing = new Map(loadedMessages.value.map((m) => [m.id, m]));
  for (const msg of newMessages.value) {
    if (!existing.has(msg.id)) {
      existing.set(msg.id, msg);
    }
  }
  return Array.from(existing.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
});

function isOwnMessage(msg: TicketMessage) {
  return msg.userId === auth.user?.id;
}

function senderLabel(msg: TicketMessage) {
  if (isOwnMessage(msg)) return 'Вы';
  return msg.user?.email || 'Пользователь';
}

async function loadTicket() {
  loading.value = true;
  try {
    const data = await $fetch<{ ticket: Ticket; messages: TicketMessage[] }>(`/api/tickets/${ticketId}`, {
      credentials: 'include',
    });
    ticket.value = data.ticket;
    loadedMessages.value = data.messages;
    editableStatus.value = data.ticket.status;
    editablePriority.value = data.ticket.priority;

    if (data.messages.length > 0) {
      lastMessageId.value = data.messages[data.messages.length - 1].id;
    }
  } catch (e: unknown) {
    console.error(e);
    error.value = 'Не удалось загрузить тикет';
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  if (!replyText.value.trim()) return;
  sending.value = true;
  error.value = '';
  try {
    await $admin(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: { message: replyText.value.trim() },
    });
    replyText.value = '';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Не удалось отправить сообщение';
  } finally {
    sending.value = false;
  }
}

async function updateField(field: string, value: string) {
  try {
    const res = await $admin<Ticket>(`/tickets/${ticketId}`, {
      method: 'PATCH',
      body: { [field]: value },
    });
    if (ticket.value) {
      ticket.value = { ...ticket.value, ...res };
    }
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Не удалось обновить';
    if (ticket.value) {
      if (field === 'status') editableStatus.value = ticket.value.status;
      if (field === 'priority') editablePriority.value = ticket.value.priority;
    }
  }
}

onMounted(async () => {
  await loadTicket();
  if (ticket.value?.status === 'closed') {
    markClosed();
  }
});
</script>

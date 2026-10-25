<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <NuxtLink
        to="/tickets"
        class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        ← Назад
      </NuxtLink>
      <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="ticketStatusClass(ticket?.status || 'open')">
        {{ ticketStatusLabel(ticket?.status || 'open') }}
      </span>
    </div>

    <!-- Ticket info -->
    <div
      v-if="ticket"
      class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6"
    >
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <h1 class="text-lg font-semibold text-slate-900 dark:text-white">{{ ticket.subject }}</h1>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="ticketPriorityClass(ticket.priority)">
          {{ ticketPriorityLabel(ticket.priority) }}
        </span>
      </div>
      <div class="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
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
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100 rounded-bl-md'
          "
        >
          <p class="whitespace-pre-wrap break-words">{{ msg.message }}</p>
          <p
            class="text-[10px] mt-1 opacity-60"
            :class="isOwnMessage(msg) ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'"
          >
            {{ fmtDate(msg.createdAt) }}
          </p>
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
          placeholder="Введите сообщение..."
          required
          class="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-950 dark:text-white"
        />
        <button
          type="submit"
          :disabled="sending"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {{ sending ? '...' : 'Отправить' }}
        </button>
      </form>
    </div>

    <!-- Close button -->
    <div v-if="ticket && ticket.status !== 'closed'" class="mt-4 flex justify-end">
      <button
        @click="closeTicket"
        :disabled="closing"
        class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 py-1 disabled:opacity-50"
      >
        {{ closing ? 'Закрытие...' : 'Закрыть тикет' }}
      </button>
    </div>

    <div v-if="ticket && ticket.status === 'closed'" class="mt-4 text-center">
      <span class="text-sm text-slate-400 dark:text-slate-500">Тикет закрыт</span>
    </div>

    <!-- Error -->
    <div v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Ticket, TicketMessage } from '~/types';

definePageMeta({ layout: 'app', middleware: ['auth'] });
useHead({ title: 'Тикет' });

const auth = useAuthStore();
const route = useRoute();
const ticketId = route.params.id as string;

const ticket = ref<Ticket | null>(null);
const loadedMessages = ref<TicketMessage[]>([]);
const replyText = ref('');
const loading = ref(true);
const sending = ref(false);
const closing = ref(false);
const error = ref('');

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
  if (msg.isStaff) return 'Поддержка';
  return msg.user?.email || 'Пользователь';
}

async function loadTicket() {
  loading.value = true;
  const $api = useApi();
  try {
    const data = await $api<{ ticket: Ticket; messages: TicketMessage[] }>(`/tickets/${ticketId}`);
    ticket.value = data.ticket;
    loadedMessages.value = data.messages;
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
  const $api = useApi();
  try {
    await $api(`/tickets/${ticketId}/messages`, {
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

async function closeTicket() {
  closing.value = true;
  error.value = '';
  const $api = useApi();
  try {
    await $api(`/tickets/${ticketId}/close`, { method: 'PATCH' });
    if (ticket.value) {
      ticket.value = { ...ticket.value, status: 'closed' };
    }
    markClosed();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Не удалось закрыть тикет';
  } finally {
    closing.value = false;
  }
}

onMounted(async () => {
  await loadTicket();
  if (ticket.value?.status === 'closed') {
    markClosed();
  }
});
</script>

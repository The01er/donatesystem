import type { TicketMessage } from '~/types';

export function useTicketPolling(ticketId: string, lastMessageId: Ref<string | undefined>) {
  const newMessages = ref<TicketMessage[]>([]);
  const isPolling = ref(true);
  const closed = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function poll() {
    if (!isPolling.value || closed.value) return;

    try {
      const data = await $fetch<{
        messages: TicketMessage[];
        timeout?: boolean;
        closed?: boolean;
      }>(`/api/tickets/${ticketId}/poll`, {
        credentials: 'include',
        params: { since: lastMessageId.value },
      });

      if (data.closed) {
        closed.value = true;
        isPolling.value = false;
        return;
      }

      if (data.messages && data.messages.length > 0) {
        const existingIds = new Set(newMessages.value.map((m) => m.id));
        for (const msg of data.messages) {
          if (!existingIds.has(msg.id)) {
            newMessages.value = [...newMessages.value, msg];
          }
        }
        if (data.messages.length > 0) {
          lastMessageId.value = data.messages[data.messages.length - 1].id;
        }
      }
    } catch {
      timer = setTimeout(() => poll(), 5000);
      return;
    }

    if (isPolling.value && !closed.value) {
      timer = setTimeout(() => poll(), 2000);
    }
  }

  function start() {
    isPolling.value = true;
    closed.value = false;
    poll();
  }

  function stop() {
    isPolling.value = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function markClosed() {
    closed.value = true;
    stop();
  }

  onMounted(() => {
    start();
  });

  onUnmounted(() => {
    stop();
  });

  return { newMessages, closed, stop, markClosed };
}

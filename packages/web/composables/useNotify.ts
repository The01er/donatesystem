export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const toasts = ref<Toast[]>([]);
let counter = 0;

function nextId(): string {
  counter++;
  return `${Date.now()}-${counter}`;
}

function notify(type: ToastType, message: string, duration = 4000) {
  if (!import.meta.client) return;
  const id = nextId();
  toasts.value = [...toasts.value, { id, type, message, duration }];
  if (duration > 0) {
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, duration);
  }
}

function dismiss(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function useNotify() {
  return {
    toasts,
    success: (message: string, duration?: number) => notify('success', message, duration),
    error: (message: string, duration?: number) => notify('error', message, duration),
    warning: (message: string, duration?: number) => notify('warning', message, duration),
    info: (message: string, duration?: number) => notify('info', message, duration),
    dismiss,
  };
}

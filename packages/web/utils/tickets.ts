export function ticketStatusClass(status: string): string {
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    answered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };
  return map[status] || '';
}

export function ticketStatusLabel(status: string): string {
  const map: Record<string, string> = { open: 'Открыт', answered: 'Отвечен', closed: 'Закрыт' };
  return map[status] || status;
}

export function ticketPriorityClass(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[priority] || '';
}

export function ticketPriorityLabel(priority: string): string {
  const map: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
  return map[priority] || priority;
}

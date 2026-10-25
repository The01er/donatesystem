import type { DeliveryAttemptItem } from '~/types';

export function useOrderDetail() {
  function fmtDateTime(d: string): string {
    return new Date(d).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function timelineIcon(type: string): string {
    const map: Record<string, string> = {
      created: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400',
      success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
      error: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
      rollback_success: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
      rollback_error: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
      revoke_success: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400',
      revoke_failed: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
      current: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    };
    return map[type] || 'bg-slate-100 text-slate-500';
  }

  function timelineSvg(type: string): string {
    const svgs: Record<string, string> = {
      created:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      success:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
      error:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
      rollback_success:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a5 5 0 015 5v2m-6-7l-3-3m0 0l3-3m-3 3h12"/></svg>',
      rollback_error:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>',
      revoke_success:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      revoke_failed:
        '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>',
      current: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>',
    };
    return svgs[type] || '';
  }

  function actionIcon(type: unknown): string {
    const icons: Record<string, string> = {
      command: '⚡',
      message: '💬',
      broadcast: '📢',
      kick: '👢',
      ban: '🚫',
      unban: '🔓',
      give_item: '🎁',
      give_currency: '💰',
      set_group: '🏷',
      execute_as_console: '🖥',
      delay: '⏳',
      if_conditions: '🔀',
      roulette: '🎲',
    };
    return icons[type as string] || '📋';
  }

  function actionLabel(action: Record<string, unknown>): string {
    const labels: Record<string, string> = {
      command: 'Команда',
      message: 'Сообщение',
      broadcast: 'Объявление',
      kick: 'Кик',
      ban: 'Бан',
      unban: 'Разбан',
      give_item: 'Выдача предмета',
      give_currency: 'Выдача валюты',
      set_group: 'Установка группы',
      execute_as_console: 'Выполнить от консоли',
      delay: 'Задержка',
      if_conditions: 'Условное действие',
      roulette: 'Рулетка',
    };
    return labels[action.type as string] || (action.type as string);
  }

  function formatAction(action: Record<string, unknown>, indent = 0, playerName?: string, orderId?: string): string {
    const prefix = '  '.repeat(indent);
    const lines: string[] = [];
    const shortOrderId = orderId && orderId.length >= 8 ? orderId.slice(0, 8) : orderId || '';

    function p(val: unknown): string {
      let s = String(val ?? '—');
      if (playerName) s = s.replace(/\{player\}/g, playerName);
      if (shortOrderId) s = s.replace(/\{order_id\}/g, shortOrderId);
      return s.replace(/\{server\}/g, '');
    }

    if (action.type === 'command') {
      lines.push(`${prefix}Тип: command`);
      lines.push(`${prefix}Команда: ${p(action.value || action.command)}`);
    } else if (action.type === 'message') {
      lines.push(`${prefix}Тип: message`);
      lines.push(`${prefix}Сообщение: ${p(action.message)}`);
    } else if (action.type === 'broadcast') {
      lines.push(`${prefix}Тип: broadcast`);
      lines.push(`${prefix}Текст: ${p(action.text)}`);
    } else if (action.type === 'kick') {
      lines.push(`${prefix}Тип: kick`);
      lines.push(`${prefix}Причина: ${p(action.reason)}`);
    } else if (action.type === 'ban') {
      lines.push(`${prefix}Тип: ban`);
      lines.push(`${prefix}Причина: ${p(action.reason)}`);
    } else if (action.type === 'unban') {
      lines.push(`${prefix}Тип: unban`);
    } else if (action.type === 'give_item') {
      lines.push(`${prefix}Тип: give_item`);
      lines.push(`${prefix}Предмет: ${p(action.item)}`);
      lines.push(`${prefix}Количество: ${action.amount ?? '—'}`);
    } else if (action.type === 'give_currency') {
      lines.push(`${prefix}Тип: give_currency`);
      lines.push(`${prefix}Валюта: ${p(action.currency)}`);
      lines.push(`${prefix}Сумма: ${action.amount ?? '—'}`);
    } else if (action.type === 'set_group') {
      lines.push(`${prefix}Тип: set_group`);
      lines.push(`${prefix}Группа: ${p(action.group)}`);
    } else if (action.type === 'execute_as_console') {
      lines.push(`${prefix}Тип: execute_as_console`);
      lines.push(`${prefix}Команда: ${p(action.command)}`);
    } else if (action.type === 'delay') {
      lines.push(`${prefix}Тип: delay`);
      lines.push(`${prefix}Секунд: ${action.seconds ?? '—'}`);
    } else if (action.type === 'roulette') {
      lines.push(`${prefix}Тип: roulette`);
      const variants = action.variants as Array<{ chance: number; description?: string; command: string }> | undefined;
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          lines.push(`${prefix}  Вариант: ${p(variant.description)} (шанс ${variant.chance}%)`);
        }
      }
    } else if (action.type === 'if_conditions' || action.type === 'if') {
      lines.push(`${prefix}Тип: if_conditions`);
      lines.push(`${prefix}Условие: ${p(action.condition || JSON.stringify(action.condition))}`);
      if (action.then) {
        lines.push(`${prefix}Then:`);
        for (const a of Array.isArray(action.then) ? action.then : [action.then]) {
          lines.push(formatAction(a as Record<string, unknown>, indent + 1, playerName, orderId));
        }
      }
      if (action.else) {
        lines.push(`${prefix}Else:`);
        for (const a of Array.isArray(action.else) ? action.else : [action.else]) {
          lines.push(formatAction(a as Record<string, unknown>, indent + 1, playerName, orderId));
        }
      }
    } else {
      lines.push(`${prefix}Тип: ${action.type}`);
      lines.push(`${prefix}${JSON.stringify(action, null, 2)}`);
    }

    return lines.join('\n');
  }

  function buildTimeline(createdAt: string, status: string, deliveryAttempts: DeliveryAttemptItem[], revokeStatus?: string | null) {
    interface TimelineEvent {
      type: 'created' | 'success' | 'error' | 'rollback_success' | 'rollback_error' | 'current' | 'revoke_success' | 'revoke_failed';
      text: string;
      time: string;
      error: string | null;
    }

    const events: TimelineEvent[] = [];

    events.push({
      type: 'created',
      text: 'Заказ создан',
      time: fmtDateTime(createdAt),
      error: null,
    });

    for (const da of deliveryAttempts) {
      if (da.actionType === 'revoke_command') {
        if (da.status === 'success') {
          events.push({
            type: 'revoke_success',
            text: 'Привилегия отозвана',
            time: fmtDateTime(da.createdAt),
            error: null,
          });
        } else if (da.status === 'failed') {
          events.push({
            type: 'revoke_failed',
            text: 'Ошибка отзыва привилегии',
            time: fmtDateTime(da.createdAt),
            error: da.error || null,
          });
        }
        continue;
      }

      if (da.status === 'success') {
        events.push({
          type: 'success',
          text: `Действие №${da.actionIndex + 1} — выполнено`,
          time: fmtDateTime(da.createdAt),
          error: null,
        });
      } else if (da.status === 'failed') {
        events.push({
          type: 'error',
          text: `Действие №${da.actionIndex + 1} — ошибка`,
          time: fmtDateTime(da.createdAt),
          error: da.error || 'Неизвестная ошибка',
        });
      } else {
        events.push({
          type: 'error',
          text: `Действие №${da.actionIndex + 1} — ${da.status}`,
          time: fmtDateTime(da.createdAt),
          error: null,
        });
      }

      if (da.rollbackStatus === 'success') {
        events.push({
          type: 'rollback_success',
          text: `Откат действия №${da.actionIndex + 1} — успешно`,
          time: fmtDateTime(da.createdAt),
          error: null,
        });
      } else if (da.rollbackStatus === 'failed') {
        events.push({
          type: 'rollback_error',
          text: `Откат действия №${da.actionIndex + 1} — ошибка`,
          time: fmtDateTime(da.createdAt),
          error: null,
        });
      }
    }

    const statusLabels: Record<string, string> = {
      pending: 'Ожидает оплаты',
      paid: 'Оплачен — ожидает доставки',
      delivering: 'Доставляется',
      delivered: 'Доставлен',
      failed: 'Ошибка доставки',
      cancelled: 'Отменён',
    };

    events.push({
      type: 'current',
      text: statusLabels[status] || status,
      time: fmtDateTime(createdAt),
      error: null,
    });

    if (revokeStatus === 'pending') {
      events.push({
        type: 'current',
        text: 'Привилегия отзывается...',
        time: fmtDateTime(createdAt),
        error: null,
      });
    }

    return events;
  }

  function parseActions(committedActions: string | null | undefined) {
    if (!committedActions) return { parsed: null as Record<string, unknown>[] | null, error: false };
    try {
      return { parsed: JSON.parse(committedActions) as Record<string, unknown>[], error: false };
    } catch {
      return { parsed: null, error: true };
    }
  }

  return {
    fmtDateTime,
    timelineIcon,
    timelineSvg,
    actionIcon,
    actionLabel,
    formatAction,
    buildTimeline,
    parseActions,
  };
}

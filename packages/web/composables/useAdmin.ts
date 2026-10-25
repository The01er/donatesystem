const FIELD_LABELS: Record<string, string> = {
  defaultCommissionPct: 'Комиссия по умолчанию',
  subscriptionPrice: 'Цена подписки',
  platformDomain: 'Домен платформы',
  cnameTarget: 'CNAME таргет',
  operatingMode: 'Режим работы',
  platformName: 'ФИО / Название',
  platformInn: 'ИНН',
  platformOgrn: 'ОГРН / ОГРНИП',
  platformAddress: 'Юридический адрес',
  platformEmail: 'Email',
  platformPhone: 'Телефон',
};

function extractFieldError(response: { _data?: unknown }): string | null {
  const data = response._data as {
    fieldErrors?: Record<string, string[]>;
    error?: string | { fieldErrors?: Record<string, string[]> };
  } | null;
  if (!data) return null;

  const fieldErrors =
    data.fieldErrors ||
    (typeof data.error === 'object'
      ? (data.error as { fieldErrors?: Record<string, string[]> }).fieldErrors
      : undefined);
  if (fieldErrors) {
    const msgs = Object.entries(fieldErrors).map(([field, errors]) => {
      const label = FIELD_LABELS[field] || field;
      return `${label}: ${errors.join(', ')}`;
    });
    return msgs.join('; ');
  }

  if (typeof data.error === 'string') return data.error;
  return null;
}

export function useAdmin() {
  const auth = useAuthStore();
  const notify = useNotify();

  const $admin = $fetch.create({
    baseURL: '/api/admin',
    credentials: 'include',
    onResponseError({ response }) {
      if (response.status === 401) {
        notify.info('Сессия истекла, войдите снова');
        auth.logout();
        navigateTo('/login');
      } else if (response.status === 403) {
        notify.error('Доступ запрещён');
      } else if (response.status === 429) {
        notify.warning('Слишком много запросов. Подождите немного.');
      } else if (response.status === 400 || response.status === 422) {
        const msg = extractFieldError(response);
        if (msg) notify.error(msg);
      }
    },
  });

  return $admin;
}

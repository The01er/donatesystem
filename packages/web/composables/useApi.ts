export const useApi = () => {
  const auth = useAuthStore();
  const notify = useNotify();

  const $api = $fetch.create({
    baseURL: '/api',
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
        const data = response._data as { error?: string | { fieldErrors?: Record<string, string[]> } } | null;
        if (typeof data?.error === 'string') {
          notify.error(data.error);
        }
      }
    },
  });

  return $api;
};

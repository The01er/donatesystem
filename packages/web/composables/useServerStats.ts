import type { ServerStats, ServerViewsStats, ConversionStats, TopProduct } from '~/types';

export function useServerStats(serverId: string) {
  const $api = useApi();
  const stats = ref<ServerStats | null>(null);
  const viewsStats = ref<ServerViewsStats | null>(null);
  const conversion = ref<ConversionStats | null>(null);
  const topProducts = ref<TopProduct[]>([]);
  const loading = ref(false);
  const period = ref('7d');

  async function loadStats() {
    loading.value = true;
    try {
      stats.value = await $api<ServerStats>(`/servers/${serverId}/stats?period=${period.value}`);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function loadViewsStats() {
    try {
      viewsStats.value = await $api<ServerViewsStats>(`/servers/${serverId}/stats/views?period=${period.value}`);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function loadConversion() {
    try {
      conversion.value = await $api<ConversionStats>(`/servers/${serverId}/stats/conversion?period=${period.value}`);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function loadTopProducts() {
    try {
      topProducts.value = await $api<TopProduct[]>(`/servers/${serverId}/stats/top-products?period=${period.value}`);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function loadAll() {
    await Promise.all([loadStats(), loadViewsStats(), loadConversion(), loadTopProducts()]);
  }

  return { stats, viewsStats, conversion, topProducts, loading, period, loadStats, loadViewsStats, loadConversion, loadTopProducts, loadAll };
}

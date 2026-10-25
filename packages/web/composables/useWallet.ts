import type { WalletData, Transaction, WithdrawalRequest, Paginated } from '~/types';

export function useWallet(serverId: string) {
  const $api = useApi();
  const wallet = ref<WalletData | null>(null);
  const transactions = ref<Transaction[]>([]);
  const withdrawals = ref<WithdrawalRequest[]>([]);
  const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 });
  const loading = ref(false);

  async function loadWallet() {
    try {
      wallet.value = await $api(`/servers/${serverId}/wallet`);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function loadTransactions(page = 1) {
    loading.value = true;
    try {
      const data = await $api<Paginated<Transaction, 'transactions'>>(`/servers/${serverId}/transactions`, {
        params: { page, limit: 20 },
      });
      transactions.value = data.transactions;
      pagination.value = data.pagination;
    } catch (e: unknown) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function loadWithdrawals() {
    try {
      withdrawals.value = await $api<WithdrawalRequest[]>(`/servers/${serverId}/withdrawals`);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function withdraw(amount: number, method: string, destination: string) {
    await $api(`/servers/${serverId}/withdraw`, {
      method: 'POST',
      body: { amount, method, destination },
    });
    await loadWallet();
    await loadTransactions();
  }

  return {
    wallet,
    transactions,
    withdrawals,
    pagination,
    loading,
    loadWallet,
    loadTransactions,
    loadWithdrawals,
    withdraw,
  };
}

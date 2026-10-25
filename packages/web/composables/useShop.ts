import type { Product, ProductType, ShopData, TopDonator, UpgradeInfo, CouponValidationResult } from '~/types';
import { getBrandColors, type BrandColors } from '~/utils/shop-colors';

export type ShopState = ReturnType<typeof useShop>;

export function useShop(slug: string) {
  const route = useRoute();

  // Payment result polling
  const paymentResult = ref<'pending' | 'success' | 'failed' | null>(null);

  onMounted(async () => {
    const orderId = route.query.order as string | undefined;
    if (orderId) {
      paymentResult.value = 'pending';
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const res = await $fetch<{ status: string }>(`/api/shop/${slug}/order/${orderId}`);
          if (res.status === 'paid') {
            paymentResult.value = 'success';
            break;
          }
          if (res.status === 'cancelled' || res.status === 'failed') {
            paymentResult.value = 'failed';
            break;
          }
        } catch {
          paymentResult.value = 'failed';
          break;
        }
      }
      const query = { ...route.query };
      delete query.order;
      navigateTo({ path: route.path, query }, { replace: true });
    }
  });

  // Shop data
  const { data: shop, error: shopError } = useAsyncData<ShopData>(`shop-${slug}`, () =>
    $fetch(`/api/shop/${slug}`),
  );

  const shopErrorMessage = computed(() => {
    if (shopError.value) {
      const errData = (shopError.value as { data?: { error?: string } })?.data;
      return errData?.error || 'Сервер с таким адресом не существует или был заблокирован.';
    }
    return null;
  });

  // Brand colors
  const brandColors = computed<BrandColors>(() => getBrandColors(shop.value?.server.primaryColor || 'indigo'));

  // Product type metadata (shared with templates)
  const typeMeta: Record<string, { label: string; icon: string; badgeClass: string }> = {
    item: { label: 'Предметы', icon: '🎁', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    privilege: { label: 'Привилегии', icon: '⭐', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    currency: { label: 'Валюта', icon: '💰', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    roulette: { label: 'Рулетка', icon: '🎰', badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    other: { label: 'Другое', icon: '📦', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  };

  const productTypeOptions: { value: ProductType | ''; label: string; icon: string }[] = [
    { value: '', label: 'Все', icon: '📋' },
    { value: 'item', label: 'Предметы', icon: '🎁' },
    { value: 'privilege', label: 'Привилегии', icon: '⭐' },
    { value: 'currency', label: 'Валюта', icon: '💰' },
    { value: 'roulette', label: 'Рулетки', icon: '🎰' },
    { value: 'other', label: 'Другое', icon: '📦' },
  ];

  // Product filtering
  const activeTypeFilter = ref<ProductType | ''>('');
  const hoveredProduct = ref<string | null>(null);
  const couponFocused = ref(false);

  const filteredProducts = computed(() => {
    if (!shop.value) return [];
    let list = shop.value.products;
    if (activeTypeFilter.value) {
      list = list.filter((p) => p.type === activeTypeFilter.value);
    }
    return list;
  });

  const typeCounts = computed(() => {
    if (!shop.value) return new Map<ProductType, number>();
    const counts = new Map<ProductType, number>();
    for (const p of shop.value.products) {
      counts.set(p.type, (counts.get(p.type) || 0) + 1);
    }
    return counts;
  });

  const allUniqueTypes = computed(() => {
    if (!shop.value) return [];
    return [...new Set(shop.value.products.map((p) => p.type))];
  });

  const shouldGroup = computed(() => allUniqueTypes.value.length > 1);

  const groupedProducts = computed(() => {
    if (!shouldGroup.value)
      return [{ type: '' as ProductType | '', label: '', icon: '', products: filteredProducts.value }];
    const groups: { type: ProductType; label: string; icon: string; products: Product[] }[] = [];
    for (const t of ['item', 'privilege', 'currency', 'roulette', 'other'] as ProductType[]) {
      const items = filteredProducts.value.filter((p) => p.type === t);
      if (items.length > 0) {
        groups.push({ type: t, label: typeMeta[t].label, icon: typeMeta[t].icon, products: items });
      }
    }
    return groups;
  });

  // Upgrade system
  const upgrades = ref<UpgradeInfo[]>([]);
  const playerName = ref('');
  const playerNameGlobal = ref('');
  const useUpgrade = ref(false);
  let upgradeTimer: ReturnType<typeof setTimeout> | null = null;

  const currentUpgrade = computed(() => {
    if (!selectedProduct.value) return null;
    return upgrades.value.find((u) => u.productId === selectedProduct.value!.id) || null;
  });

  const currentPrice = computed(() => {
    if (!selectedProduct.value) return 0;
    let price = selectedProduct.value.price;
    if (useUpgrade.value && currentUpgrade.value) {
      price = currentUpgrade.value.upgradePrice;
    }
    return price;
  });

  function getUpgrade(productId: string): UpgradeInfo | undefined {
    return upgrades.value.find((u) => u.productId === productId);
  }

  async function checkUpgrades(name: string) {
    if (!name.trim() || !shop.value?.upgradeEnabled) {
      upgrades.value = [];
      return;
    }
    try {
      const data = await $fetch<{ upgrades: UpgradeInfo[] }>(`/api/shop/${slug}/check-upgrade`, {
        method: 'POST',
        body: { playerName: name.trim() },
      });
      upgrades.value = data.upgrades;
    } catch (e: unknown) {
      upgrades.value = [];
    }
  }

  function debouncedCheckUpgrades(name: string) {
    if (upgradeTimer) clearTimeout(upgradeTimer);
    upgradeTimer = setTimeout(() => checkUpgrades(name), 500);
  }

  watch(playerNameGlobal, (val) => {
    debouncedCheckUpgrades(val);
  });

  watch(playerName, (val) => {
    if (val !== playerNameGlobal.value) {
      playerNameGlobal.value = val;
    }
  });

  // Buy modal state
  const selectedProduct = ref<Product | null>(null);
  const selectedProvider = ref('');
  const buyerEmail = ref('');
  const consentChecked = ref(false);
  const cardConsentChecked = ref(false);
  const buying = ref(false);
  const buyError = ref('');
  const buySuccess = ref('');

  const isRouletteProduct = computed(() => selectedProduct.value?.type === 'roulette');

  const rouletteVariants = computed(() => {
    if (!selectedProduct.value?.actionsJson) return [];
    try {
      const parsed = JSON.parse(selectedProduct.value.actionsJson);
      if (Array.isArray(parsed) && parsed[0]?.type === 'roulette' && Array.isArray(parsed[0].variants)) {
        return parsed[0].variants as { chance: number; command: string; description?: string }[];
      }
    } catch {}
    return [];
  });

  function openBuy(product: Product) {
    selectedProduct.value = product;
    const methods = shop.value?.paymentMethods || [];
    selectedProvider.value = methods.length > 0 ? methods[0].provider : '';
    playerName.value = playerNameGlobal.value;
    buyerEmail.value = '';
    consentChecked.value = false;
    cardConsentChecked.value = false;
    buyError.value = '';
    buySuccess.value = '';
    useUpgrade.value = !!currentUpgrade.value;
  }

  function closeBuy() {
    selectedProduct.value = null;
    buying.value = false;
    useUpgrade.value = false;
    buyerEmail.value = '';
    consentChecked.value = false;
    cardConsentChecked.value = false;
  }

  async function confirmBuy() {
    if (!selectedProduct.value) return;
    buying.value = true;
    buyError.value = '';
    buySuccess.value = '';

    try {
      const res = await $fetch<{ paymentUrl: string; orderId: string }>(`/api/shop/${slug}/order`, {
        method: 'POST',
        body: {
          productId: selectedProduct.value.id,
          playerName: playerName.value,
          email: buyerEmail.value || undefined,
          consent: true,
          couponCode: appliedCoupon.value ? couponInput.value.trim() : undefined,
          upgrade: useUpgrade.value || undefined,
          provider: selectedProvider.value || undefined,
        },
      });
      if (res.paymentUrl.startsWith('/') || res.paymentUrl.startsWith(window.location.origin)) {
        const url = new URL(res.paymentUrl, window.location.origin);
        const mockConfirm = url.searchParams.get('mock_confirm');
        const metadataRaw = url.searchParams.get('metadata');
        let metadata: Record<string, string> = {};
        if (metadataRaw) {
          try { metadata = JSON.parse(metadataRaw); } catch {}
        }
        const body = { mock_confirm: mockConfirm, metadata };
        const webhookRes = await $fetch<{ received: boolean }>('/api/payment/webhook', { method: 'POST', body }).catch(() => null);
        if (webhookRes?.received) {
          buySuccess.value = 'Покупка успешна! Наслаждайтесь вашим предметом в игре.';
          playerNameGlobal.value = playerName.value;
          setTimeout(closeBuy, 2000);
        } else {
          buyError.value = 'Ошибка подтверждения платежа. Попробуйте еще раз.';
        }
      } else {
        window.location.href = res.paymentUrl;
      }
    } catch (e: unknown) {
      const err = e as { data?: { error?: string }; message?: string };
      buyError.value = err?.data?.error || 'Ошибка при покупке. Попробуйте еще раз.';
    } finally {
      buying.value = false;
    }
  }

  // Coupon
  const couponInput = ref('');
  const couponLoading = ref(false);
  const couponError = ref('');
  const couponSuccess = ref(false);
  const appliedCoupon = ref<{ discountType: string } | null>(null);

  async function applyCoupon() {
    const code = couponInput.value.trim().toUpperCase();
    if (!code) return;
    couponLoading.value = true;
    couponError.value = '';
    couponSuccess.value = false;
    appliedCoupon.value = null;

    try {
      const res = await $fetch<CouponValidationResult>(`/api/shop/${slug}/validate-coupon`, {
        method: 'POST',
        body: { code },
      });
      if (res.valid) {
        appliedCoupon.value = { discountType: res.discountType };
        couponSuccess.value = true;
      } else {
        couponError.value = res.error;
      }
    } catch (e: unknown) {
      const err = e as { data?: { error?: string }; message?: string };
      couponError.value = err?.data?.error || 'Промокод недействителен';
    } finally {
      couponLoading.value = false;
    }
  }

  // Top donators
  const donatorPeriod = ref<'week' | 'month' | 'all'>('month');
  const donatorMetric = ref<'paid' | 'earned'>('paid');
  const donators = ref<TopDonator[]>([]);

  const periods = [
    { key: 'week' as const, label: 'Нед' },
    { key: 'month' as const, label: 'Меc' },
    { key: 'all' as const, label: 'Всё' },
  ];

  async function loadDonators() {
    try {
      const data = await $fetch<{ donators: TopDonator[] }>(`/api/shop/${slug}/top-donators`, {
        params: { period: donatorPeriod.value, limit: 10, metric: donatorMetric.value },
      });
      donators.value = data.donators;
    } catch (e: unknown) {
      console.error(e);
    }
  }

  function medal(i: number): string {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `${i + 1}`;
  }

  function medalAnimClass(i: number): string {
    if (i === 0) return 'animate-bounce-in text-amber-400';
    if (i === 1) return 'animate-bounce-in text-slate-300';
    if (i === 2) return 'animate-bounce-in text-amber-600';
    return 'text-slate-400 dark:text-slate-500';
  }

  // Lifecycle

  onMounted(() => {
    loadDonators();
    if (import.meta.client && shop.value?.server.id) {
      $fetch('/api/analytics/pageview', { method: 'POST', body: { serverId: shop.value.server.id } }).catch(() => {});
    }
  });

  onUnmounted(() => {
    if (upgradeTimer) clearTimeout(upgradeTimer);
  });

  const paymentMethods = computed(() => shop.value?.paymentMethods || []);

  return {
    shop,
    shopError,
    shopErrorMessage,
    paymentMethods,
    paymentResult,
    brandColors,
    typeMeta,
    productTypeOptions,
    filteredProducts,
    typeCounts,
    allUniqueTypes,
    shouldGroup,
    groupedProducts,
    activeTypeFilter,
    hoveredProduct,
    couponFocused,
    playerName,
    playerNameGlobal,
    useUpgrade,
    upgrades,
    currentUpgrade,
    currentPrice,
    getUpgrade,
    checkUpgrades,
    selectedProduct,
    selectedProvider,
    buyerEmail,
    consentChecked,
    cardConsentChecked,
    buying,
    buyError,
    buySuccess,
    isRouletteProduct,
    rouletteVariants,
    openBuy,
    closeBuy,
    confirmBuy,
    couponInput,
    couponLoading,
    couponError,
    couponSuccess,
    appliedCoupon,
    applyCoupon,
    donatorPeriod,
    donatorMetric,
    donators,
    periods,
    loadDonators,
    medal,
    medalAnimClass,
  };
}
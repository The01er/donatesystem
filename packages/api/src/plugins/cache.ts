import { LRUCache } from 'lru-cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shopCache = new LRUCache<string, any>({
  max: 500,
  ttl: 60_000,
});

export function getCachedShop(slug: string) {
  return shopCache.get(`shop:${slug}`);
}

export function setCachedShop(slug: string, data: unknown) {
  shopCache.set(`shop:${slug}`, data);
}

export function invalidateShopCache(slug: string) {
  shopCache.delete(`shop:${slug}`);
}

export function invalidateAllShopCache() {
  shopCache.clear();
}

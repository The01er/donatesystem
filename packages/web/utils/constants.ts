import type { $Fetch } from 'nitropack';

export const PLATFORM_DOMAIN = 'example.com';

const FALLBACK_GAME_TYPES = [
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'cs16', label: 'Counter-Strike 1.6' },
] as const;

/** @deprecated Use getGameTypes() for dynamic list from API */
export const GAME_TYPES = FALLBACK_GAME_TYPES;

export type GameTypeInfo = { value: string; label: string };

let cachedGameTypes: GameTypeInfo[] | null = null;

export async function getGameTypes($api?: $Fetch<unknown>): Promise<GameTypeInfo[]> {
  if (cachedGameTypes) return cachedGameTypes;
  try {
    if ($api) {
      const types = await $api('/adapters/game-types') as GameTypeInfo[];
      cachedGameTypes = types;
      return types;
    }
    const res = await fetch('/api/adapters/game-types');
    if (res.ok) {
      const types = await res.json() as GameTypeInfo[];
      cachedGameTypes = types;
      return types;
    }
  } catch {
    // fallback
  }
  return FALLBACK_GAME_TYPES as unknown as GameTypeInfo[];
}

export function getGameLabel(value: string): string {
  const found = cachedGameTypes?.find((g) => g.value === value);
  if (found) return found.label;
  return FALLBACK_GAME_TYPES.find((g) => g.value === value)?.label || value;
}

export const PRODUCT_TYPES = [
  { value: 'item', label: 'Предмет' },
  { value: 'privilege', label: 'Привилегия' },
  { value: 'currency', label: 'Валюта' },
  { value: 'roulette', label: 'Рулетка' },
  { value: 'other', label: 'Другое' },
] as const;

export const WITHDRAWAL_METHODS = ['card', 'sbp', 'crypto'] as const;

export const PAYMENT_PROVIDERS = ['stripe', 'unitpay', 'crypto'] as const;

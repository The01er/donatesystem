import type { GameAdapter } from './types.js';
import { minecraftAdapter } from './minecraft/index.js';
import { cs16Adapter } from './cs16/index.js';

const adapters = new Map<string, GameAdapter>();

adapters.set('minecraft', minecraftAdapter);
adapters.set('cs16', cs16Adapter);

export function getAdapter(gameType: string): GameAdapter {
  const adapter = adapters.get(gameType || 'minecraft');
  if (!adapter) {
    return minecraftAdapter;
  }
  return adapter;
}

export function registerAdapter(adapter: GameAdapter): void {
  adapters.set(adapter.gameType, adapter);
}

export function getRegisteredGameTypes(): Array<{ gameType: string; label: string }> {
  return Array.from(adapters.values()).map((a) => ({ gameType: a.gameType, label: a.label }));
}

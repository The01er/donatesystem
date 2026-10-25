import { describe, it, expect } from 'vitest';
import {
  getAdapter,
  registerAdapter,
  getRegisteredGameTypes,
} from '../src/adapters/registry.js';
import { minecraftAdapter } from '../src/adapters/minecraft/index.js';
import { cs16Adapter } from '../src/adapters/cs16/index.js';
import {
  parseRconConfig,
  sanitizeRecipient as mcSanitize,
  fillPlaceholders,
} from '../src/adapters/minecraft/index.js';
import { getRconConfig } from '../src/adapters/cs16/index.js';
import type { GameAdapter } from '../src/adapters/types.js';

describe('registry', () => {
  it('getAdapter returns minecraft for unknown game type', () => {
    const a = getAdapter('unknown_game');
    expect(a.gameType).toBe('minecraft');
  });

  it('getAdapter returns minecraft for empty string', () => {
    const a = getAdapter('');
    expect(a.gameType).toBe('minecraft');
  });

  it('getAdapter returns minecraft for null/undefined', () => {
    const a = getAdapter(undefined as unknown as string);
    expect(a.gameType).toBe('minecraft');
  });

  it('getAdapter returns cs16 for cs16', () => {
    const a = getAdapter('cs16');
    expect(a.gameType).toBe('cs16');
  });

  it('getAdapter returns minecraft for minecraft', () => {
    const a = getAdapter('minecraft');
    expect(a.gameType).toBe('minecraft');
  });

  it('registerAdapter adds a new adapter', () => {
    const fake: GameAdapter = {
      gameType: 'test_game',
      label: 'Test Game',
      getServerStatus: async () => ({ online: false, onlinePlayers: 0, maxPlayers: 0 }),
      isDeliverable: () => false,
      deliverOrder: async () => ({ ok: true }),
      executeCommands: async () => ({ ok: true, results: [] }),
      testConnection: async () => ({ ok: false, error: 'not configured' }),
      sanitizeRecipient: (n: string) => n,
    };
    registerAdapter(fake);
    expect(getAdapter('test_game').gameType).toBe('test_game');
  });

  it('getRegisteredGameTypes returns all registered types', () => {
    const types = getRegisteredGameTypes();
    expect(types.length).toBeGreaterThanOrEqual(2);
    expect(types.find((t) => t.gameType === 'minecraft')?.label).toBe('Minecraft');
    expect(types.find((t) => t.gameType === 'cs16')?.label).toBe('Counter-Strike 1.6');
  });
});

describe('minecraft.adapter.pure', () => {
  describe('sanitizeRecipient', () => {
    it('strips special characters', () => {
      expect(mcSanitize('Player@1!')).toBe('Player1');
    });

    it('allows alphanumeric and underscore', () => {
      expect(mcSanitize('Steve_123')).toBe('Steve_123');
    });

    it('returns empty string for all special chars', () => {
      expect(mcSanitize('@#$%')).toBe('');
    });
  });

  describe('fillPlaceholders', () => {
    const orderId = 'abc12345-xxxx';

    it('replaces {player} with sanitized name', () => {
      const r = fillPlaceholders('give {player} diamond', 'Player@1!', orderId);
      expect(r).toBe('give Player1 diamond');
    });

    it('replaces {order_id} with first 8 chars', () => {
      const r = fillPlaceholders('say {order_id}', 'Test', orderId);
      expect(r).toBe('say abc12345');
    });

    it('replaces {server} with empty string', () => {
      const r = fillPlaceholders('say {server}', 'Test', orderId);
      expect(r).toBe('say ');
    });

    it('strips leading slash', () => {
      const r = fillPlaceholders('/give {player} diamond', 'Test', orderId);
      expect(r).toBe('give Test diamond');
    });

    it('handles all placeholders at once', () => {
      const r = fillPlaceholders(
        '{player} bought {order_id} on {server}',
        'Alex', 'order-8888-xxxx',
      );
      expect(r).toBe('Alex bought order-88 on ');
    });
  });

  describe('parseRconConfig', () => {
    it('returns null when host is missing', () => {
      expect(parseRconConfig({ rconHost: null, rconPort: 25575, rconPassword: 'pass' })).toBeNull();
    });

    it('returns null when password is missing', () => {
      expect(parseRconConfig({ rconHost: '127.0.0.1', rconPort: 25575, rconPassword: null })).toBeNull();
    });

    it('returns config when all fields present', () => {
      const r = parseRconConfig({ rconHost: '127.0.0.1', rconPort: 25575, rconPassword: 'pass' });
      expect(r).toEqual({ host: '127.0.0.1', port: 25575, password: 'pass' });
    });

    it('uses default port 25575 when port is null', () => {
      const r = parseRconConfig({ rconHost: 'host', rconPort: null, rconPassword: 'pass' });
      expect(r?.port).toBe(25575);
    });

    it('returns plain password when password has no colon (not encrypted)', () => {
      const r = parseRconConfig({ rconHost: 'host', rconPort: 25575, rconPassword: 'plainpass' });
      expect(r?.password).toBe('plainpass');
    });
  });

  describe('isDeliverable', () => {
    it('returns true when rconHost and rconPassword are set', () => {
      expect(minecraftAdapter.isDeliverable({ rconHost: 'host', rconPort: 25575, rconPassword: 'pass' })).toBe(true);
    });

    it('returns false when rconHost is null', () => {
      expect(minecraftAdapter.isDeliverable({ rconHost: null, rconPort: 25575, rconPassword: 'pass' })).toBe(false);
    });

    it('returns false when rconPassword is null', () => {
      expect(minecraftAdapter.isDeliverable({ rconHost: 'host', rconPort: 25575, rconPassword: null })).toBe(false);
    });
  });

  describe('getServerStatus (offline branch)', () => {
    it('returns offline when ipAddress is null', async () => {
      const s = await minecraftAdapter.getServerStatus({ ipAddress: null });
      expect(s.online).toBe(false);
      expect(s.onlinePlayers).toBe(0);
      expect(s.maxPlayers).toBe(0);
    });

    it('returns offline when ipAddress is empty string', async () => {
      const s = await minecraftAdapter.getServerStatus({ ipAddress: '' });
      expect(s.online).toBe(false);
    });
  });
});

describe('cs16.adapter.pure', () => {
  describe('sanitizeRecipient', () => {
    it('allows letters, digits, underscore, space, hyphen', () => {
      expect(cs16Adapter.sanitizeRecipient('Player Name_123')).toBe('Player Name_123');
    });

    it('strips special characters except space and hyphen', () => {
      expect(cs16Adapter.sanitizeRecipient('Player@Name!')).toBe('PlayerName');
    });
  });

  describe('getRconConfig', () => {
    it('returns null when host is missing', () => {
      expect(getRconConfig({ rconHost: null, rconPort: 27015, rconPassword: 'pass' })).toBeNull();
    });

    it('returns null when password is missing', () => {
      expect(getRconConfig({ rconHost: '127.0.0.1', rconPort: 27015, rconPassword: null })).toBeNull();
    });

    it('returns config with default port 27015', () => {
      const r = getRconConfig({ rconHost: 'host', rconPort: null, rconPassword: 'pass' });
      expect(r).toEqual({ host: 'host', port: 27015, password: 'pass' });
    });
  });

  describe('isDeliverable', () => {
    it('returns true when configured', () => {
      expect(cs16Adapter.isDeliverable({ rconHost: 'host', rconPort: 27015, rconPassword: 'pass' })).toBe(true);
    });

    it('returns false when missing password', () => {
      expect(cs16Adapter.isDeliverable({ rconHost: 'host', rconPort: 27015, rconPassword: null })).toBe(false);
    });
  });

  describe('getServerStatus (offline branch)', () => {
    it('returns offline when ipAddress is null', async () => {
      const s = await cs16Adapter.getServerStatus({ ipAddress: null });
      expect(s.online).toBe(false);
    });
  });
});

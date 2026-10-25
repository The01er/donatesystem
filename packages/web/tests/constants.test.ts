import { describe, it, expect } from 'vitest';
import { PLATFORM_DOMAIN, getGameLabel, PRODUCT_TYPES } from '../utils/constants';

describe('PLATFORM_DOMAIN', () => {
  it('is example.com', () => {
    expect(PLATFORM_DOMAIN).toBe('example.com');
  });
});

describe('getGameLabel', () => {
  it('returns label for minecraft', () => {
    expect(getGameLabel('minecraft')).toBe('Minecraft');
  });

  it('returns value as label for unknown game', () => {
    expect(getGameLabel('unknown')).toBe('unknown');
  });
});

describe('PRODUCT_TYPES', () => {
  it('includes all product types', () => {
    const values = PRODUCT_TYPES.map((p) => p.value);
    expect(values).toContain('item');
    expect(values).toContain('privilege');
    expect(values).toContain('currency');
    expect(values).toContain('roulette');
    expect(values).toContain('other');
  });

  it('has labels', () => {
    for (const p of PRODUCT_TYPES) {
      expect(typeof p.label).toBe('string');
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

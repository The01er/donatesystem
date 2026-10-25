import { describe, it, expect, vi } from 'vitest';

describe('config', () => {
  it('has a default port', async () => {
    const originalSec = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret';

    vi.resetModules();
    const { config } = await import('../src/config.js');

    expect(config.port).toBe(3001);
    expect(config.jwtSecret).toBe('test-secret');

    process.env.JWT_SECRET = originalSec;
  });

  it('throws in production without JWT_SECRET', async () => {
    const originalSec = process.env.JWT_SECRET;
    const originalEnv = process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    vi.resetModules();
    await expect(import('../src/config.js')).rejects.toThrow('JWT_SECRET must be set in production');

    process.env.JWT_SECRET = originalSec;
    process.env.NODE_ENV = originalEnv;
  });
});

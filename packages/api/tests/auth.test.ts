import { describe, it, expect } from 'vitest';
import { changePasswordSchema, deleteAllSessionsSchema } from '../src/routes/auth.js';

describe('changePasswordSchema', () => {
  it('accepts valid input', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'newpassword123' });
    expect(r.success).toBe(true);
  });

  it('rejects short newPassword', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: '1234567' });
    expect(r.success).toBe(false);
  });

  it('rejects empty currentPassword', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'newpassword123' });
    expect(r.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'old' });
    expect(r.success).toBe(false);
  });
});

describe('deleteAllSessionsSchema', () => {
  it('accepts all=true', () => {
    const r = deleteAllSessionsSchema.safeParse({ all: 'true' });
    expect(r.success).toBe(true);
  });

  it('rejects all=false', () => {
    const r = deleteAllSessionsSchema.safeParse({ all: 'false' });
    expect(r.success).toBe(false);
  });

  it('rejects missing all', () => {
    const r = deleteAllSessionsSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

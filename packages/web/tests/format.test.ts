import { describe, it, expect } from 'vitest';
import { fmtDate } from '../utils/format';

describe('fmtDate', () => {
  it('formats a date string', () => {
    const result = fmtDate('2026-06-07T12:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns a string with date parts', () => {
    const result = fmtDate('2026-01-01T00:00:00Z');
    expect(result).toContain('1');
  });
});

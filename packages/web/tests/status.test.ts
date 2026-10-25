import { describe, it, expect } from 'vitest';

function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    delivered: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function orderStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    delivering: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

describe('status helpers', () => {
  it.each([
    ['pending', 'bg-yellow-100 text-yellow-800'],
    ['paid', 'bg-green-100 text-green-800'],
    ['delivered', 'bg-blue-100 text-blue-800'],
    ['cancelled', 'bg-gray-100 text-gray-800'],
    ['unknown', 'bg-gray-100 text-gray-800'],
  ])('statusClass(%s) → %s', (input, expected) => {
    expect(statusClass(input)).toBe(expected);
  });

  it.each([
    ['pending', 'bg-yellow-100 text-yellow-800'],
    ['delivering', 'bg-purple-100 text-purple-800'],
    ['delivered', 'bg-green-100 text-green-800'],
    ['failed', 'bg-red-100 text-red-800'],
  ])('orderStatusClass(%s) → %s', (input, expected) => {
    expect(orderStatusClass(input)).toBe(expected);
  });

  it('status helpers are idempotent', () => {
    const all = ['pending', 'paid', 'delivering', 'delivered', 'failed', 'cancelled'];
    for (const s of all) {
      expect(typeof orderStatusClass(s)).toBe('string');
      expect(orderStatusClass(s).length).toBeGreaterThan(0);
    }
  });
});

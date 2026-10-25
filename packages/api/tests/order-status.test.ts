import { describe, it, expect } from 'vitest';
import { OrderStatus } from '../src/constants/order-status.js';

describe('OrderStatus constants', () => {
  it('has PENDING', () => {
    expect(OrderStatus.PENDING).toBe('pending');
  });

  it('has PAID', () => {
    expect(OrderStatus.PAID).toBe('paid');
  });

  it('has DELIVERING', () => {
    expect(OrderStatus.DELIVERING).toBe('delivering');
  });

  it('has DELIVERED', () => {
    expect(OrderStatus.DELIVERED).toBe('delivered');
  });

  it('has FAILED', () => {
    expect(OrderStatus.FAILED).toBe('failed');
  });

  it('has CANCELLED', () => {
    expect(OrderStatus.CANCELLED).toBe('cancelled');
  });

  it('all statuses are unique', () => {
    const values = Object.values(OrderStatus);
    expect(new Set(values).size).toBe(values.length);
  });

  it('all statuses are lowercase', () => {
    for (const v of Object.values(OrderStatus)) {
      expect(v).toBe(v.toLowerCase());
    }
  });
});

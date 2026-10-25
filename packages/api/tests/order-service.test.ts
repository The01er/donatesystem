import { describe, it, expect } from 'vitest';
import { calculateCommission, computeBestUpgrade } from '../src/services/order-service.js';
import type { PrivilegeOrder } from '../src/services/order-service.js';

describe('calculateCommission', () => {
  it('calculates 10% commission correctly', () => {
    const r = calculateCommission(1000, 10);
    expect(r.commissionAmt).toBe(100);
    expect(r.ownerAmount).toBe(900);
  });

  it('returns zero commission at 0%', () => {
    const r = calculateCommission(500, 0);
    expect(r.commissionAmt).toBe(0);
    expect(r.ownerAmount).toBe(500);
  });

  it('handles 100% commission', () => {
    const r = calculateCommission(250, 100);
    expect(r.commissionAmt).toBe(250);
    expect(r.ownerAmount).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const r = calculateCommission(999, 33);
    expect(r.commissionAmt).toBeCloseTo(329.67, 2);
    expect(r.ownerAmount).toBeCloseTo(669.33, 2);
  });

  it('handles zero amount', () => {
    const r = calculateCommission(0, 10);
    expect(r.commissionAmt).toBe(0);
    expect(r.ownerAmount).toBe(0);
  });
});

describe('computeBestUpgrade', () => {
  const productId = 'prod-1';
  const price = 1000;

  it('returns null when no cheaper purchases', () => {
    const purchased: PrivilegeOrder[] = [
      { productId: 'prod-2', productName: 'Gold', price: 1500, createdAt: new Date() },
    ];
    expect(computeBestUpgrade(productId, price, purchased, 0)).toBeNull();
  });

  it('returns null when empty purchase history', () => {
    expect(computeBestUpgrade(productId, price, [], 0)).toBeNull();
  });

  it('picks the most expensive cheaper purchase', () => {
    const purchased: PrivilegeOrder[] = [
      { productId: 'prod-3', productName: 'Bronze', price: 200, createdAt: new Date() },
      { productId: 'prod-4', productName: 'Silver', price: 500, createdAt: new Date() },
    ];
    const u = computeBestUpgrade(productId, price, purchased, 0);
    expect(u).not.toBeNull();
    expect(u!.fromProductName).toBe('Silver');
    expect(u!.upgradePrice).toBe(500);
  });

  it('applies maxDiscount cap when upgrade price exceeds it', () => {
    const purchased: PrivilegeOrder[] = [
      { productId: 'prod-5', productName: 'Basic', price: 100, createdAt: new Date() },
    ];
    const u = computeBestUpgrade(productId, price, purchased, 300);
    expect(u).not.toBeNull();
    expect(u!.upgradePrice).toBe(300);
  });

  it('does not cap discount when maxDiscount is 0 (unlimited)', () => {
    const purchased: PrivilegeOrder[] = [
      { productId: 'prod-6', productName: 'Cheap', price: 100, createdAt: new Date() },
    ];
    const u = computeBestUpgrade(productId, price, purchased, 0);
    expect(u).not.toBeNull();
    expect(u!.upgradePrice).toBe(900);
  });

  it('returns null when purchased price >= current price', () => {
    const purchased: PrivilegeOrder[] = [
      { productId: 'prod-7', productName: 'Expensive', price: 1500, createdAt: new Date() },
      { productId: 'prod-8', productName: 'Same', price: 1000, createdAt: new Date() },
    ];
    expect(computeBestUpgrade(productId, price, purchased, 0)).toBeNull();
  });
});

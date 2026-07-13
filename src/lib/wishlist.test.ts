import { describe, expect, it } from 'vitest';
import type { WishlistItem } from '../types';
import {
  formatEuro,
  getWishlistProgress,
  getWishlistStateLabel,
  parseEuroToCents,
} from './wishlist';

const NOW = '2026-07-13T10:00:00.000Z';

const makeWishlistItem = (overrides: Partial<WishlistItem> = {}): WishlistItem => ({
  id: 'wishlist-1',
  type: 'wishlist',
  title: 'A useful thing',
  savedAmountCents: 0,
  status: 'active',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

describe('parseEuroToCents', () => {
  it('treats an empty value as an unknown amount', () => {
    expect(parseEuroToCents('')).toBeUndefined();
    expect(parseEuroToCents('   ')).toBeUndefined();
  });

  it('accepts decimal points and Dutch decimal commas', () => {
    expect(parseEuroToCents('12.34')).toBe(1_234);
    expect(parseEuroToCents('12,34')).toBe(1_234);
    expect(parseEuroToCents(' 0 ')).toBe(0);
  });

  it('accepts Dutch and English thousands formatting without changing the amount', () => {
    expect(parseEuroToCents('1.000')).toBe(100_000);
    expect(parseEuroToCents('1,000')).toBe(100_000);
    expect(parseEuroToCents('12.345,67')).toBe(1_234_567);
    expect(parseEuroToCents('12,345.67')).toBe(1_234_567);
  });

  it('rejects fractions smaller than one cent and malformed grouping', () => {
    expect(parseEuroToCents('0.005')).toBeNull();
    expect(parseEuroToCents('1234.567')).toBeNull();
    expect(parseEuroToCents('12.34.56')).toBeNull();
  });

  it('rejects negative, malformed, non-finite, and unsafe amounts', () => {
    expect(parseEuroToCents('-0.01')).toBeNull();
    expect(parseEuroToCents('not a number')).toBeNull();
    expect(parseEuroToCents('NaN')).toBeNull();
    expect(parseEuroToCents('Infinity')).toBeNull();
    expect(parseEuroToCents(String(Number.MAX_SAFE_INTEGER))).toBeNull();
  });
});

describe('formatEuro', () => {
  it('formats integer cents as a Dutch euro amount', () => {
    const formatted = formatEuro(1_234);
    expect(formatted).toContain('€');
    expect(formatted).toContain('12,34');
  });
});

describe('getWishlistProgress', () => {
  it('represents an unknown or zero goal without fake progress', () => {
    expect(getWishlistProgress(makeWishlistItem())).toEqual({
      hasGoal: false,
      goalReached: false,
      percent: 0,
      remainingCents: 0,
    });
    expect(getWishlistProgress(makeWishlistItem({ targetPriceCents: 0 }))).toEqual({
      hasGoal: false,
      goalReached: false,
      percent: 0,
      remainingCents: 0,
    });
  });

  it('calculates partial progress and rounds the displayed percentage', () => {
    expect(
      getWishlistProgress(makeWishlistItem({ targetPriceCents: 10_000, savedAmountCents: 2_500 }))
    ).toEqual({
      hasGoal: true,
      goalReached: false,
      percent: 25,
      remainingCents: 7_500,
    });
    expect(
      getWishlistProgress(makeWishlistItem({ targetPriceCents: 300, savedAmountCents: 100 })).percent
    ).toBe(33);
  });

  it('marks an exact goal as reached', () => {
    expect(
      getWishlistProgress(makeWishlistItem({ targetPriceCents: 10_000, savedAmountCents: 10_000 }))
    ).toEqual({
      hasGoal: true,
      goalReached: true,
      percent: 100,
      remainingCents: 0,
    });
  });

  it('caps over-target display progress and remaining amount', () => {
    expect(
      getWishlistProgress(makeWishlistItem({ targetPriceCents: 10_000, savedAmountCents: 12_500 }))
    ).toEqual({
      hasGoal: true,
      goalReached: true,
      percent: 100,
      remainingCents: 0,
    });
  });
});

describe('getWishlistStateLabel', () => {
  it('labels active wishlist and savings states', () => {
    expect(getWishlistStateLabel(makeWishlistItem())).toBe('Wishlist');
    expect(getWishlistStateLabel(makeWishlistItem({ savedAmountCents: 1 }))).toBe('Saving');
    expect(
      getWishlistStateLabel(makeWishlistItem({ targetPriceCents: 1_000, savedAmountCents: 1_000 }))
    ).toBe('Goal reached');
  });

  it('gives bought and archived statuses precedence over savings progress', () => {
    const funded = { targetPriceCents: 1_000, savedAmountCents: 1_000 };
    expect(getWishlistStateLabel(makeWishlistItem({ ...funded, status: 'bought' }))).toBe('Bought');
    expect(getWishlistStateLabel(makeWishlistItem({ ...funded, status: 'archived' }))).toBe('Archived');
  });
});

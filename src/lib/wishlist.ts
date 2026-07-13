import type { WishlistItem } from '../types';

const EURO_FORMATTER = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
});

export type WishlistProgress = {
  hasGoal: boolean;
  goalReached: boolean;
  percent: number;
  remainingCents: number;
};

function centsFromParts(eurosPart: string, centsPart = ''): number | null {
  const euros = Number(eurosPart);
  const cents = Number(centsPart.padEnd(2, '0'));
  const total = euros * 100 + cents;

  return Number.isSafeInteger(total) ? total : null;
}

function isValidGroupedInteger(value: string, separator: '.' | ','): boolean {
  const groups = value.split(separator);
  return (
    /^[1-9]\d{0,2}$/.test(groups[0]) &&
    groups.length > 1 &&
    groups.slice(1).every((group) => /^\d{3}$/.test(group))
  );
}

export function parseEuroToCents(value: string): number | undefined | null {
  const input = value.trim();
  if (!input) return undefined;
  if (!/^\d+(?:[.,]\d+)*$/.test(input)) return null;

  const dots = (input.match(/\./g) ?? []).length;
  const commas = (input.match(/,/g) ?? []).length;

  if (dots > 0 && commas > 0) {
    const decimalSeparator: '.' | ',' = input.lastIndexOf('.') > input.lastIndexOf(',') ? '.' : ',';
    const groupingSeparator: '.' | ',' = decimalSeparator === '.' ? ',' : '.';
    const decimalIndex = input.lastIndexOf(decimalSeparator);
    const integerPart = input.slice(0, decimalIndex);
    const decimalPart = input.slice(decimalIndex + 1);

    if (!/^\d{1,2}$/.test(decimalPart)) return null;
    if (integerPart.includes(decimalSeparator)) return null;
    if (!isValidGroupedInteger(integerPart, groupingSeparator)) return null;

    return centsFromParts(integerPart.split(groupingSeparator).join(''), decimalPart);
  }

  const separator: '.' | ',' | null = dots > 0 ? '.' : commas > 0 ? ',' : null;
  if (!separator) return centsFromParts(input);

  const parts = input.split(separator);
  if (parts.length === 2 && /^\d{1,2}$/.test(parts[1])) {
    return centsFromParts(parts[0], parts[1]);
  }

  if (isValidGroupedInteger(input, separator)) {
    return centsFromParts(parts.join(''));
  }

  return null;
}

export function formatEuro(cents: number): string {
  return EURO_FORMATTER.format(cents / 100);
}

export function getWishlistProgress(item: WishlistItem): WishlistProgress {
  const target = item.targetPriceCents;
  const hasGoal = typeof target === 'number' && target > 0;
  const goalReached = hasGoal && item.savedAmountCents >= target;
  const remainingCents = hasGoal ? Math.max(0, target - item.savedAmountCents) : 0;
  const percent = hasGoal
    ? Math.min(100, Math.round((item.savedAmountCents / target) * 100))
    : 0;

  return { hasGoal, goalReached, percent, remainingCents };
}

export function getWishlistStateLabel(item: WishlistItem): string {
  if (item.status === 'bought') return 'Bought';
  if (item.status === 'archived') return 'Archived';

  const progress = getWishlistProgress(item);
  if (progress.goalReached) return 'Goal reached';
  if (item.savedAmountCents > 0) return 'Saving';
  return 'Wishlist';
}

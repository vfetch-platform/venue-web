import { ItemCategory, ItemStatus } from '@/types';

export const ITEM_CATEGORIES: ItemCategory[] = [
  'phones',
  'wallets',
  'keys',
  'bags',
  'clothing',
  'jewelry',
  'electronics',
  'cards',
  'documents',
  'other',
];

export const ITEM_STATUSES: ItemStatus[] = [
  'available',
  'reserved',
  'released',
  'expired',
];

/** Item statuses that represent a collected/released item. */
export const RELEASED_STATUSES: Set<ItemStatus> = new Set<ItemStatus>([
  'released',
]);

/** @deprecated Use RELEASED_STATUSES instead. */
export const COLLECTED_STATUSES = RELEASED_STATUSES;

/** Check if an item status represents a reserved/claimed state. */
export function isReserved(status: ItemStatus): boolean {
  return status === 'reserved';
}

/** Check if an item status represents a released/collected state. */
export function isReleased(status: ItemStatus): boolean {
  return RELEASED_STATUSES.has(status);
}

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

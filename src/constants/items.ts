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

export const ITEM_STATUSES: (ItemStatus | 'collected')[] = [
  'available',
  'claimed',
  'collected',
  'expired',
];

export const COLLECTED_STATUSES: Set<ItemStatus> = new Set([
  'collected',
  'collected_code',
  'collected_nocode',
  'collected_courier',
]);

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

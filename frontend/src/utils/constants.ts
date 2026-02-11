export const ORDER_TYPES = [
  { value: 'CRYPTO_TO_KES', label: 'Sell USDT', description: 'Sell USDT and receive KES' },
  { value: 'KES_TO_CRYPTO', label: 'Buy USDT', description: 'Buy USDT with KES' },
] as const;

export const CRYPTO_CURRENCIES = [
  { value: 'USDT', label: 'USDT', network: 'TRC20' },
] as const;

export const FIAT_CURRENCIES = [
  { value: 'KES', label: 'KES', name: 'Kenya Shilling', flag: '' },
] as const;

export const ORDER_STATUSES = {
  PENDING: { label: 'Pending', color: 'yellow' },
  PAID: { label: 'Paid', color: 'blue' },
  PROCESSING: { label: 'Processing', color: 'purple' },
  COMPLETED: { label: 'Completed', color: 'green' },
  FAILED: { label: 'Failed', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
  EXPIRED: { label: 'Expired', color: 'gray' },
} as const;

export const KYC_STATUSES = {
  UNVERIFIED: { label: 'Unverified', color: 'gray' },
  PENDING: { label: 'Pending', color: 'yellow' },
  VERIFIED: { label: 'Verified', color: 'green' },
  REJECTED: { label: 'Rejected', color: 'red' },
} as const;

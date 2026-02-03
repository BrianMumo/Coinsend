export const ORDER_TYPES = [
  { value: 'CRYPTO_TO_KES', label: 'Crypto to KES', description: 'Sell crypto and receive KES' },
  { value: 'KES_TO_CRYPTO', label: 'KES to Crypto', description: 'Buy crypto with KES' },
  { value: 'CROSS_BORDER', label: 'Cross-Border', description: 'Send money internationally' },
  { value: 'OTC', label: 'OTC Trade', description: 'Large trades with custom rates' },
] as const;

export const CRYPTO_CURRENCIES = [
  { value: 'USDT', label: 'USDT', network: 'TRC20' },
  { value: 'USDC', label: 'USDC', network: 'ERC20' },
] as const;

export const FIAT_CURRENCIES = [
  { value: 'KES', label: 'KES', name: 'Kenya Shilling', flag: '🇰🇪' },
  { value: 'USD', label: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { value: 'ZAR', label: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { value: 'UGX', label: 'UGX', name: 'Ugandan Shilling', flag: '🇺🇬' },
  { value: 'TZS', label: 'TZS', name: 'Tanzanian Shilling', flag: '🇹🇿' },
  { value: 'NGN', label: 'NGN', name: 'Nigerian Naira', flag: '🇳🇬' },
  { value: 'CNY', label: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { value: 'AED', label: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
] as const;

export const CROSS_BORDER_DESTINATIONS = [
  { value: 'ZAR', country: 'South Africa', flag: '🇿🇦' },
  { value: 'UGX', country: 'Uganda', flag: '🇺🇬' },
  { value: 'TZS', country: 'Tanzania', flag: '🇹🇿' },
  { value: 'NGN', country: 'Nigeria', flag: '🇳🇬' },
  { value: 'CNY', country: 'China', flag: '🇨🇳' },
  { value: 'AED', country: 'UAE', flag: '🇦🇪' },
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

export const formatCurrency = (amount: string | number, currency: string = 'KES'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  const currencyConfig: Record<string, { locale: string; currency: string }> = {
    KES: { locale: 'en-KE', currency: 'KES' },
    USD: { locale: 'en-US', currency: 'USD' },
    ZAR: { locale: 'en-ZA', currency: 'ZAR' },
    UGX: { locale: 'en-UG', currency: 'UGX' },
    TZS: { locale: 'en-TZ', currency: 'TZS' },
    NGN: { locale: 'en-NG', currency: 'NGN' },
    CNY: { locale: 'zh-CN', currency: 'CNY' },
    AED: { locale: 'ar-AE', currency: 'AED' },
    USDT: { locale: 'en-US', currency: 'USD' },
    USDC: { locale: 'en-US', currency: 'USD' },
  };

  const config = currencyConfig[currency] || currencyConfig.USD;

  if (['USDT', 'USDC'].includes(currency)) {
    return `${num.toFixed(2)} ${currency}`;
  }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
};

export const formatOrderType = (type: string): string => {
  const types: Record<string, string> = {
    CRYPTO_TO_KES: 'Crypto → KES',
    KES_TO_CRYPTO: 'KES → Crypto',
    CROSS_BORDER: 'Cross-Border',
    OTC: 'OTC Trade',
  };
  return types[type] || type;
};

export const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const truncateAddress = (address: string, chars: number = 6): string => {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

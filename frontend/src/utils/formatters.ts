export const formatCurrency = (amount: string | number, currency: string = 'KES'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (currency === 'USDT') {
    return `${num.toFixed(2)} USDT`;
  }

  // Default to KES
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
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
    CRYPTO_TO_KES: 'Sell USDT',
    KES_TO_CRYPTO: 'Buy USDT',
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

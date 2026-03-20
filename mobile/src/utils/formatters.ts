import { BalanceTransactionType } from '../types';

export function formatCurrency(amount: string | number, currency = 'KES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency} 0.00`;
  return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUsdt(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000000 USDT';
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function truncateAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTransactionType(type: BalanceTransactionType): string {
  const labels: Record<BalanceTransactionType, string> = {
    DEPOSIT: 'KES Deposit',
    WITHDRAWAL: 'KES Withdrawal',
    ORDER_PAYMENT: 'Order Payment',
    ORDER_REFUND: 'Order Refund',
    ADJUSTMENT: 'Balance Adjustment',
    USDT_DEPOSIT: 'USDT Deposit',
    USDT_WITHDRAWAL: 'USDT Withdrawal',
    KES_WITHDRAWAL: 'Withdrawal to M-Pesa',
  };
  return labels[type] ?? type;
}

export function isDepositType(type: BalanceTransactionType): boolean {
  return ['DEPOSIT', 'USDT_DEPOSIT', 'ORDER_REFUND', 'ADJUSTMENT'].includes(type);
}

export function formatRate(rate: string | number): string {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(num)) return '0.00';
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatSpread(spread: string | number): string {
  const num = typeof spread === 'string' ? parseFloat(spread) : spread;
  if (isNaN(num)) return '0.00%';
  return `${(num * 100).toFixed(2)}%`;
}

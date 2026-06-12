import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'success' | 'warning' | 'error';
}

const variantClasses: Record<string, string> = {
  default:    'bg-surface-700/40 text-surface-300 border-surface-600/30',
  pending:    'bg-gold-400/10 text-gold-400 border-gold-400/20',
  processing: 'bg-lavender-500/10 text-lavender-400 border-lavender-500/20',
  completed:  'bg-accent-500/10 text-accent-400 border-accent-500/20',
  failed:     'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled:  'bg-surface-600/20 text-surface-400 border-surface-600/30',
  // Aliases for semantic variants used across admin pages
  success:    'bg-accent-500/10 text-accent-400 border-accent-500/20',
  warning:    'bg-gold-400/10 text-gold-400 border-gold-400/20',
  error:      'bg-red-500/10 text-red-400 border-red-500/20',
};

export const Badge = ({
  variant = 'default',
  className = '',
  ...props
}: BadgeProps) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variantClasses[variant]} ${className}`}
    {...props}
  />
);

export const getStatusVariant = (status: string): BadgeProps['variant'] => {
  const map: Record<string, BadgeProps['variant']> = {
    PENDING:    'pending',
    PROCESSING: 'processing',
    COMPLETED:  'completed',
    FAILED:     'failed',
    CANCELLED:  'cancelled',
    ACTIVE:     'completed',
    INACTIVE:   'cancelled',
    VERIFIED:   'completed',
    UNVERIFIED: 'pending',
  };
  return map[status] || 'default';
};

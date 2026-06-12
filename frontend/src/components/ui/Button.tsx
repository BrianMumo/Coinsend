import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading, className = '', disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900';

    const variants = {
      primary:   'bg-gold-400 text-dark-900 hover:bg-gold-300 shadow-glow-sm hover:shadow-glow-gold focus:ring-gold-400/50',
      secondary: 'bg-surface-700/40 border border-surface-600/40 text-surface-200 hover:bg-surface-700/60 focus:ring-surface-500/40',
      outline:   'border border-gold-400/40 text-gold-400 hover:bg-gold-400/10 focus:ring-gold-400/40',
      ghost:     'text-surface-300 hover:bg-surface-700/30 focus:ring-surface-500/30',
      danger:    'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 focus:ring-red-500/40',
    };

    const sizes = {
      sm: 'text-sm px-3.5 py-1.5',
      md: 'text-sm px-5 py-2.5',
      lg: 'text-base px-7 py-3',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

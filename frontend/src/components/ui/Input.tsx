import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-surface-300 mb-1.5">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 bg-dark-700/60 border rounded-xl text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 transition-all ${
          error
            ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/60'
            : 'border-surface-600/40 focus:ring-gold-400/40 focus:border-gold-400/50'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';

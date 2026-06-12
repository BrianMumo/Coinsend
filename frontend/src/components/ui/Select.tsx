import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-surface-300 mb-1.5">{label}</label>
      )}
      <select
        ref={ref}
        className={`w-full px-4 py-2.5 bg-dark-700/60 border rounded-xl text-surface-100 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
          error
            ? 'border-red-500/50 focus:ring-red-500/30'
            : 'border-surface-600/40 focus:ring-gold-400/40 focus:border-gold-400/50'
        } ${className}`}
        {...props}
      >
        {options.map(({ value, label }) => (
          <option key={value} value={value} className="bg-dark-800 text-surface-100">
            {label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  )
);

Select.displayName = 'Select';

import { HTMLAttributes } from 'react';
import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

const variants = {
  info:    { border: 'border-lavender-500/30', bg: 'bg-lavender-500/5', text: 'text-lavender-300', icon: Info },
  success: { border: 'border-accent-500/30',   bg: 'bg-accent-500/5',   text: 'text-accent-400',   icon: CheckCircle },
  warning: { border: 'border-gold-400/30',     bg: 'bg-gold-400/5',     text: 'text-gold-400',     icon: AlertTriangle },
  error:   { border: 'border-red-500/30',      bg: 'bg-red-500/5',      text: 'text-red-400',      icon: AlertCircle },
};

export const Alert = ({
  variant = 'info',
  title,
  children,
  className = '',
  ...props
}: AlertProps) => {
  const v = variants[variant];
  const Icon = v.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border ${v.border} ${v.bg} backdrop-blur-sm p-4 ${className}`}
      {...props}
    >
      <Icon className={`h-5 w-5 ${v.text} flex-shrink-0 mt-0.5`} />
      <div>
        {title && <p className={`text-sm font-semibold ${v.text} mb-0.5`}>{title}</p>}
        <div className="text-sm text-surface-300">{children}</div>
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, Toast as ToastType } from '../../store/toastStore';
import { clsx } from 'clsx';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-dark-800/90 backdrop-blur-xl border-accent-500/30 text-accent-300',
  error: 'bg-dark-800/90 backdrop-blur-xl border-red-500/30 text-red-300',
  warning: 'bg-dark-800/90 backdrop-blur-xl border-yellow-500/30 text-yellow-300',
  info: 'bg-dark-800/90 backdrop-blur-xl border-primary-500/30 text-primary-300',
};

const iconStyles = {
  success: 'text-accent-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-primary-400',
};

const ToastItem = ({ toast }: { toast: ToastType }) => {
  const { removeToast } = useToastStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeToast(toast.id), 200);
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-glass transition-all duration-200',
        styles[toast.type],
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0', iconStyles[toast.type])} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-surface-700/50 transition-colors"
      >
        <X className="h-4 w-4 text-surface-400" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
};

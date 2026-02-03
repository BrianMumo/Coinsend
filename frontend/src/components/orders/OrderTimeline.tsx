import { Order, OrderStatus } from '../../types';
import { formatDate } from '../../utils/formatters';
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  date?: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
}

interface OrderTimelineProps {
  order: Order;
}

export const OrderTimeline = ({ order }: OrderTimelineProps) => {
  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [];
    const status = order.status as OrderStatus;

    // Step 1: Order Created (always completed if order exists)
    steps.push({
      key: 'created',
      label: 'Order Created',
      description: 'Your order has been placed',
      date: order.createdAt,
      status: 'completed',
    });

    // Handle different statuses
    if (status === 'CANCELLED') {
      steps.push({
        key: 'cancelled',
        label: 'Order Cancelled',
        description: 'This order was cancelled',
        date: order.updatedAt,
        status: 'failed',
      });
      return steps;
    }

    if (status === 'EXPIRED') {
      steps.push({
        key: 'expired',
        label: 'Order Expired',
        description: 'Order expired due to no payment',
        date: order.updatedAt,
        status: 'failed',
      });
      return steps;
    }

    // Step 2: Payment Submitted
    const paymentStatus =
      status === 'PENDING'
        ? 'current'
        : ['PAID', 'PROCESSING', 'COMPLETED'].includes(status)
        ? 'completed'
        : status === 'FAILED'
        ? 'pending'
        : 'pending';

    steps.push({
      key: 'paid',
      label: 'Payment Submitted',
      description: status === 'PENDING' ? 'Waiting for your payment' : 'Payment proof received',
      date: order.paidAt || undefined,
      status: paymentStatus,
    });

    // Step 3: Processing
    const processingStatus =
      ['PENDING', 'PAID'].includes(status)
        ? 'pending'
        : status === 'PROCESSING'
        ? 'current'
        : status === 'COMPLETED'
        ? 'completed'
        : status === 'FAILED'
        ? 'failed'
        : 'pending';

    steps.push({
      key: 'processing',
      label: 'Processing',
      description:
        status === 'PROCESSING'
          ? 'We are processing your order'
          : status === 'FAILED'
          ? 'Processing failed'
          : 'Order will be processed after payment verification',
      date: status === 'PROCESSING' || status === 'FAILED' ? order.updatedAt : undefined,
      status: processingStatus,
    });

    // Step 4: Completed
    const completedStatus =
      status === 'COMPLETED' ? 'completed' : status === 'FAILED' ? 'failed' : 'pending';

    steps.push({
      key: 'completed',
      label: status === 'FAILED' ? 'Failed' : 'Completed',
      description:
        status === 'COMPLETED'
          ? 'Your order has been completed successfully'
          : status === 'FAILED'
          ? order.processingNotes || 'Order could not be completed'
          : 'Payout will be sent to your destination',
      date: order.completedAt || undefined,
      status: completedStatus,
    });

    return steps;
  };

  const steps = getTimelineSteps();

  const getStepIcon = (step: TimelineStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-500">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        );
      case 'current':
        return (
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center border-2 border-primary-500 animate-pulse">
            <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
          </div>
        );
      case 'failed':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-500">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
        );
    }
  };

  const getLineColor = (currentStep: TimelineStep, nextStep?: TimelineStep) => {
    if (currentStep.status === 'completed' && nextStep) {
      if (nextStep.status === 'completed' || nextStep.status === 'current') {
        return 'bg-green-500';
      }
    }
    if (currentStep.status === 'failed') {
      return 'bg-red-300';
    }
    return 'bg-gray-200';
  };

  return (
    <div className="relative">
      {steps.map((step, index) => (
        <div key={step.key} className="relative flex gap-4">
          {/* Timeline line */}
          {index < steps.length - 1 && (
            <div
              className={clsx(
                'absolute left-5 top-10 w-0.5 h-[calc(100%-1rem)]',
                getLineColor(step, steps[index + 1])
              )}
            />
          )}

          {/* Step icon */}
          <div className="relative z-10 flex-shrink-0">{getStepIcon(step)}</div>

          {/* Step content */}
          <div className={clsx('pb-8 flex-1', index === steps.length - 1 && 'pb-0')}>
            <div className="flex items-center gap-2">
              <p
                className={clsx(
                  'font-semibold',
                  step.status === 'completed' && 'text-green-700',
                  step.status === 'current' && 'text-primary-700',
                  step.status === 'failed' && 'text-red-700',
                  step.status === 'pending' && 'text-gray-500'
                )}
              >
                {step.label}
              </p>
              {step.status === 'current' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  In Progress
                </span>
              )}
            </div>
            <p
              className={clsx(
                'text-sm mt-0.5',
                step.status === 'pending' ? 'text-gray-400' : 'text-gray-600'
              )}
            >
              {step.description}
            </p>
            {step.date && (
              <p className="text-xs text-gray-400 mt-1">{formatDate(step.date)}</p>
            )}
          </div>
        </div>
      ))}

      {/* Admin notes if any */}
      {order.processingNotes && order.status !== 'FAILED' && (
        <div className="mt-4 ml-14 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Notes</p>
          <p className="text-sm text-gray-700 mt-1">{order.processingNotes}</p>
        </div>
      )}

      {/* Payout reference if completed */}
      {order.payoutReference && order.status === 'COMPLETED' && (
        <div className="mt-4 ml-14 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wider">
            Payout Reference
          </p>
          <p className="text-sm font-mono text-green-800 mt-1">{order.payoutReference}</p>
        </div>
      )}
    </div>
  );
};

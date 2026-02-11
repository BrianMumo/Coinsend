import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { PageTitle } from '../../components/ui/PageTitle';
import { ordersApi } from '../../api/orders.api';
import { ratesApi } from '../../api/rates.api';
import { useAuthStore } from '../../store/authStore';
import { PaymentSource } from '../../types';
import { ArrowDown, Calculator, Wallet, Smartphone } from 'lucide-react';

const formSchema = z.object({
  sourceAmount: z.string().min(1, 'Please enter an amount').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  payoutDestination: z.string().min(20, 'Please enter a valid USDT TRC-20 wallet address'),
});

type FormData = z.infer<typeof formSchema>;

const KesToCryptoPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<{
    destinationAmount: number;
    exchangeRate: number;
    fee: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'mpesa'>('mpesa');

  const userBalance = parseFloat(user?.balance?.balance || '0');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceAmount: '',
      payoutDestination: '',
    },
  });

  const sourceAmount = watch('sourceAmount');

  useEffect(() => {
    const calculateRate = async () => {
      const amount = parseFloat(sourceAmount);
      if (!amount || amount <= 0) {
        setCalculation(null);
        return;
      }

      setIsCalculating(true);
      try {
        const response = await ratesApi.calculate({
          sourceCurrency: 'KES',
          destinationCurrency: 'USDT',
          amount,
          direction: 'buy',
        });

        if (response.success && response.data) {
          setCalculation({
            destinationAmount: response.data.destinationAmount,
            exchangeRate: response.data.exchangeRate,
            fee: response.data.fee,
          });
        }
      } catch {
        setCalculation(null);
      } finally {
        setIsCalculating(false);
      }
    };

    const debounce = setTimeout(calculateRate, 500);
    return () => clearTimeout(debounce);
  }, [sourceAmount]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    const amount = parseFloat(data.sourceAmount);
    if (paymentMethod === 'balance' && amount > userBalance) {
      setError('Insufficient balance. Please top up your wallet or use M-Pesa.');
      setIsLoading(false);
      return;
    }

    try {
      const paymentSource: PaymentSource | undefined =
        paymentMethod === 'balance' ? 'ACCOUNT_BALANCE' : undefined;

      const response = await ordersApi.create({
        orderType: 'KES_TO_CRYPTO',
        sourceCurrency: 'KES',
        destinationCurrency: 'USDT',
        sourceAmount: amount,
        payoutDestination: data.payoutDestination,
        paymentSource,
      });

      if (response.success && response.data) {
        if (paymentMethod === 'balance' && response.data.paidFromBalance) {
          const newBalance = userBalance - amount;
          updateUser({
            balance: {
              balance: newBalance.toString(),
              currency: 'KES',
            },
          });
        }

        const queryParam = response.data.paidFromBalance ? '?paid=true' : '';
        navigate(`/orders/${response.data.order.id}${queryParam}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  const insufficientBalance = userBalance < (parseFloat(sourceAmount) || 0);

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title="Buy USDT" description="Purchase USDT using M-Pesa or account balance." />
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Buy USDT</h1>
        <p className="text-sm text-gray-500">Pay with KES, receive USDT</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* You Pay */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">You Pay</label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="pr-14"
                  error={errors.sourceAmount?.message}
                  {...register('sourceAmount')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  KES
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <div className="p-1.5 bg-gray-100 rounded-full">
                <ArrowDown className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            {/* You Receive */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">You Receive</label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {isCalculating ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calculator className="h-4 w-4 animate-pulse" />
                    Calculating...
                  </div>
                ) : calculation ? (
                  <div>
                    <p className="text-xl font-bold text-blue-700">
                      {calculation.destinationAmount.toFixed(4)} USDT
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Rate: 1 USDT = {(1 / calculation.exchangeRate).toFixed(2)} KES
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Enter amount to see conversion</p>
                )}
              </div>
            </div>

            {/* Wallet Address */}
            <Input
              label="Your USDT Wallet (TRC-20)"
              placeholder="T..."
              helperText="USDT will be sent to this address"
              error={errors.payoutDestination?.message}
              {...register('payoutDestination')}
            />

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Pay with</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('balance')}
                  disabled={insufficientBalance && parseFloat(sourceAmount) > 0}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    paymentMethod === 'balance'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    insufficientBalance && parseFloat(sourceAmount) > 0
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-medium">Balance</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    KES {userBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    paymentMethod === 'mpesa'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">M-Pesa</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">STK Push</p>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={!calculation}
            >
              {paymentMethod === 'balance' ? 'Pay & Buy USDT' : 'Buy USDT'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default KesToCryptoPage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageTitle } from '../../components/ui/PageTitle';
import { ordersApi } from '../../api/orders.api';
import { ratesApi } from '../../api/rates.api';
import { useAuthStore } from '../../store/authStore';
import { CRYPTO_CURRENCIES } from '../../utils/constants';
import { PaymentSource } from '../../types';
import { ArrowDown, Calculator, Wallet, Smartphone } from 'lucide-react';

const formSchema = z.object({
  destinationCurrency: z.string().min(1, 'Please select a currency'),
  sourceAmount: z.string().min(1, 'Please enter an amount').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  payoutDestination: z.string().min(20, 'Please enter a valid wallet address'),
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

  // Get user's balance
  const userBalance = parseFloat(user?.balance?.balance || '0');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destinationCurrency: 'USDT',
      sourceAmount: '',
      payoutDestination: '',
    },
  });

  const destinationCurrency = watch('destinationCurrency');
  const sourceAmount = watch('sourceAmount');

  useEffect(() => {
    const calculateRate = async () => {
      const amount = parseFloat(sourceAmount);
      if (!amount || amount <= 0 || !destinationCurrency) {
        setCalculation(null);
        return;
      }

      setIsCalculating(true);
      try {
        const response = await ratesApi.calculate({
          sourceCurrency: 'KES',
          destinationCurrency,
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
      } catch (err) {
        setCalculation(null);
      } finally {
        setIsCalculating(false);
      }
    };

    const debounce = setTimeout(calculateRate, 500);
    return () => clearTimeout(debounce);
  }, [destinationCurrency, sourceAmount]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    // Validate balance payment
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
        destinationCurrency: data.destinationCurrency,
        sourceAmount: amount,
        payoutDestination: data.payoutDestination,
        paymentSource,
      });

      if (response.success && response.data) {
        // If paid from balance, update user's balance in store
        if (paymentMethod === 'balance' && response.data.paidFromBalance) {
          const newBalance = userBalance - amount;
          updateUser({
            balance: {
              balance: newBalance.toString(),
              currency: 'KES',
            },
          });
        }

        // Redirect to order detail page
        // Add query param to indicate if it was paid from balance (for showing success message)
        const queryParam = response.data.paidFromBalance ? '?paid=true' : '';
        navigate(`/orders/${response.data.order.id}${queryParam}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle title="Buy Crypto" description="Purchase USDT or USDC using M-Pesa with competitive rates." />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Buy Crypto with KES</h1>
        <p className="text-gray-600">Purchase USDT or USDC using M-Pesa</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">You Pay (KES)</label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                error={errors.sourceAmount?.message}
                {...register('sourceAmount')}
              />
            </div>

            <div className="flex justify-center">
              <div className="p-2 bg-gray-100 rounded-full">
                <ArrowDown className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">You Receive</label>
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {isCalculating ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calculator className="h-4 w-4 animate-pulse" />
                      Calculating...
                    </div>
                  ) : calculation ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {calculation.destinationAmount.toFixed(4)} {destinationCurrency}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Rate: 1 {destinationCurrency} = {(1 / calculation.exchangeRate).toFixed(2)} KES
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400">Enter amount to see conversion</p>
                  )}
                </div>
                <div className="w-32">
                  <Select
                    options={CRYPTO_CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
                    {...register('destinationCurrency')}
                  />
                </div>
              </div>
            </div>

            <Input
              label="Your Wallet Address"
              placeholder="Enter your crypto wallet address"
              helperText="This is where you will receive your crypto"
              error={errors.payoutDestination?.message}
              {...register('payoutDestination')}
            />

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('balance')}
                  disabled={userBalance < (parseFloat(sourceAmount) || 0)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    paymentMethod === 'balance'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    userBalance < (parseFloat(sourceAmount) || 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-primary-600" />
                    <span className="font-medium">Account Balance</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    KES {userBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} available
                  </p>
                  {userBalance < (parseFloat(sourceAmount) || 0) && parseFloat(sourceAmount) > 0 && (
                    <p className="text-xs text-red-500 mt-1">Insufficient balance</p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    paymentMethod === 'mpesa'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <span className="font-medium">M-Pesa</span>
                  </div>
                  <p className="text-sm text-gray-500">Pay with STK Push</p>
                </button>
              </div>
              {paymentMethod === 'balance' && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <span>Instant payment from your balance - no M-Pesa prompt needed!</span>
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={!calculation}
            >
              {paymentMethod === 'balance' ? 'Pay & Create Order' : 'Create Order'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default KesToCryptoPage;

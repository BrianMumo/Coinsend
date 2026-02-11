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
import { formatCurrency } from '../../utils/formatters';
import { ArrowDown, Calculator } from 'lucide-react';

const formSchema = z.object({
  sourceAmount: z.string().min(1, 'Please enter an amount').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  payoutDestination: z.string().min(10, 'Please enter a valid M-Pesa number'),
});

type FormData = z.infer<typeof formSchema>;

const CryptoToKesPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<{
    destinationAmount: number;
    exchangeRate: number;
    fee: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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
          sourceCurrency: 'USDT',
          destinationCurrency: 'KES',
          amount,
          direction: 'sell',
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

    try {
      const response = await ordersApi.create({
        orderType: 'CRYPTO_TO_KES',
        sourceCurrency: 'USDT',
        destinationCurrency: 'KES',
        sourceAmount: parseFloat(data.sourceAmount),
        payoutDestination: data.payoutDestination,
      });

      if (response.success && response.data) {
        navigate(`/orders/${response.data.order.id}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title="Sell USDT" description="Convert your USDT to Kenya Shillings via M-Pesa." />
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Sell USDT</h1>
        <p className="text-sm text-gray-500">Convert USDT to KES</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* You Send */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">You Send</label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="pr-16"
                  error={errors.sourceAmount?.message}
                  {...register('sourceAmount')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  USDT
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                {isCalculating ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calculator className="h-4 w-4 animate-pulse" />
                    Calculating...
                  </div>
                ) : calculation ? (
                  <div>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(calculation.destinationAmount, 'KES')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Rate: 1 USDT = {calculation.exchangeRate.toFixed(2)} KES
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Enter amount to see conversion</p>
                )}
              </div>
            </div>

            {/* M-Pesa Number */}
            <Input
              label="M-Pesa Phone Number"
              placeholder="+254 7XX XXX XXX"
              helperText="You'll receive KES here"
              error={errors.payoutDestination?.message}
              {...register('payoutDestination')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={!calculation}
            >
              Sell USDT
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CryptoToKesPage;

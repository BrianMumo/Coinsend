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
import { CRYPTO_CURRENCIES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { ArrowDown, Calculator } from 'lucide-react';

const formSchema = z.object({
  sourceCurrency: z.string().min(1, 'Please select a currency'),
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
      sourceCurrency: 'USDT',
      sourceAmount: '',
      payoutDestination: '',
    },
  });

  const sourceCurrency = watch('sourceCurrency');
  const sourceAmount = watch('sourceAmount');

  // Calculate rate when amount or currency changes
  useEffect(() => {
    const calculateRate = async () => {
      const amount = parseFloat(sourceAmount);
      if (!amount || amount <= 0 || !sourceCurrency) {
        setCalculation(null);
        return;
      }

      setIsCalculating(true);
      try {
        const response = await ratesApi.calculate({
          sourceCurrency,
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
      } catch (err) {
        setCalculation(null);
      } finally {
        setIsCalculating(false);
      }
    };

    const debounce = setTimeout(calculateRate, 500);
    return () => clearTimeout(debounce);
  }, [sourceCurrency, sourceAmount]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await ordersApi.create({
        orderType: 'CRYPTO_TO_KES',
        sourceCurrency: data.sourceCurrency,
        destinationCurrency: 'KES',
        sourceAmount: parseFloat(data.sourceAmount),
        payoutDestination: data.payoutDestination,
      });

      if (response.success && response.data) {
        navigate(`/orders/${response.data.order.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle title="Sell Crypto" description="Convert your USDT or USDC to Kenya Shillings via M-Pesa." />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sell Crypto for KES</h1>
        <p className="text-gray-600">Convert your USDT or USDC to Kenya Shillings</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* You Send */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">You Send</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    error={errors.sourceAmount?.message}
                    {...register('sourceAmount')}
                  />
                </div>
                <div className="w-32">
                  <Select
                    options={CRYPTO_CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
                    {...register('sourceCurrency')}
                  />
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="p-2 bg-gray-100 rounded-full">
                <ArrowDown className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            {/* You Receive */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">You Receive</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {isCalculating ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calculator className="h-4 w-4 animate-pulse" />
                    Calculating...
                  </div>
                ) : calculation ? (
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(calculation.destinationAmount, 'KES')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Rate: 1 {sourceCurrency} = {calculation.exchangeRate.toFixed(2)} KES
                    </p>
                    <p className="text-sm text-gray-500">
                      Fee: {formatCurrency(calculation.fee, sourceCurrency)}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">Enter amount to see conversion</p>
                )}
              </div>
            </div>

            {/* M-Pesa Number */}
            <Input
              label="M-Pesa Phone Number"
              placeholder="+254 7XX XXX XXX"
              helperText="This is where you will receive your KES"
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
              Create Order
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CryptoToKesPage;

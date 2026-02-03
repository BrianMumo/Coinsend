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
import { CROSS_BORDER_DESTINATIONS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { Globe } from 'lucide-react';

const formSchema = z.object({
  destinationCurrency: z.string().min(1, 'Please select a destination'),
  sourceAmount: z.string().min(1, 'Please enter an amount').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  recipientName: z.string().min(2, 'Please enter recipient name'),
  recipientPhone: z.string().min(10, 'Please enter recipient phone number'),
  recipientBank: z.string().optional(),
  recipientAccount: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const CrossBorderPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<{
    destinationAmount: number;
    exchangeRate: number;
    fee: number;
  } | null>(null);
  const [_isCalculating, setIsCalculating] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destinationCurrency: '',
      sourceAmount: '',
      recipientName: '',
      recipientPhone: '',
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
  }, [destinationCurrency, sourceAmount]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await ordersApi.create({
        orderType: 'CROSS_BORDER',
        sourceCurrency: 'KES',
        destinationCurrency: data.destinationCurrency,
        sourceAmount: parseFloat(data.sourceAmount),
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        recipientBank: data.recipientBank,
        recipientAccount: data.recipientAccount,
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

  const selectedDestination = CROSS_BORDER_DESTINATIONS.find(
    (d) => d.value === destinationCurrency
  );

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle title="Cross-Border Payment" description="Send money internationally to South Africa, Uganda, Tanzania, Nigeria, China, or UAE." />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cross-Border Payment</h1>
        <p className="text-gray-600">Send money to recipients in other countries</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Select
              label="Destination Country"
              placeholder="Select destination"
              options={CROSS_BORDER_DESTINATIONS.map((d) => ({
                value: d.value,
                label: `${d.flag} ${d.country} (${d.value})`,
              }))}
              error={errors.destinationCurrency?.message}
              {...register('destinationCurrency')}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Amount to Send (KES)</label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                error={errors.sourceAmount?.message}
                {...register('sourceAmount')}
              />
            </div>

            {calculation && selectedDestination && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-primary-700 mb-2">
                  <Globe className="h-5 w-5" />
                  <span className="font-medium">Recipient will receive</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(calculation.destinationAmount, destinationCurrency)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Exchange rate: 1 KES = {calculation.exchangeRate.toFixed(4)} {destinationCurrency}
                </p>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Recipient Details</h3>

              <div className="space-y-4">
                <Input
                  label="Recipient Full Name"
                  placeholder="As appears on their ID"
                  error={errors.recipientName?.message}
                  {...register('recipientName')}
                />

                <Input
                  label="Recipient Phone Number"
                  placeholder="Include country code"
                  error={errors.recipientPhone?.message}
                  {...register('recipientPhone')}
                />

                <Input
                  label="Bank Name (Optional)"
                  placeholder="Recipient's bank"
                  {...register('recipientBank')}
                />

                <Input
                  label="Account Number (Optional)"
                  placeholder="Bank account number"
                  {...register('recipientAccount')}
                />
              </div>
            </div>

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

export default CrossBorderPage;

import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { PageTitle } from '../../components/ui/PageTitle';
import { ratesApi } from '../../api/rates.api';
import { ExchangeRate } from '../../types';
import { formatDate } from '../../utils/formatters';

const RatesPage = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await ratesApi.getAll();
        if (response.success && response.data) {
          setRates(response.data.rates);
        }
      } catch (err: any) {
        setError('Failed to load exchange rates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, []);

  const formatPair = (pair: string) => {
    const [from, to] = pair.split('_');
    return `${from} / ${to}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Exchange Rates" description="View current crypto and cross-border transfer rates on Coinsend." />
      <Header />

      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exchange Rates</h1>
          <p className="text-gray-600">Current rates for crypto and cross-border transfers</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : (
          <div className="space-y-6">
            {/* Crypto Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Crypto Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b">
                        <th className="pb-3 font-medium">Pair</th>
                        <th className="pb-3 font-medium text-right">Buy Rate</th>
                        <th className="pb-3 font-medium text-right">Sell Rate</th>
                        <th className="pb-3 font-medium text-right">Spread</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rates
                        .filter((rate) => rate.pair.includes('USDT') || rate.pair.includes('USDC'))
                        .map((rate) => (
                          <tr key={rate.id} className="text-sm">
                            <td className="py-3 font-medium">{formatPair(rate.pair)}</td>
                            <td className="py-3 text-right text-green-600">
                              {parseFloat(rate.buyRate).toFixed(2)}
                            </td>
                            <td className="py-3 text-right text-blue-600">
                              {parseFloat(rate.sellRate).toFixed(2)}
                            </td>
                            <td className="py-3 text-right text-gray-500">
                              {(parseFloat(rate.spread) * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Cross-Border Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Cross-Border Rates (KES)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b">
                        <th className="pb-3 font-medium">Destination</th>
                        <th className="pb-3 font-medium text-right">Rate</th>
                        <th className="pb-3 font-medium text-right">Min Amount</th>
                        <th className="pb-3 font-medium text-right">Max Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rates
                        .filter((rate) => rate.pair.startsWith('KES_') && !rate.pair.includes('USD'))
                        .map((rate) => {
                          const [, to] = rate.pair.split('_');
                          const countryNames: Record<string, string> = {
                            ZAR: 'South Africa',
                            UGX: 'Uganda',
                            TZS: 'Tanzania',
                            NGN: 'Nigeria',
                            CNY: 'China',
                            AED: 'UAE',
                          };
                          return (
                            <tr key={rate.id} className="text-sm">
                              <td className="py-3 font-medium">
                                {countryNames[to] || to} ({to})
                              </td>
                              <td className="py-3 text-right">
                                1 KES = {parseFloat(rate.sellRate).toFixed(4)} {to}
                              </td>
                              <td className="py-3 text-right text-gray-500">
                                KES {parseFloat(rate.minAmount).toLocaleString()}
                              </td>
                              <td className="py-3 text-right text-gray-500">
                                KES {parseFloat(rate.maxAmount).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-gray-500">
              Rates last updated: {rates.length > 0 ? formatDate(rates[0].lastUpdated) : 'N/A'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatesPage;

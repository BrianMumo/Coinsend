import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminLiquidityApi } from '../../api/admin.api';
import { LiquidityBalance } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Edit2, Save, X } from 'lucide-react';

const AdminLiquidityPage = () => {
  const [balances, setBalances] = useState<LiquidityBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBalances = async () => {
    try {
      const response = await adminLiquidityApi.getAll();
      if (response.success && response.data) {
        setBalances(response.data.balances);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const handleEdit = (balance: LiquidityBalance) => {
    setEditingCurrency(balance.currency);
    setEditValue(balance.balance);
    setEditNotes(balance.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingCurrency(null);
    setEditValue('');
    setEditNotes('');
  };

  const handleSave = async (currency: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminLiquidityApi.update(
        currency,
        parseFloat(editValue),
        editNotes || undefined
      );

      if (response.success && response.data) {
        setBalances(
          balances.map((b) =>
            b.currency === currency ? response.data!.balance : b
          )
        );
        setSuccess(`${currency} balance updated successfully`);
        setEditingCurrency(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update balance');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrencyInfo = (currency: string) => {
    const info: Record<string, { name: string; flag: string; type: string }> = {
      KES: { name: 'Kenya Shilling', flag: '🇰🇪', type: 'fiat' },
      USD: { name: 'US Dollar', flag: '🇺🇸', type: 'fiat' },
      ZAR: { name: 'South African Rand', flag: '🇿🇦', type: 'fiat' },
      UGX: { name: 'Ugandan Shilling', flag: '🇺🇬', type: 'fiat' },
      TZS: { name: 'Tanzanian Shilling', flag: '🇹🇿', type: 'fiat' },
      NGN: { name: 'Nigerian Naira', flag: '🇳🇬', type: 'fiat' },
      CNY: { name: 'Chinese Yuan', flag: '🇨🇳', type: 'fiat' },
      AED: { name: 'UAE Dirham', flag: '🇦🇪', type: 'fiat' },
      USDT: { name: 'Tether USD', flag: '💲', type: 'crypto' },
      USDC: { name: 'USD Coin', flag: '💵', type: 'crypto' },
    };
    return info[currency] || { name: currency, flag: '💰', type: 'other' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const cryptoBalances = balances.filter((b) => getCurrencyInfo(b.currency).type === 'crypto');
  const fiatBalances = balances.filter((b) => getCurrencyInfo(b.currency).type === 'fiat');

  return (
    <div className="space-y-6">
      <PageTitle title="Liquidity Management" description="Monitor and update available liquidity balances." />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liquidity Management</h1>
        <p className="text-gray-600">Monitor and update available liquidity balances</p>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Crypto Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Crypto Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cryptoBalances.map((balance) => {
              const info = getCurrencyInfo(balance.currency);
              const isEditing = editingCurrency === balance.currency;

              return (
                <div
                  key={balance.currency}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{info.flag}</span>
                      <div>
                        <p className="font-medium">{balance.currency}</p>
                        <p className="text-xs text-gray-500">{info.name}</p>
                      </div>
                    </div>
                    {!isEditing && (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(balance)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        step="any"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <Input
                        placeholder="Notes (optional)"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(balance.currency)}
                          isLoading={isUpdating}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {parseFloat(balance.balance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {formatDate(balance.lastUpdated)}
                      </p>
                      {balance.notes && (
                        <p className="text-xs text-gray-400 mt-1">{balance.notes}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fiat Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Fiat Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fiatBalances.map((balance) => {
              const info = getCurrencyInfo(balance.currency);
              const isEditing = editingCurrency === balance.currency;

              return (
                <div
                  key={balance.currency}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.flag}</span>
                      <span className="font-medium">{balance.currency}</span>
                    </div>
                    {!isEditing && (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(balance)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        step="any"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleSave(balance.currency)}
                          isLoading={isUpdating}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xl font-bold">
                      {formatCurrency(balance.balance, balance.currency)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLiquidityPage;

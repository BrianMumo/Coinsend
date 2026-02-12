import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminRatesApi } from '../../api/admin.api';
import { ExchangeRate } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Edit2, Save, X, Plus } from 'lucide-react';

const AdminRatesPage = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ buyRate: string; sellRate: string }>({
    buyRate: '',
    sellRate: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRate, setNewRate] = useState({
    pair: '',
    buyRate: '',
    sellRate: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const fetchRates = async () => {
    try {
      setError(null);
      const response = await adminRatesApi.getAll();
      if (response.success && response.data) {
        setRates(response.data.rates);
      }
    } catch (err: any) {
      console.error('Failed to fetch rates:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch rates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleEdit = (rate: ExchangeRate) => {
    setEditingId(rate.id);
    setEditValues({
      buyRate: rate.buyRate,
      sellRate: rate.sellRate,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({ buyRate: '', sellRate: '' });
  };

  const handleSave = async (id: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminRatesApi.update(id, {
        buyRate: parseFloat(editValues.buyRate),
        sellRate: parseFloat(editValues.sellRate),
      });

      if (response.success && response.data) {
        setRates(rates.map((r) => (r.id === id ? response.data!.rate : r)));
        setSuccess('Rate updated successfully');
        setEditingId(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update rate');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
      const response = await adminRatesApi.create({
        pair: newRate.pair.toUpperCase(),
        buyRate: parseFloat(newRate.buyRate),
        sellRate: parseFloat(newRate.sellRate),
      });

      if (response.success && response.data) {
        setRates([...rates, response.data.rate]);
        setSuccess('Rate added successfully');
        setShowAddForm(false);
        setNewRate({ pair: '', buyRate: '', sellRate: '' });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add rate');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Exchange Rates" description="Manage buy and sell rates for all currency pairs." />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exchange Rates</h1>
          <p className="text-gray-600">Manage buy and sell rates for all currency pairs</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rate
        </Button>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Add Rate Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRate} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Pair (e.g., USDT_KES)"
                  placeholder="USDT_KES"
                  value={newRate.pair}
                  onChange={(e) => setNewRate({ ...newRate, pair: e.target.value })}
                  required
                />
                <Input
                  label="Buy Rate"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={newRate.buyRate}
                  onChange={(e) => setNewRate({ ...newRate, buyRate: e.target.value })}
                  required
                />
                <Input
                  label="Sell Rate"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={newRate.sellRate}
                  onChange={(e) => setNewRate({ ...newRate, sellRate: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={isAdding}>
                  Add Rate
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rates Table */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Pair</th>
                  <th className="pb-3 font-medium">Buy Rate</th>
                  <th className="pb-3 font-medium">Sell Rate</th>
                  <th className="pb-3 font-medium">Spread</th>
                  <th className="pb-3 font-medium">Min/Max</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Updated</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rates.map((rate) => (
                  <tr key={rate.id} className="text-sm">
                    <td className="py-3 font-medium">{rate.pair}</td>
                    <td className="py-3">
                      {editingId === rate.id ? (
                        <Input
                          type="number"
                          step="any"
                          value={editValues.buyRate}
                          onChange={(e) =>
                            setEditValues({ ...editValues, buyRate: e.target.value })
                          }
                          className="w-32"
                        />
                      ) : (
                        <span className="text-green-600">
                          {parseFloat(rate.buyRate).toFixed(4)}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {editingId === rate.id ? (
                        <Input
                          type="number"
                          step="any"
                          value={editValues.sellRate}
                          onChange={(e) =>
                            setEditValues({ ...editValues, sellRate: e.target.value })
                          }
                          className="w-32"
                        />
                      ) : (
                        <span className="text-blue-600">
                          {parseFloat(rate.sellRate).toFixed(4)}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {(parseFloat(rate.spread) * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 text-gray-500">
                      {parseFloat(rate.minAmount).toLocaleString()} -{' '}
                      {parseFloat(rate.maxAmount).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          rate.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{formatDate(rate.lastUpdated)}</td>
                    <td className="py-3">
                      {editingId === rate.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(rate.id)}
                            disabled={isUpdating}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(rate)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRatesPage;

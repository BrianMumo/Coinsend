import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminWalletsApi } from '../../api/admin.api';
import { Wallet } from '../../types';
import { truncateAddress } from '../../utils/formatters';
import { Plus, Copy, CheckCircle, Power } from 'lucide-react';

const AdminWalletsPage = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWallet, setNewWallet] = useState({
    currency: 'USDT',
    network: 'TRON',
    address: '',
    label: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchWallets = async () => {
    try {
      const response = await adminWalletsApi.getAll();
      if (response.success && response.data) {
        setWallets(response.data.wallets);
      }
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
      const response = await adminWalletsApi.create(newWallet);
      if (response.success && response.data) {
        setWallets([...wallets, response.data.wallet]);
        setSuccess('Wallet added successfully');
        setShowAddForm(false);
        setNewWallet({ currency: 'USDT', network: 'TRON', address: '', label: '' });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to add wallet');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleWalletStatus = async (wallet: Wallet) => {
    try {
      const response = await adminWalletsApi.update(wallet.id, {
        isActive: !wallet.isActive,
      });
      if (response.success && response.data) {
        setWallets(wallets.map((w) => (w.id === wallet.id ? response.data!.wallet : w)));
        setSuccess(`Wallet ${wallet.isActive ? 'deactivated' : 'activated'} successfully`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update wallet');
    }
  };

  const currencyOptions = [
    { value: 'USDT', label: 'USDT' },
    { value: 'USDC', label: 'USDC' },
    { value: 'BTC', label: 'BTC' },
    { value: 'ETH', label: 'ETH' },
  ];

  const networkOptions = [
    { value: 'TRON', label: 'TRON (TRC20)' },
    { value: 'ETHEREUM', label: 'Ethereum (ERC20)' },
    { value: 'BSC', label: 'BNB Chain (BEP20)' },
    { value: 'POLYGON', label: 'Polygon' },
    { value: 'BITCOIN', label: 'Bitcoin' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Deposit Wallets" description="Manage wallet addresses for receiving crypto payments." />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deposit Wallets</h1>
          <p className="text-gray-600">Manage wallet addresses for receiving crypto payments</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Add Wallet Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWallet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Currency"
                  options={currencyOptions}
                  value={newWallet.currency}
                  onChange={(e) => setNewWallet({ ...newWallet, currency: e.target.value })}
                />
                <Select
                  label="Network"
                  options={networkOptions}
                  value={newWallet.network}
                  onChange={(e) => setNewWallet({ ...newWallet, network: e.target.value })}
                />
              </div>
              <Input
                label="Wallet Address"
                placeholder="Enter wallet address"
                value={newWallet.address}
                onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                required
              />
              <Input
                label="Label (Optional)"
                placeholder="e.g., Main USDT Wallet"
                value={newWallet.label}
                onChange={(e) => setNewWallet({ ...newWallet, label: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit" isLoading={isAdding}>
                  Add Wallet
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Wallets List */}
      <Card>
        <CardContent>
          {wallets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No wallets configured</p>
              <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                Add Your First Wallet
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Currency</th>
                    <th className="pb-3 font-medium">Network</th>
                    <th className="pb-3 font-medium">Address</th>
                    <th className="pb-3 font-medium">Label</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wallets.map((wallet) => (
                    <tr key={wallet.id} className="text-sm">
                      <td className="py-3 font-medium">{wallet.currency}</td>
                      <td className="py-3">{wallet.network}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {truncateAddress(wallet.address, 8)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(wallet.address)}
                          >
                            {copied === wallet.address ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 text-gray-500">{wallet.label || '-'}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            wallet.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {wallet.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleWalletStatus(wallet)}
                        >
                          <Power
                            className={`h-4 w-4 ${
                              wallet.isActive ? 'text-red-500' : 'text-green-500'
                            }`}
                          />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletsPage;

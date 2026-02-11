import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { PageTitle } from '../../components/ui/PageTitle';
import { balanceApi } from '../../api/balance.api';
import { BalanceTransaction, BalanceWithHistory, UsdtBalance, UsdtTransaction } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
  RefreshCw,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

const WalletPage = () => {
  const { user, updateUser } = useAuthStore();
  const [data, setData] = useState<BalanceWithHistory | null>(null);
  const [usdtData, setUsdtData] = useState<UsdtBalance | null>(null);
  const [usdtTransactions, setUsdtTransactions] = useState<UsdtTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kes' | 'usdt'>('kes');

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showUsdtWithdrawModal, setShowUsdtWithdrawModal] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState(user?.phone || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(user?.phone || '');
  const [usdtWithdrawAmount, setUsdtWithdrawAmount] = useState('');
  const [usdtWithdrawAddress, setUsdtWithdrawAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Polling for deposit status
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const [kesResponse, usdtResponse, usdtTxResponse] = await Promise.all([
        balanceApi.getBalance({ limit: 20 }),
        balanceApi.getUsdtBalance(),
        balanceApi.getUsdtTransactions({ limit: 20 }),
      ]);

      if (kesResponse.success && kesResponse.data) {
        setData(kesResponse.data);
        if (kesResponse.data.balance) {
          updateUser({
            balance: {
              balance: kesResponse.data.balance.balance,
              usdtBalance: kesResponse.data.balance.usdtBalance,
              currency: kesResponse.data.balance.currency,
            },
          });
        }
      }

      if (usdtResponse.success && usdtResponse.data) {
        setUsdtData(usdtResponse.data);
      }

      if (usdtTxResponse.success && usdtTxResponse.data) {
        setUsdtTransactions(usdtTxResponse.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to load balance');
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Poll for pending deposit status
  useEffect(() => {
    if (!pendingDepositId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await balanceApi.checkDepositStatus(pendingDepositId);
        if (response.success && response.data) {
          if (response.data.isCompleted) {
            setFormSuccess('Deposit completed successfully!');
            setPendingDepositId(null);
            fetchBalance();
          } else if (response.data.status === 'FAILED') {
            setFormError('Deposit failed. Please try again.');
            setPendingDepositId(null);
          }
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (pendingDepositId) {
        setFormError('Deposit timed out. Please check your transaction history.');
        setPendingDepositId(null);
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [pendingDepositId, fetchBalance]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) {
      setFormError('Minimum deposit is KES 10');
      return;
    }
    if (amount > 150000) {
      setFormError('Maximum deposit is KES 150,000');
      return;
    }
    if (!depositPhone) {
      setFormError('Phone number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await balanceApi.deposit(amount, depositPhone);
      if (response.success && response.data) {
        setFormSuccess('Check your phone for M-Pesa prompt');
        setPendingDepositId(response.data.transactionId);
        setDepositAmount('');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(error.response?.data?.error?.message || 'Failed to initiate deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amount = parseFloat(withdrawAmount);
    const currentBalance = parseFloat(data?.balance?.balance || '0');

    if (isNaN(amount) || amount < 10) {
      setFormError('Minimum withdrawal is KES 10');
      return;
    }
    if (amount > 70000) {
      setFormError('Maximum withdrawal is KES 70,000');
      return;
    }
    if (amount > currentBalance) {
      setFormError('Insufficient balance');
      return;
    }
    if (!withdrawPhone) {
      setFormError('Phone number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await balanceApi.withdraw(amount, withdrawPhone);
      if (response.success) {
        setFormSuccess('Withdrawal initiated! You will receive the funds shortly.');
        setWithdrawAmount('');
        setShowWithdrawModal(false);
        fetchBalance();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(error.response?.data?.error?.message || 'Failed to initiate withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsdtWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amount = parseFloat(usdtWithdrawAmount);
    const currentUsdtBalance = parseFloat(usdtData?.usdtBalance || '0');

    if (isNaN(amount) || amount < 1) {
      setFormError('Minimum withdrawal is 1 USDT');
      return;
    }
    if (amount > 10000) {
      setFormError('Maximum withdrawal is 10,000 USDT');
      return;
    }
    if (amount > currentUsdtBalance) {
      setFormError('Insufficient USDT balance');
      return;
    }
    if (!usdtWithdrawAddress || usdtWithdrawAddress.length < 30) {
      setFormError('Please enter a valid TRON wallet address');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await balanceApi.withdrawUsdt(amount, usdtWithdrawAddress);
      if (response.success && response.data) {
        setFormSuccess(`USDT sent! TX: ${response.data.txHash?.slice(0, 16)}...`);
        setUsdtWithdrawAmount('');
        setUsdtWithdrawAddress('');
        setTimeout(() => {
          setShowUsdtWithdrawModal(false);
          setFormSuccess(null);
          fetchBalance();
        }, 3000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(error.response?.data?.error?.message || 'Failed to withdraw USDT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAddress = async () => {
    if (usdtData?.depositAddress) {
      await navigator.clipboard.writeText(usdtData.depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('DEPOSIT')) {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    if (type.includes('WITHDRAWAL') || type === 'ORDER_PAYMENT') {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    }
    if (type === 'ORDER_REFUND') {
      return <ArrowDownLeft className="h-4 w-4 text-purple-600" />;
    }
    return <RefreshCw className="h-4 w-4 text-gray-600" />;
  };

  const getStatusVariant = (status: string): 'pending' | 'completed' | 'failed' | 'cancelled' => {
    switch (status) {
      case 'COMPLETED':
        return 'completed';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
        return 'failed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'pending';
    }
  };

  const formatTransactionType = (type: string) => {
    const types: Record<string, string> = {
      DEPOSIT: 'Deposit',
      WITHDRAWAL: 'Withdrawal',
      ORDER_PAYMENT: 'Order Payment',
      ORDER_REFUND: 'Refund',
      ADJUSTMENT: 'Adjustment',
      USDT_DEPOSIT: 'USDT Deposit',
      USDT_WITHDRAWAL: 'USDT Withdrawal',
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="Error">
          {error}
        </Alert>
        <Button onClick={fetchBalance}>Try Again</Button>
      </div>
    );
  }

  const currentBalance = parseFloat(data?.balance?.balance || '0');
  const currentUsdtBalance = parseFloat(usdtData?.usdtBalance || '0');

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageTitle
        title="Wallet"
        description="Manage your KES and USDT balances."
      />

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('kes')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'kes'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          KES Balance
        </button>
        <button
          onClick={() => setActiveTab('usdt')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'usdt'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          USDT Balance
        </button>
      </div>

      {/* KES Tab */}
      {activeTab === 'kes' && (
        <>
          {/* KES Balance Card */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-green-100 uppercase tracking-wide">KES Balance</p>
                  <p className="text-3xl font-bold mt-1">
                    {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDepositModal(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <ArrowDownLeft className="h-4 w-4 mr-1" />
                    Deposit
                  </Button>
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={currentBalance < 10}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KES Transaction History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">KES Transactions</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchBalance}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {data?.transactions && data.transactions.filter(tx => tx.currency !== 'USDT').length > 0 ? (
                <div className="space-y-2">
                  {data.transactions.filter(tx => tx.currency !== 'USDT').slice(0, 10).map((tx: BalanceTransaction) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatTransactionType(tx.type)}</p>
                          <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(tx.amount) >= 0 ? '+' : ''}KES {Math.abs(parseFloat(tx.amount)).toLocaleString()}
                        </p>
                        <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No KES transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* USDT Tab */}
      {activeTab === 'usdt' && (
        <>
          {/* USDT Balance Card */}
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-blue-100 uppercase tracking-wide">USDT Balance (TRC-20)</p>
                  <p className="text-3xl font-bold mt-1">
                    {currentUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </p>
                </div>
                <Button
                  onClick={() => setShowUsdtWithdrawModal(true)}
                  disabled={currentUsdtBalance < 1}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* USDT Deposit Address */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Deposit USDT</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-500 mb-3">
                Send USDT (TRC-20) to this address to deposit to your account:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-2">
                <code className="text-xs sm:text-sm break-all font-mono">
                  {usdtData?.depositAddress || 'Loading...'}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Important:</strong> Only send USDT on the TRON network (TRC-20).
                  Deposits from other networks will be lost.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* USDT Transaction History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">USDT Transactions</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchBalance}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {usdtTransactions.length > 0 ? (
                <div className="space-y-2">
                  {usdtTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatTransactionType(tx.type)}</p>
                          <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(tx.amount) >= 0 ? '+' : ''}{Math.abs(parseFloat(tx.amount)).toFixed(2)} USDT
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                          <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                            {tx.status}
                          </Badge>
                          {tx.txHash && (
                            <a
                              href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No USDT transactions yet</p>
                  <p className="text-xs mt-1">Deposit USDT to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* KES Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Deposit KES</h2>
              <button onClick={() => { setShowDepositModal(false); setFormError(null); setFormSuccess(null); setPendingDepositId(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            {formError && <Alert variant="error" className="mb-4">{formError}</Alert>}
            {formSuccess && (
              <Alert variant="success" className="mb-4">
                {formSuccess}
                {pendingDepositId && (
                  <div className="flex items-center gap-2 mt-2">
                    <Spinner size="sm" />
                    <span className="text-sm">Waiting for payment...</span>
                  </div>
                )}
              </Alert>
            )}
            <form onSubmit={handleDeposit} className="space-y-4">
              <Input label="Amount (KES)" type="number" min="10" max="150000" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Enter amount" required disabled={isSubmitting || !!pendingDepositId} />
              <Input label="M-Pesa Phone" type="tel" value={depositPhone} onChange={(e) => setDepositPhone(e.target.value)} placeholder="0712345678" required disabled={isSubmitting || !!pendingDepositId} />
              <p className="text-xs text-gray-500">You will receive an M-Pesa prompt on your phone.</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowDepositModal(false); setFormError(null); setFormSuccess(null); setPendingDepositId(null); }} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="flex-1" isLoading={isSubmitting} disabled={isSubmitting || !!pendingDepositId}>Deposit</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KES Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Withdraw KES</h2>
              <button onClick={() => { setShowWithdrawModal(false); setFormError(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            {formError && <Alert variant="error" className="mb-4">{formError}</Alert>}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Available</p>
              <p className="text-xl font-bold">KES {currentBalance.toLocaleString()}</p>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <Input label="Amount (KES)" type="number" min="10" max={Math.min(70000, currentBalance)} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter amount" required disabled={isSubmitting} />
              <Input label="M-Pesa Phone" type="tel" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} placeholder="0712345678" required disabled={isSubmitting} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowWithdrawModal(false); setFormError(null); }} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="flex-1" isLoading={isSubmitting}>Withdraw</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USDT Withdraw Modal */}
      {showUsdtWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Withdraw USDT</h2>
              <button onClick={() => { setShowUsdtWithdrawModal(false); setFormError(null); setFormSuccess(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            {formError && <Alert variant="error" className="mb-4">{formError}</Alert>}
            {formSuccess && <Alert variant="success" className="mb-4">{formSuccess}</Alert>}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Available</p>
              <p className="text-xl font-bold">{currentUsdtBalance.toFixed(2)} USDT</p>
            </div>
            <form onSubmit={handleUsdtWithdraw} className="space-y-4">
              <Input label="Amount (USDT)" type="number" min="1" max={Math.min(10000, currentUsdtBalance)} step="0.01" value={usdtWithdrawAmount} onChange={(e) => setUsdtWithdrawAmount(e.target.value)} placeholder="Enter amount" required disabled={isSubmitting} />
              <Input label="TRON Wallet Address (TRC-20)" type="text" value={usdtWithdrawAddress} onChange={(e) => setUsdtWithdrawAddress(e.target.value)} placeholder="T..." required disabled={isSubmitting} />
              <p className="text-xs text-gray-500">USDT will be sent to this address on the TRON network.</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowUsdtWithdrawModal(false); setFormError(null); setFormSuccess(null); }} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="flex-1" isLoading={isSubmitting}>Withdraw USDT</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;

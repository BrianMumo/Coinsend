import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { balanceApi, DepositIntentResponse } from '../../api/balance.api';
import { ratesApi } from '../../api/rates.api';
import { BalanceTransaction, BalanceWithHistory } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
  RefreshCw,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';

type TabType = 'all' | 'deposits' | 'withdrawals';
type DepositStep = 'amount' | 'address' | 'waiting';

const WalletPage = () => {
  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const [data, setData] = useState<BalanceWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [usdtRate, setUsdtRate] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit states
  const [depositStep, setDepositStep] = useState<DepositStep>('amount');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositIntent, setDepositIntent] = useState<DepositIntentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(user?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // USDT deposit address (Coinsend's hot wallet)
  const [depositAddress, setDepositAddress] = useState<string>('');

  // Check for action from navigation state
  useEffect(() => {
    const state = location.state as { action?: string } | null;
    if (state?.action === 'deposit') {
      setShowDepositModal(true);
    } else if (state?.action === 'withdraw') {
      setShowWithdrawModal(true);
    }
  }, [location.state]);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const [balanceResponse, usdtResponse, ratesResponse] = await Promise.all([
        balanceApi.getBalance({ limit: 50 }),
        balanceApi.getUsdtBalance(),
        ratesApi.getAll(),
      ]);

      if (balanceResponse.success && balanceResponse.data) {
        setData(balanceResponse.data);
        if (balanceResponse.data.balance) {
          updateUser({
            balance: {
              balance: balanceResponse.data.balance.balance,
              usdtBalance: balanceResponse.data.balance.usdtBalance,
              currency: balanceResponse.data.balance.currency,
            },
          });
        }
      }

      if (usdtResponse.success && usdtResponse.data) {
        setDepositAddress(usdtResponse.data.depositAddress);
      }

      if (ratesResponse.success && ratesResponse.data) {
        const rates = ratesResponse.data.rates || ratesResponse.data;
        const usdtKes = Array.isArray(rates) ? rates.find((r: { pair: string; buyRate: string | number }) => r.pair === 'USDT_KES') : null;
        if (usdtKes) {
          setUsdtRate(parseFloat(usdtKes.buyRate.toString()));
        }
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

  // Auto-refresh to check for deposits
  useEffect(() => {
    if (depositStep === 'waiting') {
      const interval = setInterval(() => {
        fetchBalance();
      }, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [depositStep, fetchBalance]);

  const handleCreateDepositIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 1) {
      setFormError('Minimum deposit is 1 USDT');
      return;
    }
    if (amount > 100000) {
      setFormError('Maximum deposit is 100,000 USDT');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await balanceApi.createDepositIntent(amount);
      if (response.success && response.data) {
        setDepositIntent(response.data);
        setDepositStep('address');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(error.response?.data?.error?.message || 'Failed to create deposit intent');
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
        setFormSuccess('Withdrawal initiated! You will receive the funds on M-Pesa shortly.');
        setWithdrawAmount('');
        setTimeout(() => {
          setShowWithdrawModal(false);
          setFormSuccess(null);
          fetchBalance();
        }, 3000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(error.response?.data?.error?.message || 'Failed to initiate withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAddress = async () => {
    const address = depositIntent?.depositAddress || depositAddress;
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setDepositStep('amount');
    setDepositAmount('');
    setDepositIntent(null);
    setFormError(null);
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('DEPOSIT') || type === 'ORDER_REFUND') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
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
      DEPOSIT: 'M-Pesa Deposit',
      WITHDRAWAL: 'M-Pesa Withdrawal',
      ORDER_PAYMENT: 'Order Payment',
      ORDER_REFUND: 'Refund',
      ADJUSTMENT: 'Adjustment',
      USDT_DEPOSIT: 'USDT → KES',
      USDT_WITHDRAWAL: 'USDT Withdrawal',
    };
    return types[type] || type;
  };

  // Filter transactions based on active tab
  const filteredTransactions = data?.transactions?.filter((tx: BalanceTransaction) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'deposits') {
      return tx.type.includes('DEPOSIT') || tx.type === 'ORDER_REFUND';
    }
    if (activeTab === 'withdrawals') {
      return tx.type.includes('WITHDRAWAL') || tx.type === 'ORDER_PAYMENT';
    }
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
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

  return (
    <div className="space-y-4">
      {/* KES Balance Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇰🇪</span>
              <span className="text-sm font-medium">KES Balance</span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              {showBalance ? (
                <EyeOff className="h-5 w-5 text-green-100" />
              ) : (
                <Eye className="h-5 w-5 text-green-100" />
              )}
            </button>
          </div>

          <p className="text-3xl font-bold mb-4">
            Ksh {showBalance
              ? currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })
              : '••••••'
            }
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={currentBalance < 10}
              className="flex-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Current Rate */}
      {usdtRate > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 text-sm">Rate:</span>
            <span className="font-semibold text-blue-800">1 USDT = KES {usdtRate.toLocaleString()}</span>
          </div>
          <button onClick={fetchBalance} className="p-1.5 hover:bg-blue-100 rounded-lg">
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </button>
        </div>
      )}

      {/* Transaction Tabs */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'all', label: 'All' },
            { key: 'deposits', label: 'Deposits' },
            { key: 'withdrawals', label: 'Withdrawals' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-gray-50">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx: BalanceTransaction) => (
              <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    tx.type.includes('DEPOSIT') || tx.type === 'ORDER_REFUND'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatTransactionType(tx.type)}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(tx.amount) >= 0 ? '+' : ''}
                    Ksh {Math.abs(parseFloat(tx.amount)).toLocaleString()}
                  </p>
                  <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm">No {activeTab === 'all' ? '' : activeTab} transactions</p>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
                {depositStep === 'amount' && 'Deposit USDT'}
                {depositStep === 'address' && 'Send USDT'}
                {depositStep === 'waiting' && 'Waiting for Deposit'}
              </h2>
              <button
                onClick={closeDepositModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1: Enter Amount */}
            {depositStep === 'amount' && (
              <form onSubmit={handleCreateDepositIntent} className="space-y-4">
                {formError && <Alert variant="error" className="text-sm">{formError}</Alert>}

                {/* Rate info */}
                {usdtRate > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 mb-1">Current Rate</p>
                    <p className="text-xl font-bold text-green-800">
                      1 USDT = KES {usdtRate.toLocaleString()}
                    </p>
                  </div>
                )}

                <Input
                  label="Amount (USDT)"
                  type="number"
                  min="1"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter USDT amount"
                  required
                  disabled={isSubmitting}
                />

                {depositAmount && parseFloat(depositAmount) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">You will receive approximately</p>
                    <p className="text-lg font-bold text-gray-900">
                      KES {(parseFloat(depositAmount) * usdtRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  isLoading={isSubmitting}
                >
                  Continue
                </Button>
              </form>
            )}

            {/* Step 2: Show Address */}
            {depositStep === 'address' && depositIntent && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-green-600">You send</span>
                    <span className="font-bold text-green-800">{depositIntent.expectedAmount} USDT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">You receive</span>
                    <span className="font-bold text-green-800">
                      KES {depositIntent.estimatedKes.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Deposit Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send exactly {depositIntent.expectedAmount} USDT to:
                  </label>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs break-all font-mono text-gray-800 flex-1">
                        {depositIntent.depositAddress}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      >
                        {copied ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Expires in 1 hour</span>
                </div>

                {/* Network Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ TRON Network Only</strong> - Send USDT on TRC-20 network only.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDepositStep('amount')}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setDepositStep('waiting')}
                  >
                    I've Sent It
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Waiting */}
            {depositStep === 'waiting' && depositIntent && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                </div>

                <div>
                  <p className="font-medium text-gray-900">Waiting for your deposit...</p>
                  <p className="text-sm text-gray-500 mt-1">
                    We're monitoring for {depositIntent.expectedAmount} USDT
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-left">
                  <p className="text-xs font-medium text-gray-500 mb-2">DEPOSIT ADDRESS</p>
                  <code className="text-xs break-all font-mono text-gray-800">
                    {depositIntent.depositAddress}
                  </code>
                </div>

                <p className="text-xs text-gray-500">
                  Once we detect your deposit, your balance will update automatically.
                  This page refreshes every 10 seconds.
                </p>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={closeDepositModal}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Withdraw to M-Pesa</h2>
              <button
                onClick={() => { setShowWithdrawModal(false); setFormError(null); setFormSuccess(null); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <Alert variant="error" className="mb-4 text-sm">{formError}</Alert>}
            {formSuccess && <Alert variant="success" className="mb-4 text-sm">{formSuccess}</Alert>}

            {/* Available Balance */}
            <div className="bg-green-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-green-600">Available</p>
              <p className="text-xl font-bold text-green-800">
                Ksh {currentBalance.toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <Input
                label="Amount (KES)"
                type="number"
                min="10"
                max={Math.min(70000, currentBalance)}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                required
                disabled={isSubmitting}
              />

              <Input
                label="M-Pesa Phone Number"
                type="tel"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                placeholder="0712345678"
                required
                disabled={isSubmitting}
              />

              <p className="text-xs text-gray-500 text-center">
                Min: KES 10 • Max: KES 70,000
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowWithdrawModal(false); setFormError(null); setFormSuccess(null); }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  isLoading={isSubmitting}
                >
                  Withdraw
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Receipt icon component for empty state
const Receipt = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default WalletPage;

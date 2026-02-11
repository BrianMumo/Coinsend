import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { balanceApi } from '../../api/balance.api';
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
} from 'lucide-react';

const WalletPage = () => {
  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const [data, setData] = useState<BalanceWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [usdtRate, setUsdtRate] = useState<number>(0);

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(user?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        balanceApi.getBalance({ limit: 20 }),
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
        const usdtKes = Array.isArray(rates) ? rates.find((r: { pair: string; buyRate: string | number }) => r.pair === 'USDT/KES') : null;
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
    if (depositAddress) {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-6">
      {/* KES Balance Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
          <div className="absolute -right-4 top-12 w-20 h-20 border-[12px] border-white rounded-full"></div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs">🇰🇪</span>
              </div>
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

          <p className="text-xs text-green-100 mb-1">Available Balance</p>
          <p className="text-4xl font-bold mb-4">
            Ksh {showBalance
              ? currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })
              : '••••••'
            }
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowDepositModal(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Deposit
            </Button>
            <Button
              onClick={() => setShowWithdrawModal(true)}
              disabled={currentBalance < 10}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Current Rate Card */}
      {usdtRate > 0 && (
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Current Rate</p>
                <p className="text-lg font-bold text-blue-800">1 USDT = KES {usdtRate.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">Deposit USDT</p>
                <p className="text-xs text-blue-600">Get KES instantly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchBalance}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {data?.transactions && data.transactions.length > 0 ? (
            <div className="space-y-1">
              {data.transactions.map((tx: BalanceTransaction) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type.includes('DEPOSIT') || tx.type === 'ORDER_REFUND'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatTransactionType(tx.type)}</p>
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
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Deposit USDT</h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Rate info */}
              {usdtRate > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-700 mb-1">Current Rate</p>
                  <p className="text-2xl font-bold text-green-800">
                    1 USDT = KES {usdtRate.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Send USDT and receive KES in your balance
                  </p>
                </div>
              )}

              {/* Deposit Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send USDT (TRC-20) to this address:
                </label>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <code className="text-sm break-all font-mono text-gray-800">
                      {depositAddress || 'Loading...'}
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
                </div>
              </div>

              {/* Network Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Only send USDT on the <strong>TRON network (TRC-20)</strong>.
                  Deposits from other networks will be lost.
                </p>
              </div>

              {/* Steps */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">How it works:</p>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="font-bold text-green-600">1.</span>
                    Send USDT to the address above
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-green-600">2.</span>
                    We receive and convert your USDT at the current rate
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-green-600">3.</span>
                    KES is credited to your balance instantly
                  </li>
                </ol>
              </div>

              <Button
                onClick={() => setShowDepositModal(false)}
                className="w-full"
                variant="outline"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Withdraw to M-Pesa</h2>
              <button
                onClick={() => { setShowWithdrawModal(false); setFormError(null); setFormSuccess(null); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <Alert variant="error" className="mb-4">{formError}</Alert>}
            {formSuccess && <Alert variant="success" className="mb-4">{formSuccess}</Alert>}

            {/* Available Balance */}
            <div className="bg-green-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-green-600">Available Balance</p>
              <p className="text-2xl font-bold text-green-800">
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

              <p className="text-xs text-gray-500">
                Minimum: KES 10 • Maximum: KES 70,000
              </p>

              <div className="flex gap-3 pt-2">
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

export default WalletPage;

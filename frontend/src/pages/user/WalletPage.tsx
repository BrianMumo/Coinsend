import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  DollarSign,
} from 'lucide-react';

type TabType = 'all' | 'deposits' | 'withdrawals';
type DepositStep = 'info' | 'verify' | 'success';

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
  const [depositStep, setDepositStep] = useState<DepositStep>('info');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [depositResult, setDepositResult] = useState<{ usdtAmount: number; kesAmount: number } | null>(null);
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
        const usdtKes = Array.isArray(rates) ? rates.find((r: { pair: string; sellRate: string | number }) => r.pair === 'USDT_KES') : null;
        if (usdtKes) {
          // Use sellRate for withdrawals (selling USDT for KES)
          setUsdtRate(parseFloat(usdtKes.sellRate.toString()));
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

  const handleVerifyDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const txHash = depositTxHash.trim();
    if (!txHash) {
      setFormError('Please enter your transaction hash');
      return;
    }
    if (txHash.length < 64) {
      setFormError('Invalid transaction hash format');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await balanceApi.verifyDeposit(txHash);
      if (response.success && response.data) {
        setDepositResult({
          usdtAmount: response.data.usdtAmount,
          kesAmount: response.data.kesAmount,
        });
        setDepositStep('success');
        // Refresh balance
        fetchBalance();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(error.response?.data?.error?.message || 'Failed to verify deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // New withdrawal handler - withdraws USDT as KES to M-Pesa
  const handleWithdrawToKes = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const usdtAmount = parseFloat(withdrawAmount);
    const currentUsdtBalance = parseFloat(data?.balance?.usdtBalance || '0');

    if (isNaN(usdtAmount) || usdtAmount < 1) {
      setFormError('Minimum withdrawal is 1 USDT');
      return;
    }
    if (usdtAmount > 5000) {
      setFormError('Maximum withdrawal is 5,000 USDT');
      return;
    }
    if (usdtAmount > currentUsdtBalance) {
      setFormError('Insufficient USDT balance');
      return;
    }
    if (!withdrawPhone) {
      setFormError('Phone number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await balanceApi.withdrawToKes(usdtAmount, withdrawPhone);
      if (response.success && response.data) {
        const kesAmount = parseFloat(response.data.kesAmount);
        setFormSuccess(`Sending KES ${kesAmount.toLocaleString()} to ${withdrawPhone}. You'll receive it shortly!`);
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

  const copyAddress = async (address?: string) => {
    const addressToCopy = address || depositAddress;
    if (addressToCopy) {
      await navigator.clipboard.writeText(addressToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setDepositStep('info');
    setDepositTxHash('');
    setDepositResult(null);
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
      USDT_DEPOSIT: 'USDT Deposit',
      USDT_WITHDRAWAL: 'USDT Withdrawal',
      KES_WITHDRAWAL: 'KES Withdrawal',
    };
    return types[type] || type;
  };

  const formatTransactionAmount = (tx: BalanceTransaction) => {
    const amount = Math.abs(parseFloat(tx.amount));
    const isCredit = parseFloat(tx.amount) >= 0;

    // For USDT transactions, show USDT
    if (tx.currency === 'USDT' || tx.type === 'USDT_DEPOSIT' || tx.type === 'USDT_WITHDRAWAL' || tx.type === 'KES_WITHDRAWAL') {
      return {
        text: `${isCredit ? '+' : '-'}${amount.toFixed(2)} USDT`,
        isCredit,
      };
    }

    // For KES transactions
    return {
      text: `${isCredit ? '+' : ''}KES ${amount.toLocaleString()}`,
      isCredit,
    };
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

  const usdtBalance = parseFloat(data?.balance?.usdtBalance || '0');
  const kesEquivalent = usdtBalance * usdtRate;
  const withdrawUsdtAmount = parseFloat(withdrawAmount || '0');
  const withdrawKesAmount = withdrawUsdtAmount * usdtRate;

  return (
    <div className="space-y-4">
      {/* USDT Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-medium">USDT Balance</span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              {showBalance ? (
                <EyeOff className="h-5 w-5 text-blue-100" />
              ) : (
                <Eye className="h-5 w-5 text-blue-100" />
              )}
            </button>
          </div>

          <p className="text-3xl font-bold mb-1">
            ${showBalance
              ? usdtBalance.toFixed(2)
              : '••••••'
            }
          </p>

          {showBalance && usdtRate > 0 && (
            <p className="text-sm text-blue-100 mb-4">
              ≈ KES {kesEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit USDT
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={usdtBalance < 1}
              className="flex-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw KES
            </button>
          </div>
        </div>
      </div>

      {/* Current Rate */}
      {usdtRate > 0 && (
        <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-sm">Rate:</span>
            <span className="font-semibold text-green-800">1 USDT = KES {usdtRate.toLocaleString()}</span>
          </div>
          <button onClick={fetchBalance} className="p-1.5 hover:bg-green-100 rounded-lg">
            <RefreshCw className="h-4 w-4 text-green-600" />
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
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
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
            filteredTransactions.map((tx: BalanceTransaction) => {
              const { text, isCredit } = formatTransactionAmount(tx);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isCredit ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatTransactionType(tx.type)}</p>
                      <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {text}
                    </p>
                    <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })
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
                {depositStep === 'info' && 'Deposit USDT'}
                {depositStep === 'verify' && 'Verify Deposit'}
                {depositStep === 'success' && 'Deposit Successful'}
              </h2>
              <button
                onClick={closeDepositModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1: Show Address & Instructions */}
            {depositStep === 'info' && (
              <div className="space-y-4">
                {formError && <Alert variant="error" className="text-sm">{formError}</Alert>}

                {/* Deposit Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send USDT (TRC-20) to:
                  </label>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs break-all font-mono text-gray-800 flex-1">
                        {depositAddress || 'Loading...'}
                      </code>
                      <button
                        onClick={() => copyAddress(depositAddress)}
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

                {/* Instructions */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">How to deposit:</p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Send any amount of USDT to the address above</li>
                    <li>Wait for the transaction to confirm</li>
                    <li>Copy your transaction hash from your wallet</li>
                    <li>Click "I've Sent USDT" and paste your transaction hash</li>
                  </ol>
                </div>

                {/* Network Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ TRON Network Only</strong> - Send USDT on TRC-20 network only. Other networks will not be credited.
                  </p>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setDepositStep('verify')}
                >
                  I've Sent USDT
                </Button>
              </div>
            )}

            {/* Step 2: Enter Transaction Hash */}
            {depositStep === 'verify' && (
              <form onSubmit={handleVerifyDeposit} className="space-y-4">
                {formError && <Alert variant="error" className="text-sm">{formError}</Alert>}

                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600">
                    Enter your TRON transaction hash to verify your deposit
                  </p>
                </div>

                <Input
                  label="Transaction Hash"
                  type="text"
                  value={depositTxHash}
                  onChange={(e) => setDepositTxHash(e.target.value)}
                  placeholder="e.g., a1b2c3d4e5f6..."
                  required
                  disabled={isSubmitting}
                />

                <p className="text-xs text-gray-500">
                  You can find this in your wallet's transaction history or on TronScan.
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setDepositStep('info'); setFormError(null); }}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    isLoading={isSubmitting}
                  >
                    Verify & Credit
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Success */}
            {depositStep === 'success' && depositResult && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <div>
                  <p className="font-medium text-gray-900">Deposit Successful!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your USDT balance has been credited
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">USDT Credited</span>
                    <span className="font-bold text-green-800">{depositResult.usdtAmount} USDT</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={closeDepositModal}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw to KES Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Withdraw to M-Pesa</h2>
              <button
                onClick={() => { setShowWithdrawModal(false); setFormError(null); setFormSuccess(null); setWithdrawAmount(''); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <Alert variant="error" className="mb-4 text-sm">{formError}</Alert>}
            {formSuccess && <Alert variant="success" className="mb-4 text-sm">{formSuccess}</Alert>}

            {/* Available USDT Balance */}
            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-blue-600">Available USDT</p>
              <p className="text-xl font-bold text-blue-800">
                ${usdtBalance.toFixed(2)}
              </p>
            </div>

            <form onSubmit={handleWithdrawToKes} className="space-y-4">
              <Input
                label="USDT Amount to Withdraw"
                type="number"
                step="0.01"
                min="1"
                max={Math.min(5000, usdtBalance)}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter USDT amount"
                required
                disabled={isSubmitting}
              />

              {/* KES Preview */}
              {withdrawUsdtAmount > 0 && usdtRate > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">You'll receive</span>
                    <span className="font-bold text-green-800">
                      KES {withdrawKesAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Rate: 1 USDT = KES {usdtRate.toLocaleString()}
                  </p>
                </div>
              )}

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
                Min: 1 USDT • Max: 5,000 USDT
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowWithdrawModal(false); setFormError(null); setFormSuccess(null); setWithdrawAmount(''); }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  isLoading={isSubmitting}
                >
                  Withdraw KES
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

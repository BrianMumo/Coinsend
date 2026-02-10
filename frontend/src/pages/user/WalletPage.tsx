import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { PageTitle } from '../../components/ui/PageTitle';
import { balanceApi } from '../../api/balance.api';
import { BalanceTransaction, BalanceWithHistory } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

const WalletPage = () => {
  const { user, updateUser } = useAuthStore();
  const [data, setData] = useState<BalanceWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState(user?.phone || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(user?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Polling for deposit status
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await balanceApi.getBalance({ limit: 20 });
      if (response.success && response.data) {
        setData(response.data);
        // Update user balance in store
        if (response.data.balance) {
          updateUser({
            balance: {
              balance: response.data.balance.balance,
              currency: response.data.balance.currency,
            },
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load balance');
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
      } catch (err) {
        // Continue polling
      }
    }, 3000);

    // Stop polling after 2 minutes
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
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to initiate deposit');
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
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to initiate withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'WITHDRAWAL':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'ORDER_PAYMENT':
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      case 'ORDER_REFUND':
        return <ArrowDownLeft className="h-4 w-4 text-purple-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
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
    <div className="space-y-6">
      <PageTitle
        title="Wallet"
        description="Manage your KES balance - deposit, withdraw, and view transaction history."
      />

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-primary-50">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-xl">
                <Wallet className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Available Balance</p>
                <p className="text-4xl font-bold text-gray-900">
                  KES {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowDepositModal(true)} className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Deposit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowWithdrawModal(true)}
                disabled={currentBalance < 10}
                className="flex items-center gap-2"
              >
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchBalance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {data?.transactions && data.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Reference</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.transactions.map((tx: BalanceTransaction) => (
                    <tr key={tx.id} className="text-sm">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.type)}
                          <span>{formatTransactionType(tx.type)}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={
                            parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                          }
                        >
                          {parseFloat(tx.amount) >= 0 ? '+' : ''}
                          KES {Math.abs(parseFloat(tx.amount)).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tx.status)}
                          <Badge variant={getStatusVariant(tx.status)}>
                            {tx.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 hidden sm:table-cell text-gray-500">
                        {tx.orderNumber || tx.reference || '-'}
                      </td>
                      <td className="py-3 text-gray-500">{formatDate(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
              <p className="text-sm">Deposit funds to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Deposit Funds</h2>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setFormError(null);
                  setFormSuccess(null);
                  setPendingDepositId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <Alert variant="error" className="mb-4">
                {formError}
              </Alert>
            )}

            {formSuccess && (
              <Alert variant="success" className="mb-4">
                {formSuccess}
                {pendingDepositId && (
                  <div className="flex items-center gap-2 mt-2">
                    <Spinner size="sm" />
                    <span className="text-sm">Waiting for payment confirmation...</span>
                  </div>
                )}
              </Alert>
            )}

            <form onSubmit={handleDeposit} className="space-y-4">
              <Input
                label="Amount (KES)"
                type="number"
                min="10"
                max="150000"
                step="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount"
                required
                disabled={isSubmitting || !!pendingDepositId}
              />
              <Input
                label="M-Pesa Phone Number"
                type="tel"
                value={depositPhone}
                onChange={(e) => setDepositPhone(e.target.value)}
                placeholder="0712345678"
                required
                disabled={isSubmitting || !!pendingDepositId}
              />
              <p className="text-sm text-gray-500">
                You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the
                deposit.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDepositModal(false);
                    setFormError(null);
                    setFormSuccess(null);
                    setPendingDepositId(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !!pendingDepositId}
                >
                  Deposit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Withdraw Funds</h2>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <Alert variant="error" className="mb-4">
                {formError}
              </Alert>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-2xl font-bold">
                KES {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <Input
                label="Amount (KES)"
                type="number"
                min="10"
                max={Math.min(70000, currentBalance)}
                step="1"
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
              <p className="text-sm text-gray-500">
                Funds will be sent to your M-Pesa account within a few minutes.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setFormError(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" isLoading={isSubmitting}>
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

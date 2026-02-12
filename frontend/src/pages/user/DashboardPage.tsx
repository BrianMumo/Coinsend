import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { balanceApi } from '../../api/balance.api';
import { ratesApi } from '../../api/rates.api';
import { BalanceTransaction } from '../../types';
import { formatDate, formatStatus } from '../../utils/formatters';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [usdtRate, setUsdtRate] = useState(130); // Default USDT/KES rate

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [balanceResponse, ratesResponse] = await Promise.all([
        balanceApi.getBalance({ limit: 10 }),
        ratesApi.getAll(),
      ]);

      if (balanceResponse.success && balanceResponse.data) {
        setUsdtBalance(balanceResponse.data.balance.usdtBalance || '0');
        setRecentTransactions(balanceResponse.data.transactions || []);

        // Update user balance in store
        updateUser({
          balance: {
            balance: balanceResponse.data.balance.balance,
            usdtBalance: balanceResponse.data.balance.usdtBalance,
            currency: balanceResponse.data.balance.currency,
          },
        });
      }

      // Get USDT/KES rate
      if (ratesResponse.success && ratesResponse.data?.rates) {
        const usdtKesRate = ratesResponse.data.rates.find(
          (r) => r.pair === 'USDT_KES' && r.isActive
        );
        if (usdtKesRate) {
          setUsdtRate(Number(usdtKesRate.sellRate));
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatTransactionType = (type: string) => {
    const types: Record<string, string> = {
      DEPOSIT: 'KES Deposit',
      WITHDRAWAL: 'Withdrawal',
      ORDER_PAYMENT: 'Order Payment',
      ORDER_REFUND: 'Refund',
      ADJUSTMENT: 'Adjustment',
      USDT_DEPOSIT: 'USDT Deposit',
      USDT_WITHDRAWAL: 'USDT Withdrawal',
      KES_WITHDRAWAL: 'USDT → M-Pesa',
    };
    return types[type] || type;
  };

  const getTransactionIcon = (type: string) => {
    // Deposits and refunds are incoming (green)
    if (type.includes('DEPOSIT') || type === 'ORDER_REFUND') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    // Withdrawals are outgoing (red)
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  };

  // Helper to determine if a transaction is USDT-based
  const isUsdtTransaction = (type: string) => {
    return type === 'USDT_DEPOSIT' || type === 'USDT_WITHDRAWAL' || type === 'KES_WITHDRAWAL';
  };

  return (
    <div className="space-y-4">
      {/* Header with greeting */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-sm">
            {user?.firstName?.[0] || user?.email?.[0] || 'U'}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500">Welcome back,</p>
          <p className="font-semibold text-gray-900">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
          </p>
        </div>
      </div>

      {/* USDT Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💵</span>
            <span className="text-sm font-medium">USDT Balance</span>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <p className="text-3xl font-bold">
              ${showBalance
                ? parseFloat(usdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '••••••'
              }
            </p>
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

          {/* KES Equivalent */}
          <p className="text-sm text-blue-100 mb-4">
            {showBalance
              ? `≈ KES ${(parseFloat(usdtBalance) * usdtRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : '≈ KES ••••••'
            }
          </p>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/wallet', { state: { action: 'deposit' } })}
              className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit USDT
            </button>
            <button
              onClick={() => navigate('/wallet', { state: { action: 'withdraw' } })}
              className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw KES
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl p-3">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Deposit USDT to your balance. Withdraw to M-Pesa at the current rate anytime.
        </p>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
          <Link
            to="/wallet"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center font-medium"
          >
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-1">No transactions yet</p>
            <button
              onClick={() => navigate('/wallet', { state: { action: 'deposit' } })}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Make your first USDT deposit →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentTransactions.slice(0, 5).map((tx) => (
              <Link
                key={tx.id}
                to="/wallet"
                className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    tx.type.includes('DEPOSIT') || tx.type === 'ORDER_REFUND'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTransactionType(tx.type)}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    tx.type.includes('DEPOSIT') || tx.type === 'ORDER_REFUND' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type.includes('DEPOSIT') || tx.type === 'ORDER_REFUND' ? '+' : '-'}
                    {isUsdtTransaction(tx.type)
                      ? `$${Math.abs(parseFloat(tx.usdtAmount || tx.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : `KES ${Math.abs(parseFloat(tx.amount)).toLocaleString()}`
                    }
                  </p>
                  <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                    {formatStatus(tx.status)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

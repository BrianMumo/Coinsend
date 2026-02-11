import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { balanceApi } from '../../api/balance.api';
import { BalanceTransaction } from '../../types';
import { formatDate, formatStatus } from '../../utils/formatters';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Bell,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [kesBalance, setKesBalance] = useState('0');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const balanceResponse = await balanceApi.getBalance({ limit: 10 });

      if (balanceResponse.success && balanceResponse.data) {
        setKesBalance(balanceResponse.data.balance.balance);
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
      USDT_DEPOSIT: 'USDT → KES',
      USDT_WITHDRAWAL: 'USDT Withdrawal',
    };
    return types[type] || type;
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('DEPOSIT') || type === 'ORDER_REFUND') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-semibold text-sm">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Hi,</p>
            <p className="font-semibold text-gray-900">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Welcome'}
            </p>
          </div>
        </div>
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* KES Balance Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
          <div className="absolute -right-4 top-12 w-20 h-20 border-[12px] border-white rounded-full"></div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xs">🇰🇪</span>
            </div>
            <span className="text-sm font-medium">Kenyan Shilling (KES)</span>
          </div>

          <p className="text-xs text-green-100 mb-1">Available Balance</p>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold">
              Ksh {showBalance
                ? parseFloat(kesBalance).toLocaleString(undefined, { minimumFractionDigits: 0 })
                : '••••••'
              }
            </p>
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
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-12">
        <button
          onClick={() => navigate('/wallet', { state: { action: 'deposit' } })}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center transition-colors">
            <ArrowDownLeft className="h-6 w-6 text-green-700" />
          </div>
          <span className="text-sm text-gray-700 font-medium">Deposit</span>
        </button>

        <button
          onClick={() => navigate('/wallet', { state: { action: 'withdraw' } })}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors">
            <ArrowUpRight className="h-6 w-6 text-red-700" />
          </div>
          <span className="text-sm text-gray-700 font-medium">Withdraw</span>
        </button>
      </div>

      {/* How it works - Brief */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Deposit USDT to get KES instantly. Withdraw KES to your M-Pesa anytime.
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Transaction history</h3>
            <Link
              to="/wallet"
              className="text-sm text-green-600 hover:text-green-700 flex items-center font-medium"
            >
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-1">No transactions yet</p>
              <p className="text-sm text-gray-400">Deposit USDT to get started</p>
              <button
                onClick={() => navigate('/wallet', { state: { action: 'deposit' } })}
                className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Make your first deposit →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.slice(0, 5).map((tx) => (
                <Link
                  key={tx.id}
                  to="/wallet"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                      parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(tx.amount) >= 0 ? '+' : ''}
                      Ksh {Math.abs(parseFloat(tx.amount)).toLocaleString()}
                    </p>
                    <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                      {formatStatus(tx.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;

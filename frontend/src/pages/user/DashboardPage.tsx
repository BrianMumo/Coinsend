import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ordersApi } from '../../api/orders.api';
import { balanceApi } from '../../api/balance.api';
import { Order, BalanceTransaction } from '../../types';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';
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
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [kesBalance, setKesBalance] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersResponse, balanceResponse] = await Promise.all([
        ordersApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        balanceApi.getBalance({ limit: 10 }),
      ]);

      if (ordersResponse.success && ordersResponse.data) {
        setRecentOrders(ordersResponse.data);
      }

      if (balanceResponse.success && balanceResponse.data) {
        setKesBalance(balanceResponse.data.balance.balance);
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
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatOrderType = (type: string) => {
    return type === 'CRYPTO_TO_KES' ? 'Sell USDT' : 'Buy USDT';
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

  const getTransactionIcon = (type: string) => {
    if (type.includes('DEPOSIT') || type === 'ORDER_REFUND') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  };

  // Combine and sort transactions and orders for display
  const combinedHistory = [...recentTransactions.slice(0, 5)];

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
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

      {/* Balance Cards - Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {/* KES Balance Card */}
        <div className="min-w-[280px] snap-start">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
              <div className="absolute -right-4 top-12 w-20 h-20 border-[12px] border-white rounded-full"></div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold">🇰🇪</span>
                </div>
                <span className="text-sm font-medium">Kenyan Shilling (KES)</span>
              </div>

              <p className="text-xs text-green-100 mb-1">Available Balance</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">
                  Ksh {showBalance
                    ? parseFloat(kesBalance).toLocaleString(undefined, { minimumFractionDigits: 0 })
                    : '••••••'
                  }
                </p>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
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
        </div>

        {/* USDT Balance Card */}
        <div className="min-w-[280px] snap-start">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 border-[20px] border-white rounded-full"></div>
              <div className="absolute -right-4 top-12 w-20 h-20 border-[12px] border-white rounded-full"></div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold">₮</span>
                </div>
                <span className="text-sm font-medium">Tether (USDT)</span>
              </div>

              <p className="text-xs text-blue-100 mb-1">Available Balance</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">
                  $ {showBalance
                    ? parseFloat(usdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '••••••'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-8">
        <button
          onClick={() => navigate('/wallet')}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
            <ArrowDownLeft className="h-6 w-6 text-gray-700" />
          </div>
          <span className="text-sm text-gray-700 font-medium">Deposit</span>
        </button>

        <button
          onClick={() => navigate('/wallet')}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
            <ArrowUpRight className="h-6 w-6 text-gray-700" />
          </div>
          <span className="text-sm text-gray-700 font-medium">Withdraw</span>
        </button>

        <button
          onClick={() => navigate('/orders/new/crypto-to-kes')}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
            <svg className="h-6 w-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <span className="text-sm text-gray-700 font-medium">Exchange</span>
        </button>
      </div>

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
          ) : combinedHistory.length === 0 && recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 opacity-50">
                <svg viewBox="0 0 100 100" fill="none" className="text-gray-300">
                  <path d="M20 80 L50 20 L80 80 Z" fill="currentColor" opacity="0.3"/>
                  <path d="M15 85 L85 85" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="50" cy="50" r="3" fill="currentColor"/>
                </svg>
              </div>
              <p className="text-gray-400">You have no transaction record yet</p>
              <button
                onClick={() => navigate('/wallet')}
                className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Make your first deposit →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Show balance transactions */}
              {combinedHistory.map((tx) => (
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
                      {tx.currency === 'USDT'
                        ? `$${Math.abs(parseFloat(tx.amount)).toFixed(2)}`
                        : `Ksh ${Math.abs(parseFloat(tx.amount)).toLocaleString()}`
                      }
                    </p>
                    <Badge variant={getStatusVariant(tx.status)} className="text-[10px]">
                      {formatStatus(tx.status)}
                    </Badge>
                  </div>
                </Link>
              ))}

              {/* Show recent orders if no balance transactions */}
              {combinedHistory.length === 0 && recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      order.orderType === 'CRYPTO_TO_KES' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {order.orderType === 'CRYPTO_TO_KES' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatOrderType(order.orderType)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                    </p>
                    <Badge variant={getStatusVariant(order.status)} className="text-[10px]">
                      {formatStatus(order.status)}
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

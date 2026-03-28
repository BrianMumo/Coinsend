import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
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
  TrendingUp,
  Zap,
  RefreshCw,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [usdtRate, setUsdtRate] = useState(130);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setRefreshing(true);
      const [balanceResponse, ratesResponse] = await Promise.all([
        balanceApi.getBalance({ limit: 10 }),
        ratesApi.getAll(),
      ]);

      if (balanceResponse.success && balanceResponse.data) {
        setUsdtBalance(balanceResponse.data.balance.usdtBalance || '0');
        setRecentTransactions(balanceResponse.data.transactions || []);
        updateUser({
          balance: {
            balance: balanceResponse.data.balance.balance,
            usdtBalance: balanceResponse.data.balance.usdtBalance,
            currency: balanceResponse.data.balance.currency,
          },
        });
      }

      if (ratesResponse.success && ratesResponse.data?.rates) {
        const usdtKesRate = ratesResponse.data.rates.find(
          (r) => r.pair === 'USDT_KES' && r.isActive
        );
        if (usdtKesRate) setUsdtRate(Number(usdtKesRate.buyRate));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const isCredit = (type: string) =>
    type.includes('DEPOSIT') || type === 'ORDER_REFUND' || type === 'ADJUSTMENT';

  if (isLoading) return <DashboardSkeleton />;

  const usdtNum = parseFloat(usdtBalance);
  const kesEquivalent = usdtNum * usdtRate;
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center ring-2 ring-teal-200">
            <span className="text-teal-700 font-bold text-sm">
              {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Good day,</p>
            <p className="font-semibold text-gray-900 leading-tight">
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${refreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-8 w-28 h-28 rounded-full bg-white/5" />
        <div className="absolute left-1/2 -bottom-12 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative p-5">
          {/* Label row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs">₿</span>
              </div>
              <span className="text-teal-100 text-xs font-medium tracking-wide uppercase">Total Balance</span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              {showBalance
                ? <EyeOff className="h-4 w-4 text-teal-200" />
                : <Eye className="h-4 w-4 text-teal-200" />
              }
            </button>
          </div>

          {/* KES amount */}
          <p className="text-3xl font-bold text-white mb-0.5">
            {showBalance
              ? `KES ${kesEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : 'KES ••••••'
            }
          </p>

          {/* USDT equivalent */}
          <p className="text-sm text-teal-200 mb-5">
            {showBalance
              ? `≈ $${usdtNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
              : '≈ $•••• USDT'
            }
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-1 mb-5">
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2.5 py-1.5">
              <TrendingUp className="h-3 w-3 text-teal-200" />
              <span className="text-xs text-white font-medium">
                1 USDT = KES {usdtRate.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2.5 py-1.5">
              <Zap className="h-3 w-3 text-yellow-300" />
              <span className="text-xs text-white font-medium">Instant</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/wallet', { state: { action: 'deposit' } })}
              className="flex items-center justify-center gap-2 bg-white text-teal-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-50 transition-colors shadow-sm"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit USDT
            </button>
            <button
              onClick={() => navigate('/wallet', { state: { action: 'withdraw' } })}
              className="flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-white/25 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw KES
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Transactions</h3>
          <Link
            to="/wallet"
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-0.5 font-medium"
          >
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-1 font-medium">No transactions yet</p>
            <p className="text-gray-400 text-xs mb-3">Deposit USDT to get started</p>
            <button
              onClick={() => navigate('/wallet', { state: { action: 'deposit' } })}
              className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium bg-teal-50 px-4 py-2 rounded-lg"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Make your first deposit
            </button>
          </div>
        ) : (
          <div>
            {recentTransactions.slice(0, 5).map((tx, index) => {
              const credit = isCredit(tx.type);
              const hasUsdt = (tx.usdtAmount && parseFloat(tx.usdtAmount) > 0) || tx.currency === 'USDT';
              const amount = hasUsdt
                ? `${credit ? '+' : '-'}$${Math.abs(parseFloat(tx.usdtAmount || tx.amount)).toFixed(2)}`
                : `${credit ? '+' : '-'}KES ${Math.abs(parseFloat(tx.amount)).toLocaleString()}`;

              return (
                <Link
                  key={tx.id}
                  to="/wallet"
                  className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 transition-colors ${index !== 0 ? 'border-t border-gray-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${credit ? 'bg-teal-50' : 'bg-red-50'}`}>
                      {credit
                        ? <ArrowDownLeft className="h-4 w-4 text-teal-600" />
                        : <ArrowUpRight className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 leading-tight">
                        {formatTransactionType(tx.type)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${credit ? 'text-teal-600' : 'text-red-500'}`}>
                      {amount}
                    </p>
                    <Badge variant={getStatusVariant(tx.status)} className="text-[10px] mt-0.5">
                      {formatStatus(tx.status)}
                    </Badge>
                  </div>
                </Link>
              );
            })}

            <div className="px-4 py-3 border-t border-gray-50">
              <Link
                to="/wallet"
                className="flex items-center justify-center gap-1.5 text-sm text-teal-600 font-medium hover:text-teal-700"
              >
                View all transactions <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-900 mb-0.5">Automatic Deposits</p>
            <p className="text-xs text-teal-700 leading-relaxed">
              Send USDT to your personal address and your balance updates automatically — no manual verification needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

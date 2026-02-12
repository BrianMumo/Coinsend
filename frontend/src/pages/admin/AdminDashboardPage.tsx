import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminDashboardApi, adminOrdersApi, adminDepositsApi, UsdtDeposit } from '../../api/admin.api';
import { DashboardStats, Order } from '../../types';
import { formatCurrency, formatStatus } from '../../utils/formatters';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import {
  Users,
  Receipt,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
} from 'lucide-react';

const AdminDashboardPage = () => {
  const { admin } = useAdminAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [usdtDeposits, setUsdtDeposits] = useState<UsdtDeposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, depositsRes] = await Promise.all([
          adminDashboardApi.getStats(),
          adminOrdersApi.getAll({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
          adminDepositsApi.getUsdtDeposits({ limit: 5 }),
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
        if (ordersRes.success && ordersRes.data) {
          setRecentOrders(ordersRes.data);
        }
        if (depositsRes.success && depositsRes.data) {
          setUsdtDeposits(depositsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const getOrderIcon = (type: string) => {
    if (type === 'CRYPTO_TO_KES') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CRYPTO_TO_KES: 'Sell USDT',
      KES_TO_CRYPTO: 'Buy USDT',
      CROSS_BORDER: 'Transfer',
      OTC: 'OTC Trade',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Admin Dashboard" description="Overview of Coinsend operations and statistics." />

      {/* Header with greeting */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-600 font-semibold text-sm">
            {admin?.firstName?.[0] || 'A'}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500">Welcome back,</p>
          <p className="font-semibold text-gray-900">
            {admin?.firstName ? `${admin.firstName} ${admin.lastName || ''}`.trim() : 'Admin'}
          </p>
        </div>
      </div>

      {/* Urgent Alert - Paid Orders */}
      {(stats?.orders.paid || 0) > 0 && (
        <Link
          to="/mumo/orders?status=PAID"
          className="block bg-orange-50 border border-orange-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-orange-800">
                {stats?.orders.paid} orders need attention
              </p>
              <p className="text-sm text-orange-600 truncate">
                Payment received, awaiting processing
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-orange-400 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Stats Grid - Compact 2x3 on mobile */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats?.users.total || 0}</p>
          <p className="text-[10px] text-gray-500">Users</p>
        </div>

        <div className="bg-white rounded-xl p-3 text-center">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats?.orders.pending || 0}</p>
          <p className="text-[10px] text-gray-500">Pending</p>
        </div>

        <div className="bg-white rounded-xl p-3 text-center">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats?.orders.paid || 0}</p>
          <p className="text-[10px] text-gray-500">Paid</p>
        </div>

        <div className="bg-white rounded-xl p-3 text-center">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats?.orders.processing || 0}</p>
          <p className="text-[10px] text-gray-500">Processing</p>
        </div>

        <div className="bg-white rounded-xl p-3 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats?.orders.completed || 0}</p>
          <p className="text-[10px] text-gray-500">Completed</p>
        </div>

        <div className="bg-white rounded-xl p-3 text-center">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Receipt className="h-4 w-4 text-primary-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats?.orders.today || 0}</p>
          <p className="text-[10px] text-gray-500">Today</p>
        </div>
      </div>

      {/* Recent Orders - Card List Style */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          <Link
            to="/mumo/orders"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center font-medium"
          >
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <Receipt className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.slice(0, 6).map((order) => (
              <Link
                key={order.id}
                to={`/mumo/orders?search=${order.orderNumber}`}
                className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    order.orderType === 'CRYPTO_TO_KES' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {getOrderIcon(order.orderType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getOrderTypeLabel(order.orderType)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {order.user?.email || order.orderNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
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
      </div>

      {/* Recent USDT Deposits */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent USDT Deposits</h3>
          <Link
            to="/mumo/users"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center font-medium"
          >
            View users <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {usdtDeposits.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <Coins className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">No USDT deposits yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {usdtDeposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
                    <Coins className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {deposit.userName || deposit.userEmail}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {deposit.txHash ? `${deposit.txHash.slice(0, 10)}...` : 'No TX hash'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-semibold text-green-600">
                    +{parseFloat(deposit.amount).toLocaleString()} USDT
                  </p>
                  <Badge
                    variant={deposit.status === 'COMPLETED' ? 'success' : deposit.status === 'PENDING' ? 'warning' : 'error'}
                    className="text-[10px]"
                  >
                    {deposit.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-gradient-to-br from-secondary-800 to-secondary-900 rounded-xl p-4 text-white">
        <p className="text-sm text-gray-300 mb-2">Platform Summary</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{stats?.orders.total || 0}</p>
            <p className="text-xs text-gray-400">Total Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
            <p className="text-xs text-gray-400">Total Users</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

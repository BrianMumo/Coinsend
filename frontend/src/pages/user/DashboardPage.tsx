import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { ordersApi } from '../../api/orders.api';
import { Order } from '../../types';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Clock,
  CheckCircle,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await ordersApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
        if (response.success && response.data) {
          setRecentOrders(response.data);
          setStats({
            totalOrders: response.pagination?.total || 0,
            pendingOrders: response.data.filter((o) => ['PENDING', 'PAID'].includes(o.status)).length,
            completedOrders: response.data.filter((o) => o.status === 'COMPLETED').length,
          });
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatOrderType = (type: string) => {
    return type === 'CRYPTO_TO_KES' ? 'Sell USDT' : 'Buy USDT';
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <PageTitle title="Dashboard" description="Manage your USDT transactions on Coinsend." />

      {/* Welcome */}
      <div className="pb-2">
        <h1 className="text-xl font-bold text-gray-900">
          Hi, {user?.firstName || 'there'}!
        </h1>
        <p className="text-sm text-gray-500">Welcome to Coinsend</p>
      </div>

      {/* Balance Card - Compact */}
      <Card className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-100 uppercase tracking-wide">KES Balance</p>
              <p className="text-2xl font-bold mt-1">
                {parseFloat(user?.balance?.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Link
              to="/wallet"
              className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
              Top Up
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - 2 columns, compact */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/orders/new/crypto-to-kes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-green-200">
            <CardContent className="py-4 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
              <p className="font-semibold text-sm">Sell USDT</p>
              <p className="text-xs text-gray-500">Get KES</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/orders/new/kes-to-crypto">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200">
            <CardContent className="py-4 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
              </div>
              <p className="font-semibold text-sm">Buy USDT</p>
              <p className="text-xs text-gray-500">Pay with KES</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Row - Compact horizontal */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="py-3 text-center">
            <Clock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{stats.pendingOrders}</p>
            <p className="text-[10px] text-gray-500 uppercase">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{stats.completedOrders}</p>
            <p className="text-[10px] text-gray-500 uppercase">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <TrendingUp className="h-4 w-4 text-gray-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{stats.totalOrders}</p>
            <p className="text-[10px] text-gray-500 uppercase">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders - Compact list */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Recent Orders</h3>
            <Link to="/orders" className="text-xs text-primary-600 hover:text-primary-700 flex items-center">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No orders yet</p>
              <p className="text-xs text-gray-400 mt-1">Start by buying or selling USDT</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 4).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      order.orderType === 'CRYPTO_TO_KES' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {order.orderType === 'CRYPTO_TO_KES' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatOrderType(order.orderType)}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                    </p>
                    <Badge variant={getStatusVariant(order.status)} className="text-[10px] px-1.5 py-0">
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { ordersApi } from '../../api/orders.api';
import { Order } from '../../types';
import { formatCurrency, formatDate, formatOrderType, formatStatus } from '../../utils/formatters';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Globe,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  Wallet,
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

  const quickActions = [
    {
      icon: Wallet,
      label: 'Top Up',
      description: 'Add funds to balance',
      to: '/wallet',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: ArrowDownLeft,
      label: 'Sell Crypto',
      description: 'Convert USDT/USDC to KES',
      to: '/orders/new/crypto-to-kes',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: ArrowUpRight,
      label: 'Buy Crypto',
      description: 'Buy USDT/USDC with KES',
      to: '/orders/new/kes-to-crypto',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Globe,
      label: 'Send Abroad',
      description: 'Cross-border payments',
      to: '/orders/new/cross-border',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" description="View your orders, track transactions, and manage your Coinsend account." />
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'there'}!
        </h1>
        <p className="text-gray-600">Here is what is happening with your account today.</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-primary-50">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Account Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                KES {parseFloat(user?.balance?.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <Link to="/wallet">
            <Button className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Manage Wallet
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Clock className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Orders</p>
              <p className="text-2xl font-bold">{stats.pendingOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed Orders</p>
              <p className="text-2xl font-bold">{stats.completedOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className={`p-3 rounded-full ${action.color} mb-3`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-sm">{action.label}</span>
                <span className="text-xs text-gray-500 text-center">{action.description}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link to="/orders">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No orders yet</p>
              <Link to="/orders/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Order
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="text-sm">
                      <td className="py-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3">{formatOrderType(order.orderType)}</td>
                      <td className="py-3">
                        {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                      </td>
                      <td className="py-3">
                        <Badge variant={getStatusVariant(order.status)}>
                          {formatStatus(order.status)}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;

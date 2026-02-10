import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminDashboardApi, adminOrdersApi } from '../../api/admin.api';
import { DashboardStats, Order } from '../../types';
import { formatCurrency, formatDate, formatOrderType, formatStatus } from '../../utils/formatters';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import {
  Users,
  Receipt,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          adminDashboardApi.getStats(),
          adminOrdersApi.getAll({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
        if (ordersRes.success && ordersRes.data) {
          setRecentOrders(ordersRes.data);
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

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Orders',
      value: stats?.orders.pending || 0,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Paid (Awaiting)',
      value: stats?.orders.paid || 0,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      title: 'Processing',
      value: stats?.orders.processing || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'Completed',
      value: stats?.orders.completed || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Today\'s Orders',
      value: stats?.orders.today || 0,
      icon: Receipt,
      color: 'bg-primary-500',
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Admin Dashboard" description="Overview of Coinsend operations and statistics." />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of Coinsend operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Orders Alert */}
      {(stats?.orders.paid || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  {stats?.orders.paid} orders waiting to be processed
                </p>
                <p className="text-sm text-orange-600">
                  These orders have submitted payment proof and need your attention.
                </p>
              </div>
              <Link
                to="/mumo/orders?status=PAID"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                View Orders
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link to="/mumo/orders" className="text-sm text-primary-600 hover:text-primary-700">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">User</th>
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
                        to={`/mumo/orders?search=${order.orderNumber}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3">{order.user?.email || 'N/A'}</td>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;

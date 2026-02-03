import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { ordersApi } from '../../api/orders.api';
import { Order, OrderStatus } from '../../types';
import { formatCurrency, formatDate, formatOrderType, formatStatus } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchOrders = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await ordersApi.getAll({
        page,
        limit: pagination.limit,
        status: statusFilter as OrderStatus || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (response.success && response.data) {
        setOrders(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter]);

  const handlePageChange = (newPage: number) => {
    fetchOrders(newPage);
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(ORDER_STATUSES).map(([value, { label }]) => ({
      value,
      label,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="My Orders" description="View and track all your orders on Coinsend." />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600">View and track all your orders</p>
        </div>
        <Link to="/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Filter by status"
              />
            </div>
            <span className="text-sm text-gray-500">
              {pagination.total} order{pagination.total !== 1 ? 's' : ''} found
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No orders found</p>
              <Link to="/orders/new">
                <Button>Create Your First Order</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Order #</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">You Send</th>
                      <th className="pb-3 font-medium">You Receive</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="text-sm">
                        <td className="py-4">
                          <Link
                            to={`/orders/${order.id}`}
                            className="font-medium text-primary-600 hover:text-primary-700"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-4">{formatOrderType(order.orderType)}</td>
                        <td className="py-4">
                          {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                        </td>
                        <td className="py-4">
                          {formatCurrency(order.destinationAmount, order.destinationCurrency)}
                        </td>
                        <td className="py-4">
                          <Badge variant={getStatusVariant(order.status)}>
                            {formatStatus(order.status)}
                          </Badge>
                        </td>
                        <td className="py-4 text-gray-500">{formatDate(order.createdAt)}</td>
                        <td className="py-4">
                          <Link to={`/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;

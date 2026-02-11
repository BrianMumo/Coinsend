import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ordersApi } from '../../api/orders.api';
import { Order } from '../../types';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';
import { Plus, ChevronRight, Package } from 'lucide-react';

type FilterType = 'all' | 'active' | 'completed';

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchOrders = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await ordersApi.getAll({
        page,
        limit: pagination.limit,
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
  }, []);

  // Filter orders based on active filter
  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') {
      return ['PENDING', 'PAID', 'PROCESSING'].includes(order.status);
    }
    if (activeFilter === 'completed') {
      return ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(order.status);
    }
    return true;
  });

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CRYPTO_TO_KES: 'Sell Crypto',
      KES_TO_CRYPTO: 'Buy Crypto',
      CROSS_BORDER: 'Cross-border',
      OTC: 'OTC Trade',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
        <Link to="/orders/new">
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as FilterType)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm mb-3">
              {activeFilter === 'all' ? 'No orders yet' : `No ${activeFilter} orders`}
            </p>
            <Link to="/orders/new">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Create Order
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {getOrderTypeLabel(order.orderType)}
                    </span>
                    <Badge variant={getStatusVariant(order.status)} className="text-[10px]">
                      {formatStatus(order.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{order.orderNumber}</span>
                    <span>•</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="text-gray-600">
                      {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                    </span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.destinationAmount, order.destinationCurrency)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* Load More */}
        {pagination.totalPages > 1 && pagination.page < pagination.totalPages && (
          <div className="p-4 border-t border-gray-100">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fetchOrders(pagination.page + 1)}
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      {orders.length > 0 && (
        <p className="text-center text-xs text-gray-500">
          Showing {filteredOrders.length} of {pagination.total} orders
        </p>
      )}
    </div>
  );
};

export default OrdersPage;

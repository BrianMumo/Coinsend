import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminOrdersApi } from '../../api/admin.api';
import { Order, OrderStatus } from '../../types';
import { formatCurrency, formatDate, formatOrderType, formatStatus } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

const AdminOrdersPage = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OrderStatus | ''>('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [payoutReference, setPayoutReference] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await adminOrdersApi.getAll({
        page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        search: search || undefined,
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
  }, [statusFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !updateStatus) return;

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const response = await adminOrdersApi.updateStatus(
        selectedOrder.id,
        updateStatus,
        processingNotes || undefined,
        payoutReference || undefined
      );

      if (response.success && response.data) {
        setUpdateSuccess('Order status updated successfully');
        setOrders(orders.map((o) =>
          o.id === selectedOrder.id ? response.data!.order : o
        ));
        setTimeout(() => {
          setSelectedOrder(null);
          setUpdateStatus('');
          setProcessingNotes('');
          setPayoutReference('');
          setUpdateSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      setUpdateError(err.response?.data?.error?.message || 'Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(ORDER_STATUSES).map(([value, { label }]) => ({
      value,
      label,
    })),
  ];

  const nextStatusOptions: Record<string, string[]> = {
    PENDING: ['PAID', 'CANCELLED', 'EXPIRED'],
    PAID: ['PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
  };

  const getOrderIcon = (type: string) => {
    if (type === 'CRYPTO_TO_KES') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Orders Management" description="View and process all customer orders." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{pagination.total} total</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {/* Filters - Collapsible on mobile */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 space-y-3">
          <form onSubmit={handleSearch} className="space-y-3">
            <Input
              placeholder="Search by order # or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      )}

      {/* Orders List - Card style for mobile */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full bg-white rounded-xl p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.orderType === 'CRYPTO_TO_KES' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {getOrderIcon(order.orderType)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{formatOrderType(order.orderType)}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(order.status)} className="text-[10px]">
                  {formatStatus(order.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-500 text-xs">{order.user?.email}</p>
                  <p className="font-medium">
                    {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                    <span className="text-gray-400 mx-1">→</span>
                    {formatCurrency(order.destinationAmount, order.destinationCurrency)}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOrders(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">{selectedOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">{formatOrderType(selectedOrder.orderType)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {updateSuccess && <Alert variant="success">{updateSuccess}</Alert>}
              {updateError && <Alert variant="error">{updateError}</Alert>}

              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge variant={getStatusVariant(selectedOrder.status)} className="text-sm px-4 py-1">
                  {formatStatus(selectedOrder.status)}
                </Badge>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">User</p>
                  <p className="font-medium truncate">{selectedOrder.user?.email}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.user?.phone || 'No phone'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Rate</p>
                  <p className="font-medium">{parseFloat(selectedOrder.exchangeRate).toFixed(4)}</p>
                  <p className="text-xs text-gray-500">Fee: {formatCurrency(selectedOrder.fee, selectedOrder.sourceCurrency)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-green-600 text-xs mb-1">From</p>
                  <p className="font-semibold text-green-700">
                    {formatCurrency(selectedOrder.sourceAmount, selectedOrder.sourceCurrency)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-blue-600 text-xs mb-1">To</p>
                  <p className="font-semibold text-blue-700">
                    {formatCurrency(selectedOrder.destinationAmount, selectedOrder.destinationCurrency)}
                  </p>
                </div>
              </div>

              {/* Payout Destination */}
              {selectedOrder.payoutDestination && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Payout Destination</p>
                  <p className="font-mono text-sm break-all">{selectedOrder.payoutDestination}</p>
                </div>
              )}

              {/* Payment Proof */}
              {selectedOrder.paymentProofUrl && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Payment Proof</p>
                  <a
                    href={selectedOrder.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Proof →
                  </a>
                </div>
              )}

              {/* Payment Reference */}
              {selectedOrder.paymentReference && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Payment Reference</p>
                  <p className="font-mono text-sm">{selectedOrder.paymentReference}</p>
                </div>
              )}

              {/* Update Status Section */}
              {nextStatusOptions[selectedOrder.status] && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-sm">Update Status</h3>
                  <Select
                    options={[
                      { value: '', label: 'Select new status...' },
                      ...nextStatusOptions[selectedOrder.status].map((s) => ({
                        value: s,
                        label: formatStatus(s),
                      })),
                    ]}
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as OrderStatus)}
                  />
                  <Input
                    placeholder="Processing notes (optional)"
                    value={processingNotes}
                    onChange={(e) => setProcessingNotes(e.target.value)}
                  />
                  {updateStatus === 'COMPLETED' && (
                    <Input
                      placeholder="Payout reference (M-Pesa/TX hash)"
                      value={payoutReference}
                      onChange={(e) => setPayoutReference(e.target.value)}
                    />
                  )}
                  <Button
                    onClick={handleUpdateStatus}
                    isLoading={isUpdating}
                    disabled={!updateStatus}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
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
import { Search, ChevronLeft, ChevronRight, Eye, CheckCircle } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <PageTitle title="Orders Management" description="View and process all customer orders." />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
        <p className="text-gray-600">View and process all customer orders</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <Input
                placeholder="Search by order # or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <span className="text-sm text-gray-500">
              {pagination.total} orders found
            </span>
          </form>
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
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Order #</th>
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">From</th>
                      <th className="pb-3 font-medium">To</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="text-sm">
                        <td className="py-3 font-medium">{order.orderNumber}</td>
                        <td className="py-3">
                          <div>
                            <p>{order.user?.email}</p>
                            <p className="text-xs text-gray-500">{order.user?.phone}</p>
                          </div>
                        </td>
                        <td className="py-3">{formatOrderType(order.orderType)}</td>
                        <td className="py-3">
                          {formatCurrency(order.sourceAmount, order.sourceCurrency)}
                        </td>
                        <td className="py-3">
                          {formatCurrency(order.destinationAmount, order.destinationCurrency)}
                        </td>
                        <td className="py-3">
                          <Badge variant={getStatusVariant(order.status)}>
                            {formatStatus(order.status)}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                        <td className="py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="py-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedOrder.orderNumber}</h2>
                  <p className="text-gray-500">{formatOrderType(selectedOrder.orderType)}</p>
                </div>
                <Badge variant={getStatusVariant(selectedOrder.status)} className="text-sm">
                  {formatStatus(selectedOrder.status)}
                </Badge>
              </div>

              {updateSuccess && <Alert variant="success" className="mb-4">{updateSuccess}</Alert>}
              {updateError && <Alert variant="error" className="mb-4">{updateError}</Alert>}

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-500">User Email</p>
                  <p className="font-medium">{selectedOrder.user?.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">User Phone</p>
                  <p className="font-medium">{selectedOrder.user?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Source Amount</p>
                  <p className="font-medium">
                    {formatCurrency(selectedOrder.sourceAmount, selectedOrder.sourceCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Destination Amount</p>
                  <p className="font-medium">
                    {formatCurrency(selectedOrder.destinationAmount, selectedOrder.destinationCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Exchange Rate</p>
                  <p className="font-medium">{parseFloat(selectedOrder.exchangeRate).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Fee</p>
                  <p className="font-medium">
                    {formatCurrency(selectedOrder.fee, selectedOrder.sourceCurrency)}
                  </p>
                </div>
                {selectedOrder.payoutDestination && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Payout Destination</p>
                    <p className="font-medium font-mono break-all">{selectedOrder.payoutDestination}</p>
                  </div>
                )}
                {selectedOrder.paymentProofUrl && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Payment Proof</p>
                    <a
                      href={selectedOrder.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      View Proof
                    </a>
                  </div>
                )}
                {selectedOrder.paymentReference && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Payment Reference</p>
                    <p className="font-medium font-mono">{selectedOrder.paymentReference}</p>
                  </div>
                )}
              </div>

              {/* Update Status */}
              {nextStatusOptions[selectedOrder.status] && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-medium">Update Order Status</h3>
                  <Select
                    label="New Status"
                    options={nextStatusOptions[selectedOrder.status].map((s) => ({
                      value: s,
                      label: formatStatus(s),
                    }))}
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as OrderStatus)}
                  />
                  <Input
                    label="Processing Notes"
                    placeholder="Add notes about this order..."
                    value={processingNotes}
                    onChange={(e) => setProcessingNotes(e.target.value)}
                  />
                  {updateStatus === 'COMPLETED' && (
                    <Input
                      label="Payout Reference"
                      placeholder="M-Pesa confirmation or TX hash"
                      value={payoutReference}
                      onChange={(e) => setPayoutReference(e.target.value)}
                    />
                  )}
                  <Button
                    onClick={handleUpdateStatus}
                    isLoading={isUpdating}
                    disabled={!updateStatus}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                </div>
              )}

              <div className="flex justify-end mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;

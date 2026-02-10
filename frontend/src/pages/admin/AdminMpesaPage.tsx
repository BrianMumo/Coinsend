import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminMpesaApi, adminBalanceApi, PendingBalanceTransaction } from '../../api/admin.api';
import { MpesaTransaction, MpesaBalance } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import {
  RefreshCw,
  Send,
  Wallet,
  DollarSign,
  Search,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

const AdminMpesaPage = () => {
  const { admin } = useAdminAuthStore();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  // Balance state
  const [balance, setBalance] = useState<MpesaBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // Transactions state
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // B2C Payment form state
  const [showB2CForm, setShowB2CForm] = useState(false);
  const [b2cForm, setB2cForm] = useState({
    phoneNumber: '',
    amount: '',
    commandId: 'BusinessPayment' as 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment',
    remarks: '',
  });
  const [isSubmittingB2C, setIsSubmittingB2C] = useState(false);

  // Pending balance transactions state
  const [pendingBalanceTx, setPendingBalanceTx] = useState<PendingBalanceTransaction[]>([]);
  const [isLoadingPendingTx, setIsLoadingPendingTx] = useState(true);
  const [completingTxId, setCompletingTxId] = useState<string | null>(null);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch balance
  const fetchBalance = async () => {
    try {
      const response = await adminMpesaApi.getBalance();
      if (response.success && response.data) {
        setBalance(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch pending balance transactions
  const fetchPendingBalanceTx = async () => {
    try {
      setIsLoadingPendingTx(true);
      const response = await adminBalanceApi.getPendingTransactions();
      if (response.success && response.data) {
        setPendingBalanceTx(response.data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch pending balance transactions:', err);
    } finally {
      setIsLoadingPendingTx(false);
    }
  };

  // Complete a pending balance transaction
  const handleCompleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to mark this transaction as completed?')) return;

    setCompletingTxId(txId);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminBalanceApi.completeTransaction(txId);
      if (response.success) {
        setSuccess('Transaction marked as completed');
        fetchPendingBalanceTx();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to complete transaction');
    } finally {
      setCompletingTxId(null);
    }
  };

  // Refresh balance (trigger query to Safaricom)
  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminMpesaApi.refreshBalance();
      if (response.success) {
        setSuccess('Balance query initiated. Please wait a moment and refresh the page.');
        // Wait 5 seconds and refetch
        setTimeout(() => {
          fetchBalance();
          setSuccess(null);
        }, 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to refresh balance');
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async (page = 1) => {
    setIsLoadingTransactions(true);
    try {
      const response = await adminMpesaApi.getTransactions({
        page,
        limit: 20,
        type: filterType || undefined,
        status: filterStatus || undefined,
        search: searchQuery || undefined,
      });
      if (response.success && response.data) {
        setTransactions(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Submit B2C payment
  const handleB2CSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingB2C(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminMpesaApi.initiateB2CPayment({
        phoneNumber: b2cForm.phoneNumber,
        amount: parseFloat(b2cForm.amount),
        commandId: b2cForm.commandId,
        remarks: b2cForm.remarks || undefined,
      });

      if (response.success) {
        setSuccess(`B2C payment initiated successfully. Conversation ID: ${response.data?.conversationId}`);
        setB2cForm({ phoneNumber: '', amount: '', commandId: 'BusinessPayment', remarks: '' });
        setShowB2CForm(false);
        // Refresh transactions after a delay
        setTimeout(() => fetchTransactions(), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initiate B2C payment');
    } finally {
      setIsSubmittingB2C(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    fetchPendingBalanceTx();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [filterType, filterStatus]);

  const handleSearch = () => {
    fetchTransactions(1);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; icon: typeof CheckCircle }> = {
      SUCCESS: { variant: 'success', icon: CheckCircle },
      PENDING: { variant: 'warning', icon: Clock },
      FAILED: { variant: 'error', icon: XCircle },
      TIMEOUT: { variant: 'error', icon: AlertTriangle },
    };
    const { variant, icon: Icon } = config[status] || { variant: 'default' as const, icon: Clock };
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      C2B_STK_PUSH: 'STK Push',
      B2C_PAYMENT: 'B2C Payment',
      BALANCE_QUERY: 'Balance Query',
    };
    return <Badge variant="default">{labels[type] || type}</Badge>;
  };

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'C2B_STK_PUSH', label: 'STK Push' },
    { value: 'B2C_PAYMENT', label: 'B2C Payment' },
    { value: 'BALANCE_QUERY', label: 'Balance Query' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'SUCCESS', label: 'Success' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'TIMEOUT', label: 'Timeout' },
  ];

  const commandIdOptions = [
    { value: 'BusinessPayment', label: 'Business Payment' },
    { value: 'SalaryPayment', label: 'Salary Payment' },
    { value: 'PromotionPayment', label: 'Promotion Payment' },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="M-Pesa Management"
        description="View paybill balance, make B2C payments, and track M-Pesa transactions."
      />

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary-600" />
              Working Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <Spinner />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">
                  {balance?.workingBalance !== null
                    ? formatCurrency(balance?.workingBalance || 0, 'KES')
                    : 'N/A'}
                </p>
                {balance?.lastUpdated && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {formatDate(balance.lastUpdated)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              Utility Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <Spinner />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {balance?.utilityBalance !== null
                  ? formatCurrency(balance?.utilityBalance || 0, 'KES')
                  : 'N/A'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <Button
              onClick={handleRefreshBalance}
              isLoading={isRefreshingBalance}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Balance
            </Button>

            {isSuperAdmin && (
              <Button
                onClick={() => setShowB2CForm(!showB2CForm)}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {showB2CForm ? 'Cancel' : 'Make B2C Payment'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* B2C Payment Form */}
      {showB2CForm && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Initiate B2C Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleB2CSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="0712345678"
                  value={b2cForm.phoneNumber}
                  onChange={(e) => setB2cForm({ ...b2cForm, phoneNumber: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KES)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="150000"
                  placeholder="1000"
                  value={b2cForm.amount}
                  onChange={(e) => setB2cForm({ ...b2cForm, amount: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Min: KES 10, Max: KES 150,000</p>
              </div>

              <Select
                label="Payment Type"
                options={commandIdOptions}
                value={b2cForm.commandId}
                onChange={(e) => setB2cForm({ ...b2cForm, commandId: e.target.value as any })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Payment for order #123"
                  maxLength={100}
                  value={b2cForm.remarks}
                  onChange={(e) => setB2cForm({ ...b2cForm, remarks: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" isLoading={isSubmittingB2C}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Payment
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowB2CForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Balance Transactions */}
      {pendingBalanceTx.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Pending Balance Transactions ({pendingBalanceTx.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 mb-4">
              These transactions need manual reconciliation. Verify payment was received before marking as complete.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-yellow-100">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">User</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Reference</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBalanceTx.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-yellow-100">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={tx.type === 'DEPOSIT' ? 'success' : tx.type === 'WITHDRAWAL' ? 'error' : 'default'}
                          className="flex items-center gap-1 w-fit"
                        >
                          {tx.type === 'DEPOSIT' ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>{tx.userBalance.user.email}</div>
                        <div className="text-xs text-gray-500">
                          {tx.userBalance.user.firstName} {tx.userBalance.user.lastName}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {tx.phoneNumber || tx.userBalance.user.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(Math.abs(parseFloat(tx.amount)), 'KES')}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs max-w-[200px] truncate">
                        {tx.reference || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTransaction(tx.id)}
                          isLoading={completingTxId === tx.id}
                          disabled={completingTxId !== null}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="w-40">
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              />
            </div>

            <div className="w-40">
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search phone or receipt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoadingTransactions ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Receipt</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Initiated By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {getTypeBadge(tx.transactionType)}
                      </td>
                      <td className="py-3 px-4">
                        {tx.phoneNumber || '-'}
                        {tx.receiverPartyPublicName && (
                          <div className="text-xs text-gray-500">
                            {tx.receiverPartyPublicName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {tx.transactionType !== 'BALANCE_QUERY'
                          ? formatCurrency(tx.amount, 'KES')
                          : '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {tx.mpesaReceiptNumber || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(tx.status)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {tx.initiatedBy
                          ? `${tx.initiatedBy.firstName} ${tx.initiatedBy.lastName}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {transactions.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No transactions found
                </p>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMpesaPage;

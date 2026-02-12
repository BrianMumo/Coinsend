import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { ConfirmModal } from '../../components/ui/Modal';
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
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Filter,
  X,
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
  const [showFilters, setShowFilters] = useState(false);

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
  const [completingTxId, setCompletingTxId] = useState<string | null>(null);

  // Reversal state
  const [reversingTxId, setReversingTxId] = useState<string | null>(null);
  const [reversalModalTx, setReversalModalTx] = useState<MpesaTransaction | null>(null);

  // Complete transaction modal state
  const [completeModalTxId, setCompleteModalTxId] = useState<string | null>(null);

  // Selected transaction for detail view
  const [selectedTx, setSelectedTx] = useState<MpesaTransaction | null>(null);

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
      const response = await adminBalanceApi.getPendingTransactions();
      if (response.success && response.data) {
        setPendingBalanceTx(response.data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch pending balance transactions:', err);
    }
  };

  // Complete a pending balance transaction
  const handleCompleteTransaction = async () => {
    if (!completeModalTxId) return;

    setCompletingTxId(completeModalTxId);
    setCompleteModalTxId(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminBalanceApi.completeTransaction(completeModalTxId);
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

  // Refresh balance
  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminMpesaApi.refreshBalance();
      if (response.success) {
        setSuccess('Balance query initiated');
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
        setSuccess(`B2C payment initiated successfully`);
        setB2cForm({ phoneNumber: '', amount: '', commandId: 'BusinessPayment', remarks: '' });
        setShowB2CForm(false);
        setTimeout(() => fetchTransactions(), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initiate B2C payment');
    } finally {
      setIsSubmittingB2C(false);
    }
  };

  // Handle transaction reversal
  const handleReversal = async () => {
    if (!reversalModalTx) return;

    const tx = reversalModalTx;
    setReversalModalTx(null);
    setReversingTxId(tx.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminMpesaApi.initiateReversal(
        tx.id,
        parseFloat(tx.amount),
        `Reversal of payment to ${tx.phoneNumber}`
      );

      if (response.success) {
        setSuccess(`Reversal initiated successfully`);
        setTimeout(() => fetchTransactions(), 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initiate reversal');
    } finally {
      setReversingTxId(null);
    }
  };

  const canReverse = (tx: MpesaTransaction): boolean => {
    return (
      tx.transactionType === 'B2C_PAYMENT' &&
      tx.status === 'SUCCESS' &&
      !tx.isReversed &&
      !!tx.mpesaReceiptNumber &&
      isSuperAdmin
    );
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
    const config: Record<string, { variant: 'completed' | 'processing' | 'failed' | 'default'; icon: typeof CheckCircle }> = {
      SUCCESS: { variant: 'completed', icon: CheckCircle },
      PENDING: { variant: 'processing', icon: Clock },
      FAILED: { variant: 'failed', icon: XCircle },
      TIMEOUT: { variant: 'failed', icon: AlertTriangle },
    };
    const { variant, icon: Icon } = config[status] || { variant: 'default' as const, icon: Clock };
    return (
      <Badge variant={variant} className="flex items-center gap-1 text-[10px]">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      C2B_STK_PUSH: 'STK Push',
      B2C_PAYMENT: 'B2C',
      BALANCE_QUERY: 'Balance',
      REVERSAL: 'Reversal',
    };
    return labels[type] || type;
  };

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'C2B_STK_PUSH', label: 'STK Push' },
    { value: 'B2C_PAYMENT', label: 'B2C Payment' },
    { value: 'BALANCE_QUERY', label: 'Balance Query' },
    { value: 'REVERSAL', label: 'Reversal' },
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
    <div className="space-y-4">
      <PageTitle
        title="M-Pesa Management"
        description="View paybill balance, make B2C payments, and track M-Pesa transactions."
      />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">M-Pesa</h1>
        <p className="text-sm text-gray-500">Payments & Balance</p>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Balance Cards - Compact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary-600" />
            </div>
            <span className="text-xs text-gray-500">Working</span>
          </div>
          {isLoadingBalance ? (
            <Spinner size="sm" />
          ) : (
            <p className="text-lg font-bold text-gray-900">
              {balance?.workingBalance !== null
                ? formatCurrency(balance?.workingBalance || 0, 'KES')
                : 'N/A'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Utility</span>
          </div>
          {isLoadingBalance ? (
            <Spinner size="sm" />
          ) : (
            <p className="text-lg font-bold text-gray-900">
              {balance?.utilityBalance !== null
                ? formatCurrency(balance?.utilityBalance || 0, 'KES')
                : 'N/A'}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleRefreshBalance}
          isLoading={isRefreshingBalance}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
        {isSuperAdmin && (
          <Button
            onClick={() => setShowB2CForm(!showB2CForm)}
            size="sm"
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-1" />
            B2C Pay
          </Button>
        )}
      </div>

      {/* B2C Payment Form */}
      {showB2CForm && isSuperAdmin && (
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold mb-3">B2C Payment</h3>
          <form onSubmit={handleB2CSubmit} className="space-y-3">
            <Input
              type="tel"
              placeholder="Phone (0712345678)"
              value={b2cForm.phoneNumber}
              onChange={(e) => setB2cForm({ ...b2cForm, phoneNumber: e.target.value })}
              required
            />
            <Input
              type="number"
              min="10"
              max="150000"
              placeholder="Amount (KES)"
              value={b2cForm.amount}
              onChange={(e) => setB2cForm({ ...b2cForm, amount: e.target.value })}
              required
            />
            <Select
              options={commandIdOptions}
              value={b2cForm.commandId}
              onChange={(e) => setB2cForm({ ...b2cForm, commandId: e.target.value as any })}
            />
            <Input
              type="text"
              placeholder="Remarks (optional)"
              maxLength={100}
              value={b2cForm.remarks}
              onChange={(e) => setB2cForm({ ...b2cForm, remarks: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" isLoading={isSubmittingB2C} className="flex-1">
                Send
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowB2CForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Balance Transactions Alert */}
      {pendingBalanceTx.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">
              {pendingBalanceTx.length} Pending Transactions
            </span>
          </div>
          <div className="space-y-2">
            {pendingBalanceTx.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'DEPOSIT' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'DEPOSIT' ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.userBalance.user.email}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(Math.abs(parseFloat(tx.amount)), 'KES')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setCompleteModalTxId(tx.id)}
                  isLoading={completingTxId === tx.id}
                  disabled={completingTxId !== null}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Transactions</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              />
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
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
        )}

        {/* Transactions List */}
        {isLoadingTransactions ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No transactions found</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <button
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${tx.isReversed ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tx.transactionType === 'C2B_STK_PUSH' ? 'bg-green-100' :
                      tx.transactionType === 'B2C_PAYMENT' ? 'bg-blue-100' :
                      tx.transactionType === 'REVERSAL' ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      {tx.transactionType === 'C2B_STK_PUSH' ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      ) : tx.transactionType === 'B2C_PAYMENT' ? (
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      ) : tx.transactionType === 'REVERSAL' ? (
                        <RotateCcw className="h-4 w-4 text-orange-600" />
                      ) : (
                        <Wallet className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getTypeLabel(tx.transactionType)}
                        {tx.isReversed && <span className="text-red-500 text-xs ml-1">(Reversed)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{tx.phoneNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {tx.transactionType !== 'BALANCE_QUERY'
                        ? formatCurrency(tx.amount, 'KES')
                        : '-'}
                    </p>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h2 className="font-bold text-lg">{getTypeLabel(selectedTx.transactionType)}</h2>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-center">
                {getStatusBadge(selectedTx.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Amount</p>
                  <p className="font-semibold">
                    {selectedTx.transactionType !== 'BALANCE_QUERY'
                      ? formatCurrency(selectedTx.amount, 'KES')
                      : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Date</p>
                  <p className="font-medium text-sm">{formatDate(selectedTx.createdAt)}</p>
                </div>
                {selectedTx.phoneNumber && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-gray-500 text-xs mb-1">Phone</p>
                    <p className="font-mono">{selectedTx.phoneNumber}</p>
                    {selectedTx.receiverPartyPublicName && (
                      <p className="text-xs text-gray-500">{selectedTx.receiverPartyPublicName}</p>
                    )}
                  </div>
                )}
                {selectedTx.mpesaReceiptNumber && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-gray-500 text-xs mb-1">Receipt</p>
                    <p className="font-mono text-sm">{selectedTx.mpesaReceiptNumber}</p>
                  </div>
                )}
              </div>

              {canReverse(selectedTx) && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    setSelectedTx(null);
                    setReversalModalTx(selectedTx);
                  }}
                  isLoading={reversingTxId === selectedTx.id}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reverse Payment
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      <ConfirmModal
        isOpen={reversalModalTx !== null}
        onClose={() => setReversalModalTx(null)}
        onConfirm={handleReversal}
        title="Reverse B2C Payment"
        variant="danger"
        confirmText="Reverse Payment"
        cancelText="Cancel"
        isLoading={reversingTxId !== null}
        message={
          reversalModalTx && (
            <div className="text-left space-y-3">
              <p>Are you sure you want to reverse this B2C payment?</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-semibold">KES {parseFloat(reversalModalTx.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-mono">{reversalModalTx.phoneNumber}</span>
                </div>
              </div>
              <p className="text-red-600 text-xs font-medium">
                This action cannot be undone.
              </p>
            </div>
          )
        }
      />

      {/* Complete Transaction Confirmation Modal */}
      <ConfirmModal
        isOpen={completeModalTxId !== null}
        onClose={() => setCompleteModalTxId(null)}
        onConfirm={handleCompleteTransaction}
        title="Complete Transaction"
        variant="warning"
        confirmText="Mark as Complete"
        cancelText="Cancel"
        isLoading={completingTxId !== null}
        message={
          <div className="text-left">
            <p>Are you sure you want to mark this transaction as completed?</p>
            <p className="mt-2 text-yellow-700 text-xs">
              Please verify that the payment was received before completing.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default AdminMpesaPage;

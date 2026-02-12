import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminDepositsApi, adminWithdrawalsApi, UsdtDeposit, KesWithdrawal } from '../../api/admin.api';
import { formatDate, formatStatus } from '../../utils/formatters';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

type Tab = 'deposits' | 'withdrawals';

const AdminTransactionsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('withdrawals');
  const [deposits, setDeposits] = useState<UsdtDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<KesWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Withdrawal modal state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<KesWithdrawal | null>(null);
  const [mpesaReceipt, setMpesaReceipt] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDeposits = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await adminDepositsApi.getUsdtDeposits({ page, limit: pagination.limit });
      if (response.success && response.data) {
        setDeposits(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch deposits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWithdrawals = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await adminWithdrawalsApi.getKesWithdrawals({ page, limit: pagination.limit });
      if (response.success && response.data) {
        setWithdrawals(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'deposits') {
      fetchDeposits(1);
    } else {
      fetchWithdrawals(1);
    }
  }, [activeTab]);

  const handleCompleteWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    setError(null);

    try {
      await adminWithdrawalsApi.completeWithdrawal(selectedWithdrawal.id, mpesaReceipt || undefined);
      setSuccess('Withdrawal marked as completed');
      fetchWithdrawals(pagination.page);
      setTimeout(() => {
        setSelectedWithdrawal(null);
        setMpesaReceipt('');
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to complete withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectReason.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await adminWithdrawalsApi.rejectWithdrawal(selectedWithdrawal.id, rejectReason);
      setSuccess('Withdrawal rejected and USDT refunded');
      fetchWithdrawals(pagination.page);
      setTimeout(() => {
        setSelectedWithdrawal(null);
        setRejectReason('');
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reject withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'deposits') {
      fetchDeposits(pagination.page);
    } else {
      fetchWithdrawals(pagination.page);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (activeTab === 'deposits') {
      fetchDeposits(newPage);
    } else {
      fetchWithdrawals(newPage);
    }
  };

  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <PageTitle title="Transactions" description="Manage deposits and withdrawal requests." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">{pagination.total} total</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors relative ${
            activeTab === 'withdrawals'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          KES Withdrawals
          {pendingWithdrawalsCount > 0 && activeTab !== 'withdrawals' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'deposits'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          USDT Deposits
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : activeTab === 'withdrawals' ? (
        /* Withdrawals List */
        withdrawals.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">No withdrawal requests found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((withdrawal) => (
              <button
                key={withdrawal.id}
                onClick={() => withdrawal.status === 'PENDING' ? setSelectedWithdrawal(withdrawal) : null}
                className={`w-full bg-white rounded-xl p-4 text-left transition-colors ${
                  withdrawal.status === 'PENDING' ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{withdrawal.userName || withdrawal.userEmail}</p>
                      <p className="text-xs text-gray-500">USDT → M-Pesa</p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(withdrawal.status)} className="text-[10px]">
                    {formatStatus(withdrawal.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">{withdrawal.phoneNumber || withdrawal.userPhone}</p>
                    <p className="font-semibold text-orange-600">
                      ${parseFloat(withdrawal.usdtAmount).toFixed(2)} USDT
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(withdrawal.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        /* Deposits List */
        deposits.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">No deposits found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="w-full bg-white rounded-xl p-4 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{deposit.userName || deposit.userEmail}</p>
                      <p className="text-xs text-gray-500">USDT Deposit</p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(deposit.status)} className="text-[10px]">
                    {formatStatus(deposit.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    {deposit.txHash && (
                      <p className="text-gray-500 text-xs font-mono truncate max-w-[150px]">
                        {deposit.txHash.slice(0, 12)}...{deposit.txHash.slice(-8)}
                      </p>
                    )}
                    <p className="font-semibold text-green-600">
                      +${parseFloat(deposit.amount).toFixed(2)} USDT
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(deposit.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )
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

      {/* Withdrawal Action Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Process Withdrawal</h2>
                <p className="text-sm text-gray-500">{selectedWithdrawal.userEmail}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedWithdrawal(null);
                  setMpesaReceipt('');
                  setRejectReason('');
                  setError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {success && <Alert variant="success">{success}</Alert>}
              {error && <Alert variant="error">{error}</Alert>}

              {/* Withdrawal Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">User</p>
                  <p className="font-medium">{selectedWithdrawal.userName || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{selectedWithdrawal.userEmail}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Phone</p>
                  <p className="font-medium">{selectedWithdrawal.phoneNumber || selectedWithdrawal.userPhone || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 col-span-2">
                  <p className="text-blue-600 text-xs mb-1">Amount to Send</p>
                  <p className="font-bold text-xl text-blue-700">
                    ${parseFloat(selectedWithdrawal.usdtAmount).toFixed(2)} USDT
                  </p>
                  {selectedWithdrawal.description && (
                    <p className="text-xs text-blue-600 mt-1">{selectedWithdrawal.description}</p>
                  )}
                </div>
              </div>

              {/* Complete Section */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-green-700">Complete Withdrawal</h3>
                <p className="text-xs text-gray-500">
                  Send KES to the phone number above via M-Pesa, then enter the receipt below.
                </p>
                <Input
                  placeholder="M-Pesa Receipt Number (optional)"
                  value={mpesaReceipt}
                  onChange={(e) => setMpesaReceipt(e.target.value)}
                />
                <Button
                  onClick={handleCompleteWithdrawal}
                  isLoading={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              </div>

              {/* Reject Section */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-sm text-red-700">Reject & Refund USDT</h3>
                <p className="text-xs text-gray-500">
                  Rejecting will refund the USDT amount back to the user's balance.
                </p>
                <Input
                  placeholder="Reason for rejection (required)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <Button
                  onClick={handleRejectWithdrawal}
                  isLoading={isProcessing}
                  disabled={!rejectReason.trim()}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject & Refund
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactionsPage;

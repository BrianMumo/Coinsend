import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { PageTitle } from '../../components/ui/PageTitle';
import { ConfirmModal } from '../../components/ui/Modal';
import { adminUsersApi } from '../../api/admin.api';
import { User } from '../../types';
import { formatDate } from '../../utils/formatters';
import { KYC_STATUSES } from '../../utils/constants';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  Phone,
  X,
  UserX,
  UserCheck,
  Shield,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useAdminAuthStore } from '../../store/adminAuthStore';

const AdminUsersPage = () => {
  const { admin } = useAdminAuthStore();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const canManageUsers = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [users, setUsers] = useState<(User & { _count?: { orders: number }; balance?: { balance: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [kycFilter, setKycFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<User & { _count?: { orders: number }; balance?: { balance: string } } | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Suspend modal
  const [suspendModalUser, setSuspendModalUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // KYC modal
  const [kycModalUser, setKycModalUser] = useState<User | null>(null);
  const [newKycStatus, setNewKycStatus] = useState<string>('');

  // Credit deposit modal
  const [creditModalUser, setCreditModalUser] = useState<User | null>(null);
  const [creditForm, setCreditForm] = useState({ amount: '', txHash: '', usdtAmount: '' });

  // USDT adjustment modal
  const [adjustModalUser, setAdjustModalUser] = useState<User | null>(null);
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '' });

  const fetchUsers = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await adminUsersApi.getAll({
        page,
        limit: pagination.limit,
        kycStatus: kycFilter || undefined,
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (response.success && response.data) {
        setUsers(response.data as any);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [kycFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleSuspendUser = async () => {
    if (!suspendModalUser) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const isCurrentlyActive = suspendModalUser.isActive !== false;
      await adminUsersApi.updateStatus(suspendModalUser.id, !isCurrentlyActive, suspendReason);
      setActionSuccess(`User ${isCurrentlyActive ? 'suspended' : 'activated'} successfully`);
      setSuspendModalUser(null);
      setSuspendReason('');
      fetchUsers(pagination.page);
      if (selectedUser?.id === suspendModalUser.id) {
        setSelectedUser(prev => prev ? { ...prev, isActive: !isCurrentlyActive } : null);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateKyc = async () => {
    if (!kycModalUser || !newKycStatus) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await adminUsersApi.updateKycStatus(kycModalUser.id, newKycStatus as any);
      setActionSuccess(`KYC status updated to ${newKycStatus}`);
      setKycModalUser(null);
      setNewKycStatus('');
      fetchUsers(pagination.page);
      if (selectedUser?.id === kycModalUser.id) {
        setSelectedUser(prev => prev ? { ...prev, kycStatus: newKycStatus as any } : null);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || 'Failed to update KYC status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreditDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalUser) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await adminUsersApi.creditDeposit(
        creditModalUser.id,
        parseFloat(creditForm.amount),
        creditForm.txHash,
        parseFloat(creditForm.usdtAmount)
      );
      setActionSuccess(`Credited KES ${creditForm.amount} to user`);
      setCreditModalUser(null);
      setCreditForm({ amount: '', txHash: '', usdtAmount: '' });
      fetchUsers(pagination.page);
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || 'Failed to credit deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustUsdt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalUser || !adjustForm.amount || !adjustForm.reason) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const response = await adminUsersApi.adjustUsdtBalance(
        adjustModalUser.id,
        parseFloat(adjustForm.amount),
        adjustForm.reason
      );
      if (response.success && response.data) {
        setActionSuccess(`USDT balance adjusted: ${response.data.previousBalance} → ${response.data.newBalance}`);
      }
      setAdjustModalUser(null);
      setAdjustForm({ amount: '', reason: '' });
      fetchUsers(pagination.page);
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || 'Failed to adjust USDT balance');
    } finally {
      setActionLoading(false);
    }
  };

  const kycOptions = [
    { value: '', label: 'All KYC Statuses' },
    ...Object.entries(KYC_STATUSES).map(([value, { label }]) => ({
      value,
      label,
    })),
  ];

  const getKycBadgeVariant = (status: string) => {
    const variants: Record<string, 'default' | 'completed' | 'processing' | 'failed'> = {
      UNVERIFIED: 'default',
      PENDING: 'processing',
      VERIFIED: 'completed',
      REJECTED: 'failed',
    };
    return variants[status] || 'default';
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Users Management" description="View and manage registered users." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{pagination.total} total</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {actionSuccess && <Alert variant="success" className="mb-2">{actionSuccess}</Alert>}
      {actionError && <Alert variant="error" className="mb-2">{actionError}</Alert>}

      {/* Filters - Collapsible */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 space-y-3">
          <form onSubmit={handleSearch} className="space-y-3">
            <Input
              placeholder="Search by email, phone, or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              options={kycOptions}
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
            />
            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      )}

      {/* Users List - Card style */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full bg-white rounded-xl p-4 text-left transition-colors ${
                user.isActive === false ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    user.isActive === false ? 'bg-red-100' : 'bg-primary-100'
                  }`}>
                    <span className={`font-semibold text-sm ${
                      user.isActive === false ? 'text-red-600' : 'text-primary-600'
                    }`}>
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'No name'}
                      </p>
                      {user.isActive === false && (
                        <Badge variant="failed" className="text-[10px]">Suspended</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{user.country}</p>
                  </div>
                </div>
                <Badge variant={getKycBadgeVariant(user.kycStatus)} className="text-[10px]">
                  {KYC_STATUSES[user.kycStatus]?.label || user.kycStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs">{user.phone || 'No phone'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>{user._count?.orders || 0} orders</span>
                <span>Joined {user.createdAt ? formatDate(user.createdAt) : 'N/A'}</span>
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
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedUser.isActive === false ? 'bg-red-100' : 'bg-primary-100'
                }`}>
                  <span className={`font-semibold ${
                    selectedUser.isActive === false ? 'text-red-600' : 'text-primary-600'
                  }`}>
                    {selectedUser.firstName?.[0] || selectedUser.email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-bold">
                    {selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName || ''}`.trim() : 'User'}
                  </h2>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Status Badges */}
              <div className="flex gap-2 justify-center flex-wrap">
                <Badge variant={getKycBadgeVariant(selectedUser.kycStatus)}>
                  KYC: {KYC_STATUSES[selectedUser.kycStatus]?.label || selectedUser.kycStatus}
                </Badge>
                {selectedUser.isActive === false && (
                  <Badge variant="failed">Account Suspended</Badge>
                )}
              </div>

              {/* User Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Email</p>
                  <p className="font-medium truncate">{selectedUser.email}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Country</p>
                  <p className="font-medium">{selectedUser.country}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Orders</p>
                  <p className="font-medium">{selectedUser._count?.orders || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Joined</p>
                  <p className="font-medium">{selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'N/A'}</p>
                </div>
              </div>

              {/* Admin Actions */}
              {canManageUsers && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-sm">Admin Actions</h3>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Suspend/Activate Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={selectedUser.isActive === false ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}
                      onClick={() => setSuspendModalUser(selectedUser)}
                    >
                      {selectedUser.isActive === false ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </>
                      )}
                    </Button>

                    {/* Update KYC Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setKycModalUser(selectedUser);
                        setNewKycStatus(selectedUser.kycStatus);
                      }}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Update KYC
                    </Button>
                  </div>

                  {/* Credit Deposit - Super Admin Only */}
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setCreditModalUser(selectedUser)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Credit Deposit
                    </Button>
                  )}

                  {/* Adjust USDT Balance - Super Admin Only */}
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-green-600 border-green-300"
                      onClick={() => setAdjustModalUser(selectedUser)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Adjust USDT Balance
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suspend/Activate Modal */}
      <ConfirmModal
        isOpen={suspendModalUser !== null}
        onClose={() => {
          setSuspendModalUser(null);
          setSuspendReason('');
        }}
        onConfirm={handleSuspendUser}
        title={suspendModalUser?.isActive === false ? 'Activate User' : 'Suspend User'}
        variant={suspendModalUser?.isActive === false ? 'warning' : 'danger'}
        confirmText={suspendModalUser?.isActive === false ? 'Activate' : 'Suspend'}
        isLoading={actionLoading}
        message={
          <div className="text-left space-y-3">
            <p>
              {suspendModalUser?.isActive === false
                ? `Are you sure you want to activate ${suspendModalUser?.email}?`
                : `Are you sure you want to suspend ${suspendModalUser?.email}?`}
            </p>
            {suspendModalUser?.isActive !== false && (
              <Input
                placeholder="Reason for suspension (optional)"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            )}
            <p className="text-xs text-gray-500">
              {suspendModalUser?.isActive === false
                ? 'User will be able to login and use the platform again.'
                : 'Suspended users cannot login or access their account.'}
            </p>
          </div>
        }
      />

      {/* KYC Update Modal */}
      {kycModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <h3 className="font-bold mb-4">Update KYC Status</h3>
            <p className="text-sm text-gray-500 mb-4">
              User: {kycModalUser.email}
            </p>
            <Select
              label="New KYC Status"
              options={Object.entries(KYC_STATUSES).map(([value, { label }]) => ({
                value,
                label,
              }))}
              value={newKycStatus}
              onChange={(e) => setNewKycStatus(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                onClick={handleUpdateKyc}
                isLoading={actionLoading}
                disabled={!newKycStatus || newKycStatus === kycModalUser.kycStatus}
              >
                Update
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setKycModalUser(null);
                  setNewKycStatus('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Deposit Modal */}
      {creditModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <h3 className="font-bold mb-4">Credit Deposit</h3>
            <p className="text-sm text-gray-500 mb-4">
              User: {creditModalUser.email}
            </p>
            <form onSubmit={handleCreditDeposit} className="space-y-3">
              <Input
                label="USDT Amount"
                type="number"
                step="0.01"
                placeholder="e.g. 12"
                value={creditForm.usdtAmount}
                onChange={(e) => setCreditForm({ ...creditForm, usdtAmount: e.target.value })}
                required
              />
              <Input
                label="KES Amount to Credit"
                type="number"
                step="0.01"
                placeholder="e.g. 1554"
                value={creditForm.amount}
                onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                required
              />
              <Input
                label="Transaction Hash"
                placeholder="Paste the USDT tx hash"
                value={creditForm.txHash}
                onChange={(e) => setCreditForm({ ...creditForm, txHash: e.target.value })}
                required
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={actionLoading}
                >
                  Credit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreditModalUser(null);
                    setCreditForm({ amount: '', txHash: '', usdtAmount: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USDT Adjustment Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <h3 className="font-bold mb-2">Adjust USDT Balance</h3>
            <p className="text-sm text-gray-500 mb-4">
              User: {adjustModalUser.email}
            </p>
            <form onSubmit={handleAdjustUsdt} className="space-y-3">
              <Input
                label="USDT Amount"
                type="number"
                step="0.01"
                placeholder="e.g. 9 or -5"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500">
                Use positive numbers to add, negative to subtract
              </p>
              <Input
                label="Reason"
                placeholder="e.g. Correction for deposit #12345"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                required
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  isLoading={actionLoading}
                  disabled={!adjustForm.amount || !adjustForm.reason}
                >
                  Adjust Balance
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAdjustModalUser(null);
                    setAdjustForm({ amount: '', reason: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;

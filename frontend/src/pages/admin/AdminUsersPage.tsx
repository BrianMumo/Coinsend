import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { PageTitle } from '../../components/ui/PageTitle';
import { adminUsersApi } from '../../api/admin.api';
import { User } from '../../types';
import { formatDate } from '../../utils/formatters';
import { KYC_STATUSES } from '../../utils/constants';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminUsersPage = () => {
  const [users, setUsers] = useState<(User & { _count?: { orders: number } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [kycFilter, setKycFilter] = useState('');
  const [search, setSearch] = useState('');

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
    <div className="space-y-6">
      <PageTitle title="Users Management" description="View and manage registered users." />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-600">View and manage registered users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <Input
                placeholder="Search by email, phone, or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                options={kycOptions}
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <span className="text-sm text-gray-500">
              {pagination.total} users found
            </span>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Phone</th>
                      <th className="pb-3 font-medium">Country</th>
                      <th className="pb-3 font-medium">KYC Status</th>
                      <th className="pb-3 font-medium">Orders</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="text-sm">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-gray-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3">{user.phone || 'N/A'}</td>
                        <td className="py-3">{user.country}</td>
                        <td className="py-3">
                          <Badge variant={getKycBadgeVariant(user.kycStatus)}>
                            {KYC_STATUSES[user.kycStatus]?.label || user.kycStatus}
                          </Badge>
                        </td>
                        <td className="py-3">{user._count?.orders || 0}</td>
                        <td className="py-3 text-gray-500">
                          {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                        </td>
                        <td className="py-3 text-gray-500">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;

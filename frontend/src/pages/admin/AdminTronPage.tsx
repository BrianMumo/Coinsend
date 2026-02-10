import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { ConfirmModal } from '../../components/ui/Modal';
import { adminTronApi, TronWalletSummary, CryptoTransaction } from '../../api/admin.api';
import { formatDate } from '../../utils/formatters';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import {
  RefreshCw,
  Send,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ExternalLink,
  Copy,
  CheckCircle,
  Search,
} from 'lucide-react';

const AdminTronPage = () => {
  const { admin } = useAdminAuthStore();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  // Wallet state
  const [wallet, setWallet] = useState<TronWalletSummary | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [txFilter, setTxFilter] = useState({ type: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Send USDT state
  const [sendForm, setSendForm] = useState({ toAddress: '', amount: '' });
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Check deposits state
  const [isCheckingDeposits, setIsCheckingDeposits] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Fetch wallet summary
  const fetchWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const response = await adminTronApi.getWalletSummary();
      if (response.success && response.data) {
        setWallet(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch wallet:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch wallet summary');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async (page: number = 1) => {
    setIsLoadingTx(true);
    try {
      const response = await adminTronApi.getTransactions({
        page,
        limit: pagination.limit,
        type: txFilter.type as 'DEPOSIT' | 'WITHDRAWAL' | undefined || undefined,
        status: txFilter.status as any || undefined,
      });
      if (response.success && response.data) {
        setTransactions(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [txFilter]);

  // Check for new deposits
  const handleCheckDeposits = async () => {
    setIsCheckingDeposits(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await adminTronApi.checkDeposits();
      if (response.success) {
        setSuccess(response.message || `Found ${response.data?.newDeposits || 0} new deposit(s)`);
        fetchWallet();
        fetchTransactions();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to check deposits');
    } finally {
      setIsCheckingDeposits(false);
    }
  };

  // Validate address
  const handleValidateAddress = async (address: string) => {
    if (!address || address.length < 30) {
      setAddressValid(null);
      return;
    }
    setIsValidatingAddress(true);
    try {
      const response = await adminTronApi.validateAddress(address);
      setAddressValid(response.data?.isValid || false);
    } catch {
      setAddressValid(false);
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Send USDT
  const handleSendUsdt = async () => {
    setShowSendModal(false);
    setIsSending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await adminTronApi.sendUsdt(sendForm.toAddress, parseFloat(sendForm.amount));
      if (response.success) {
        setSuccess(`Successfully sent ${sendForm.amount} USDT. TX: ${response.data?.txHash}`);
        setSendForm({ toAddress: '', amount: '' });
        setAddressValid(null);
        fetchWallet();
        fetchTransactions();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send USDT');
    } finally {
      setIsSending(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (wallet?.hotWallet) {
      navigator.clipboard.writeText(wallet.hotWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get type badge variant
  const getTypeVariant = (type: string) => {
    return type === 'DEPOSIT' ? 'success' : 'info';
  };

  // Format USDT amount
  const formatUsdt = (amount: string | number) => {
    return parseFloat(amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <div className="space-y-6">
      <PageTitle title="TRON Wallet" description="Manage USDT TRC-20 transactions" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TRON Wallet</h1>
        <p className="text-gray-600">Manage USDT TRC-20 deposits and withdrawals</p>
      </div>

      {/* Messages */}
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Wallet Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Hot Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingWallet ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : wallet ? (
              <div className="space-y-4">
                {/* Address */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">Address:</span>
                  <code className="flex-1 text-sm font-mono">{wallet.hotWallet}</code>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Copy address"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={`https://tronscan.org/#/address/${wallet.hotWallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="View on TronScan"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">USDT Balance</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatUsdt(wallet.balances.usdt)} <span className="text-sm">USDT</span>
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">TRX Balance (for fees)</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {wallet.balances.trx.toFixed(2)} <span className="text-sm">TRX</span>
                    </p>
                  </div>
                </div>

                {/* Today's Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ArrowDownCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Today's Deposits</p>
                      <p className="font-semibold">
                        {formatUsdt(wallet.today.deposits.amount)} USDT ({wallet.today.deposits.count})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ArrowUpCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Today's Withdrawals</p>
                      <p className="font-semibold">
                        {formatUsdt(wallet.today.withdrawals.amount)} USDT ({wallet.today.withdrawals.count})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Network Badge */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Badge variant="default">{wallet.network.toUpperCase()}</Badge>
                  <span>Network</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Failed to load wallet data</p>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Check Deposits */}
            <Button
              onClick={handleCheckDeposits}
              isLoading={isCheckingDeposits}
              className="w-full"
              variant="outline"
            >
              <Search className="h-4 w-4 mr-2" />
              Check for Deposits
            </Button>

            {/* Refresh */}
            <Button
              onClick={() => { fetchWallet(); fetchTransactions(); }}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Send USDT (SUPER_ADMIN only) */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send USDT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Recipient Address"
                  placeholder="T..."
                  value={sendForm.toAddress}
                  onChange={(e) => {
                    setSendForm({ ...sendForm, toAddress: e.target.value });
                    handleValidateAddress(e.target.value);
                  }}
                  className={addressValid === true ? 'border-green-500' : addressValid === false ? 'border-red-500' : ''}
                />
                {isValidatingAddress && <p className="text-xs text-gray-500 mt-1">Validating...</p>}
                {addressValid === true && <p className="text-xs text-green-600 mt-1">Valid TRON address</p>}
                {addressValid === false && <p className="text-xs text-red-600 mt-1">Invalid TRON address</p>}
              </div>
              <div>
                <Input
                  label="Amount (USDT)"
                  type="number"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => setShowSendModal(true)}
                disabled={!addressValid || !sendForm.amount || parseFloat(sendForm.amount) < 1}
                isLoading={isSending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send USDT
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <div className="flex gap-2">
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'DEPOSIT', label: 'Deposits' },
                { value: 'WITHDRAWAL', label: 'Withdrawals' },
              ]}
              value={txFilter.type}
              onChange={(e) => setTxFilter({ ...txFilter, type: e.target.value })}
              className="w-32"
            />
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'FAILED', label: 'Failed' },
              ]}
              value={txFilter.status}
              onChange={(e) => setTxFilter({ ...txFilter, status: e.target.value })}
              className="w-32"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTx ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Address</th>
                      <th className="pb-3 font-medium">TX Hash</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="text-sm">
                        <td className="py-3">
                          <Badge variant={getTypeVariant(tx.type)}>
                            {tx.type === 'DEPOSIT' ? (
                              <><ArrowDownCircle className="h-3 w-3 mr-1" /> Deposit</>
                            ) : (
                              <><ArrowUpCircle className="h-3 w-3 mr-1" /> Withdrawal</>
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 font-medium">
                          {formatUsdt(tx.amount)} USDT
                        </td>
                        <td className="py-3 font-mono text-xs">
                          {tx.type === 'DEPOSIT' ? tx.fromAddress : tx.toAddress}
                        </td>
                        <td className="py-3">
                          <a
                            href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary-600 hover:underline flex items-center gap-1"
                          >
                            {tx.txHash.slice(0, 16)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-3">
                          <Badge variant={getStatusVariant(tx.status)}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-500">
                          {formatDate(tx.createdAt)}
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
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => fetchTransactions(pagination.page - 1)}
                    >
                      Previous
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Send Confirmation Modal */}
      <ConfirmModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onConfirm={handleSendUsdt}
        title="Confirm USDT Transfer"
        variant="warning"
        confirmText="Send USDT"
        cancelText="Cancel"
        isLoading={isSending}
        message={
          <div className="text-left space-y-3">
            <p>Are you sure you want to send USDT?</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-semibold">{sendForm.amount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">To:</span>
                <span className="font-mono text-xs">{sendForm.toAddress}</span>
              </div>
            </div>
            <p className="text-yellow-600 text-xs font-medium">
              This action cannot be undone. Double-check the recipient address.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default AdminTronPage;

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { WalletSkeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import { balanceApi } from '../../api/balance.api';
import { ratesApi } from '../../api/rates.api';
import { BalanceTransaction, BalanceWithHistory } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
  RefreshCw,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';

type TabType = 'all' | 'deposits' | 'withdrawals';

const WalletPage = () => {
  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const [data, setData] = useState<BalanceWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [usdtRate, setUsdtRate] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit
  const [depositAddress, setDepositAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showManualVerify, setShowManualVerify] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(user?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { action?: string } | null;
    if (state?.action === 'deposit') setShowDepositModal(true);
    else if (state?.action === 'withdraw') setShowWithdrawModal(true);
  }, [location.state]);

  const fetchBalance = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setRefreshing(true);
      const [balanceResponse, usdtResponse, ratesResponse] = await Promise.all([
        balanceApi.getBalance({ limit: 50 }),
        balanceApi.getUsdtBalance(),
        ratesApi.getAll(),
      ]);

      if (balanceResponse.success && balanceResponse.data) {
        setData(balanceResponse.data);
        if (balanceResponse.data.balance) {
          updateUser({
            balance: {
              balance: balanceResponse.data.balance.balance,
              usdtBalance: balanceResponse.data.balance.usdtBalance,
              currency: balanceResponse.data.balance.currency,
            },
          });
        }
      }

      if (usdtResponse.success && usdtResponse.data) {
        setDepositAddress(usdtResponse.data.depositAddress);
      }

      if (ratesResponse.success && ratesResponse.data) {
        const rates = ratesResponse.data.rates || ratesResponse.data;
        const usdtKes = Array.isArray(rates)
          ? rates.find((r: { pair: string; buyRate: string | number }) => r.pair === 'USDT_KES')
          : null;
        if (usdtKes) setUsdtRate(parseFloat(usdtKes.buyRate.toString()));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      if (!silent) setError(e.response?.data?.error?.message || 'Failed to load balance');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const copyAddress = async () => {
    if (depositAddress) {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    const txHash = depositTxHash.trim();
    if (!txHash || txHash.length < 64) {
      setVerifyError('Enter a valid transaction hash (64+ characters)');
      return;
    }
    try {
      setIsVerifying(true);
      const response = await balanceApi.verifyDeposit(txHash);
      if (response.success && response.data) {
        setVerifySuccess(`Credited ${response.data.usdtAmount} USDT to your account`);
        setDepositTxHash('');
        fetchBalance(true);
        setTimeout(() => {
          setVerifySuccess(null);
          setShowManualVerify(false);
        }, 4000);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setVerifyError(e.response?.data?.error?.message || 'Failed to verify deposit');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWithdrawToKes = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);
    const kesAmount = parseFloat(withdrawAmount);
    const currentKes = usdtBalance * usdtRate;
    if (isNaN(kesAmount) || kesAmount < 100) { setWithdrawError('Minimum withdrawal is KES 100'); return; }
    if (kesAmount > 250000) { setWithdrawError('Maximum withdrawal is KES 250,000'); return; }
    if (kesAmount > currentKes) { setWithdrawError('Insufficient balance'); return; }
    if (!withdrawPhone) { setWithdrawError('Phone number is required'); return; }
    try {
      setIsSubmitting(true);
      const usdtAmount = kesAmount / usdtRate;
      const response = await balanceApi.withdrawToKes(usdtAmount, withdrawPhone);
      if (response.success) {
        setWithdrawSuccess(`Sending KES ${kesAmount.toLocaleString()} to ${withdrawPhone} 🎉`);
        setWithdrawAmount('');
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess(null);
          fetchBalance(true);
        }, 3000);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setWithdrawError(e.response?.data?.error?.message || 'Failed to initiate withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setShowManualVerify(false);
    setDepositTxHash('');
    setVerifyError(null);
    setVerifySuccess(null);
  };

  const formatTxType = (type: string) => ({
    DEPOSIT: 'M-Pesa Deposit',
    WITHDRAWAL: 'M-Pesa Withdrawal',
    ORDER_PAYMENT: 'Order Payment',
    ORDER_REFUND: 'Refund',
    ADJUSTMENT: 'Adjustment',
    USDT_DEPOSIT: 'USDT Deposit',
    USDT_WITHDRAWAL: 'USDT Withdrawal',
    KES_WITHDRAWAL: 'USDT → M-Pesa',
  }[type] || type);

  const isCredit = (type: string) =>
    type.includes('DEPOSIT') || type === 'ORDER_REFUND' || type === 'ADJUSTMENT';

  const getStatusVariant = (status: string): 'pending' | 'completed' | 'failed' | 'cancelled' => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'PENDING') return 'pending';
    if (status === 'FAILED') return 'failed';
    return 'cancelled';
  };

  const formatAmount = (tx: BalanceTransaction) => {
    const credit = isCredit(tx.type);
    const hasUsdt = (tx.usdtAmount && parseFloat(tx.usdtAmount) > 0) || tx.currency === 'USDT';
    if (hasUsdt) {
      const v = parseFloat(tx.usdtAmount || tx.amount);
      return { text: `${credit ? '+' : '-'}$${Math.abs(v).toFixed(2)}`, credit };
    }
    return { text: `${credit ? '+' : '-'}KES ${Math.abs(parseFloat(tx.amount)).toLocaleString()}`, credit };
  };

  const filteredTxs = data?.transactions?.filter((tx: BalanceTransaction) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'deposits') return isCredit(tx.type);
    return !isCredit(tx.type);
  }) || [];

  if (isLoading) return <WalletSkeleton />;
  if (error) return (
    <div className="space-y-4">
      <Alert variant="error" title="Error">{error}</Alert>
      <Button onClick={() => fetchBalance()}>Try Again</Button>
    </div>
  );

  const usdtBalance = parseFloat(data?.balance?.usdtBalance || '0');
  const kesEquivalent = usdtBalance * usdtRate;

  return (
    <div className="space-y-4 pb-4">

      {/* Balance Card */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E1038 0%, #3B1F7C 40%, #8B5E14 100%)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-8 w-28 h-28 rounded-full bg-white/5" />

        <div className="relative p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lavender-300/80 text-xs font-medium tracking-wide uppercase">Wallet Balance</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchBalance(true)}
                className={`p-1.5 hover:bg-white/10 rounded-full transition-colors ${refreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="h-4 w-4 text-lavender-300/70" />
              </button>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                {showBalance ? <EyeOff className="h-4 w-4 text-lavender-300/70" /> : <Eye className="h-4 w-4 text-lavender-300/70" />}
              </button>
            </div>
          </div>

          <p className="text-3xl font-bold text-white mb-0.5">
            {showBalance
              ? `KES ${kesEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : 'KES ••••••'
            }
          </p>
          <p className="text-sm text-lavender-300/50 mb-4">
            {showBalance ? `≈ $${usdtBalance.toFixed(2)} USDT` : '≈ $•••• USDT'}
          </p>

          {usdtRate > 0 && (
            <div className="flex items-center gap-1.5 mb-5">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                <TrendingUp className="h-3 w-3 text-lavender-300/80" />
                <span className="text-xs text-white font-medium">1 USDT = KES {usdtRate.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center justify-center gap-2 bg-white text-dark-900 py-2.5 rounded-xl font-semibold text-sm hover:bg-gold-100 transition-colors shadow-sm"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit USDT
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={kesEquivalent < 100}
              className="flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-white/25 disabled:opacity-40 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw KES
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-dark-800/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-surface-700/50">
        {/* Tabs */}
        <div className="flex border-b border-surface-700/30">
          {[
            { key: 'all', label: 'All' },
            { key: 'deposits', label: 'Deposits' },
            { key: 'withdrawals', label: 'Withdrawals' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-gold-400 border-b-2 border-primary-500'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredTxs.length > 0 ? (
          <div>
            {filteredTxs.map((tx: BalanceTransaction, index: number) => {
              const { text, credit } = formatAmount(tx);
              return (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-surface-700/15 transition-colors ${index !== 0 ? 'border-t border-surface-700/20' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${credit ? 'bg-accent-500/15 border border-accent-500/20' : 'bg-red-500/15 border border-red-500/20'}`}>
                      {credit
                        ? <ArrowDownLeft className="h-4 w-4 text-accent-400" />
                        : <ArrowUpRight className="h-4 w-4 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200 leading-tight">{formatTxType(tx.type)}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${credit ? 'text-accent-400' : 'text-red-400'}`}>{text}</p>
                    <Badge variant={getStatusVariant(tx.status)} className="text-[10px] mt-0.5">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-surface-700/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-surface-300 text-sm font-medium">No {activeTab === 'all' ? '' : activeTab} transactions yet</p>
          </div>
        )}
      </div>

      {/* ─── DEPOSIT MODAL ─────────────────────────────────── */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
          <div className="bg-dark-800/95 backdrop-blur-xl border border-surface-700/50 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-glass-lg">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-surface-600 rounded-full" />
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-surface-50">Deposit USDT</h2>
                <button onClick={closeDepositModal} className="p-2 hover:bg-surface-700/50 rounded-full transition-colors">
                  <X className="h-5 w-5 text-surface-400" />
                </button>
              </div>

              {/* Auto-credit banner */}
              <div className="flex items-start gap-3 bg-gold-400/10 border border-gold-400/20 rounded-2xl p-3.5 mb-5">
                <div className="w-8 h-8 bg-gold-400/15 border border-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-gold-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gold-300">Automatic — no verification needed</p>
                  <p className="text-xs text-gold-400/70 mt-0.5 leading-relaxed">
                    Send USDT to your address below. Your balance updates automatically within ~30 seconds.
                  </p>
                </div>
              </div>

              {/* Your personal address */}
              <div className="mb-4">
                <p className="text-xs text-surface-500 font-medium uppercase tracking-wide mb-2">Your Personal TRC-20 Address</p>
                <div className="bg-dark-900/80 border border-surface-700/50 rounded-2xl p-4">
                  <p className="font-mono text-sm text-surface-200 break-all leading-relaxed mb-3">
                    {depositAddress || 'Loading...'}
                  </p>
                  <button
                    onClick={copyAddress}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      copied
                        ? 'bg-accent-500 text-white'
                        : 'bg-gold-400 text-white hover:bg-gold-300 shadow-glow-sm'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Address Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Address
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Network warning */}
              <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
                <span className="text-yellow-400 text-base leading-none mt-0.5">⚠️</span>
                <p className="text-xs text-yellow-300">
                  <strong>TRON (TRC-20) Network Only.</strong> Sending on any other network will result in permanent loss of funds.
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-2.5 mb-5">
                {[
                  { n: '1', text: 'Copy your personal deposit address above' },
                  { n: '2', text: 'Open your crypto wallet and send USDT (TRC-20)' },
                  { n: '3', text: 'Your balance updates automatically — no action needed' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gold-400/15 border border-gold-400/20 text-gold-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      {step.n}
                    </div>
                    <p className="text-sm text-surface-400">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-surface-500 mb-5">
                <Shield className="h-3.5 w-3.5" />
                <span>This address is unique to your account and never changes</span>
              </div>

              {/* Manual verify collapse */}
              <div className="border border-surface-700/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowManualVerify(!showManualVerify)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-surface-400 hover:bg-surface-700/20 transition-colors"
                >
                  <span className="font-medium">Didn't receive credit?</span>
                  {showManualVerify ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showManualVerify && (
                  <div className="px-4 pb-4 border-t border-surface-700/30 pt-3">
                    <p className="text-xs text-surface-500 mb-3">
                      If your balance hasn't updated after 2 minutes, submit your transaction hash for manual processing.
                    </p>
                    {verifyError && <Alert variant="error" className="text-xs mb-3">{verifyError}</Alert>}
                    {verifySuccess && <Alert variant="success" className="text-xs mb-3">{verifySuccess}</Alert>}
                    <form onSubmit={handleManualVerify} className="space-y-3">
                      <Input
                        label="Transaction Hash"
                        type="text"
                        value={depositTxHash}
                        onChange={(e) => setDepositTxHash(e.target.value)}
                        placeholder="Paste TRON transaction hash..."
                        disabled={isVerifying}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        isLoading={isVerifying}
                      >
                        Verify Manually
                      </Button>
                    </form>
                  </div>
                )}
              </div>

              <button
                onClick={closeDepositModal}
                className="w-full mt-3 py-3 text-sm font-medium text-surface-500 hover:text-surface-300 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── WITHDRAW MODAL ────────────────────────────────── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
          <div className="bg-dark-800/95 backdrop-blur-xl border border-surface-700/50 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-glass-lg">

            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-surface-600 rounded-full" />
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-surface-50">Withdraw to M-Pesa</h2>
                <button
                  onClick={() => { setShowWithdrawModal(false); setWithdrawError(null); setWithdrawSuccess(null); setWithdrawAmount(''); }}
                  className="p-2 hover:bg-surface-700/50 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-surface-400" />
                </button>
              </div>

              {/* Available balance */}
              <div className="bg-gold-400/10 border border-gold-400/20 rounded-2xl p-4 mb-5 text-center">
                <p className="text-xs text-gold-400 font-medium mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-surface-50">
                  KES {kesEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                {usdtRate > 0 && (
                  <p className="text-xs text-gold-400/70 mt-1">≈ ${usdtBalance.toFixed(2)} USDT</p>
                )}
              </div>

              {withdrawError && <Alert variant="error" className="mb-4 text-sm">{withdrawError}</Alert>}
              {withdrawSuccess && <Alert variant="success" className="mb-4 text-sm">{withdrawSuccess}</Alert>}

              <form onSubmit={handleWithdrawToKes} className="space-y-4">
                <Input
                  label="Amount (KES)"
                  type="number"
                  step="1"
                  min="100"
                  max={Math.min(250000, kesEquivalent)}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount in KES"
                  required
                  disabled={isSubmitting}
                />

                {/* KES → USDT preview */}
                {withdrawAmount && usdtRate > 0 && (
                  <div className="bg-dark-900/80 border border-surface-700/50 rounded-xl p-3 flex items-center justify-between text-sm">
                    <span className="text-surface-400">You send</span>
                    <span className="font-semibold text-surface-100">
                      ${(parseFloat(withdrawAmount) / usdtRate).toFixed(2)} USDT
                    </span>
                  </div>
                )}

                <Input
                  label="M-Pesa Phone Number"
                  type="tel"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="0712345678"
                  required
                  disabled={isSubmitting}
                />

                <p className="text-xs text-surface-500 text-center">Min KES 100 · Max KES 250,000</p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowWithdrawModal(false); setWithdrawError(null); setWithdrawSuccess(null); setWithdrawAmount(''); }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-accent-500 hover:bg-accent-600 shadow-glow-gold"
                    isLoading={isSubmitting}
                  >
                    Send to M-Pesa
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;

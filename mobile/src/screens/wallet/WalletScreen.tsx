import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { balanceApi } from '../../api/balance.api';
import { ratesApi } from '../../api/rates.api';
import { BalanceCard } from '../../components/ui/BalanceCard';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { Colors } from '../../utils/constants';
import {
  formatTransactionType,
  formatDateTime,
  isDepositType,
} from '../../utils/formatters';
import { BalanceTransaction, Pagination } from '../../types';
import { MainTabsParamList } from '../../navigation/MainTabs';

type FilterTab = 'all' | 'deposits' | 'withdrawals';

const FILTER_TYPE_MAP: Record<FilterTab, string | undefined> = {
  all: undefined,
  deposits: 'USDT_DEPOSIT',
  withdrawals: 'KES_WITHDRAWAL,USDT_WITHDRAWAL',
};

export function WalletScreen() {
  const route = useRoute<RouteProp<MainTabsParamList, 'Wallet'>>();

  const [usdtBalance, setUsdtBalance] = useState('0');
  const [usdtRate, setUsdtRate] = useState(130);
  const [showBalance, setShowBalance] = useState(true);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [txs, setTxs] = useState<BalanceTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Auto-open modal from navigation params
  useEffect(() => {
    if (route.params?.action === 'deposit') setShowDeposit(true);
    if (route.params?.action === 'withdraw') setShowWithdraw(true);
  }, [route.params]);

  const loadBalance = useCallback(async () => {
    try {
      const [balRes, ratesRes] = await Promise.all([
        balanceApi.getBalance({ limit: 1 }),
        ratesApi.getAll(),
      ]);
      if (balRes.data) setUsdtBalance(balRes.data.balance.usdtBalance ?? '0');
      if (ratesRes.data?.rates) {
        const rate = ratesRes.data.rates.find((r) => r.pair === 'USDT_KES' && r.isActive);
        if (rate) setUsdtRate(parseFloat(rate.buyRate));
      }
    } catch {}
  }, []);

  const loadTxs = useCallback(
    async (pageNum: number, tab: FilterTab, isRefresh = false) => {
      if (pageNum === 1) {
        isRefresh ? setRefreshing(true) : setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params: Record<string, unknown> = { page: pageNum, limit: 20 };
        const typeFilter = FILTER_TYPE_MAP[tab];
        if (typeFilter) params.type = typeFilter;

        const res = await balanceApi.getTransactions(params);
        const newTxs = res.data ?? [];

        setTxs((prev) => (pageNum === 1 ? newTxs : [...prev, ...newTxs]));
        if (res.pagination) setPagination(res.pagination);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadBalance();
      loadTxs(1, activeTab);
      setPage(1);
    }, [loadBalance, loadTxs, activeTab])
  );

  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab);
    setPage(1);
    loadTxs(1, tab);
  }

  function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    loadBalance();
    loadTxs(1, activeTab, true);
  }

  function handleLoadMore() {
    const totalPages = pagination?.totalPages ?? 1;
    if (isLoadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadTxs(nextPage, activeTab);
  }

  function handleModalSuccess() {
    loadBalance();
    loadTxs(1, activeTab, true);
    setPage(1);
  }

  if (isLoading) return <Spinner fullScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={txs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>Wallet</Text>
            <BalanceCard
              usdtBalance={usdtBalance}
              usdtRate={usdtRate}
              showBalance={showBalance}
              onToggleBalance={() => setShowBalance((v) => !v)}
              onDeposit={() => setShowDeposit(true)}
              onWithdraw={() => setShowWithdraw(true)}
            />

            <View style={styles.filterTabs}>
              {(['all', 'deposits', 'withdrawals'] as FilterTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => handleTabChange(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Transactions</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <TxRow tx={item} />}
      />

      <DepositModal
        visible={showDeposit}
        onClose={() => setShowDeposit(false)}
        onSuccess={handleModalSuccess}
      />
      <WithdrawModal
        visible={showWithdraw}
        usdtBalance={usdtBalance}
        onClose={() => setShowWithdraw(false)}
        onSuccess={handleModalSuccess}
      />
    </View>
  );
}

function TxRow({ tx }: { tx: BalanceTransaction }) {
  const isDeposit = isDepositType(tx.type);
  const amount = parseFloat(tx.usdtAmount ?? tx.amount);

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isDeposit ? Colors.successBg : Colors.errorBg }]}>
        <Ionicons
          name={isDeposit ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={18}
          color={isDeposit ? Colors.success : Colors.error}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txType}>{formatTransactionType(tx.type)}</Text>
        <Text style={styles.txDate}>{formatDateTime(tx.createdAt)}</Text>
        {tx.txHash && (
          <Text style={styles.txHash} numberOfLines={1}>
            {tx.txHash.slice(0, 16)}...
          </Text>
        )}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isDeposit ? Colors.success : Colors.error }]}>
          {isDeposit ? '+' : '-'}{Math.abs(amount).toFixed(4)} USDT
        </Text>
        <Badge label={tx.status.toLowerCase()} variant={getStatusVariant(tx.status)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  txDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txHash: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
});

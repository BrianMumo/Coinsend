import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { balanceApi } from '../../api/balance.api';
import { ratesApi } from '../../api/rates.api';
import { BalanceCard } from '../../components/ui/BalanceCard';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Colors } from '../../utils/constants';
import { formatTransactionType, formatTimeAgo, isDepositType } from '../../utils/formatters';
import { BalanceTransaction } from '../../types';
import { MainTabsParamList } from '../../navigation/MainTabs';

type Props = {
  navigation: BottomTabNavigationProp<MainTabsParamList, 'Home'>;
};

export function HomeScreen({ navigation }: Props) {
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [usdtRate, setUsdtRate] = useState(130);
  const [recentTxs, setRecentTxs] = useState<BalanceTransaction[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [balRes, ratesRes] = await Promise.all([
        balanceApi.getBalance({ limit: 10 }),
        ratesApi.getAll(),
      ]);

      if (balRes.data) {
        setUsdtBalance(balRes.data.balance.usdtBalance ?? '0');
        setRecentTxs(balRes.data.transactions.slice(0, 5));
      }

      if (ratesRes.data?.rates) {
        const rate = ratesRes.data.rates.find(
          (r) => r.pair === 'USDT_KES' && r.isActive
        );
        if (rate) setUsdtRate(parseFloat(rate.buyRate));
      }
    } catch {
      // silent fail — data stays at previous values
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  if (isLoading) return <Spinner fullScreen />;

  return (
    <ScreenWrapper refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Dashboard</Text>
      </View>

      <BalanceCard
        usdtBalance={usdtBalance}
        usdtRate={usdtRate}
        showBalance={showBalance}
        onToggleBalance={() => setShowBalance((v) => !v)}
        onDeposit={() => navigation.navigate('Wallet', { action: 'deposit' })}
        onWithdraw={() => navigation.navigate('Wallet', { action: 'withdraw' })}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet', undefined)}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentTxs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <FlatList
            data={recentTxs}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => <TransactionRow tx={item} />}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

function TransactionRow({ tx }: { tx: BalanceTransaction }) {
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
        <Text style={styles.txDate}>{formatTimeAgo(tx.createdAt)}</Text>
      </View>

      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isDeposit ? Colors.success : Colors.error }]}>
          {isDeposit ? '+' : '-'}{Math.abs(amount).toFixed(4)} USDT
        </Text>
        <Badge
          label={tx.status.toLowerCase()}
          variant={getStatusVariant(tx.status)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

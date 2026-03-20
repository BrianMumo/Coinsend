import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ratesApi } from '../../api/rates.api';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { Colors, CURRENCY_COUNTRY } from '../../utils/constants';
import { formatRate, formatSpread, formatDateTime } from '../../utils/formatters';
import { ExchangeRate } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

export function RatesScreen() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRates = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      const res = await ratesApi.getAll();
      if (res.data?.rates) {
        setRates(res.data.rates.filter((r) => r.isActive));
        const latest = res.data.rates.reduce((a, b) =>
          new Date(a.lastUpdated) > new Date(b.lastUpdated) ? a : b
        );
        if (latest) setLastUpdated(latest.lastUpdated);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRates();
    }, [loadRates])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadRates(true);
  }

  const cryptoRates = rates.filter(
    (r) => r.pair.includes('USDT') || r.pair.includes('USDC')
  );
  const crossBorderRates = rates.filter(
    (r) => r.pair.startsWith('KES_') && !r.pair.includes('USD')
  );

  if (isLoading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.pageTitle}>Exchange Rates</Text>

        {/* Crypto Rates */}
        <Text style={styles.sectionTitle}>Crypto Rates</Text>
        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, styles.headerText, { flex: 1.5 }]}>Pair</Text>
            <Text style={[styles.col, styles.headerText, { textAlign: 'right' }]}>Buy (KES)</Text>
            <Text style={[styles.col, styles.headerText, { textAlign: 'right' }]}>Sell (KES)</Text>
            <Text style={[styles.col, styles.headerText, { textAlign: 'right' }]}>Spread</Text>
          </View>
          {cryptoRates.length === 0 ? (
            <Text style={styles.noData}>No crypto rates available</Text>
          ) : (
            cryptoRates.map((rate, i) => (
              <View key={rate.id} style={[styles.tableRow, i % 2 === 0 && styles.rowEven]}>
                <View style={[styles.col, { flex: 1.5 }]}>
                  <Text style={styles.pairName}>{rate.pair.replace('_', '/')}</Text>
                </View>
                <Text style={[styles.col, styles.buyRate, { textAlign: 'right' }]}>
                  {formatRate(rate.buyRate)}
                </Text>
                <Text style={[styles.col, styles.sellRate, { textAlign: 'right' }]}>
                  {formatRate(rate.sellRate)}
                </Text>
                <Text style={[styles.col, styles.spreadText, { textAlign: 'right' }]}>
                  {formatSpread(rate.spread)}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Cross-Border Rates */}
        {crossBorderRates.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cross-Border Rates</Text>
            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col, styles.headerText, { flex: 1.5 }]}>Route</Text>
                <Text style={[styles.col, styles.headerText, { textAlign: 'right' }]}>Buy</Text>
                <Text style={[styles.col, styles.headerText, { textAlign: 'right' }]}>Sell</Text>
                <Text style={[styles.col, styles.headerText, { textAlign: 'right' }]}>Spread</Text>
              </View>
              {crossBorderRates.map((rate, i) => {
                const destCurrency = rate.pair.replace('KES_', '');
                const country = CURRENCY_COUNTRY[destCurrency] ?? destCurrency;
                return (
                  <View key={rate.id} style={[styles.tableRow, i % 2 === 0 && styles.rowEven]}>
                    <View style={[styles.col, { flex: 1.5 }]}>
                      <Text style={styles.pairName}>KES → {destCurrency}</Text>
                      <Text style={styles.countryName}>{country}</Text>
                    </View>
                    <Text style={[styles.col, styles.buyRate, { textAlign: 'right' }]}>
                      {formatRate(rate.buyRate)}
                    </Text>
                    <Text style={[styles.col, styles.sellRate, { textAlign: 'right' }]}>
                      {formatRate(rate.sellRate)}
                    </Text>
                    <Text style={[styles.col, styles.spreadText, { textAlign: 'right' }]}>
                      {formatSpread(rate.spread)}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {lastUpdated && (
          <View style={styles.lastUpdated}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.lastUpdatedText}>
              Updated {formatDateTime(lastUpdated)}
            </Text>
          </View>
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.disclaimerText}>
            Rates update regularly. Final rate applied at time of transaction.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  tableCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowEven: {
    backgroundColor: '#fafafa',
  },
  col: {
    flex: 1,
    fontSize: 13,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pairName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  countryName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  buyRate: {
    color: Colors.success,
    fontWeight: '600',
    fontSize: 13,
  },
  sellRate: {
    color: Colors.info,
    fontWeight: '600',
    fontSize: 13,
  },
  spreadText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  noData: {
    textAlign: 'center',
    color: Colors.textSecondary,
    padding: 16,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.infoBg,
    padding: 12,
    borderRadius: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.infoText,
  },
});

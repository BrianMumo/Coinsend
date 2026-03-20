import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/constants';
import { formatCurrency, formatUsdt } from '../../utils/formatters';

interface BalanceCardProps {
  usdtBalance: string;
  usdtRate: number;
  showBalance: boolean;
  onToggleBalance: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function BalanceCard({
  usdtBalance,
  usdtRate,
  showBalance,
  onToggleBalance,
  onDeposit,
  onWithdraw,
}: BalanceCardProps) {
  const usdt = parseFloat(usdtBalance) || 0;
  const kesEquivalent = usdt * usdtRate;

  return (
    <LinearGradient colors={['#0d9488', '#0f766e']} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.header}>
        <Text style={styles.label}>USDT Balance</Text>
        <TouchableOpacity onPress={onToggleBalance} style={styles.eyeButton}>
          <Ionicons
            name={showBalance ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.balance}>
        {showBalance ? formatUsdt(usdtBalance) : '••••••'}
      </Text>

      <Text style={styles.kesLabel}>
        ≈ {showBalance ? formatCurrency(kesEquivalent) : 'KES ••••••'}
      </Text>

      <View style={styles.rateRow}>
        <Ionicons name="trending-up-outline" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={styles.rateText}>1 USDT = KES {usdtRate.toFixed(2)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onDeposit} activeOpacity={0.8}>
          <Ionicons name="arrow-down-outline" size={18} color={Colors.primary} />
          <Text style={styles.actionLabel}>Deposit</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionBtn} onPress={onWithdraw} activeOpacity={0.8}>
          <Ionicons name="arrow-up-outline" size={18} color={Colors.primary} />
          <Text style={styles.actionLabel}>Withdraw</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  balance: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  kesLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    marginBottom: 8,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  rateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  actionLabel: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});

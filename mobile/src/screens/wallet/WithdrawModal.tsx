import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { balanceApi } from '../../api/balance.api';
import { ratesApi } from '../../api/rates.api';
import { getApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';

interface WithdrawModalProps {
  visible: boolean;
  usdtBalance: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  amount?: string;
  phone?: string;
}

export function WithdrawModal({
  visible,
  usdtBalance,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [usdtRate, setUsdtRate] = useState(130);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{ kesAmount: string; usdtAmount: string } | null>(null);

  const usdt = parseFloat(usdtBalance) || 0;
  const kesEquivalent = usdt * usdtRate;
  const kesAmount = parseFloat(amount) || 0;
  const usdtNeeded = usdtRate > 0 ? kesAmount / usdtRate : 0;

  useEffect(() => {
    if (visible) {
      setAmount('');
      setErrors({});
      setSuccess(false);
      setResult(null);
      loadRate();
    }
  }, [visible]);

  async function loadRate() {
    try {
      const res = await ratesApi.getAll();
      const rate = res.data?.rates.find((r) => r.pair === 'USDT_KES' && r.isActive);
      if (rate) setUsdtRate(parseFloat(rate.sellRate));
    } catch {
      // keep default
    }
  }

  function validate() {
    const e: FormErrors = {};
    const kes = parseFloat(amount);
    if (!amount || isNaN(kes)) {
      e.amount = 'Enter a valid amount';
    } else if (kes < 100) {
      e.amount = 'Minimum withdrawal is KES 100';
    } else if (kes > 250000) {
      e.amount = 'Maximum withdrawal is KES 250,000';
    } else if (usdtNeeded > usdt) {
      e.amount = `Insufficient balance (you need ${usdtNeeded.toFixed(4)} USDT)`;
    }
    if (!phone.trim()) {
      e.phone = 'Phone number is required';
    } else if (!/^254\d{9}$/.test(phone.replace(/\s/g, ''))) {
      e.phone = 'Enter a valid Safaricom number (e.g. 254712345678)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleWithdraw() {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await balanceApi.withdrawToKes(usdtNeeded, phone.trim());
      if (res.success && res.data) {
        setResult({ kesAmount: res.data.kesAmount, usdtAmount: res.data.usdtAmount });
        setSuccess(true);
      } else {
        Alert.alert('Withdrawal Failed', res.error?.message ?? 'Something went wrong');
      }
    } catch (err) {
      Alert.alert('Withdrawal Failed', getApiError(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleDone() {
    onClose();
    onSuccess();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Withdraw to M-Pesa</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {success && result ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                </View>
                <Text style={styles.successTitle}>Withdrawal Initiated!</Text>
                <Text style={styles.successSubtitle}>
                  M-Pesa payment is being processed
                </Text>

                <View style={styles.resultCard}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>KES Amount</Text>
                    <Text style={styles.resultValue}>{formatCurrency(result.kesAmount)}</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>USDT Deducted</Text>
                    <Text style={styles.resultValue}>{parseFloat(result.usdtAmount).toFixed(4)} USDT</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Phone</Text>
                    <Text style={styles.resultValue}>{phone}</Text>
                  </View>
                </View>

                <Text style={styles.successNote}>
                  You will receive an M-Pesa confirmation SMS shortly.
                </Text>

                <Button label="Done" onPress={handleDone} style={{ marginTop: 24 }} />
              </View>
            ) : (
              <View>
                <View style={styles.balanceInfo}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Available USDT</Text>
                    <Text style={styles.balanceValue}>{usdt.toFixed(4)} USDT</Text>
                  </View>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>≈ KES Equivalent</Text>
                    <Text style={styles.balanceValue}>{formatCurrency(kesEquivalent)}</Text>
                  </View>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Exchange Rate</Text>
                    <Text style={styles.balanceValue}>1 USDT = KES {usdtRate.toFixed(2)}</Text>
                  </View>
                </View>

                <Input
                  label="KES Amount"
                  placeholder="Enter amount in KES (min 100)"
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
                  }}
                  keyboardType="numeric"
                  error={errors.amount}
                />

                {kesAmount > 0 && (
                  <View style={styles.conversionHint}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.conversionText}>
                      ≈ {usdtNeeded.toFixed(4)} USDT will be deducted
                    </Text>
                  </View>
                )}

                <Input
                  label="M-Pesa Phone Number"
                  placeholder="254712345678"
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                  error={errors.phone}
                />

                <Button
                  label="Withdraw to M-Pesa"
                  onPress={handleWithdraw}
                  isLoading={isLoading}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  balanceInfo: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  conversionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  conversionText: {
    fontSize: 13,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  successNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { balanceApi } from '../../api/balance.api';
import { getApiError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Colors } from '../../utils/constants';
import { truncateAddress } from '../../utils/formatters';

type Step = 'loading' | 'info' | 'verify' | 'success';

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DepositModal({ visible, onClose, onSuccess }: DepositModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [depositAddress, setDepositAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txHashError, setTxHashError] = useState('');
  const [creditedUsdt, setCreditedUsdt] = useState(0);
  const [creditedKes, setCreditedKes] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep('loading');
      setTxHash('');
      setTxHashError('');
      loadAddress();
    }
  }, [visible]);

  async function loadAddress() {
    try {
      const res = await balanceApi.getUsdtBalance();
      if (res.data?.depositAddress) {
        setDepositAddress(res.data.depositAddress);
        setStep('info');
      } else {
        Alert.alert('Error', 'Unable to load deposit address');
        onClose();
      }
    } catch (err) {
      Alert.alert('Error', getApiError(err));
      onClose();
    }
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleVerify() {
    const hash = txHash.trim();
    if (!hash) {
      setTxHashError('Transaction hash is required');
      return;
    }
    if (hash.length < 64) {
      setTxHashError('Transaction hash must be at least 64 characters');
      return;
    }
    setTxHashError('');
    setIsVerifying(true);
    try {
      const res = await balanceApi.verifyDeposit(hash);
      if (res.success && res.data) {
        setCreditedUsdt(res.data.usdtAmount);
        setCreditedKes(res.data.kesAmount);
        setStep('success');
      } else {
        Alert.alert('Verification Failed', res.error?.message ?? 'Unable to verify deposit');
      }
    } catch (err) {
      Alert.alert('Verification Failed', getApiError(err));
    } finally {
      setIsVerifying(false);
    }
  }

  function handleDone() {
    onClose();
    onSuccess();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Deposit USDT</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'loading' && (
            <View style={styles.center}>
              <Spinner />
              <Text style={styles.loadingText}>Loading deposit address...</Text>
            </View>
          )}

          {step === 'info' && (
            <View>
              <View style={styles.networkBadge}>
                <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                <Text style={styles.networkText}>
                  Only send USDT on the <Text style={{ fontWeight: '700' }}>TRON (TRC-20)</Text> network
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Your Deposit Address</Text>
              <View style={styles.addressCard}>
                <Text style={styles.address}>{truncateAddress(depositAddress, 12)}</Text>
                <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
                  <Ionicons
                    name={copied ? 'checkmark-outline' : 'copy-outline'}
                    size={20}
                    color={copied ? Colors.success : Colors.primary}
                  />
                  <Text style={[styles.copyText, { color: copied ? Colors.success : Colors.primary }]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fullAddress}>{depositAddress}</Text>

              <View style={styles.infoList}>
                {[
                  'Send only USDT (TRC-20) to this address',
                  'Minimum deposit: 1 USDT',
                  'Deposits are credited automatically within minutes',
                  'If not credited after 30 mins, use "Verify Deposit"',
                ].map((item, i) => (
                  <View key={i} style={styles.infoItem}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.infoText}>{item}</Text>
                  </View>
                ))}
              </View>

              <Button
                label="I've Sent USDT — Verify Deposit"
                onPress={() => setStep('verify')}
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {step === 'verify' && (
            <View>
              <View style={styles.verifyInfo}>
                <Ionicons name="search-outline" size={32} color={Colors.primary} />
                <Text style={styles.verifyTitle}>Verify Your Deposit</Text>
                <Text style={styles.verifySubtitle}>
                  Enter the transaction hash from your TRON wallet or block explorer
                </Text>
              </View>

              <Input
                label="Transaction Hash (TxID)"
                placeholder="Paste your TRON transaction hash..."
                value={txHash}
                onChangeText={(v) => {
                  setTxHash(v);
                  if (txHashError) setTxHashError('');
                }}
                error={txHashError}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />

              <Button
                label="Verify & Credit Balance"
                onPress={handleVerify}
                isLoading={isVerifying}
              />

              <Button
                label="Back"
                onPress={() => setStep('info')}
                variant="ghost"
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {step === 'success' && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Deposit Verified!</Text>
              <Text style={styles.successSubtitle}>Your balance has been credited</Text>

              <View style={styles.successAmounts}>
                <View style={styles.successRow}>
                  <Text style={styles.successLabel}>USDT Received</Text>
                  <Text style={styles.successValue}>{creditedUsdt.toFixed(6)} USDT</Text>
                </View>
                <View style={styles.successRow}>
                  <Text style={styles.successLabel}>KES Equivalent</Text>
                  <Text style={styles.successValue}>KES {creditedKes.toLocaleString()}</Text>
                </View>
              </View>

              <Button label="Done" onPress={handleDone} style={{ marginTop: 24 }} />
            </View>
          )}
        </ScrollView>
      </View>
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
  center: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  networkText: {
    flex: 1,
    color: Colors.warningText,
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  address: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fullAddress: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  infoList: {
    gap: 10,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  verifyInfo: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  verifySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  successAmounts: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  successValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

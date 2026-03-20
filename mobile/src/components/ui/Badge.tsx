import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../utils/constants';

type BadgeVariant = 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing' | 'verified' | 'unverified' | 'rejected';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  pending: { bg: Colors.warningBg, text: Colors.warningText },
  completed: { bg: Colors.successBg, text: Colors.successText },
  failed: { bg: Colors.errorBg, text: Colors.errorText },
  cancelled: { bg: Colors.gray100, text: Colors.gray700 },
  processing: { bg: Colors.purpleBg, text: Colors.purpleText },
  verified: { bg: Colors.successBg, text: Colors.successText },
  unverified: { bg: Colors.gray100, text: Colors.gray500 },
  rejected: { bg: Colors.errorBg, text: Colors.errorText },
};

export function Badge({ label, variant }: BadgeProps) {
  const style = variantStyles[variant] ?? variantStyles.cancelled;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </View>
  );
}

export function getStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PROCESSING: 'processing',
    VERIFIED: 'verified',
    UNVERIFIED: 'unverified',
    REJECTED: 'rejected',
    SUCCESS: 'completed',
  };
  return (map[status.toUpperCase()] as BadgeVariant) ?? 'cancelled';
}

export function getKycVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    UNVERIFIED: 'unverified',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
  };
  return (map[status] as BadgeVariant) ?? 'unverified';
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

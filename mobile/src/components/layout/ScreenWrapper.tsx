import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../utils/constants';

interface ScreenWrapperProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  scrollable?: boolean;
  withKeyboard?: boolean;
}

export function ScreenWrapper({
  children,
  refreshing,
  onRefresh,
  style,
  scrollable = true,
  withKeyboard = false,
}: ScreenWrapperProps) {
  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  if (withKeyboard) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
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
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../api/user.api';
import { getApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge, getKycVariant } from '../../components/ui/Badge';
import { Colors, WHATSAPP_URL, KYC_STATUS_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

type Section = 'profile' | 'password' | null;

export function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState<Section>(null);

  // Edit profile state
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Change password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  function toggleSection(section: Section) {
    setActiveSection((prev) => (prev === section ? null : section));
    setProfileError('');
    setPasswordErrors({});
  }

  async function handleSaveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('First and last name are required');
      return;
    }
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await userApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      if (res.success && res.data) {
        updateUser(res.data);
        setActiveSection(null);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        setProfileError(res.error?.message ?? 'Failed to update profile');
      }
    } catch (err) {
      setProfileError(getApiError(err));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword() {
    const errs: Record<string, string> = {};
    if (!currentPass) errs.currentPass = 'Current password is required';
    if (!newPass) errs.newPass = 'New password is required';
    else if (newPass.length < 8) errs.newPass = 'Password must be at least 8 characters';
    else if (!/\d/.test(newPass)) errs.newPass = 'Password must contain at least one number';
    if (newPass !== confirmPass) errs.confirmPass = 'Passwords do not match';
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPasswordLoading(true);
    try {
      const res = await userApi.changePassword({ currentPassword: currentPass, newPassword: newPass });
      if (res.success) {
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setActiveSection(null);
        Alert.alert('Success', 'Password changed successfully');
      } else {
        setPasswordErrors({ general: res.error?.message ?? 'Failed to change password' });
      }
    } catch (err) {
      setPasswordErrors({ general: getApiError(err) });
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Profile</Text>

          {/* Avatar header */}
          <View style={styles.avatarCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Badge
              label={KYC_STATUS_LABELS[user?.kycStatus ?? 'UNVERIFIED']}
              variant={getKycVariant(user?.kycStatus ?? 'UNVERIFIED')}
            />
          </View>

          {/* Edit Profile */}
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => toggleSection('profile')}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="person-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>Edit Profile</Text>
              <Ionicons
                name={activeSection === 'profile' ? 'chevron-up' : 'chevron-forward'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {activeSection === 'profile' && (
              <View style={styles.expandedSection}>
                {!!profileError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{profileError}</Text>
                  </View>
                )}
                <View style={styles.row}>
                  <Input
                    label="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="John"
                    containerStyle={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Doe"
                    containerStyle={{ flex: 1 }}
                  />
                </View>
                <Input
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="254712345678"
                  keyboardType="phone-pad"
                />
                <View style={styles.actionRow}>
                  <Button
                    label="Cancel"
                    onPress={() => setActiveSection(null)}
                    variant="outline"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    label="Save"
                    onPress={handleSaveProfile}
                    isLoading={profileLoading}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Change Password */}
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => toggleSection('password')}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>Change Password</Text>
              <Ionicons
                name={activeSection === 'password' ? 'chevron-up' : 'chevron-forward'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {activeSection === 'password' && (
              <View style={styles.expandedSection}>
                {!!passwordErrors.general && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{passwordErrors.general}</Text>
                  </View>
                )}
                <Input
                  label="Current Password"
                  value={currentPass}
                  onChangeText={setCurrentPass}
                  isPassword
                  placeholder="Enter current password"
                  error={passwordErrors.currentPass}
                />
                <Input
                  label="New Password"
                  value={newPass}
                  onChangeText={setNewPass}
                  isPassword
                  placeholder="Min 8 chars with a number"
                  error={passwordErrors.newPass}
                />
                <Input
                  label="Confirm New Password"
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  isPassword
                  placeholder="Re-enter new password"
                  error={passwordErrors.confirmPass}
                />
                <View style={styles.actionRow}>
                  <Button
                    label="Cancel"
                    onPress={() => setActiveSection(null)}
                    variant="outline"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    label="Save"
                    onPress={handleChangePassword}
                    isLoading={passwordLoading}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Verification Status */}
          <View style={styles.menuCard}>
            <View style={styles.menuRow}>
              <View style={styles.menuIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>Verification Status</Text>
              <Badge
                label={KYC_STATUS_LABELS[user?.kycStatus ?? 'UNVERIFIED']}
                variant={getKycVariant(user?.kycStatus ?? 'UNVERIFIED')}
              />
            </View>
          </View>

          {/* WhatsApp Support */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => Linking.openURL(WHATSAPP_URL)}
          >
            <View style={styles.menuRow}>
              <View style={[styles.menuIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
              </View>
              <Text style={styles.menuLabel}>WhatsApp Support</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Account Details */}
          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>Account Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Member Since</Text>
              <Text style={styles.detailValue}>
                {user?.createdAt ? formatDate(user.createdAt) : '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Country</Text>
              <Text style={styles.detailValue}>{user?.country ?? 'KE'}</Text>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  avatarCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorBoxText: {
    color: Colors.errorText,
    fontSize: 13,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.errorBg,
    marginTop: 4,
  },
  logoutText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 15,
  },
});

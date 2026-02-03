import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import api from '../../api/client';
import { formatDate } from '../../utils/formatters';
import { KYC_STATUSES } from '../../utils/constants';
import { User, Shield, Lock } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional().or(z.literal('')),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileError(null);
    setProfileSuccess(null);
    setIsUpdatingProfile(true);

    try {
      const response = await api.put('/users/profile', data);
      if (response.data.success) {
        updateUser(response.data.data.user);
        setProfileSuccess('Profile updated successfully');
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsUpdatingPassword(true);

    try {
      const response = await api.put('/users/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (response.data.success) {
        setPasswordSuccess('Password changed successfully');
        resetPassword();
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const kycStatus = KYC_STATUSES[user?.kycStatus || 'UNVERIFIED'];
  const kycVariant = user?.kycStatus === 'VERIFIED' ? 'completed' : user?.kycStatus === 'PENDING' ? 'processing' : 'default';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitle title="Profile Settings" description="Manage your Coinsend account information and security settings." />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Country</p>
              <p className="font-medium">{user?.country || 'KE'}</p>
            </div>
            <div>
              <p className="text-gray-500">Member Since</p>
              <p className="font-medium">{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Login</p>
              <p className="font-medium">{user?.lastLoginAt ? formatDate(user.lastLoginAt) : 'N/A'}</p>
            </div>
          </div>

          {profileSuccess && (
            <Alert variant="success" className="mb-4">
              {profileSuccess}
            </Alert>
          )}
          {profileError && (
            <Alert variant="error" className="mb-4">
              {profileError}
            </Alert>
          )}

          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                error={profileErrors.firstName?.message}
                {...registerProfile('firstName')}
              />
              <Input
                label="Last Name"
                error={profileErrors.lastName?.message}
                {...registerProfile('lastName')}
              />
            </div>
            <Input
              label="Phone Number"
              placeholder="+254 7XX XXX XXX"
              error={profileErrors.phone?.message}
              {...registerProfile('phone')}
            />
            <Button type="submit" isLoading={isUpdatingProfile}>
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* KYC Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">KYC Status</p>
              <p className="text-sm text-gray-500">
                {user?.kycStatus === 'VERIFIED'
                  ? 'Your identity has been verified'
                  : 'Complete verification to increase your limits'}
              </p>
            </div>
            <Badge variant={kycVariant}>{kycStatus.label}</Badge>
          </div>

          {user?.kycStatus !== 'VERIFIED' && (
            <Alert variant="info" className="mt-4">
              Contact support to complete your identity verification and unlock higher transaction limits.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <Alert variant="success" className="mb-4">
              {passwordSuccess}
            </Alert>
          )}
          {passwordError && (
            <Alert variant="error" className="mb-4">
              {passwordError}
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              error={passwordErrors.currentPassword?.message}
              {...registerPassword('currentPassword')}
            />
            <Input
              label="New Password"
              type="password"
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword')}
            />
            <Button type="submit" isLoading={isUpdatingPassword}>
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;

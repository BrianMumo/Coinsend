import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import api from '../../api/client';
import { formatDate } from '../../utils/formatters';
import { KYC_STATUSES } from '../../utils/constants';
import { User, Shield, Lock, LogOut, ChevronRight, MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

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
  const { user, updateUser, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | null>(null);
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
        setTimeout(() => setActiveSection(null), 1500);
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
        setTimeout(() => setActiveSection(null), 1500);
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
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-bold text-xl">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <Badge variant={kycVariant} className="text-xs">{kycStatus.label}</Badge>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-xl overflow-hidden">
        {/* Edit Profile */}
        <button
          onClick={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium text-gray-900">Edit Profile</span>
          </div>
          <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${activeSection === 'profile' ? 'rotate-90' : ''}`} />
        </button>

        {activeSection === 'profile' && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            {profileSuccess && <Alert variant="success" className="mb-4 text-sm">{profileSuccess}</Alert>}
            {profileError && <Alert variant="error" className="mb-4 text-sm">{profileError}</Alert>}

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-3">
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
              <Input
                label="Phone Number"
                placeholder="+254 7XX XXX XXX"
                error={profileErrors.phone?.message}
                {...registerProfile('phone')}
              />
              <Button type="submit" isLoading={isUpdatingProfile} className="w-full">
                Save Changes
              </Button>
            </form>
          </div>
        )}

        {/* Change Password */}
        <button
          onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
              <Lock className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-medium text-gray-900">Change Password</span>
          </div>
          <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${activeSection === 'password' ? 'rotate-90' : ''}`} />
        </button>

        {activeSection === 'password' && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            {passwordSuccess && <Alert variant="success" className="mb-4 text-sm">{passwordSuccess}</Alert>}
            {passwordError && <Alert variant="error" className="mb-4 text-sm">{passwordError}</Alert>}

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-3">
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
                label="Confirm Password"
                type="password"
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword')}
              />
              <Button type="submit" isLoading={isUpdatingPassword} className="w-full">
                Update Password
              </Button>
            </form>
          </div>
        )}

        {/* Verification Status */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900">Verification</span>
              <p className="text-xs text-gray-500">
                {user?.kycStatus === 'VERIFIED' ? 'Your account is verified' : 'Contact support to verify'}
              </p>
            </div>
          </div>
          <Badge variant={kycVariant} className="text-xs">{kycStatus.label}</Badge>
        </div>

        {/* WhatsApp Support */}
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <span className="font-medium text-gray-900">WhatsApp Support</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </a>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            <span className="font-medium text-red-600">Log Out</span>
          </div>
        </button>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">Account Details</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Member Since</p>
            <p className="font-medium">{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500">Country</p>
            <p className="font-medium">{user?.country || 'KE'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

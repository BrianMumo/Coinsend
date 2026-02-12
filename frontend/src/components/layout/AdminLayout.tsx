import { ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  DollarSign,
  Wallet,
  TrendingUp,
  LogOut,
  Shield,
  Smartphone,
  Coins,
} from 'lucide-react';
import { clsx } from 'clsx';
import { AdminBottomNav } from './AdminBottomNav';

interface AdminLayoutProps {
  children: ReactNode;
}

const sidebarLinks = [
  { to: '/mumo', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/mumo/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/mumo/users', icon: Users, label: 'Users' },
  { to: '/mumo/mpesa', icon: Smartphone, label: 'M-Pesa' },
  { to: '/mumo/tron', icon: Coins, label: 'TRON Wallet' },
  { to: '/mumo/rates', icon: TrendingUp, label: 'Exchange Rates' },
  { to: '/mumo/liquidity', icon: DollarSign, label: 'Liquidity' },
  { to: '/mumo/wallets', icon: Wallet, label: 'Wallets' },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { isAuthenticated, admin, logout } = useAdminAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/mumo/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="md:hidden bg-secondary-900 text-white sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary-400" />
            <span className="text-lg font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-primary-600 px-2 py-0.5 rounded">
              {admin?.role}
            </span>
            <button
              onClick={logout}
              className="p-1.5 hover:bg-secondary-800 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:block bg-secondary-900 text-white fixed w-full z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary-400" />
            <span className="text-xl font-bold">Coinsend Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              {admin?.firstName} {admin?.lastName}
            </span>
            <span className="text-xs bg-primary-600 px-2 py-1 rounded">
              {admin?.role}
            </span>
            <button
              onClick={logout}
              className="p-2 hover:bg-secondary-800 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex md:pt-16">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 fixed inset-y-0 pt-16 bg-secondary-800 text-white">
          <nav className="px-4 py-6 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to) && link.to !== '/mumo';
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-secondary-700 hover:text-white'
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64">
          {/* Mobile: compact padding with bottom nav space */}
          {/* Desktop: normal padding */}
          <div className="p-4 pb-20 md:p-6 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav />
    </div>
  );
};

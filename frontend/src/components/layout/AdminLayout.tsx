import { ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import {
  LayoutDashboard,
  Receipt,
  Users,
  DollarSign,
  Wallet,
  TrendingUp,
  LogOut,
  Shield,
} from 'lucide-react';
import { clsx } from 'clsx';

interface AdminLayoutProps {
  children: ReactNode;
}

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/orders', icon: Receipt, label: 'Orders' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/rates', icon: TrendingUp, label: 'Exchange Rates' },
  { to: '/admin/liquidity', icon: DollarSign, label: 'Liquidity' },
  { to: '/admin/wallets', icon: Wallet, label: 'Wallets' },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { isAuthenticated, admin, logout } = useAdminAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-secondary-900 text-white fixed w-full z-10">
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

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="w-64 fixed inset-y-0 pt-16 bg-secondary-800 text-white">
          <nav className="px-4 py-6 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to) && link.to !== '/admin';
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
        <main className="flex-1 ml-64">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

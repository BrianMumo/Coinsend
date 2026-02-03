import { ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Header } from './Header';
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  User,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

interface UserLayoutProps {
  children: ReactNode;
}

const sidebarLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders/new', icon: PlusCircle, label: 'New Order' },
  { to: '/orders', icon: Receipt, label: 'My Orders' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export const UserLayout = ({ children }: UserLayoutProps) => {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white border-r border-gray-200">
          <nav className="flex-1 px-4 py-6 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.to ||
                (link.to !== '/dashboard' && location.pathname.startsWith(link.to));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 mt-4"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp Support
            </a>

            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full mt-2"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

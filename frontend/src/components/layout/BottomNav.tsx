import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, User } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

          return (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive
                  ? 'text-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon className={clsx('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className={clsx(
                'text-xs mt-1',
                isActive ? 'font-medium' : 'font-normal'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

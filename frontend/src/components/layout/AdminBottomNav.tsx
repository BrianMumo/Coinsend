import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Smartphone,
  MoreHorizontal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

const mainNavItems = [
  { to: '/mumo', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/mumo/orders', icon: Receipt, label: 'Orders' },
  { to: '/mumo/users', icon: Users, label: 'Users' },
  { to: '/mumo/mpesa', icon: Smartphone, label: 'M-Pesa' },
];

const moreNavItems = [
  { to: '/mumo/tron', label: 'TRON Wallet' },
  { to: '/mumo/rates', label: 'Exchange Rates' },
  { to: '/mumo/liquidity', label: 'Liquidity' },
  { to: '/mumo/wallets', label: 'Wallets' },
];

export const AdminBottomNav = () => {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreNavItems.some(item =>
    location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Menu Popup */}
      {showMore && (
        <div className="fixed bottom-16 right-4 bg-white rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px] border border-gray-100">
          {moreNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setShowMore(false)}
                className={clsx(
                  'block px-4 py-3 text-sm border-b border-gray-50 last:border-0',
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-secondary-900 border-t border-secondary-700 z-40 safe-area-bottom md:hidden">
        <div className="flex justify-around items-center h-16">
          {mainNavItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== '/mumo';

            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  isActive
                    ? 'text-primary-400'
                    : 'text-gray-400 hover:text-gray-300'
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
          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={clsx(
              'flex flex-col items-center justify-center flex-1 h-full transition-colors',
              isMoreActive || showMore
                ? 'text-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            )}
          >
            <MoreHorizontal className={clsx('h-5 w-5', (isMoreActive || showMore) && 'stroke-[2.5]')} />
            <span className={clsx(
              'text-xs mt-1',
              (isMoreActive || showMore) ? 'font-medium' : 'font-normal'
            )}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

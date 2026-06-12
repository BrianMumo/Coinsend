import { NavLink } from 'react-router-dom';
import { Home, Wallet, User } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: Home,   label: 'Home' },
  { to: '/wallet',    icon: Wallet, label: 'Wallet' },
  { to: '/profile',   icon: User,   label: 'Profile' },
];

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-30 bg-dark-900/90 backdrop-blur-xl border-t border-surface-700/30 safe-bottom">
    <div className="flex items-center justify-around h-16 max-w-md mx-auto">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
              isActive
                ? 'text-gold-400'
                : 'text-surface-500 hover:text-surface-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold-400 rounded-full" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

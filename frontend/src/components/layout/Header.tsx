import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Menu, X } from 'lucide-react';

export const Header = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${
      isHome
        ? 'bg-dark-900/70 backdrop-blur-xl border-b border-surface-700/20'
        : 'bg-dark-900/90 backdrop-blur-xl border-b border-surface-700/30'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo-white.svg" alt="Coinsend" className="h-8" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/rates"
            className="text-sm text-surface-400 hover:text-gold-400 transition-colors"
          >
            Rates
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="text-sm font-semibold bg-gold-400 text-dark-900 px-5 py-2 rounded-xl hover:bg-gold-300 transition-all shadow-glow-sm hover:shadow-glow-gold"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-surface-300 hover:text-surface-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-gold-400 text-dark-900 px-5 py-2 rounded-xl hover:bg-gold-300 transition-all shadow-glow-sm hover:shadow-glow-gold"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-surface-400 hover:text-surface-200 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-dark-800/95 backdrop-blur-xl border-t border-surface-700/20 animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            <Link
              to="/rates"
              className="block text-sm text-surface-300 hover:text-gold-400 py-2 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Rates
            </Link>
            {isAuthenticated ? (
              <button
                onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}
                className="w-full text-sm font-semibold bg-gold-400 text-dark-900 py-2.5 rounded-xl hover:bg-gold-300 transition-all"
              >
                Dashboard
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-sm text-surface-300 hover:text-surface-100 py-2 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block text-center text-sm font-semibold bg-gold-400 text-dark-900 py-2.5 rounded-xl hover:bg-gold-300 transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Check if we're on the homepage for transparent header
  const isHomePage = location.pathname === '/';

  return (
    <header className={`${isHomePage ? 'absolute top-0 left-0 right-0 z-50 bg-transparent' : 'bg-white border-b border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={isHomePage ? '/logo-white.svg' : '/logo.svg'}
              alt="Coinsend"
              className="h-9 sm:h-10"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/rates"
              className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Rates
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/wallet"
                  className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Wallet
                </Link>
                <div className="flex items-center gap-3 ml-4">
                  <Link
                    to="/profile"
                    className={`flex items-center gap-2 ${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                      </span>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className={isHomePage ? 'text-gray-300 hover:text-white hover:bg-white/10' : ''}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className={isHomePage ? 'text-white hover:bg-white/10' : ''}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className={isHomePage ? 'bg-primary-500 hover:bg-primary-600' : ''}>
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 ${isHomePage ? 'text-white' : 'text-gray-900'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className={`md:hidden py-4 border-t ${isHomePage ? 'border-white/10 bg-gray-900/95 -mx-4 px-4' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-4">
              <Link
                to="/rates"
                className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Rates
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/wallet"
                    className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Wallet
                  </Link>
                  <Link
                    to="/profile"
                    className={`${isHomePage ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    className="text-left text-red-500 hover:text-red-400"
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className={`w-full ${isHomePage ? 'border-white/20 text-white hover:bg-white/10' : ''}`}
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

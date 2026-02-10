import { Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { PageLoader } from './components/ui/Spinner';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { WhatsAppButton } from './components/ui/WhatsAppButton';
import { ToastContainer } from './components/ui/Toast';

// Public pages
const HomePage = lazy(() => import('./pages/public/HomePage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const RatesPage = lazy(() => import('./pages/public/RatesPage'));

// User pages
const DashboardPage = lazy(() => import('./pages/user/DashboardPage'));
const NewOrderPage = lazy(() => import('./pages/user/NewOrderPage'));
const CryptoToKesPage = lazy(() => import('./pages/user/CryptoToKesPage'));
const KesToCryptoPage = lazy(() => import('./pages/user/KesToCryptoPage'));
const CrossBorderPage = lazy(() => import('./pages/user/CrossBorderPage'));
const OrdersPage = lazy(() => import('./pages/user/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/user/OrderDetailPage'));
const ProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const WalletPage = lazy(() => import('./pages/user/WalletPage'));

// Admin pages
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminMpesaPage = lazy(() => import('./pages/admin/AdminMpesaPage'));
const AdminRatesPage = lazy(() => import('./pages/admin/AdminRatesPage'));
const AdminLiquidityPage = lazy(() => import('./pages/admin/AdminLiquidityPage'));
const AdminWalletsPage = lazy(() => import('./pages/admin/AdminWalletsPage'));

// Error pages
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/mumo');

  return (
    <>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        {!isAdminRoute && <WhatsAppButton />}
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rates" element={<RatesPage />} />

        {/* User routes */}
        <Route path="/dashboard" element={<UserLayout><DashboardPage /></UserLayout>} />
        <Route path="/orders/new" element={<UserLayout><NewOrderPage /></UserLayout>} />
        <Route path="/orders/new/crypto-to-kes" element={<UserLayout><CryptoToKesPage /></UserLayout>} />
        <Route path="/orders/new/kes-to-crypto" element={<UserLayout><KesToCryptoPage /></UserLayout>} />
        <Route path="/orders/new/cross-border" element={<UserLayout><CrossBorderPage /></UserLayout>} />
        <Route path="/orders" element={<UserLayout><OrdersPage /></UserLayout>} />
        <Route path="/orders/:id" element={<UserLayout><OrderDetailPage /></UserLayout>} />
        <Route path="/wallet" element={<UserLayout><WalletPage /></UserLayout>} />
        <Route path="/profile" element={<UserLayout><ProfilePage /></UserLayout>} />

        {/* Admin routes */}
        <Route path="/mumo/login" element={<AdminLoginPage />} />
        <Route path="/mumo" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
        <Route path="/mumo/orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
        <Route path="/mumo/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
        <Route path="/mumo/mpesa" element={<AdminLayout><AdminMpesaPage /></AdminLayout>} />
        <Route path="/mumo/rates" element={<AdminLayout><AdminRatesPage /></AdminLayout>} />
        <Route path="/mumo/liquidity" element={<AdminLayout><AdminLiquidityPage /></AdminLayout>} />
        <Route path="/mumo/wallets" element={<AdminLayout><AdminWalletsPage /></AdminLayout>} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default App;

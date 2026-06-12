import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export const UserLayout = () => (
  <div className="min-h-screen bg-dark-900 mesh-bg pb-20">
    <div className="max-w-md mx-auto px-4 pt-4">
      <Outlet />
    </div>
    <BottomNav />
  </div>
);

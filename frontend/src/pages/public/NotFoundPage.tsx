import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-dark-900 mesh-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            <span className="text-[150px] font-bold text-surface-800 leading-none">404</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="h-20 w-20 text-primary-500/30" />
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-white mb-4">Page Not Found</h1>
        <p className="text-surface-400 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
          Don't worry, let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gold-400 text-white font-medium rounded-xl hover:bg-gold-300 transition-all shadow-glow-sm hover:shadow-glow-gold"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-6 py-3 border border-surface-600/50 text-surface-300 font-medium rounded-xl hover:bg-surface-700/30 transition-all"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </button>
        </div>

        {/* Help Link */}
        <p className="mt-8 text-sm text-surface-500">
          Need help?{' '}
          <a
            href="https://wa.me/254768294351"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;

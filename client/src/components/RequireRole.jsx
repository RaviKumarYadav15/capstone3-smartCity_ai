import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

// UX guard only; the API enforces the same roles on every request
export default function RequireRole({ roles, children }) {
  const { user, loading, openAuthModal } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal();
    }
  }, [loading, user, openAuthModal]);

  if (loading) return <div className="text-slate-500 text-center py-12 text-sm">Loading</div>;

  if (!user) {
    return (
      <div className="text-center py-16">
        <button
          onClick={openAuthModal}
          className="bg-black hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-full transition-all text-sm cursor-pointer inline-flex items-center gap-2"
        >
          Sign in to access this page
        </button>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

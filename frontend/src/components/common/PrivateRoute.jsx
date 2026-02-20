import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = () => {
  const {
    isAuthenticated,
    loading,
    hasBillsAccess,
    hasRewardsAccess,
  } = useAuth();

  const location = useLocation();

  /* 🔄 Loading */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  /* 🔐 Not authenticated */
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  /* 🧾 Bills access (Milestone 3) */
  if (
    (location.pathname === '/bills' ||
      location.pathname.startsWith('/bills/')) &&
    !hasBillsAccess()
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  /* 🏆 Rewards access (Milestone 3) */
  if (
    (location.pathname === '/rewards' ||
      location.pathname.startsWith('/rewards/')) &&
    !hasRewardsAccess()
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  /* ✅ Authorized */
  return <Outlet />;
};

export default PrivateRoute;

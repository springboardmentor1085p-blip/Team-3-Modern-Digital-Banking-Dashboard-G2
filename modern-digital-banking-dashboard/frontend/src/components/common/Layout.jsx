import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const { user, loading } = useAuth();

  /* 🔄 Loading state */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  /* 🔓 Public routes (login, register, etc.) */
  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 📱 Mobile Header */}
      <div className="lg:hidden">
        <Header />
      </div>

      <div className="flex">
        {/* 🧭 Sidebar (desktop only) */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* 📄 Main Content */}
        <main className="flex-1 min-h-screen flex flex-col">
          <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>

          {/* 🔻 Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default Layout;

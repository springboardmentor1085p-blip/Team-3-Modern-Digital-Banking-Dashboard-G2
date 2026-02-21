import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SnackbarProvider } from './context/SnackbarContext';

// Components
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/common/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Bills from './pages/Bills';
import Rewards from './pages/Rewards';
import Insights from './pages/Insights';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';

import Profile from './pages/Profile';
import Cards from './pages/Cards';
import Settings from './pages/Settings';

// Milestone 2
import Budgets from './pages/Budgets';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SnackbarProvider>
          <Toaster position="top-right" />

          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SnackbarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

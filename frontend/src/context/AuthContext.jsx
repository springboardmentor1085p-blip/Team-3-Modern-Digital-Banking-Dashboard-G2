import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ===============================
     INIT AUTH ON APP LOAD
  ================================ */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();

        if (currentUser) {
          setUser(currentUser);

          // 🔄 Try refreshing user data (Milestone 3)
          try {
            const { success, user: freshUser } =
              await authService.refreshUserData();
            if (success && freshUser) {
              setUser(freshUser);
            }
          } catch {
            // Silent fail → keep cached user
          }
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /* ===============================
     LOGIN
  ================================ */
  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);

    try {
      const { success, user: loggedUser, error: loginError } =
        await authService.login(identifier, password);

      if (!success) {
        setError(loginError);
        return { success: false, error: loginError };
      }

      setUser(loggedUser);
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     REGISTER
  ================================ */
  const register = async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const { success, user: newUser, error: registerError } =
        await authService.register(userData);

      if (!success) {
        setError(registerError);
        return { success: false, error: registerError };
      }

      setUser(newUser);
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Registration failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     LOGOUT
  ================================ */
  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  /* ===============================
     PROFILE & MILESTONE 3 FEATURES
  ================================ */
  const updateProfile = async (updates) => {
    const result = await authService.updateProfile(updates);
    if (result.success) setUser(result.user);
    return result;
  };

  const updatePoints = async (points) => {
    const result = await authService.updateUserPoints(points);
    if (result.success) setUser(result.user);
    return result;
  };

  const refreshUser = async () => {
    const result = await authService.refreshUserData();
    if (result.success) setUser(result.user);
    return result;
  };

  const hasBillsAccess = () => authService.hasBillsAccess();
  const hasRewardsAccess = () => authService.hasRewardsAccess();

  const clearError = () => setError(null);

  /* ===============================
     CONTEXT VALUE
  ================================ */
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePoints,     // Milestone 3
    refreshUser,      // Milestone 3
    hasBillsAccess,   // Milestone 3
    hasRewardsAccess, // Milestone 3
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/* ===============================
   HOOK
================================ */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

export default AuthContext;

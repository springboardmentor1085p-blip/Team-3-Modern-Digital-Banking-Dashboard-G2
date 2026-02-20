import api, { authAPI } from './api';

export const authService = {
  /* ===============================
     LOGIN
  ================================ */
  login: async (identifier, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', identifier);
      formData.append('password', password);

      // 1️⃣ Login → get token
      const response = await authAPI.login(formData);
      const { access_token } = response.data;

      // 2️⃣ Save token
      localStorage.setItem('access_token', access_token);
      api.defaults.headers.common['Authorization'] =
        `Bearer ${access_token}`;

      // 3️⃣ Fetch user profile
      const profileResponse = await authAPI.getProfile();
      const user = profileResponse.data;

      // 4️⃣ Save user
      localStorage.setItem('user', JSON.stringify(user));

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          'Login failed. Please check your credentials.',
      };
    }
  },



  /* ===============================
     REGISTER
  ================================ */
  register: async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      api.defaults.headers.common['Authorization'] =
        `Bearer ${access_token}`;

      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          'Registration failed. Please try again.',
      };
    }
  },

  /* ===============================
     LOGOUT
  ================================ */
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API failed, clearing local data anyway');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
  },

  /* ===============================
     USER HELPERS
  ================================ */
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      if (!userStr || !token) return null;
      return JSON.parse(userStr);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

  isAuthenticated: () => {
    return !!(
      localStorage.getItem('access_token') &&
      authService.getCurrentUser()
    );
  },

  getToken: () => localStorage.getItem('access_token'),

  /* ===============================
     PROFILE (Milestone 3)
  ================================ */
  refreshUserData: async () => {
    try {
      const response = await authAPI.getProfile();
      const freshUser = response.data;

      const currentUser = authService.getCurrentUser() || {};
      const updatedUser = { ...currentUser, ...freshUser };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false };
    }
  },

  updateProfile: async (updates) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('No user');

      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch {
      return { success: false, error: 'Profile update failed' };
    }
  },

  /* ===============================
     REWARDS & TIERS (Milestone 3)
  ================================ */
  updateUserPoints: async (pointsToAdd = 0) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('No user');

      const totalPoints = (user.points || 0) + pointsToAdd;

      let tier = 'bronze';
      if (totalPoints >= 10000) tier = 'diamond';
      else if (totalPoints >= 5000) tier = 'platinum';
      else if (totalPoints >= 2000) tier = 'gold';
      else if (totalPoints >= 500) tier = 'silver';

      const updatedUser = {
        ...user,
        points: totalPoints,
        current_tier: tier,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update points error:', error);
      return { success: false };
    }
  },

  /* ===============================
     FEATURE FLAGS (Milestone 3)
  ================================ */
  hasBillsAccess: () => {
    const user = authService.getCurrentUser();
    return user?.features?.includes('bills') ?? true;
  },

  hasRewardsAccess: () => {
    const user = authService.getCurrentUser();
    return user?.features?.includes('rewards') ?? true;
  },
};

export default authService;


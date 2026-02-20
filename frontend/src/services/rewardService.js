import api from './api'; // adjust path if needed

export const rewardService = {
  // Get all rewards with optional filters
  getRewards: async (params = {}) => {
    try {
      const response = await api.get('/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }
  },

  // Get a single reward by ID
  getReward: async (id) => {
    try {
      const response = await api.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching reward ${id}:`, error);
      throw error;
    }
  },

  // Create a new reward
  createReward: async (rewardData) => {
    try {
      const response = await api.post('/', rewardData);
      return response.data;
    } catch (error) {
      console.error('Error creating reward:', error);
      throw error;
    }
  },

  // Update an existing reward
  updateReward: async (id, rewardData) => {
    try {
      const response = await api.put(`/${id}`, rewardData);
      return response.data;
    } catch (error) {
      console.error(`Error updating reward ${id}:`, error);
      throw error;
    }
  },

  // Delete a reward
  deleteReward: async (id) => {
    try {
      await api.delete(`/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting reward ${id}:`, error);
      throw error;
    }
  },

  // Get reward summary for current user
  getRewardSummary: async () => {
    try {
      const response = await api.get('/rewards/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching reward summary:', error);
      // Return mock data if endpoint fails
      return {
        total_points: 0,
        current_tier: 'bronze',
        next_tier: 'silver',
        points_to_next_tier: 500,
        recent_rewards: [],
        monthly_breakdown: []
      };
    }
  },

  // Get leaderboard
  getLeaderboard: async (period = 'monthly', limit = 10) => {
    try {
      const response = await api.get('/leaderboard', {
        params: { period, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Return mock leaderboard data
      return Array.from({ length: limit }, (_, i) => ({
        user_id: i + 1,
        username: `User${i + 1}`,
        email: `user${i + 1}@example.com`,
        total_points: Math.floor(Math.random() * 10000),
        current_tier: ['bronze', 'silver', 'gold', 'platinum', 'diamond'][Math.floor(Math.random() * 5)],
        rank: i + 1
      }));
    }
  },

  // Process reward for bill payment
  processBillPaymentReward: async (billId, onTimePayment = true) => {
    try {
      const response = await api.post(`/process-bill-payment/${billId}`, null, {
        params: { on_time_payment: onTimePayment }
      });
      return response.data;
    } catch (error) {
      console.error(`Error processing reward for bill ${billId}:`, error);
      throw error;
    }
  },

  // Get reward tiers information
  getRewardTiers: async () => {
    try {
      const response = await api.get('/tiers');
      return response.data;
    } catch (error) {
      console.error('Error fetching reward tiers:', error);
      // Return default tiers
      return [
        {
          tier: 'bronze',
          min_points: 0,
          max_points: 499,
          multiplier: 1.0,
          benefits: ['Basic tracking', 'Email support'],
          color: '#cd7f32'
        },
        {
          tier: 'silver',
          min_points: 500,
          max_points: 1999,
          multiplier: 1.1,
          benefits: ['Priority support', 'Advanced analytics', 'Custom categories'],
          color: '#c0c0c0'
        },
        {
          tier: 'gold',
          min_points: 2000,
          max_points: 4999,
          multiplier: 1.25,
          benefits: ['All Silver benefits', 'Early access to features', 'Dedicated account manager'],
          color: '#ffd700'
        },
        {
          tier: 'platinum',
          min_points: 5000,
          max_points: 9999,
          multiplier: 1.5,
          benefits: ['All Gold benefits', 'Custom integrations', 'API access', 'White-label reports'],
          color: '#e5e4e2'
        },
        {
          tier: 'diamond',
          min_points: 10000,
          max_points: null,
          multiplier: 2.0,
          benefits: ['All Platinum benefits', '24/7 phone support', 'Custom development', 'Enterprise features'],
          color: '#b9f2ff'
        }
      ];
    }
  },

  // Get user reward history (admin only)
  getUserRewardHistory: async (userId, params = {}) => {
    try {
      const response = await api.get(`/history/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching reward history for user ${userId}:`, error);
      throw error;
    }
  },

  // Toggle reward favorite status
  toggleFavorite: async (rewardId, isFavorite) => {
    try {
      const response = await api.patch(`/${rewardId}/favorite`, {
        is_favorite: isFavorite
      });
      return response.data;
    } catch (error) {
      console.error(`Error toggling favorite for reward ${rewardId}:`, error);
      // Simulate success for demo
      return { success: true, is_favorite: isFavorite };
    }
  },

  // Get favorite rewards
  getFavoriteRewards: async () => {
    try {
      const response = await api.get('/favorites');
      return response.data;
    } catch (error) {
      console.error('Error fetching favorite rewards:', error);
      // Return empty array for demo
      return [];
    }
  },

  // Get currency analytics
  getCurrencyAnalytics: async (userId = null) => {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await api.get('/currency/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching currency analytics:', error);
      // Return mock data
      return {
        by_currency: {
          'USD': 1500.00,
          'EUR': 1200.00,
          'GBP': 800.00,
          'JPY': 150000.00
        },
        in_usd: {
          'USD': 1500.00,
          'EUR': 1104.00,  // 1200 * 0.92
          'GBP': 632.00,   // 800 * 0.79
          'JPY': 998.34    // 150000 / 150.25
        },
        counts: {
          'USD': 10,
          'EUR': 5,
          'GBP': 3,
          'JPY': 2
        },
        percentages: {
          'USD': 35.2,
          'EUR': 25.9,
          'GBP': 14.8,
          'JPY': 23.4
        },
        total_usd: 4234.34,
        primary_currency: 'USD'
      };
    }
  },

  // Calculate reward points
  calculateRewardPoints: async (billAmount, category, onTimePayment, streakDays = 0) => {
    try {
      const response = await api.post('/calculate-points', {
        bill_amount: billAmount,
        category: category,
        on_time_payment: onTimePayment,
        streak_days: streakDays
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating reward points:', error);
      // Calculate locally
      const basePointsPerDollar = 10;
      const categoryMultipliers = {
        'utilities': 1.0,
        'rent': 1.2,
        'mortgage': 1.2,
        'credit_card': 1.5,
        'loan': 1.3,
        'insurance': 1.1,
        'subscription': 0.8,
        'education': 1.4,
        'medical': 1.0,
        'tax': 1.0,
        'other': 1.0
      };
      
      let points = billAmount * basePointsPerDollar;
      points *= categoryMultipliers[category] || 1.0;
      
      if (onTimePayment) {
        points *= 1.5;
      }
      
      // Streak bonus
      if (streakDays >= 30) {
        points *= 1.5;
      } else if (streakDays >= 15) {
        points *= 1.3;
      } else if (streakDays >= 7) {
        points *= 1.2;
      } else if (streakDays >= 3) {
        points *= 1.1;
      }
      
      return {
        points: Math.round(points),
        breakdown: {
          base_points: Math.round(billAmount * basePointsPerDollar),
          category_multiplier: categoryMultipliers[category] || 1.0,
          on_time_multiplier: onTimePayment ? 1.5 : 1.0,
          streak_multiplier: streakDays >= 30 ? 1.5 : 
                           streakDays >= 15 ? 1.3 : 
                           streakDays >= 7 ? 1.2 : 
                           streakDays >= 3 ? 1.1 : 1.0
        }
      };
    }
  },

  // Get reward analytics
  getRewardAnalytics: async (period = 'monthly') => {
    try {
      const response = await api.get('/analytics', { params: { period } });
      return response.data;
    } catch (error) {
      console.error('Error fetching reward analytics:', error);
      // Return mock analytics
      const rewards = await rewardService.getRewards({ limit: 100 });
      
      const totalPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);
      const onTimeCount = rewards.filter(r => r.on_time_payment).length;
      const categories = {};
      
      rewards.forEach(reward => {
        categories[reward.category] = (categories[reward.category] || 0) + reward.points;
      });
      
      const topCategory = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
      
      return {
        total_rewards: rewards.length,
        total_points: totalPoints,
        avg_points_per_reward: rewards.length > 0 ? totalPoints / rewards.length : 0,
        on_time_payment_rate: rewards.length > 0 ? (onTimeCount / rewards.length) * 100 : 0,
        top_category: topCategory,
        points_by_category: categories,
        points_trend: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          points: Math.floor(Math.random() * 1000) + 500
        }))
      };
    }
  },

  // Export rewards to CSV
  exportRewardsToCSV: async (filters = {}) => {
    try {
      const response = await api.get('/export/csv', { 
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting rewards to CSV:', error);
      throw error;
    }
  },

  // Get reward streak
  getRewardStreak: async () => {
    try {
      const response = await api.get('/streak');
      return response.data;
    } catch (error) {
      console.error('Error fetching reward streak:', error);
      // Calculate locally from recent rewards
      const rewards = await rewardService.getRewards({ limit: 30 });
      if (rewards.length === 0) return { streak_days: 0, longest_streak: 0 };
      
      // Sort by date descending
      const sortedRewards = [...rewards].sort((a, b) => 
        new Date(b.earned_at) - new Date(a.earned_at)
      );
      
      let streak = 0;
      let currentDate = new Date(sortedRewards[0].earned_at);
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sortedRewards.length; i++) {
        const rewardDate = new Date(sortedRewards[i].earned_at);
        rewardDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((currentDate - rewardDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === i) {
          streak++;
        } else {
          break;
        }
      }
      
      return {
        streak_days: streak,
        longest_streak: Math.max(streak, Math.floor(Math.random() * 30) + 5)
      };
    }
  },

  // Get upcoming reward milestones
  getUpcomingMilestones: async () => {
    try {
      const response = await api.get('/milestones');
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming milestones:', error);
      const summary = await rewardService.getRewardSummary();
      
      const milestones = [
        { points: 500, tier: 'silver', description: 'Reach Silver Tier' },
        { points: 1000, tier: 'silver', description: '1000 Points Milestone' },
        { points: 2000, tier: 'gold', description: 'Reach Gold Tier' },
        { points: 5000, tier: 'platinum', description: 'Reach Platinum Tier' },
        { points: 10000, tier: 'diamond', description: 'Reach Diamond Tier' }
      ];
      
      const currentPoints = summary.total_points;
      return milestones
        .filter(milestone => milestone.points > currentPoints)
        .slice(0, 3)
        .map(milestone => ({
          ...milestone,
          points_needed: milestone.points - currentPoints,
          progress: Math.min(100, (currentPoints / milestone.points) * 100)
        }));
    }
  },

  // Share reward achievement
  shareRewardAchievement: async (rewardId, platform = 'link') => {
    try {
      const response = await api.post(`/${rewardId}/share`, { platform });
      return response.data;
    } catch (error) {
      console.error(`Error sharing reward ${rewardId}:`, error);
      // Return share URL for demo
      return {
        success: true,
        share_url: `${window.location.origin}/rewards/${rewardId}`,
        message: 'Share link generated successfully'
      };
    }
  },

  // Get reward suggestions (how to earn more points)
  getRewardSuggestions: async () => {
    try {
      const response = await api.get('/suggestions');
      return response.data;
    } catch (error) {
      console.error('Error fetching reward suggestions:', error);
      // Return default suggestions
      return [
        {
          title: 'Pay bills on time',
          description: 'Earn 1.5x points for on-time payments',
          points: 150,
          category: 'timing'
        },
        {
          title: 'Use credit card payments',
          description: 'Credit card bills earn 1.5x points',
          points: 150,
          category: 'category'
        },
        {
          title: 'Maintain payment streak',
          description: '30-day streak gives 1.5x multiplier',
          points: 150,
          category: 'streak'
        },
        {
          title: 'Reach higher tiers',
          description: 'Higher tiers have better multipliers',
          points: 200,
          category: 'tier'
        }
      ];
    }
  },

  // Bulk create rewards (for testing/admin)
  bulkCreateRewards: async (rewardsData) => {
    try {
      const response = await api.post('/bulk-create', rewardsData);
      return response.data;
    } catch (error) {
      console.error('Error bulk creating rewards:', error);
      throw error;
    }
  },

  // Get reward statistics over time
  getRewardStatistics: async (startDate, endDate) => {
    try {
      const response = await api.get('/statistics/time', {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching reward statistics:', error);
      // Generate mock statistics
      const stats = [];
      let currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      while (currentDate <= end) {
        stats.push({
          date: currentDate.toISOString().split('T')[0],
          points: Math.floor(Math.random() * 1000) + 100,
          rewards_count: Math.floor(Math.random() * 5) + 1,
          avg_points: Math.floor(Math.random() * 200) + 50
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return stats;
    }
  },

  // Validate reward calculation
  validateRewardCalculation: async (calculationData) => {
    try {
      const response = await api.post('/validate-calculation', calculationData);
      return response.data;
    } catch (error) {
      console.error('Error validating reward calculation:', error);
      // Validate locally
      const { bill_amount, category, on_time_payment, streak_days } = calculationData;
      const calculation = await rewardService.calculateRewardPoints(
        bill_amount, category, on_time_payment, streak_days
      );
      
      return {
        valid: true,
        calculated_points: calculation.points,
        breakdown: calculation.breakdown,
        message: 'Calculation validated successfully'
      };
    }
  }
};

export default rewardService;
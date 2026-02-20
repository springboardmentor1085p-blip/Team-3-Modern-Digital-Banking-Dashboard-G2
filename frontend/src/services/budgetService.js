import api from './api';


const budgetService = {
  // Budget CRUD Operations
  createBudget: async (budgetData) => {
    try {
      const response = await api.post(`/budgets/`, budgetData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  },

  getBudgets: async (month = null, year = null) => {
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await api.get(`/budgets/`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }
  },

  getBudget: async (budgetId) => {
    try {
      const response = await api.get(`/budgets/${budgetId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching budget:', error);
      throw error;
    }
  },

  updateBudget: async (budgetId, budgetData) => {
    try {
      const response = await api.put(`/budgets/${budgetId}`, budgetData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  },

  deleteBudget: async (budgetId) => {
    try {
      await api.delete(`/budgets/${budgetId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  },

  // Budget Progress and Summary
  getBudgetProgress: async (budgetId) => {
    if (!budgetId) {
      console.error('Budget ID is missing');
      return Promise.reject(new Error('Budget ID is undefined'));
    }
    try {
      const response = await api.get(`/budgets/${budgetId}/progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return {
        progress: response.data
      };
    } catch (error) {
      console.error('Error fetching budget progress:', error);
      throw error;
    }
  },

  getBudgetSummary: async (month = null, year = null) => {
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await api.get(`/budgets/summary`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching budget summary:', error);
      throw error;
    }
  },

  // Budget Categories
  createCategory: async (categoryData) => {
    try {
      const response = await api.post(`/budgets/categories`, categoryData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

 getCategories: async () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
  throw new Error("No access token found");
  }


  try {
    const response = await api.get(`/budgets/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
},


  deleteCategory: async (categoryId) => {
    try {
      await api.delete(`/budgets/categories/${categoryId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Categorization Rules
  createCategoryRule: async (ruleData) => {
    try {
      const response = await api.post(`/categories/rules`, ruleData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating category rule:', error);
      throw error;
    }
  },

  getCategoryRules: async () => {
    try {
      const response = await api.get(`/categories/rules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching category rules:', error);
      throw error;
    }
  },

  updateCategoryRule: async (ruleId, ruleData) => {
    try {
      const response = await api.put(`/categories/rules/${ruleId}`, ruleData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating category rule:', error);
      throw error;
    }
  },

  deleteCategoryRule: async (ruleId) => {
    try {
      await api.delete(`/categories/rules/${ruleId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting category rule:', error);
      throw error;
    }
  },

  // Auto-Categorization
  autoCategorizeTransactions: async (transactionIds = null, startDate = null, endDate = null) => {
    try {
      const requestData = {};
      if (transactionIds) requestData.transaction_ids = transactionIds;
      if (startDate) requestData.start_date = startDate;
      if (endDate) requestData.end_date = endDate;
      
      const response = await api.post(`/categories/auto-categorize`, requestData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error auto-categorizing transactions:', error);
      throw error;
    }
  },

  // Category Suggestions
  getCategorySuggestions: async (description) => {
    try {
      const response = await api.get(`/categories/suggestions`, {
        params: { description },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting category suggestions:', error);
      throw error;
    }
  },

  // Update Transaction Category
  updateTransactionCategory: async (transactionId, categoryData) => {
    try {
      const response = await api.put(
        `/categories/transactions/${transactionId}/category`,
        categoryData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating transaction category:', error);
      throw error;
    }
  },

  // Category Statistics
  getCategoryStatistics: async (month = null, year = null) => {
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await api.get(`/categories/stats`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching category statistics:', error);
      throw error;
    }
  },

  // Spending Trends
  getSpendingTrends: async (category, months = 6) => {
    try {
      // Note: This endpoint would need to be implemented in the backend
      // For now, we'll return mock data or handle it differently
      console.log('Getting spending trends for:', category, 'months:', months);
      // Implement based on your backend API
      return [];
    } catch (error) {
      console.error('Error fetching spending trends:', error);
      throw error;
    }
  },

  // Predict Future Spending
  predictFutureSpending: async (category) => {
    try {
      // Note: This endpoint would need to be implemented in the backend
      console.log('Predicting future spending for:', category);
      // Implement based on your backend API
      return null;
    } catch (error) {
      console.error('Error predicting future spending:', error);
      throw error;
    }
  },

  // Utility Functions
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  },

  calculatePercentage: (spent, budget) => {
    if (!budget || budget === 0) return 0;
    return (spent / budget) * 100;
  },

  getBudgetStatus: (spent, budget) => {
    const percentage = budgetService.calculatePercentage(spent, budget);
    
    if (percentage >= 100) return 'over';
    if (percentage >= 90) return 'warning';
    if (percentage >= 75) return 'near_limit';
    return 'under';
  }
};

export default budgetService;
import api from './api';

const insightService = {
  /**
   * Get cash flow insights
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getCashFlowInsights: (params = {}) => {
    return api.get('/insights/cash-flow', {params: params});
  },

  /**
   * Get category breakdown
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getCategoryBreakdown: (params = {}) => {
    return api.get('/api/v1/insights/category-breakdown', { params });
  },

  /**
   * Get trend insights
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getTrendInsights: (params = {}) => {
    return api.get('/insights/trends', { params });
  },

  /**
   * Get monthly summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getMonthlySummary: (params = {}) => {
    return api.get('/api/v1/insights/monthly-summary', { params });
  },

  /**
   * Detect anomalies
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAnomalies: (params = {}) => {
    return api.get('/api/v1/insights/anomalies', { params });
  },

  /**
   * Get predictions
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getPredictions: (params = {}) => {
    return api.get('/api/v1/insights/predictions', { params });
  },

  /**
   * Get spending habits
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSpendingHabits: (params = {}) => {
    return api.get('/api/v1/insights/spending-habits', { params });
  },

  /**
   * Get comprehensive insights summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getInsightSummary: (params = {}) => {
    return api.get('/api/v1/insights/summary', { params });
  },

  /**
   * Get budget insights
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getBudgetInsights: (params = {}) => {
    return api.get('/api/v1/insights/budgets', { params });
  },

  /**
   * Get comparison insights
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getComparisonInsights: (params = {}) => {
    return api.get('/api/v1/insights/comparison', { params });
  },

  /**
   * Get top merchants
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getTopMerchants: (params = {}) => {
    return api.get('/api/v1/insights/merchants', { params });
  },

  /**
   * Get spending by time of day
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSpendingByTime: (params = {}) => {
    return api.get('/api/v1/insights/spending-time', { params });
  },

  /**
   * Get recurring transactions analysis
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getRecurringAnalysis: (params = {}) => {
    return api.get('/api/v1/insights/recurring', { params });
  },

  /**
   * Get income sources breakdown
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIncomeSources: (params = {}) => {
    return api.get('/api/v1/insights/income-sources', { params });
  },

  /**
   * Get expense categories trends
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getCategoryTrends: (params = {}) => {
    return api.get('/api/v1/insights/category-trends', { params });
  },

  /**
   * Get savings rate analysis
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSavingsRateAnalysis: (params = {}) => {
    return api.get('/api/v1/insights/savings-rate', { params });
  },

  /**
   * Get net worth trends
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getNetWorthTrends: (params = {}) => {
    return api.get('/api/v1/insights/net-worth', { params });
  },

  /**
   * Get debt analysis
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getDebtAnalysis: (params = {}) => {
    return api.get('/api/v1/insights/debt', { params });
  },

  /**
   * Get investment performance
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getInvestmentPerformance: (params = {}) => {
    return api.get('/api/v1/insights/investments', { params });
  },

  /**
   * Generate custom report
   * @param {Object} data - Report configuration
   * @returns {Promise}
   */
  generateCustomReport: (data) => {
    return api.post('/api/v1/insights/reports/generate', data);
  },

  /**
   * Export insights data
   * @param {Object} params - Export parameters
   * @returns {Promise}
   */
  exportInsightsData: (params = {}) => {
    return api.get('/api/v1/insights/export', {
      params,
      responseType: 'blob'
    });
  },

  /**
   * Schedule regular insights report
   * @param {Object} data - Schedule configuration
   * @returns {Promise}
   */
  scheduleInsightsReport: (data) => {
    return api.post('/api/v1/insights/reports/schedule', data);
  },

  /**
   * Get saved insights reports
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSavedReports: (params = {}) => {
    return api.get('/api/v1/insights/reports/saved', { params });
  },

  /**
   * Delete saved report
   * @param {string} reportId - Report ID
   * @returns {Promise}
   */
  deleteSavedReport: (reportId) => {
    return api.delete(`/api/v1/insights/reports/saved/${reportId}`);
  },

  /**
   * Get insights settings
   * @returns {Promise}
   */
  getInsightsSettings: () => {
    return api.get('/api/v1/insights/settings');
  },

  /**
   * Update insights settings
   * @param {Object} data - Settings data
   * @returns {Promise}
   */
  updateInsightsSettings: (data) => {
    return api.put('/api/v1/insights/settings', data);
  },

  /**
   * Reset insights cache
   * @returns {Promise}
   */
  resetInsightsCache: () => {
    return api.post('/api/v1/insights/cache/reset');
  },

  /**
   * Get insights health status
   * @returns {Promise}
   */
  getInsightsHealth: () => {
    return api.get('/api/v1/insights/health');
  },

  /**
   * Get real-time insights updates
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getRealTimeInsights: (params = {}) => {
    return api.get('/api/v1/insights/real-time', { params });
  },

  /**
   * Subscribe to insights updates
   * @param {Object} data - Subscription data
   * @returns {Promise}
   */
  subscribeToInsights: (data) => {
    return api.post('/api/v1/insights/subscribe', data);
  },

  /**
   * Unsubscribe from insights updates
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise}
   */
  unsubscribeFromInsights: (subscriptionId) => {
    return api.delete(`/api/v1/insights/subscribe/${subscriptionId}`);
  },

  /**
   * Get insights API usage statistics
   * @returns {Promise}
   */
  getApiUsage: () => {
    return api.get('/api/v1/insights/usage');
  },

  /**
   * Test insights API connection
   * @returns {Promise}
   */
  testConnection: () => {
    return api.get('/api/v1/insights/test');
  }
};

export default insightService;
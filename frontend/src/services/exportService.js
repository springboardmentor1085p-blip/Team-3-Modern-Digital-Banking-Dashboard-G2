import api from './api';

const exportService = {
  /**
   * Generate an export file
   * @param {Object} data - Export request data
   * @returns {Promise}
   */
  generateExport: (data) => {
    return api.post('/exports/generate', data);
  },

  /**
   * Get export status
   * @param {string} exportId - Export ID
   * @returns {Promise}
   */
  getExportStatus: (exportId) => {
    return api.get(`exports/status/${exportId}`);
  },

  /**
   * Download export file
   * @param {string} exportId - Export ID
   * @returns {Promise}
   */
  downloadExport: (exportId) => {
    return api.get(`/exports/download/${exportId}`, {
      responseType: 'blob'
    });
  },

  /**
   * Get transactions CSV export
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  exportTransactionsCSV: (params = {}) => {
    return api.get('/exports/transactions/csv', {
      params,
      responseType: 'blob'
    });
  },

  /**
   * Get summary PDF export
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  exportSummaryPDF: (params = {}) => {
    return api.get('/exports/summary/pdf', {
      params,
      responseType: 'blob'
    });
  },

  /**
   * Get cash flow report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getCashFlowReport: (params = {}) => {
    return api.get('/exports/cash-flow/report', { params });
  },

  /**
   * Get export history
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getExportHistory: (params = {}) => {
    return api.get('/exports/history', { params });
  },

  /**
   * Delete export file
   * @param {string} exportId - Export ID
   * @returns {Promise}
   */
  deleteExport: (exportId) => {
    return api.delete(`/exports/${exportId}`);
  },

  /**
   * Bulk delete exports
   * @param {Array} exportIds - Array of export IDs
   * @returns {Promise}
   */
  bulkDeleteExports: (exportIds) => {
    return api.post('/exports/bulk-delete', {
      export_ids: exportIds
    });
  },

  /**
   * Get export templates
   * @returns {Promise}
   */
  getExportTemplates: () => {
    return api.get('/exports/templates');
  },

  /**
   * Create export template
   * @param {Object} data - Template data
   * @returns {Promise}
   */
  createExportTemplate: (data) => {
    return api.post('/exports/templates', data);
  },

  /**
   * Update export template
   * @param {string} templateId - Template ID
   * @param {Object} data - Template data
   * @returns {Promise}
   */
  updateExportTemplate: (templateId, data) => {
    return api.put(`/exports/templates/${templateId}`, data);
  },

  /**
   * Delete export template
   * @param {string} templateId - Template ID
   * @returns {Promise}
   */
  deleteExportTemplate: (templateId) => {
    return api.delete(`/exports/templates/${templateId}`);
  },

  /**
   * Duplicate export template
   * @param {string} templateId - Template ID
   * @returns {Promise}
   */
  duplicateExportTemplate: (templateId) => {
    return api.post(`/exports/templates/${templateId}/duplicate`);
  },

  /**
   * Apply export template
   * @param {string} templateId - Template ID
   * @param {Object} data - Export data
   * @returns {Promise}
   */
  applyExportTemplate: (templateId, data = {}) => {
    return api.post(`/exports/templates/${templateId}/apply`, data);
  },

  /**
   * Get export configuration
   * @returns {Promise}
   */
  getExportConfig: () => {
    return api.get('/exports/config');
  },

  /**
   * Update export configuration
   * @param {Object} data - Configuration data
   * @returns {Promise}
   */
  updateExportConfig: (data) => {
    return api.put('/exports/config', data);
  },

  /**
   * Get export formats
   * @returns {Promise}
   */
  getExportFormats: () => {
    return api.get('/exports/formats');
  },

  /**
   * Get export types
   * @returns {Promise}
   */
  getExportTypes: () => {
    return api.get('/exports/types');
  },

  /**
   * Validate export request
   * @param {Object} data - Export request data
   * @returns {Promise}
   */
  validateExportRequest: (data) => {
    return api.post('/exports/validate', data);
  },

  /**
   * Estimate export size
   * @param {Object} data - Export request data
   * @returns {Promise}
   */
  estimateExportSize: (data) => {
    return api.post('/exports/estimate', data);
  },

  /**
   * Get export queue status
   * @returns {Promise}
   */
  getExportQueue: () => {
    return api.get('/exports/queue');
  },

  /**
   * Cancel export
   * @param {string} exportId - Export ID
   * @returns {Promise}
   */
  cancelExport: (exportId) => {
    return api.post(`/exports/${exportId}/cancel`);
  },

  /**
   * Retry failed export
   * @param {string} exportId - Export ID
   * @returns {Promise}
   */
  retryExport: (exportId) => {
    return api.post(`/exports/${exportId}/retry`);
  },

  /**
   * Schedule export
   * @param {Object} data - Schedule data
   * @returns {Promise}
   */
  scheduleExport: (data) => {
    return api.post('/exports/schedule', data);
  },

  /**
   * Get scheduled exports
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getScheduledExports: (params = {}) => {
    return api.get('/exports/scheduled', { params });
  },

  /**
   * Update scheduled export
   * @param {string} scheduleId - Schedule ID
   * @param {Object} data - Schedule data
   * @returns {Promise}
   */
  updateScheduledExport: (scheduleId, data) => {
    return api.put(`/exports/scheduled/${scheduleId}`, data);
  },

  /**
   * Delete scheduled export
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise}
   */
  deleteScheduledExport: (scheduleId) => {
    return api.delete(`/exports/scheduled/${scheduleId}`);
  },

  /**
   * Run scheduled export now
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise}
   */
  runScheduledExport: (scheduleId) => {
    return api.post(`/exports/scheduled/${scheduleId}/run`);
  },

  /**
   * Enable/disable scheduled export
   * @param {string} scheduleId - Schedule ID
   * @param {boolean} enabled - Enable/disable flag
   * @returns {Promise}
   */
  toggleScheduledExport: (scheduleId, enabled) => {
    return api.patch(`/exports/scheduled/${scheduleId}/toggle`, { enabled });
  },

  /**
   * Get export destinations
   * @returns {Promise}
   */
  getExportDestinations: () => {
    return api.get('/exports/destinations');
  },

  /**
   * Create export destination
   * @param {Object} data - Destination data
   * @returns {Promise}
   */
  createExportDestination: (data) => {
    return api.post('/exports/destinations', data);
  },

  /**
   * Update export destination
   * @param {string} destinationId - Destination ID
   * @param {Object} data - Destination data
   * @returns {Promise}
   */
  updateExportDestination: (destinationId, data) => {
    return api.put(`/exports/destinations/${destinationId}`, data);
  },

  /**
   * Delete export destination
   * @param {string} destinationId - Destination ID
   * @returns {Promise}
   */
  deleteExportDestination: (destinationId) => {
    return api.delete(`/exports/destinations/${destinationId}`);
  },

  /**
   * Test export destination
   * @param {string} destinationId - Destination ID
   * @returns {Promise}
   */
  testExportDestination: (destinationId) => {
    return api.post(`/exports/destinations/${destinationId}/test`);
  },

  /**
   * Get export webhooks
   * @returns {Promise}
   */
  getExportWebhooks: () => {
    return api.get('/exports/webhooks');
  },

  /**
   * Create export webhook
   * @param {Object} data - Webhook data
   * @returns {Promise}
   */
  createExportWebhook: (data) => {
    return api.post('/exports/webhooks', data);
  },

  /**
   * Update export webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} data - Webhook data
   * @returns {Promise}
   */
  updateExportWebhook: (webhookId, data) => {
    return api.put(`/exports/webhooks/${webhookId}`, data);
  },

  /**
   * Delete export webhook
   * @param {string} webhookId - Webhook ID
   * @returns {Promise}
   */
  deleteExportWebhook: (webhookId) => {
    return api.delete(`/exports/webhooks/${webhookId}`);
  },

  /**
   * Test export webhook
   * @param {string} webhookId - Webhook ID
   * @returns {Promise}
   */
  testExportWebhook: (webhookId) => {
    return api.post(`/exports/webhooks/${webhookId}/test`);
  },

  /**
   * Get export analytics
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getExportAnalytics: (params = {}) => {
    return api.get('/exports/analytics', { params });
  },

  /**
   * Get export usage statistics
   * @returns {Promise}
   */
  getExportUsage: () => {
    return api.get('/exports/usage');
  },

  /**
   * Get export storage information
   * @returns {Promise}
   */
  getExportStorage: () => {
    return api.get('/exports/storage');
  },

  /**
   * Clean up old exports
   * @param {Object} params - Cleanup parameters
   * @returns {Promise}
   */
  cleanupExports: (params = {}) => {
    return api.post('/exports/cleanup', null, { params });
  },

  /**
   * Export to external service
   * @param {Object} data - Export data
   * @returns {Promise}
   */
  exportToExternal: (data) => {
    return api.post('/exports/external', data);
  },

  /**
   * Get external export services
   * @returns {Promise}
   */
  getExternalServices: () => {
    return api.get('/exports/external/services');
  },

  /**
   * Configure external export service
   * @param {string} serviceId - Service ID
   * @param {Object} data - Configuration data
   * @returns {Promise}
   */
  configureExternalService: (serviceId, data) => {
    return api.post(`/exports/external/services/${serviceId}/configure`, data);
  },

  /**
   * Test external export service
   * @param {string} serviceId - Service ID
   * @returns {Promise}
   */
  testExternalService: (serviceId) => {
    return api.post(`/exports/external/services/${serviceId}/test`);
  },

  /**
   * Get export backup
   * @returns {Promise}
   */
  getExportBackup: () => {
    return api.get('/exports/backup');
  },

  /**
   * Restore export backup
   * @param {Object} data - Backup data
   * @returns {Promise}
   */
  restoreExportBackup: (data) => {
    return api.post('/exports/restore-backup', data);
  },

  /**
   * Get export audit log
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getExportAuditLog: (params = {}) => {
    return api.get('/exports/audit-log', { params });
  },

  /**
   * Clear export audit log
   * @param {Object} params - Clear parameters
   * @returns {Promise}
   */
  clearExportAuditLog: (params = {}) => {
    return api.delete('/exports/audit-log', { params });
  },

  /**
   * Get export API documentation
   * @returns {Promise}
   */
  getExportApiDocs: () => {
    return api.get('/exports/api-docs');
  },

  /**
   * Test export API connection
   * @returns {Promise}
   */
  testExportApi: () => {
    return api.get('/exports/test');
  },

  /**
   * Get export system status
   * @returns {Promise}
   */
  getExportSystemStatus: () => {
    return api.get('/exports/status');
  },

  /**
   * Validate export file
   * @param {Object} file - File to validate
   * @returns {Promise}
   */
  validateExportFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/exports/validate-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Import data from file
   * @param {Object} file - File to import
   * @param {Object} config - Import configuration
   * @returns {Promise}
   */
  importFromFile: (file, config = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));
    return api.post('/exports/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Get import templates
   * @returns {Promise}
   */
  getImportTemplates: () => {
    return api.get('/exports/import-templates');
  },

  /**
   * Get import history
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getImportHistory: (params = {}) => {
    return api.get('/exports/import-history', { params });
  },

  /**
   * Get export limits
   * @returns {Promise}
   */
  getExportLimits: () => {
    return api.get('/exports/limits');
  },

  /**
   * Request export limit increase
   * @param {Object} data - Request data
   * @returns {Promise}
   */
  requestLimitIncrease: (data) => {
    return api.post('/exports/limits/request-increase', data);
  },

  /**
   * Get export subscriptions
   * @returns {Promise}
   */
  getExportSubscriptions: () => {
    return api.get('/exports/subscriptions');
  },

  /**
   * Subscribe to export updates
   * @param {Object} data - Subscription data
   * @returns {Promise}
   */
  subscribeToExports: (data) => {
    return api.post('/exports/subscribe', data);
  },

  /**
   * Unsubscribe from export updates
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise}
   */
  unsubscribeFromExports: (subscriptionId) => {
    return api.delete(`/exports/subscribe/${subscriptionId}`);
  },

  /**
   * Get export notifications
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getExportNotifications: (params = {}) => {
    return api.get('/exports/notifications', { params });
  },

  /**
   * Mark export notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise}
   */
  markNotificationRead: (notificationId) => {
    return api.patch(`/exports/notifications/${notificationId}/read`);
  },

  /**
   * Clear all export notifications
   * @returns {Promise}
   */
  clearAllNotifications: () => {
    return api.delete('/exports/notifications/clear');
  }
};

export default exportService;
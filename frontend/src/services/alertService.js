import api from './api';

const alertService = {
  /** Get alerts list */
  getAlerts: (params = {}) => {
    return api.get('/alerts', { params });
  },

  /** Get alert statistics */
  getAlertStats: () => {
    return api.get('/alerts/stats/summary');
  },

  /** Update single alert (read / status) */
  updateAlert: (id, data) => {
    return api.patch(`/alerts/${id}`, data);
  },

  /** Delete single alert */
  deleteAlert: (id) => {
    return api.delete(`/alerts/${id}`);
  },

  /** Bulk update alerts (mark read, unread, dismiss) */
  bulkUpdateAlerts: (ids = [], payload = {}) => {
    return Promise.all(
      ids.map((id) => api.patch(`/alerts/${id}`, payload))
    );
  },

  /** Mark all alerts as read */
  markAllAsRead: () => {
    return api.patch('/alerts/mark-all-read');
  },

  /** Generate test alerts (dev only) */
  generateTestAlerts: (count = 3) => {
    return api.post('/alerts/generate-test', null, {
      params: { count },
    });
  },
};

export default alertService;

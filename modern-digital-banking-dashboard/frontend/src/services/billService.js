import api from './api';

export const billService = {
  getBills: (params = {}) =>
    api.get('/bills', { params }).then(res => res.data),

  getBill: (id) =>
    api.get(`/bills/${id}`).then(res => res.data),

  createBill: (data) =>
    api.post('/bills', data).then(res => res.data),

  updateBill: (id, data) =>
    api.put(`/bills/${id}`, data).then(res => res.data),

  deleteBill: (id) =>
    api.delete(`/bills/${id}`).then(() => true),

  markBillAsPaid: (id) =>
    api.post(`/bills/${id}/pay`).then(res => res.data),

  getDueSoonBills: (days = 7) =>
    api.get('/bills/summary/due-soon', { params: { days } })
      .then(res => res.data),

  getOverdueBills: () =>
    api.get('/bills/summary/due-soon', { params: { days: -30 } })
      .then(res => res.data),

  getMonthlySummary: (month, year) =>
    api.get('/bills/summary/monthly', { params: { month, year } })
      .then(res => res.data),
};

export default billService;

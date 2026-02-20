import api from './api';

const accountService = {
  getAccounts: async (params = {}) => {
    const response = await api.get('/accounts', { params });
    return response.data;
  },

  getAccount: async (id) => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  createAccount: async (accountData) => {
    const response = await api.post('/accounts', accountData);
    return response.data;
  },

  updateAccount: async (id, accountData) => {
    const response = await api.put(`/accounts/${id}`, accountData);
    return response.data;
  },

  deleteAccount: async (id) => {
    await api.delete(`/accounts/${id}`);
  },

  // Mock data for development
  getMockAccounts: () => {
    return [
      {
        id: 1,
        account_number: '1234567890',
        account_type: 'checking',
        balance: '1250.75',
        currency: 'USD',
        status: 'active',
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        id: 2,
        account_number: '0987654321',
        account_type: 'savings',
        balance: '5000.00',
        currency: 'USD',
        status: 'active',
        created_at: '2024-01-02T10:00:00Z',
      },
      {
        id: 3,
        account_number: '5678901234',
        account_type: 'credit',
        balance: '-250.50',
        currency: 'USD',
        status: 'active',
        created_at: '2024-01-03T10:00:00Z',
      },
    ];
  },
};
export default accountService;
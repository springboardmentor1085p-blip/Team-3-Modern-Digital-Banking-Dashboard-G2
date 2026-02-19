import api from './api';

export const transactionService = {
  getTransactions: async (params = {}) => {
    const response = await api.get('/transactions/', { params });
    return response.data;
  },

  getTransaction: async (id) => {
    const response = await api.get(`/transactions/${id}/`);
    return response.data;
  },

  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions/', transactionData);
    return response.data;
  },

  // Mock data for development
  getMockTransactions: () => {
    return [
      {
        id: 1,
        account_id: 1,
        transaction_type: 'deposit',
        amount: '500.00',
        description: 'Salary Deposit',
        status: 'completed',
        recipient_account: null,
        reference_number: 'TXN-ABC123',
        transaction_date: '2024-01-10T09:00:00Z',
      },
      {
        id: 2,
        account_id: 1,
        transaction_type: 'withdrawal',
        amount: '150.75',
        description: 'Grocery Store',
        status: 'completed',
        recipient_account: null,
        reference_number: 'TXN-DEF456',
        transaction_date: '2024-01-09T14:30:00Z',
      },
      {
        id: 3,
        account_id: 2,
        transaction_type: 'transfer',
        amount: '1000.00',
        description: 'Savings Transfer',
        status: 'completed',
        recipient_account: '0987654321',
        reference_number: 'TXN-GHI789',
        transaction_date: '2024-01-08T11:15:00Z',
      },
      {
        id: 4,
        account_id: 1,
        transaction_type: 'payment',
        amount: '75.50',
        description: 'Netflix Subscription',
        status: 'pending',
        recipient_account: null,
        reference_number: 'TXN-JKL012',
        transaction_date: '2024-01-07T16:45:00Z',
      },
      {
        id: 5,
        account_id: 3,
        transaction_type: 'payment',
        amount: '250.00',
        description: 'Credit Card Payment',
        status: 'completed',
        recipient_account: null,
        reference_number: 'TXN-MNO345',
        transaction_date: '2024-01-06T10:00:00Z',
      },
    ];
  },
};
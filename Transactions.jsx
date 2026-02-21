import React, { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    amount: '',
    description: '',
    transaction_type: 'deposit',
    recipient_account: '',
    transaction_date: '', 
  });



  const fetchTransactions = useCallback(
    async (filterParams = {}) => {
      try {
        setLoading(true);
        const params = { ...filters, ...filterParams };
        const data = await transactionService.getTransactions(params);
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    },
    [filters]   // 👈 dependency
  );

    useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
    setShowFilterModal(false);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        account_id: Number(formData.account_id),
        transaction_date: new Date(formData.transaction_date).toISOString(),
      };
      if (!payload.recipient_account) {
        payload.recipient_account = "self";
      }

      await transactionService.createTransaction(payload);

      setShowCreateModal(false);
      setFormData({
        account_id: '',
        amount: '',
        description: '',
        transaction_type: 'deposit',
        recipient_account: '',
        transaction_date: '',
      });

      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };


  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    fetchTransactions({});
  };

  const getTransactionTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return 'text-success-600 bg-success-50';
      case 'withdrawal':
        return 'text-danger-600 bg-danger-50';
      case 'transfer':
        return 'text-primary-600 bg-primary-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">
            View and manage all your financial transactions
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilterModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <FunnelIcon className="w-5 h-5" />
            <span>Filter</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* Filters Summary */}
      {(filters.type || filters.status || filters.startDate) && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-primary-800">Active Filters:</span>
              {filters.type && (
                <span className="text-sm text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
                  Type: {filters.type}
                </span>
              )}
              {filters.status && (
                <span className="text-sm text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
                  Status: {filters.status}
                </span>
              )}
              {filters.startDate && (
                <span className="text-sm text-primary-600 bg-primary-100 px-3 py-1 rounded-full">
                  From: {filters.startDate}
                </span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions found</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {Object.values(filters).some(f => f) 
                ? 'Try changing your filters to see more results.'
                : 'Get started by creating your first transaction.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-6"
            >
              Create Your First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description || 'Transaction'}
                        </div>
                        {transaction.recipient_account && (
                          <div className="text-sm text-gray-500">
                            To: {transaction.recipient_account}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.transaction_type === 'deposit' ? 'text-success-600' : 'text-gray-900'}>
                        {transaction.transaction_type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed' 
                          ? 'bg-success-100 text-success-800'
                          : transaction.status === 'pending'
                          ? 'bg-warning-100 text-warning-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {transactions.length} transactions
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Filter Transactions
            </h3>
            
            <form onSubmit={handleFilterSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="input-field"
                  >
                    <option value="">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="transfer">Transfer</option>
                    <option value="payment">Payment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="input-field"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Transaction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Transaction
            </h3>
            
            <form onSubmit={handleCreateTransaction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
                    className="input-field"
                  >
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="input-field"
                    required 
                  >
                    <option value="">Select account</option>
                    <option value="1">Savings Account</option>
                    <option value="2">Current Account</option>
                  </select>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="input-field"
                    placeholder="Enter description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Date
                  </label>
                  <input
                      type="datetime-local"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>

                {formData.transaction_type === 'transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Account
                    </label>
                    <input
                      type="text"
                      value={formData.recipient_account}
                      onChange={(e) => setFormData({...formData, recipient_account: e.target.value})}
                      className="input-field"
                      placeholder="Enter recipient account number"
                    />
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
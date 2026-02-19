import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const TransactionList = ({ transactions }) => {
  const getTransactionIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return '🟢';
      case 'withdrawal':
        return '🔴';
      case 'transfer':
        return '🔵';
      case 'payment':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getAmountColor = (type, amount) => {
    if (type.toLowerCase() === 'deposit') {
      return 'text-success-600';
    }
    return 'text-gray-900';
  };

  const getAmountPrefix = (type) => {
    if (type.toLowerCase() === 'deposit') {
      return '+';
    }
    return '-';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getTransactionIcon(transaction.transaction_type)}</span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description || 'Transaction'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatDate(transaction.transaction_date)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-semibold ${getAmountColor(transaction.transaction_type, transaction.amount)}`}>
                    {getAmountPrefix(transaction.transaction_type)}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Ref: {transaction.reference_number}
                  </p>
                </div>
              </div>
              
              {transaction.recipient_account && (
                <div className="mt-3 pl-11">
                  <p className="text-sm text-gray-600">
                    To: {transaction.recipient_account}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {transactions.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            View All Transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
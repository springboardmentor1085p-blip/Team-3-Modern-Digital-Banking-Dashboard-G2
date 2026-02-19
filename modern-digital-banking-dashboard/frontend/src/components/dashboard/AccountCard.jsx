import React from 'react';
import {
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  useTheme,
} from '@mui/material';

import { formatCurrency as formatCurrencyUtil } from '../../utils/formatters';

const AccountCard = ({
  account,
  showBudgetInfo = false,
  budgetData = null,
}) => {
  const theme = useTheme();

  /* ---------- Tailwind helpers (Milestone 1) ---------- */
  const getAccountIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'checking':
        return <BanknotesIcon className="w-8 h-8 text-primary-600" />;
      case 'savings':
        return <BuildingLibraryIcon className="w-8 h-8 text-success-600" />;
      case 'credit':
        return <CreditCardIcon className="w-8 h-8 text-warning-600" />;
      default:
        return <BanknotesIcon className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success-100 text-success-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'closed':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /* ---------- Milestone 2: Budget helpers ---------- */
  const calculateSpendingPercentage = () => {
    if (!budgetData || !budgetData.total_spent || !budgetData.total_budget)
      return 0;
    return (budgetData.total_spent / budgetData.total_budget) * 100;
  };

  const getBudgetStatus = () => {
    const percentage = calculateSpendingPercentage();
    if (percentage >= 100) return 'over';
    if (percentage >= 90) return 'warning';
    if (percentage >= 75) return 'near_limit';
    return 'under';
  };

  const formatCurrency = (amount, currency = 'USD') =>
    formatCurrencyUtil
      ? formatCurrencyUtil(amount, currency)
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        }).format(amount);

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
      className="dashboard-card"
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="center" gap={2}>
            {getAccountIcon(account.account_type || account.type)}
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {account.name || account.account_type}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {account.account_number}
              </Typography>
            </Box>
          </Box>

          {account.status && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                account.status
              )}`}
            >
              {account.status}
            </span>
          )}
        </Box>

        {/* Balance */}
        <Typography variant="h4" fontWeight="bold" mt={3}>
          {formatCurrency(account.balance, account.currency)}
        </Typography>

        {/* Meta chips */}
        <Box display="flex" alignItems="center" mt={2}>
          {account.type && (
            <Chip
              label={account.type}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}
          {account.currency && (
            <Chip label={account.currency} size="small" variant="outlined" />
          )}
        </Box>

        {/* Milestone 2: Budget Progress */}
        {showBudgetInfo && budgetData && (
          <Box mt={4} pt={2} borderTop={`1px solid ${theme.palette.divider}`}>
            <Typography variant="subtitle2" gutterBottom>
              Monthly Budget Progress
            </Typography>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="textSecondary">
                {calculateSpendingPercentage().toFixed(1)}% used
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {formatCurrency(budgetData.total_spent)} of{' '}
                {formatCurrency(budgetData.total_budget)}
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={Math.min(calculateSpendingPercentage(), 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  backgroundColor:
                    getBudgetStatus() === 'over'
                      ? theme.palette.error.main
                      : getBudgetStatus() === 'warning'
                      ? theme.palette.warning.main
                      : getBudgetStatus() === 'near_limit'
                      ? theme.palette.warning.light
                      : theme.palette.success.main,
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}

        {/* Footer */}
        {account.updated_at && (
          <Box display="flex" justifyContent="space-between" mt={3}>
            <Typography variant="caption" color="textSecondary">
              Last updated:{' '}
              {new Date(account.updated_at).toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountCard;

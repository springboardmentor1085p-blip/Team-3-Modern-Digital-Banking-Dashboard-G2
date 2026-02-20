import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Refresh,
  ArrowUpward,
} from '@mui/icons-material';
import  budgetService  from '../../services/budgetService';

const safeNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const BudgetProgress = ({ budgetId, showDetails = true, onUpdate }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

const fetchProgress = useCallback(async () => {
  if (!budgetId) {
    setProgress(null);
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const data = await budgetService.getBudgetProgress(budgetId);
    setProgress(data);
  } catch (err) {
    console.error('Error fetching budget progress:', err);
    setError('Failed to load budget progress');
  } finally {
    setLoading(false);
  }
}, [budgetId]);


useEffect(() => {
  fetchProgress();
}, [fetchProgress]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'over':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'near_limit':
        return theme.palette.warning.light;
      default:
        return theme.palette.success.main;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'over':
        return <ArrowUpward sx={{ color: getStatusColor(status) }} />;
      case 'warning':
        return <Warning sx={{ color: getStatusColor(status) }} />;
      case 'near_limit':
        return <TrendingUp sx={{ color: getStatusColor(status) }} />;
      default:
        return <CheckCircle sx={{ color: getStatusColor(status) }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'over':
        return 'Over Budget';
      case 'warning':
        return 'Warning';
      case 'near_limit':
        return 'Near Limit';
      default:
        return 'On Track';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error" action={
            <IconButton size="small" onClick={fetchProgress}>
              <Refresh />
            </IconButton>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!budgetId) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Alert severity="info">
          Budget not linked
        </Alert>
      </CardContent>
    </Card>
  );
}


  const budget = progress?.budget ?? {};
  const budgetAmount = safeNumber(budget.amount);
  const spentAmount = safeNumber(progress?.progress?.spent_amount);
  const remainingAmount = Math.max(budgetAmount - spentAmount, 0);

  const progressData = {
    percentage_used: progress?.progress?.percentage_used ?? 0,
    spent_amount: progress?.progress?.spent_amount ?? 0,
    remaining_amount: progress?.progress?.remaining_amount ?? 0,
    transactions_count: progress?.progress?.transactions_count ?? 0,
    status: progress?.progress?.status ?? 'under',
  };

  const percentage =  budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

  const statusColor = getStatusColor(progressData.status);

  return (
    <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" component="div" gutterBottom>
              {budget.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {typeof budget.category === "string" ? budget.category : budget.category?.name || "Uncategorized"}
              {budget.subcategory && ` • ${budget.subcategory}`}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Chip
              label={getStatusText(progressData.status || "under")}
              color={progressData.status === 'over' ? 'error' : progressData.status === 'warning' ? 'warning' : 'success'}
              size="small"
              icon={getStatusIcon(progressData.status || "under")}
              sx={{ mr: 1 }}
            />
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchProgress}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="textSecondary">
              {Number(percentage).toFixed(1)}% used
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatCurrency(spentAmount)} of {formatCurrency(budgetAmount)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(percentage, 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: statusColor,
                borderRadius: 5,
              }
            }}
          />
        </Box>

        {/* Details Grid */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box textAlign={isMobile ? "left" : "center"}>
              <Typography variant="caption" color="textSecondary" display="block">
                Budget
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold">
                {formatCurrency(budgetAmount)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign={isMobile ? "left" : "center"}>
              <Typography variant="caption" color="textSecondary" display="block">
                Spent
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold" color={statusColor}>
                {formatCurrency(progressData.spent_amount)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign={isMobile ? "left" : "center"}>
              <Typography variant="caption" color="textSecondary" display="block">
                Remaining
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold">
                {formatCurrency(remainingAmount)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign={isMobile ? "left" : "center"}>
              <Typography variant="caption" color="textSecondary" display="block">
                Transactions
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold">
                {progressData.transactions_count}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Additional Information */}
        {showDetails && (
          <Box mt={3} pt={2} borderTop={`1px solid ${theme.palette.divider}`}>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="textSecondary">
                    Period
                  </Typography>
                  <Typography variant="caption" fontWeight="medium">
                    {budget.period ? budget.period.charAt(0).toUpperCase() + budget.period.slice(1) : "Monthly"}
                    {budget.month && ` • Month ${budget.month}`}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="textSecondary">
                    Year
                  </Typography>
                  <Typography variant="caption" fontWeight="medium">
                    {budget.year}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="textSecondary">
                    Daily Average
                  </Typography>
                  <Typography variant="caption" fontWeight="medium">
                    {formatCurrency(spentAmount / 30)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Status Message */}
        {progressData.status !== 'under' && (
          <Alert
            severity={progressData.status === 'over' ? 'error' : 'warning'}
            sx={{ mt: 2 }}
            icon={progressData.status === 'over' ? <ArrowUpward /> : <Warning />}
          >
            {progressData.status === 'over' ? (
              <>You've exceeded your budget by {formatCurrency(spentAmount - budgetAmount)}</>
            ) : (
              <>You've used {percentage.toFixed(1)}% of your budget. Consider slowing down spending.</>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetProgress;
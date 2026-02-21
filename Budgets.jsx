import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  useTheme,
  useMediaQuery,
  Stack,
  LinearProgress,
  TextField,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  TrendingUp,
  TrendingDown,
  Warning,
  Refresh,
  AttachMoney,
  Category,
  Search,
  Download,
  MoreVert,
  CheckCircle,
  Error
} from '@mui/icons-material';
import  budgetService  from '../services/budgetService';
import BudgetForm from '../components/forms/BudgetForm';
import BudgetProgress from '../components/dashboard/BudgetProgress';
import CategorizationForm from '../components/forms/CategorizationForm';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => ({
    value: currentYear - 1 + i,
    label: (currentYear - 1 + i).toString()
  }));

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [budgetsData, summaryData] = await Promise.all([
        budgetService.getBudgets(filterMonth, filterYear),
        budgetService.getBudgetSummary(filterMonth, filterYear)
      ]);
      
      setBudgets(budgetsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading budgets:', err);
      setError('Failed to load budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleEditBudget = (budget) => {
    setSelectedBudget(budget);
    setDialogOpen(true);
  };

  const handleDeleteBudget = async (budgetId) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetService.deleteBudget(budgetId);
        await loadBudgets();
      } catch (err) {
        console.error('Error deleting budget:', err);
        alert('Failed to delete budget');
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedBudget(null);
  };

  const handleBudgetSuccess = () => {
    handleDialogClose();
    loadBudgets();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'over': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'near_limit': return theme.palette.warning.light;
      default: return theme.palette.success.main;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'over': return <Error sx={{ color: getStatusColor(status) }} />;
      case 'warning': return <Warning sx={{ color: getStatusColor(status) }} />;
      case 'near_limit': return <TrendingUp sx={{ color: getStatusColor(status) }} />;
      default: return <CheckCircle sx={{ color: getStatusColor(status) }} />;
    }
  };

  const renderSummaryCards = () => {
    if (!summary) return null;

    const cards = [
      {
        title: 'Total Budget',
        value: formatCurrency(summary.total_budget),
        icon: <AttachMoney sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
        color: theme.palette.primary.main,
        subtitle: 'Allocated amount'
      },
      {
        title: 'Total Spent',
        value: formatCurrency(summary.total_spent),
        icon: <TrendingDown sx={{ fontSize: 40, color: theme.palette.error.main }} />,
        color: theme.palette.error.main,
        subtitle: `${summary.overall_percentage.toFixed(1)}% of budget`
      },
      {
        title: 'Remaining',
        value: formatCurrency(summary.total_remaining),
        icon: <TrendingUp sx={{ fontSize: 40, color: theme.palette.success.main }} />,
        color: theme.palette.success.main,
        subtitle: 'Available balance'
      },
      {
        title: 'Categories',
        value: summary.category_breakdown.length,
        icon: <Category sx={{ fontSize: 40, color: theme.palette.info.main }} />,
        color: theme.palette.info.main,
        subtitle: `${summary.over_budget_categories.length} over budget`
      }
    ];

    return (
      <Grid container spacing={2}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={card.color}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Box>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderCategoryBreakdown = () => {
    if (!summary || !summary.category_breakdown) return null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Category Breakdown
          </Typography>
          <TableContainer>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Budget</TableCell>
                  <TableCell align="right">Spent</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                  <TableCell align="center">Progress</TableCell>
                  <TableCell align="center">Status</TableCell>
                  {!isMobile && <TableCell align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.category_breakdown.map((category) => (
                  <TableRow key={`${category.category}-${category.subcategory || ''}`}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {category.category}
                        </Typography>
                        {category.subcategory && (
                          <Typography variant="caption" color="textSecondary">
                            {category.subcategory}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(category.budget)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color={category.status === 'over' ? 'error' : 'textPrimary'}
                      >
                        {formatCurrency(category.spent)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(category.remaining)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box flex={1} mr={1}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(category.percentage, 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: theme.palette.grey[200],
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getStatusColor(category.status),
                                borderRadius: 4,
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="caption" minWidth={40}>
                          {category.percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={getStatusIcon(category.status)}
                        label={category.status.replace('_', ' ')}
                        size="small"
                        color={category.status === 'over' ? 'error' : category.status === 'warning' ? 'warning' : 'success'}
                      />
                    </TableCell>
                    {!isMobile && (
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  const renderBudgetsList = () => {
    const filteredBudgets = budgets.filter(budget => {
      const matchesSearch = searchTerm === '' || 
        budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return (
      <Grid container spacing={2}>
        {filteredBudgets.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              No budgets found. Create your first budget to get started!
            </Alert>
          </Grid>
        ) : (
          filteredBudgets.map((budget) => (
            <Grid item xs={12} md={6} lg={4} key={budget.id}>
              <BudgetProgress 
                budgetId={budget.id} 
                showDetails={false}
                onUpdate={loadBudgets}
              />
              <Box mt={1} display="flex" justifyContent="flex-end" gap={1}>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => handleEditBudget(budget)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => handleDeleteBudget(budget.id)}
                >
                  Delete
                </Button>
              </Box>
            </Grid>
          ))
        )}
      </Grid>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" fontWeight="bold">
            Budget Management
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadBudgets}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setDialogOpen(true)}
            >
              New Budget
            </Button>
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="Month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="Year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                {years.map((year) => (
                  <MenuItem key={year.value} value={year.value}>
                    {year.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                size="small"
              >
                Export
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={loadBudgets}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab label="Overview" />
          <Tab label="Budgets" />
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Content */}
      {!loading && (
        <Box>
          {tabValue === 0 && (
            <>
              {renderSummaryCards()}
              {renderCategoryBreakdown()}
              
              {/* Over Budget Alert */}
              {summary?.over_budget_categories?.length > 0 && (
                <Alert 
                  severity="error" 
                  sx={{ mt: 2 }}
                  action={
                    <Button color="inherit" size="small">
                      View Details
                    </Button>
                  }
                >
                  {summary.over_budget_categories.length} category
                  {summary.over_budget_categories.length > 1 ? 's are' : ' is'} over budget
                </Alert>
              )}

              {/* Budget Progress Charts */}
              <Grid container spacing={2} mt={2}>
                {budgets.slice(0, isMobile ? 1 : isTablet ? 2 : 3).map((budget) => (
                  <Grid item xs={12} md={6} lg={4} key={budget.id}>
                    <BudgetProgress budgetId={budget.id} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {tabValue === 1 && renderBudgetsList()}

          {tabValue === 2 && (
            <CategorizationForm 
              onCategorizeComplete={() => {
                // Refresh budgets after categorization
                loadBudgets();
              }}
            />
          )}
        </Box>
      )}

      {/* Create/Edit Budget Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {selectedBudget ? 'Edit Budget' : 'Create New Budget'}
        </DialogTitle>
        <DialogContent dividers>
          <BudgetForm
            initialData={selectedBudget}
            onSuccess={handleBudgetSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Budgets;
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  InputAdornment,
  Pagination,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Paid as PaidIcon,
  Pending as PendingIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import BillCard from './BillCard';
import BillForm from './BillForm';
import { billService } from '../../services/billService';
import { useSnackbar } from '../../context/SnackbarContext';
import { exportToCSV } from '../../utils/exportUtils';

const BillList = ({ onBillSelect, showFilters = true, initialView = 'grid' }) => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(initialView);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    frequency: 'all',
    sortBy: 'due_date',
    sortOrder: 'asc',
    dateRange: 'all'
  });

  const { showSuccess } = useSnackbar();

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = {};
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.status !== 'all') params.is_paid = filters.status === 'paid';
      if (filters.frequency !== 'all') params.frequency = filters.frequency;
      params.sort = `${filters.sortOrder === 'desc' ? '-' : ''}${filters.sortBy}`;
      params.page = page;
      params.limit = itemsPerPage;
      
      const response = await billService.getBills(params);
      setBills(response.data || response);
      
      // Calculate pagination
      if (response.total !== undefined) {
        setTotalPages(Math.ceil(response.total / itemsPerPage));
      } else {
        setTotalPages(1);
      }
      
      // Fetch summary
      fetchSummary();
      
    } catch (err) {
      setError('Failed to load bills. Please try again.');
      showSuccess('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [filters, page, itemsPerPage, showSuccess]);
  const fetchSummary = async () => {
    try {
      const today = new Date();
      const summaryData = await billService.getMonthlySummary(
        today.getMonth() + 1,
        today.getFullYear()
      );
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Apply local filters (search, date range)
  useEffect(() => {
    let result = [...bills];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(bill =>
        bill.name.toLowerCase().includes(searchLower) ||
        bill.description?.toLowerCase().includes(searchLower) ||
        bill.category.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const today = new Date();
      let startDate, endDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = today;
          endDate = today;
          break;
        case 'week':
          startDate = new Date(today.setDate(today.getDate() - today.getDay()));
          endDate = new Date(today.setDate(today.getDate() + 6));
          break;
        case 'month':
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          break;
        case 'overdue':
          result = result.filter(bill => {
            const dueDate = parseISO(bill.due_date);
            return !bill.is_paid && dueDate < new Date();
          });
          break;
        case 'upcoming':
          result = result.filter(bill => {
            const dueDate = parseISO(bill.due_date);
            const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
            return !bill.is_paid && daysUntilDue <= 7 && daysUntilDue >= 0;
          });
          break;
        default:
          break;
      }
      
      if (startDate && endDate) {
        result = result.filter(bill => {
          const dueDate = parseISO(bill.due_date);
          return isWithinInterval(dueDate, { start: startDate, end: endDate });
        });
      }
    }
    
    setFilteredBills(result);
  }, [bills, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSortChange = (sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleBillUpdate = (updatedBill) => {
    setBills(prev => prev.map(bill => 
      bill.id === updatedBill.id ? updatedBill : bill
    ));
    showSuccess('Bill updated successfully');
  };

  const handleBillDelete = (billId) => {
    setBills(prev => prev.filter(bill => bill.id !== billId));
    showSuccess('Bill deleted successfully');
  };

  const handleAddBill = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };


  const handleFormSubmit = async (billData) => {
    try {
      let updatedBill;
      if (editingBill) {
        updatedBill = await billService.updateBill(editingBill.id, billData);
        handleBillUpdate(updatedBill);
      } else {
        updatedBill = await billService.createBill(billData);
        setBills(prev => [updatedBill, ...prev]);
        showSuccess('Bill created successfully');
      }
      setIsFormOpen(false);
    } catch (error) {
      showSuccess('Failed to save bill');
    }
  };

  const handleExport = () => {
    const exportData = filteredBills.map(bill => ({
      'Bill Name': bill.name,
      'Amount': `${bill.amount} ${bill.currency}`,
      'Amount (USD)': bill.amount_usd || bill.amount,
      'Due Date': format(parseISO(bill.due_date), 'yyyy-MM-dd'),
      'Status': bill.is_paid ? 'Paid' : 'Pending',
      'Category': bill.category,
      'Frequency': bill.frequency,
      'Reminder Days': bill.reminder_days,
      'Created Date': format(parseISO(bill.created_at), 'yyyy-MM-dd')
    }));
    
    exportToCSV(exportData, `bills_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    showSuccess('Bills exported successfully');
  };

  const handleRefresh = () => {
    fetchBills();
    showSuccess('Refreshing bills...');
  };

  const categories = [
    'utilities', 'rent', 'mortgage', 'credit_card', 'loan',
    'insurance', 'subscription', 'education', 'medical', 'tax', 'other'
  ];

  if (loading && bills.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && bills.length === 0) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Button onClick={fetchBills} sx={{ ml: 2 }}>Retry</Button>
      </Alert>
    );
  }

  return (
    <Box className="bill-list-container">
      {/* Header with summary */}
      <Box className="bill-list-header">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              My Bills
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and manage your bills efficiently
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Tooltip title="Export to CSV">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                disabled={filteredBills.length === 0}
              >
                Export
              </Button>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddBill}
            >
              Add New Bill
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="summary-card">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PaidIcon color="success" fontSize="large" />
                    <Box>
                      <Typography variant="h6" color="success.main">
                        ${summary.total_amount ? parseFloat(summary.total_amount).toFixed(2) : '0.00'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Amount
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="summary-card">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CalendarIcon color="primary" fontSize="large" />
                    <Box>
                      <Typography variant="h6" color="primary.main">
                        {summary.total_bills || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Bills
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="summary-card">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PaidIcon color="success" fontSize="large" />
                    <Box>
                      <Typography variant="h6" color="success.main">
                        {summary.paid_bills || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Paid Bills
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="summary-card">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PendingIcon color="warning" fontSize="large" />
                    <Box>
                      <Typography variant="h6" color="warning.main">
                        {summary.unpaid_bills || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unpaid Bills
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Filters Section */}
      {showFilters && (
        <Paper className="filters-section" sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <FilterIcon />
              Filters & Sorting
            </Typography>
            
            <Box display="flex" alignItems="center" gap={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newView) => newView && setViewMode(newView)}
                size="small"
              >
                <ToggleButton value="grid" aria-label="grid view">
                  <ViewModuleIcon />
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <TextField
                fullWidth
                label="Search bills"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by name, description..."
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3} lg={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3} lg={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3} lg={2}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={filters.frequency}
                  label="Frequency"
                  onChange={(e) => handleFilterChange('frequency', e.target.value)}
                >
                  <MenuItem value="all">All Frequencies</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="biannually">Bi-Annually</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                  <MenuItem value="one_time">One Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3} lg={3}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  label="Date Range"
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                >
                  <MenuItem value="all">All Dates</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="upcoming">Upcoming (7 days)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Sorting */}
          <Box display="flex" alignItems="center" gap={2} mt={3}>
            <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
              <SortIcon fontSize="small" />
              Sort by:
            </Typography>
            {['due_date', 'amount', 'created_at', 'name'].map(sortField => (
              <Chip
                key={sortField}
                label={sortField.replace('_', ' ')}
                variant={filters.sortBy === sortField ? 'filled' : 'outlined'}
                color={filters.sortBy === sortField ? 'primary' : 'default'}
                onClick={() => handleSortChange(sortField)}
                deleteIcon={filters.sortBy === sortField && (
                  filters.sortOrder === 'asc' ? '↑' : '↓'
                )}
                onDelete={filters.sortBy === sortField ? () => handleSortChange(sortField) : undefined}
                sx={{ textTransform: 'capitalize' }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Bills Grid/List */}
      {filteredBills.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No bills found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {filters.search || filters.category !== 'all' || filters.status !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by adding your first bill'}
          </Typography>
          {(!filters.search && filters.category === 'all' && filters.status === 'all') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddBill}
              sx={{ mt: 2 }}
            >
              Add Your First Bill
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Box className={`bills-${viewMode}`}>
            {viewMode === 'grid' ? (
              <Grid container spacing={3}>
                {filteredBills.map(bill => (
                  <Grid item key={bill.id} xs={12} sm={6} md={4} lg={3}>
                    <BillCard
                      bill={bill}
                      onUpdate={handleBillUpdate}
                      onDelete={handleBillDelete}
                      onClick={() => onBillSelect?.(bill)}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box className="bills-list-view">
                {filteredBills.map(bill => (
                  <Box key={bill.id} mb={2}>
                    <BillCard
                      bill={bill}
                      onUpdate={handleBillUpdate}
                      onDelete={handleBillDelete}
                      onClick={() => onBillSelect?.(bill)}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Bill Form Dialog */}
      <BillForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBill(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingBill}
      />
    </Box>
  );
};

BillList.propTypes = {
  onBillSelect: PropTypes.func,
  showFilters: PropTypes.bool,
  initialView: PropTypes.oneOf(['grid', 'list']),
};

export default BillList;
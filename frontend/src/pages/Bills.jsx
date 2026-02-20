import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
  useTheme,
  Alert,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Paid as PaidIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import BillList from '../components/bills/BillList';
import BillForm from '../components/bills/BillForm';
import { billService } from '../services/billService';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import './Bills.css';

const Bills = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess } = useSnackbar();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [summary, setSummary] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dueSoonBills, setDueSoonBills] = useState([]);
  const [overdueBills, setOverdueBills] = useState([]);



  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch summary
      const today = new Date();
      const summaryData = await billService.getMonthlySummary(
        today.getMonth() + 1,
        today.getFullYear()
      );
      setSummary(summaryData);
      
      // Fetch due soon bills
      const dueSoon = await billService.getDueSoonBills(7);
      setDueSoonBills(dueSoon);
      
      // Fetch overdue bills
      const overdue = await billService.getOverdueBills();
      setOverdueBills(overdue);
      
    } catch (err) {
      setError('Failed to load bill data');
      showSuccess('Failed to load bills data');
    } finally {
      setLoading(false);
    }
  }, [showSuccess]);
    useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddBill = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };

  const handleEditBill = useCallback(async (billId) => {
    try {
      const bill = await billService.getBill(billId);
      setEditingBill(bill);
      setIsFormOpen(true);
      // Update URL without reload
      navigate(`/bills?edit=${billId}`, { replace: true });
    } catch (err) {
      showSuccess('Failed to load bill for editing');
    }
  }, [navigate, showSuccess]);

    // Check URL for bill ID to edit
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const billId = params.get('edit');
    if (billId) {
      handleEditBill(parseInt(billId));
    }
  }, [location.search, handleEditBill]);

  const handleFormSubmit = async (billData) => {
    try {
      if (editingBill) {
        await billService.updateBill(editingBill.id, billData);
        showSuccess('Bill updated successfully');
      } else {
        await billService.createBill(billData);
        showSuccess('Bill created successfully');
      }
      
      setIsFormOpen(false);
      setEditingBill(null);
      fetchInitialData(); // Refresh data
      navigate('/bills', { replace: true }); // Clear URL params
    } catch (error) {
      showSuccess('Failed to save bill');
    }
  };

  const handleBillSelect = (bill) => {
    navigate(`/bills/${bill.id}`);
  };

  const handleExportAll = async () => {
    try {
      const bills = await billService.getAllBills();
      const exportData = bills.map(bill => ({
        'Bill Name': bill.name,
        'Amount': `${bill.amount} ${bill.currency}`,
        'Due Date': bill.due_date,
        'Status': bill.is_paid ? 'Paid' : 'Pending',
        'Category': bill.category,
        'Frequency': bill.frequency,
        'Created Date': bill.created_at
      }));
      
      // Create CSV
      const csvContent = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bills_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      showSuccess('Bills exported successfully');
    } catch (err) {
      showSuccess('Failed to export bills');
    }
  };

  const handleQuickPay = async (billId) => {
    try {
      await billService.markBillAsPaid(billId);
      showSuccess('Bill marked as paid successfully');
      fetchInitialData(); // Refresh data
    } catch (err) {
      showSuccess('Failed to mark bill as paid');
    }
  };

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="bills-page">
      {/* Mobile App Bar */}
      {isMobile && (
        <Paper elevation={3} sx={{ position: 'sticky', top: 0, zIndex: 1100, mb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6">My Bills</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddBill}
              size="small"
            >
              Add
            </Button>
          </Box>
        </Paper>
      )}

      <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4 }}>
        {/* Page Header */}
        {!isMobile && (
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
            <Box>
              <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                Bill Management
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Track, manage, and pay your bills efficiently
              </Typography>
            </Box>
            
            <Box display="flex" gap={2}>
              <Tooltip title="Export All Bills">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportAll}
                    disabled={loading}
                  >
                    Export
                  </Button>
                </span>
            </Tooltip>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddBill}
                size="large"
              >
                Add New Bill
              </Button>
            </Box>
          </Box>
        )}

        {/* Alerts Section */}
        <Fade in={true}>
          <Box mb={4}>
            {overdueBills.length > 0 && (
              <Alert 
                severity="error" 
                icon={<WarningIcon />}
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => setActiveTab(2)}>
                    View All
                  </Button>
                }
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {overdueBills.length} bill{overdueBills.length > 1 ? 's' : ''} overdue!
                </Typography>
                <Typography variant="body2">
                  Total amount overdue: ${overdueBills.reduce((sum, bill) => sum + (bill.amount_usd || bill.amount), 0).toFixed(2)}
                </Typography>
              </Alert>
            )}
            
            {dueSoonBills.length > 0 && (
              <Alert 
                severity="warning" 
                icon={<CalendarIcon />}
                action={
                  <Button color="inherit" size="small" onClick={() => setActiveTab(1)}>
                    View All
                  </Button>
                }
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {dueSoonBills.length} bill{dueSoonBills.length > 1 ? 's' : ''} due soon
                </Typography>
                <Typography variant="body2">
                  Due in the next 7 days
                </Typography>
              </Alert>
            )}
            
            {summary && summary.unpaid_bills > 0 && (
              <Alert 
                severity="info" 
                icon={<PaidIcon />}
                sx={{ mt: overdueBills.length > 0 || dueSoonBills.length > 0 ? 2 : 0 }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  Monthly Bill Summary
                </Typography>
                <Typography variant="body2">
                  You have {summary.unpaid_bills} unpaid bill{summary.unpaid_bills > 1 ? 's' : ''} this month. 
                  Total due: ${summary.total_amount ? parseFloat(summary.total_amount).toFixed(2) : '0.00'}
                </Typography>
              </Alert>
            )}
          </Box>
        </Fade>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Left Sidebar - Desktop Only */}
          {!isMobile && (
            <Grid item xs={12} md={3} lg={2}>
              <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddBill}
                    fullWidth
                  >
                    Add Bill
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<FilterIcon />}
                    onClick={() => setActiveTab(0)}
                    fullWidth
                  >
                    All Bills
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<CalendarIcon />}
                    onClick={() => setActiveTab(1)}
                    fullWidth
                  >
                    Due Soon
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<WarningIcon />}
                    onClick={() => setActiveTab(2)}
                    fullWidth
                    color="error"
                  >
                    Overdue
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PaidIcon />}
                    onClick={() => setActiveTab(3)}
                    fullWidth
                    color="success"
                  >
                    Paid Bills
                  </Button>
                </Box>
                
                {/* Summary Stats */}
                {summary && (
                  <Box mt={4}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      This Month
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Total Bills:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {summary.total_bills}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Total Amount:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        ${summary.total_amount ? parseFloat(summary.total_amount).toFixed(2) : '0.00'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Paid:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        {summary.paid_bills}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Unpaid:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="warning.main">
                        {summary.unpaid_bills}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          )}

          {/* Main Content Area */}
          <Grid item xs={12} md={isMobile ? 12 : 9} lg={isMobile ? 12 : 10}>
            {/* Tabs for Mobile, Content for Desktop */}
            {isMobile ? (
              <>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 3 }}
                >
                  <Tab label="All Bills" icon={<DashboardIcon />} iconPosition="start" />
                  <Tab label="Due Soon" icon={<CalendarIcon />} iconPosition="start" />
                  <Tab label="Overdue" icon={<WarningIcon />} iconPosition="start" />
                  <Tab label="Paid" icon={<PaidIcon />} iconPosition="start" />
                  <Tab label="Analytics" icon={<TrendingUpIcon />} iconPosition="start" />
                </Tabs>
                
                {activeTab === 0 && (
                  <BillList
                    onBillSelect={handleBillSelect}
                    showFilters={true}
                    initialView="grid"
                  />
                )}
                
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      Bills Due Soon
                    </Typography>
                    {dueSoonBills.length > 0 ? (
                      <Grid container spacing={2}>
                        {dueSoonBills.map(bill => (
                          <Grid item xs={12} key={bill.id}>
                            <Paper sx={{ p: 2 }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="subtitle1">{bill.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Due: {new Date(bill.due_date).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="h6" color="primary">
                                    ${bill.amount_usd || bill.amount}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleQuickPay(bill.id)}
                                >
                                  Mark Paid
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography color="text.secondary" align="center" py={4}>
                        No bills due in the next 7 days
                      </Typography>
                    )}
                  </Box>
                )}
                
                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      Overdue Bills
                    </Typography>
                    {overdueBills.length > 0 ? (
                      <Grid container spacing={2}>
                        {overdueBills.map(bill => (
                          <Grid item xs={12} key={bill.id}>
                            <Paper sx={{ p: 2, bgcolor: '#fff5f5' }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="subtitle1">{bill.name}</Typography>
                                  <Typography variant="body2" color="error">
                                    Overdue since: {new Date(bill.due_date).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="h6" color="error">
                                    ${bill.amount_usd || bill.amount}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  onClick={() => handleQuickPay(bill.id)}
                                >
                                  Pay Now
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography color="text.secondary" align="center" py={4}>
                        No overdue bills
                      </Typography>
                    )}
                  </Box>
                )}
                
                {activeTab === 3 && (
                  <BillList
                    onBillSelect={handleBillSelect}
                    showFilters={false}
                    initialView="list"
                  />
                )}
                
                {activeTab === 4 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                      Bill Analytics
                    </Typography>
                    <Typography color="text.secondary" align="center" py={4}>
                      Analytics coming soon
                    </Typography>
                  </Paper>
                )}
              </>
            ) : (
              <Paper sx={{ p: 3 }}>
                <BillList
                  onBillSelect={handleBillSelect}
                  showFilters={true}
                  initialView="grid"
                />
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Bill Form Dialog */}
      <BillForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBill(null);
          navigate('/bills', { replace: true });
        }}
        onSubmit={handleFormSubmit}
        initialData={editingBill}
      />

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 280, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Bill Management
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={2} mt={3}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                handleAddBill();
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Add New Bill
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => {
                setActiveTab(0);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              All Bills
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CalendarIcon />}
              onClick={() => {
                setActiveTab(1);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Due Soon
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<WarningIcon />}
              onClick={() => {
                setActiveTab(2);
                setDrawerOpen(false);
              }}
              fullWidth
              color="error"
            >
              Overdue Bills
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PaidIcon />}
              onClick={() => {
                setActiveTab(3);
                setDrawerOpen(false);
              }}
              fullWidth
              color="success"
            >
              Paid Bills
            </Button>
          </Box>
          
          {/* User Info */}
          {user && (
            <Box mt={4} pt={3} borderTop={1} borderColor="divider">
              <Typography variant="subtitle2" color="text.secondary">
                Welcome back,
              </Typography>
              <Typography variant="h6">
                {user.full_name || user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default Bills;
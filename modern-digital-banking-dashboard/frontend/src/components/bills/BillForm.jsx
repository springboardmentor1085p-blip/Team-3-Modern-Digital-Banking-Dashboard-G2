import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  FormHelperText,
  Chip,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Repeat as RepeatIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, addDays, isBefore, startOfToday, parseISO } from 'date-fns';
import { billService } from '../../services/billService';
import { useSnackbar } from '../../context/SnackbarContext';
import './BillForm.css';

const BillForm = ({ open, onClose, onSubmit, initialData }) => {
  const { showError } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currencyRates, setCurrencyRates] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'USD',
    due_date: addDays(startOfToday(), 7),
    category: 'utilities',
    frequency: 'monthly',
    reminder_days: 3,
    is_paid: false
  });

  // Available categories
  const categories = [
    { value: 'utilities', label: 'Utilities', icon: '⚡', color: '#2196f3' },
    { value: 'rent', label: 'Rent', icon: '🏠', color: '#9c27b0' },
    { value: 'mortgage', label: 'Mortgage', icon: '🏦', color: '#673ab7' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳', color: '#f44336' },
    { value: 'loan', label: 'Loan', icon: '💰', color: '#ff9800' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️', color: '#009688' },
    { value: 'subscription', label: 'Subscription', icon: '📱', color: '#795548' },
    { value: 'education', label: 'Education', icon: '🎓', color: '#3f51b5' },
    { value: 'medical', label: 'Medical', icon: '🏥', color: '#e91e63' },
    { value: 'tax', label: 'Tax', icon: '📊', color: '#607d8b' },
    { value: 'other', label: 'Other', icon: '📝', color: '#9e9e9e' }
  ];

  // Currency options
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' }
  ];

  // Frequency options
  const frequencies = [
    { value: 'monthly', label: 'Monthly', description: 'Recurring every month' },
    { value: 'quarterly', label: 'Quarterly', description: 'Recurring every 3 months' },
    { value: 'biannually', label: 'Bi-Annually', description: 'Recurring every 6 months' },
    { value: 'annually', label: 'Annually', description: 'Recurring every year' },
    { value: 'one_time', label: 'One Time', description: 'One time payment' }
  ];

  // Reminder options
  const reminderOptions = [
    { value: 0, label: 'No reminder' },
    { value: 1, label: '1 day before' },
    { value: 2, label: '2 days before' },
    { value: 3, label: '3 days before' },
    { value: 5, label: '5 days before' },
    { value: 7, label: '1 week before' },
    { value: 14, label: '2 weeks before' }
  ];

  // Calculate converted amount
  const calculateConvertedAmount = () => {
    if (!formData.amount || isNaN(formData.amount) || formData.currency === 'USD') {
      return null;
    }
    
    const rate = currencyRates[formData.currency] || 1;
    const converted = parseFloat(formData.amount) / rate;
    return converted.toFixed(2);
  };

  const convertedAmount = calculateConvertedAmount();

  useEffect(() => {
    // Load initial data if editing
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        amount: initialData.amount || '',
        currency: initialData.currency || 'USD',
        due_date: initialData.due_date ? parseISO(initialData.due_date) : addDays(startOfToday(), 7),
        category: initialData.category || 'utilities',
        frequency: initialData.frequency || 'monthly',
        reminder_days: initialData.reminder_days || 3,
        is_paid: initialData.is_paid || false
      });
    } else {
      // Reset form for new bill
      setFormData({
        name: '',
        description: '',
        amount: '',
        currency: 'USD',
        due_date: addDays(startOfToday(), 7),
        category: 'utilities',
        frequency: 'monthly',
        reminder_days: 3,
        is_paid: false
      });
    }
  }, [initialData, open]);

  useEffect(() => {
    // Fetch currency rates
    const fetchCurrencyRates = async () => {
      try {
        const rates = await billService.getCurrencyRates();
        setCurrencyRates(rates);
      } catch (error) {
        console.error('Failed to fetch currency rates:', error);
      }
    };
    
    if (open && formData.currency !== 'USD') {
      fetchCurrencyRates();
    }
  }, [open, formData.currency]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Bill name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Bill name must be less than 255 characters';
    }
    
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    } else if (isBefore(formData.due_date, startOfToday())) {
      newErrors.due_date = 'Due date cannot be in the past';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const submissionData = {
        ...formData,
        due_date: format(formData.due_date, 'yyyy-MM-dd'),
        amount: parseFloat(formData.amount)
      };
      
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      showError ('Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || categories[0];
  };

  const categoryInfo = getCategoryInfo(formData.category);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      className="bill-form-dialog"
      PaperProps={{
        sx: {
          backgroundColor: '#ffffff',
          color: '#111827',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(15, 23, 42, 0.55)', // soft dark overlay
          backdropFilter: 'blur(2px)',
        },
      }}  
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="div">
            {initialData ? 'Edit Bill' : 'Add New Bill'}
          </Typography>
          <IconButton onClick={onClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Form Alert */}
          <Alert severity="info" sx={{ mb: 3 }}>
            Fill in the bill details below. You'll earn reward points for on-time payments!
          </Alert>

          <Grid container spacing={3}>
            {/* Bill Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bill Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g., Electricity Bill, Rent Payment"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InfoIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={loading}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description || "Optional description for the bill"}
                multiline
                rows={3}
                placeholder="Add any notes or details about this bill..."
                disabled={loading}
              />
            </Grid>

            {/* Amount and Currency */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount *"
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                error={!!errors.amount}
                helperText={errors.amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" color="text.secondary">
                        {currencies.find(c => c.code === formData.currency)?.symbol}
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  step: "0.01",
                  min: "0"
                }}
                disabled={loading}
              />
              
              {convertedAmount && formData.currency !== 'USD' && (
                <FormHelperText sx={{ ml: 1, mt: 0.5 }}>
                  ≈ ${convertedAmount} USD
                </FormHelperText>
              )}
            </Grid>

            {/* Currency Selector */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.currency}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  label="Currency"
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  disabled={loading}
                  startAdornment={
                    <InputAdornment position="start">
                      <Typography variant="body2" color="text.secondary">
                        {currencies.find(c => c.code === formData.currency)?.symbol}
                      </Typography>
                    </InputAdornment>
                  }
                >
                  {currencies.map(currency => (
                    <MenuItem key={currency.code} value={currency.code}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ minWidth: '30px' }}>
                          {currency.symbol}
                        </Typography>
                        <Typography>
                          {currency.name} ({currency.code})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Amount will be converted to USD for reward calculations
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Due Date */}
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date *"
                  value={formData.due_date}
                  onChange={(date) => handleInputChange('due_date', date)}
                  minDate={startOfToday()}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!errors.due_date}
                      helperText={errors.due_date}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <CalendarIcon color="action" />
                            </InputAdornment>
                            {params.InputProps?.startAdornment}
                          </>
                        ),
                      }}
                      disabled={loading}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.category}>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={formData.category}
                  label="Category *"
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={loading}
                  startAdornment={
                    <InputAdornment position="start">
                      <CategoryIcon color="action" />
                    </InputAdornment>
                  }
                  renderValue={(selected) => (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={categoryInfo.icon}
                        size="small"
                        sx={{ bgcolor: `${categoryInfo.color}20`, color: categoryInfo.color }}
                      />
                      <Typography>{categoryInfo.label}</Typography>
                    </Box>
                  )}
                >
                  {categories.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        <Chip
                          label={category.icon}
                          size="small"
                          sx={{ bgcolor: `${category.color}20`, color: category.color }}
                        />
                        <Box flex={1}>
                          <Typography>{category.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {category.value}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Different categories earn different reward points
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Frequency */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Frequency"
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  disabled={loading}
                  startAdornment={
                    <InputAdornment position="start">
                      <RepeatIcon color="action" />
                    </InputAdornment>
                  }
                >
                  {frequencies.map(freq => (
                    <MenuItem key={freq.value} value={freq.value}>
                      <Box>
                        <Typography>{freq.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {freq.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Reminder Days */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Reminder</InputLabel>
                <Select
                  value={formData.reminder_days}
                  label="Reminder"
                  onChange={(e) => handleInputChange('reminder_days', e.target.value)}
                  disabled={loading}
                  startAdornment={
                    <InputAdornment position="start">
                      <NotificationsIcon color="action" />
                    </InputAdornment>
                  }
                >
                  {reminderOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Get notified before the due date
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Status (if editing) */}
            {initialData && (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.is_paid}
                    label="Status"
                    onChange={(e) => handleInputChange('is_paid', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value={false}>Unpaid</MenuItem>
                    <MenuItem value={true}>Paid</MenuItem>
                  </Select>
                  <FormHelperText>
                    Marking as paid will award reward points
                  </FormHelperText>
                </FormControl>
              </Grid>
            )}

            {/* Reward Points Preview */}
            <Grid item xs={12}>
              <Alert severity="info" icon={false} sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Reward Points Preview
                    </Typography>
                    <Typography variant="body2">
                      Estimated points for on-time payment: 
                      <Typography component="span" variant="body2" fontWeight="bold" color="primary" sx={{ ml: 1 }}>
                        {formData.amount ? Math.round(parseFloat(formData.amount) * 10 * 1.5) : '0'} points
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on {formData.amount || '0'} {formData.currency} × 10 points/$ × 1.5x on-time bonus
                    </Typography>
                  </Box>
                  {categoryInfo.value !== 'utilities' && (
                    <Chip
                      label={`${getCategoryInfo(formData.category).label} category bonus`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Saving...' : initialData ? 'Update Bill' : 'Create Bill'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

BillForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
};

export default BillForm;
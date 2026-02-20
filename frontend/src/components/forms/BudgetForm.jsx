import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AttachMoney,
  Category,
  Description,
  CalendarMonth,
  Save,
  Cancel
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import  budgetService  from '../../services/budgetService';

  // Common budget categories
  const DEFAULT_CATEGORIES = [
    { id: 1, label: 'Food & Dining', subcategories: ['Groceries', 'Restaurants', 'Coffee Shops', 'Fast Food'] },
    { id: 2, label: 'Transportation', subcategories: ['Fuel', 'Public Transit', 'Ride Sharing', 'Parking'] },
    { id: 3, label: 'Housing', subcategories: ['Rent', 'Mortgage', 'Utilities', 'Maintenance'] },
    { id: 4, label: 'Entertainment', subcategories: ['Movies', 'Streaming', 'Concerts', 'Games'] },
    { id: 5, label: 'Shopping', subcategories: ['Clothing', 'Electronics', 'Home Goods', 'Online'] },
    { id: 6, label: 'Healthcare', subcategories: ['Insurance', 'Medications', 'Doctor Visits', 'Wellness'] },
    { id: 7, label: 'Personal', subcategories: ['Personal Care', 'Education', 'Gifts', 'Subscriptions'] },
    { id: 8, label: 'Income', subcategories: ['Salary', 'Freelance', 'Investments', 'Other'] },
    { id: 9, label: 'Savings', subcategories: ['Emergency Fund', 'Retirement', 'Vacation', 'Investment'] },
  ];

const BudgetForm = ({ initialData = null, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const periods = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'weekly', label: 'Weekly' },
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear + i,
    label: (currentYear + i).toString()
  }));

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Budget name is required')
      .max(100, 'Name must be less than 100 characters'),
    /*category: Yup.string()
      .required('Category is required'),
    */
    category_id: Yup.number()
      .required('Category is required')
      .typeError('Category is required'),

    subcategory: Yup.string()
      .nullable(),
    amount: Yup.number()
      .required('Amount is required')
      .positive('Amount must be positive')
      .typeError('Amount must be a number'),
    period: Yup.string()
      .required('Period is required')
      .oneOf(['monthly', 'quarterly', 'yearly', 'weekly']),
    month: Yup.number().when('period', {
  is: (val) => val === 'monthly',
  then: (schema) =>
    schema
      .required('Month is required for monthly budgets')
      .min(1, 'Month must be between 1 and 12')
      .max(12, 'Month must be between 1 and 12'),
  otherwise: (schema) =>
    schema
      .nullable()
      .transform((value) => (isNaN(value) ? null : value)),
}),

    year: Yup.number()
      .required('Year is required')
      .min(2020, 'Year must be 2020 or later')
      .max(currentYear + 5, `Year must be ${currentYear + 5} or earlier`),
    is_active: Yup.boolean()
      .default(true)
  });

  const formik = useFormik({
    initialValues: {
      name: initialData?.name || '',
      category_id: initialData?.category_id || '',
      subcategory: initialData?.subcategory || '',
      amount: initialData?.amount || '',
      period: initialData?.period || 'monthly',
      month: initialData?.month || new Date().getMonth() + 1,
      year: initialData?.year || currentYear,
      is_active: initialData?.is_active ?? true,
    },
    validationSchema,
    onSubmit: async (values) => {
      console.log('FORM SUBMITTED', values);
      try {
        setLoading(true);
        setError(null);
        
        const budgetData = {
          name: values.name,
          category_id: Number(values.category_id),
          subcategory: values.subcategory,
          amount: parseFloat(values.amount),
          period: values.period,
          month: values.month,
          year: values.year,
          is_active: values.is_active,
        };

        
        let result;
        if (initialData) {
          result = await budgetService.updateBudget(initialData.id, budgetData);
        } else {
          result = await budgetService.createBudget(budgetData);
        }
        
        setSuccess(true);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        // Reset form after successful submission
        setTimeout(() => {
          if (!initialData) {
            formik.resetForm();
            setActiveStep(0);
          }
          setSuccess(false);
        }, 2000);
        
      } catch (err) {
        console.error('Error saving budget:', err);
        setError(err.response?.data?.detail || 'Failed to save budget');
      } finally {
        setLoading(false);
      }
    },
  });

  const {setFieldValue } = formik;
  useEffect(() => {
  if (!localStorage.getItem('access_token')) {
    setCategories(DEFAULT_CATEGORIES);
    return;
  }

  const loadCategories = async () => {
    try {
      const userCategories = await budgetService.getCategories();
      setCategories([...DEFAULT_CATEGORIES, ...userCategories]);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  loadCategories();
}, []);


  useEffect(() => {
    // Update subcategories when category changes
    if (formik.values.category_id) {
      const selectedCategory = categories.find(
        cat => cat.id === Number(formik.values.category_id)
    );
    setSubcategories(selectedCategory?.subcategories || []);
    
      if (
        formik.values.subcategory &&
        !selectedCategory?.subcategories?.includes(formik.values.subcategory)
      ) {
        setFieldValue('subcategory', '');
        }
    } else {
      setSubcategories([]);
      setFieldValue('subcategory', '');
    }
  }, [formik.values.category_id, formik.values.subcategory, categories, setFieldValue]);


  const handleStepNext = () => {
    // Validate current step before proceeding
    let isValid = true;
    
    switch (activeStep) {
      case 0:
        isValid = formik.values.name && formik.values.category_id;
        if (!isValid) {
          formik.setTouched({
            name: true,
            category_id: true
          });
        }
        break;
      case 1:
        isValid = formik.values.amount && formik.values.period;
        if (!isValid) {
          formik.setTouched({
            amount: true,
            period: true
          });
        }
        break;
      case 2:
        isValid = formik.values.year && (formik.values.period !== 'monthly' || formik.values.month);
        if (!isValid) {
          formik.setTouched({
            year: true,
            ...(formik.values.period === 'monthly' && { month: true })
          });
        }
        break;
      default:
        return null;
    }
    
    if (isValid) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleStepBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const steps = [
    {
      label: 'Basic Information',
      description: 'Set the name and category for your budget',
    },
    {
      label: 'Amount & Period',
      description: 'Define how much and how often',
    },
    {
      label: 'Timing',
      description: 'Set the time period for your budget',
    },
    {
      label: 'Review',
      description: 'Review and save your budget',
    },
  ];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="name"
                label="Budget Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  ),
                }}
                placeholder="e.g., Grocery Shopping, Entertainment Fund"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                name="category_id"
                label="Category"
                value={formik.values.category_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.category_id && Boolean(formik.errors.category_id)}
                helperText={formik.touched.category_id && formik.errors.category_id}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Category />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <em>Select a category</em>
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                name="subcategory"
                label="Subcategory (Optional)"
                value={formik.values.subcategory}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.subcategory && Boolean(formik.errors.subcategory)}
                helperText={formik.touched.subcategory && formik.errors.subcategory}
                disabled={!formik.values.category_id || subcategories.length === 0}
              >
                <MenuItem value="">
                  <em>Select a subcategory</em>
                </MenuItem>
                {subcategories.map((subcat) => (
                  <MenuItem key={subcat} value={subcat}>
                    {subcat}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="amount"
                label="Budget Amount"
                type="number"
                value={formik.values.amount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.amount && Boolean(formik.errors.amount)}
                helperText={formik.touched.amount && formik.errors.amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0, step: 0.01 }
                }}
                placeholder="0.00"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                name="period"
                label="Budget Period"
                value={formik.values.period}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.period && Boolean(formik.errors.period)}
                helperText={formik.touched.period && formik.errors.period}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth />
                    </InputAdornment>
                  ),
                }}
              >
                {periods.map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_active"
                    checked={formik.values.is_active}
                    onChange={formik.handleChange}
                    color="primary"
                  />
                }
                label="Active Budget"
              />
              <Typography variant="caption" color="textSecondary" sx={{ ml: 2, display: 'block' }}>
                Active budgets are included in calculations and alerts
              </Typography>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                name="year"
                label="Year"
                value={formik.values.year}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.year && Boolean(formik.errors.year)}
                helperText={formik.touched.year && formik.errors.year}
              >
                {years.map((year) => (
                  <MenuItem key={year.value} value={year.value}>
                    {year.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {formik.values.period === 'monthly' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  name="month"
                  label="Month"
                  value={formik.values.month}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.month && Boolean(formik.errors.month)}
                  helperText={formik.touched.month && formik.errors.month}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonth />
                      </InputAdornment>
                    ),
                  }}
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            {formik.values.period !== 'monthly' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {formik.values.period === 'yearly' && 'Yearly budgets apply to the entire year.'}
                  {formik.values.period === 'quarterly' && 'Quarterly budgets apply to 3-month periods.'}
                  {formik.values.period === 'weekly' && 'Weekly budgets reset every week.'}
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 3:
        return (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Budget Summary
                </Typography>
              </Grid>
              {[
                { label: 'Name', value: formik.values.name },
                { label: 'Category', value: categories.find(c => c.id === Number(formik.values.category_id))?.label || '' },
                { label: 'Subcategory', value: formik.values.subcategory || 'None' },
                { label: 'Amount', value: `$${parseFloat(formik.values.amount).toFixed(2)}` },
                { label: 'Period', value: formik.values.period.charAt(0).toUpperCase() + formik.values.period.slice(1) },
                { label: 'Year', value: formik.values.year },
                ...(formik.values.period === 'monthly' ? [{ label: 'Month', value: months.find(m => m.value === formik.values.month)?.label }] : []),
                { label: 'Status', value: formik.values.is_active ? 'Active' : 'Inactive' },
              ].map((item, index) => (
                <Grid item xs={6} key={index}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {item.value}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            {initialData ? 'Edit Budget' : 'Create New Budget'}
          </Typography>
          <Tooltip title="Cancel">
            <IconButton onClick={onCancel}>
              <Cancel />
            </IconButton>
          </Tooltip>
        </Box>

       <form onSubmit={formik.handleSubmit}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === 3 ? (
                    <Typography variant="caption">Final step</Typography>
                  ) : null
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      //onClick={index === steps.length - 1 ? formik.handleSubmit : handleStepNext}
                      type={index === steps.length - 1 ? 'submit' : 'button'} onClick={index === steps.length - 1 ? undefined : handleStepNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={loading}
                      startIcon={index === steps.length - 1 ? <Save /> : null}
                    >
                      {index === steps.length - 1 ? (loading ? <CircularProgress size={24} /> : 'Save Budget') : 'Continue'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleStepBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </form>

        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - you&apos;re finished</Typography>
            <Button onClick={() => setActiveStep(0)} sx={{ mt: 1, mr: 1 }}>
              Reset
            </Button>
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Budget {initialData ? 'updated' : 'created'} successfully!
          </Alert>
        )}

        {/* Quick Actions */}
        <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Quick Tips
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem', color: '#666' }}>
            <li>Be realistic about your spending habits</li>
            <li>Consider historical spending when setting amounts</li>
            <li>Review and adjust budgets regularly</li>
            <li>Use subcategories for more detailed tracking</li>
          </ul>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BudgetForm;
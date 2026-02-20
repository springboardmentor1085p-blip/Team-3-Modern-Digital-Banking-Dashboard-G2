import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Slider,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Stack
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Refresh,
  AutoFixHigh,
  Category,
  Description,
  ExpandMore,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Info,
  LocalOffer,
  Restaurant,
  DirectionsCar,
  Home,
  ShoppingBag,
  LocalHospital,
  School,
  Work,
  Savings,
  Flight,
  SportsEsports,
  Receipt
} from '@mui/icons-material';
import budgetService from '../../services/budgetService';
import toast from 'react-hot-toast';

const CategorizationForm = ({ onCategorizeComplete }) => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedRule, setSelectedRule] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testDescription, setTestDescription] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [autoCategorizeLoading, setAutoCategorizeLoading] = useState(false);
  const [categorizeStats, setCategorizeStats] = useState(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    pattern_type: 'contains',
    pattern: '',
    category: '',
    subcategory: '',
    priority: 1,
    is_active: true
  });

  // Predefined categories with icons and subcategories
  const defaultCategories = useMemo(() => ([
    {
      name: 'Food & Dining',
      icon: <Restaurant />,
      color: '#10B981',
      subcategories: ['Groceries', 'Restaurants', 'Coffee Shops', 'Fast Food', 'Alcohol', 'Delivery']
    },
    {
      name: 'Transportation',
      icon: <DirectionsCar />,
      color: '#3B82F6',
      subcategories: ['Fuel', 'Public Transit', 'Ride Sharing', 'Parking', 'Maintenance', 'Tolls']
    },
    {
      name: 'Housing',
      icon: <Home />,
      color: '#8B5CF6',
      subcategories: ['Rent', 'Mortgage', 'Utilities', 'Maintenance', 'Insurance', 'Property Tax']
    },
    {
      name: 'Shopping',
      icon: <ShoppingBag />,
      color: '#EF4444',
      subcategories: ['Clothing', 'Electronics', 'Home Goods', 'Online', 'Department Stores', 'Books']
    },
    {
      name: 'Entertainment',
      icon: <SportsEsports />,
      color: '#EC4899',
      subcategories: ['Movies', 'Streaming', 'Concerts', 'Games', 'Hobbies', 'Sports']
    },
    {
      name: 'Healthcare',
      icon: <LocalHospital />,
      color: '#06B6D4',
      subcategories: ['Insurance', 'Medications', 'Doctor Visits', 'Dental', 'Vision', 'Wellness']
    },
    {
      name: 'Personal',
      icon: <School />,
      color: '#F59E0B',
      subcategories: ['Personal Care', 'Education', 'Gifts', 'Subscriptions', 'Child Care', 'Pet Care']
    },
    {
      name: 'Income',
      icon: <Work />,
      color: '#10B981',
      subcategories: ['Salary', 'Freelance', 'Investments', 'Bonus', 'Rental Income', 'Other Income']
    },
    {
      name: 'Savings',
      icon: <Savings />,
      color: '#6366F1',
      subcategories: ['Emergency Fund', 'Retirement', 'Vacation', 'Investment', 'Goals', 'Debt Payment']
    },
    {
      name: 'Travel',
      icon: <Flight />,
      color: '#8B5CF6',
      subcategories: ['Flights', 'Hotels', 'Rental Cars', 'Vacation', 'Travel Insurance', 'Activities']
    },
    {
      name: 'Bills & Utilities',
      icon: <Receipt />,
      color: '#6B7280',
      subcategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Cable TV']
    },
    {
      name: 'Education',
      icon: <School />,
      color: '#3B82F6',
      subcategories: ['Tuition', 'Books', 'Supplies', 'Courses', 'Student Loans', 'Workshops']
    },
    {
      name: 'Gifts & Donations',
      icon: <LocalOffer />,
      color: '#EC4899',
      subcategories: ['Birthday', 'Holiday', 'Charity', 'Tips', 'Wedding', 'Celebrations']
    },
    {
      name: 'Business',
      icon: <Work />,
      color: '#F59E0B',
      subcategories: ['Office Supplies', 'Client Meals', 'Travel', 'Equipment', 'Software', 'Marketing']
    },
    {
      name: 'Uncategorized',
      icon: <Category />,
      color: '#9CA3AF',
      subcategories: []
    }
  ]), []);

  const patternTypes = [
    { value: 'contains', label: 'Contains', description: 'Text contains pattern' },
    { value: 'exact', label: 'Exact Match', description: 'Text exactly matches pattern' },
    { value: 'starts_with', label: 'Starts With', description: 'Text starts with pattern' },
    { value: 'ends_with', label: 'Ends With', description: 'Text ends with pattern' },
    { value: 'regex', label: 'Regular Expression', description: 'Advanced pattern matching' },
  ];

  const priorities = [
    { value: 1, label: 'Low', color: 'success' },
    { value: 3, label: 'Medium', color: 'info' },
    { value: 5, label: 'High', color: 'warning' },
    { value: 8, label: 'Very High', color: 'error' },
    { value: 10, label: 'Critical', color: 'error' },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesData, categoriesData] = await Promise.all([
        budgetService.getCategoryRules(),
        budgetService.getCategories()
      ]);
      setRules(rulesData);
      
      // Combine default categories with user-defined categories
      const allCategories = [...defaultCategories];
      if (categoriesData && categoriesData.length > 0) {
        categoriesData.forEach(cat => {
          if (!allCategories.find(c => c.name === cat.name)) {
            allCategories.push({
              name: cat.name,
              icon: <Category />,
              color: cat.color || '#6B7280',
              subcategories: []
            });
          }
        });
      }
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [defaultCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    // Update subcategories when category changes
    if (formData.category) {
      const selectedCat = categories.find(cat => cat.name === formData.category);
      if (selectedCat && selectedCat.subcategories.length > 0) {
        // Keep the current subcategory if it's valid for the new category
        if (formData.subcategory && !selectedCat.subcategories.includes(formData.subcategory)) {
          setFormData(prev => ({ ...prev, subcategory: '' }));
        }
      } else {
        setFormData(prev => ({ ...prev, subcategory: '' }));
      }
    }
  }, [formData.category, formData.subcategory, categories]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };


  const handleSubcategoryChange = (event) => {
    setFormData(prev => ({
      ...prev,
      subcategory: event.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (selectedRule) {
        await budgetService.updateCategoryRule(selectedRule.id, formData);
        toast.success('Rule updated successfully');
      } else {
        await budgetService.createCategoryRule(formData);
        toast.success('Rule created successfully');
      }
      
      await loadData();
      resetForm();
      setEditDialogOpen(false);
      
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (rule) => {
    setSelectedRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      pattern_type: rule.pattern_type,
      pattern: rule.pattern,
      category: rule.category,
      subcategory: rule.subcategory || '',
      priority: rule.priority,
      is_active: rule.is_active
    });
    setEditDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await budgetService.deleteCategoryRule(ruleId);
        toast.success('Rule deleted successfully');
        await loadData();
      } catch (error) {
        console.error('Error deleting rule:', error);
        toast.error('Failed to delete rule');
      }
    }
  };

  const handleTestPattern = async () => {
    if (!testDescription.trim()) {
      toast.error('Please enter a description to test');
      return;
    }

    try {
      const results = await budgetService.getCategorySuggestions(testDescription);
      setTestResults(results);
      toast.success(`Found ${results.suggestions?.length || 0} matching rules`);
    } catch (error) {
      console.error('Error testing pattern:', error);
      toast.error('Failed to test pattern');
    }
  };

  const handleAutoCategorize = async () => {
    try {
      setAutoCategorizeLoading(true);
      const result = await budgetService.autoCategorizeTransactions();
      setCategorizeStats(result);
      
      if (onCategorizeComplete) {
        onCategorizeComplete(result);
      }
      
      toast.success(`Successfully categorized ${result.categorized_count} transactions!`);
      
    } catch (error) {
      console.error('Error auto-categorizing:', error);
      toast.error('Failed to auto-categorize transactions');
    } finally {
      setAutoCategorizeLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      pattern_type: 'contains',
      pattern: '',
      category: '',
      subcategory: '',
      priority: 1,
      is_active: true
    });
    setSelectedRule(null);
    setTestDescription('');
    setTestResults(null);
  };

  const getPatternTypeIcon = (type) => {
    switch (type) {
      case 'contains': return <Search fontSize="small" />;
      case 'exact': return <CheckCircle fontSize="small" />;
      case 'regex': return <AutoFixHigh fontSize="small" />;
      case 'starts_with': return <Description fontSize="small" />;
      case 'ends_with': return <Description fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return 'error';
    if (priority >= 5) return 'warning';
    if (priority >= 3) return 'info';
    return 'success';
  };

  const getCategoryIcon = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.icon || <Category />;
  };

  const getCategoryColor = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.color || '#6B7280';
  };

  const renderRulesTable = () => (
    <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Rule Name</TableCell>
            <TableCell>Pattern</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id} hover>
              <TableCell>
                <Box display="flex" alignItems="center">
                  {rule.is_active ? (
                    <Visibility fontSize="small" color="success" sx={{ mr: 1 }} />
                  ) : (
                    <VisibilityOff fontSize="small" color="disabled" sx={{ mr: 1 }} />
                  )}
                  <Typography variant="body2">{rule.rule_name}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={rule.pattern}
                  size="small"
                  variant="outlined"
                  sx={{ maxWidth: 200 }}
                />
              </TableCell>
              <TableCell>
                <Tooltip title={rule.pattern_type}>
                  <Chip
                    icon={getPatternTypeIcon(rule.pattern_type)}
                    label={rule.pattern_type}
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      bgcolor: getCategoryColor(rule.category),
                      fontSize: '0.75rem'
                    }}
                  >
                    {getCategoryIcon(rule.category)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">{rule.category}</Typography>
                    {rule.subcategory && (
                      <Typography variant="caption" color="textSecondary">
                        {rule.subcategory}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={`Priority ${rule.priority}`}
                  color={getPriorityColor(rule.priority)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={rule.is_active ? 'Active' : 'Inactive'}
                  color={rule.is_active ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => handleEditRule(rule)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => handleDeleteRule(rule.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {rules.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Category sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No categorization rules
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Create your first rule to automatically categorize transactions
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setEditDialogOpen(true)}
                  >
                    Create First Rule
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTestArea = () => (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Test Pattern Matching
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Transaction Description"
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              placeholder="e.g., 'AMAZON PURCHASE', 'STARBUCKS COFFEE', 'UBER RIDE'"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Description />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleTestPattern}
              startIcon={<Search />}
              disabled={!testDescription.trim()}
            >
              Test Pattern
            </Button>
          </Grid>
        </Grid>

        {testResults && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Test Results
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Found {testResults.suggestions?.length || 0} matching rules for "{testDescription}"
            </Alert>
            
            {testResults.suggestions?.map((suggestion, index) => (
              <Accordion key={index} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" width="100%" gap={2}>
                    <Avatar sx={{ bgcolor: getCategoryColor(suggestion.category) }}>
                      {getCategoryIcon(suggestion.category)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography>
                        {suggestion.category}
                        {suggestion.subcategory && ` › ${suggestion.subcategory}`}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Confidence: {(suggestion.confidence * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Chip
                      label={`Priority: ${suggestion.priority}`}
                      color={getPriorityColor(suggestion.priority)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Matched Rule:</strong> {suggestion.matched_rule}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Pattern:</strong> <code>{suggestion.pattern}</code>
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Pattern Type:</strong> {suggestion.pattern_type}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderAutoCategorizeSection = () => (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Auto-Categorize Transactions
        </Typography>
        
        {categorizeStats && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully categorized {categorizeStats.categorized_count} transactions.
            {categorizeStats.uncategorized_count > 0 && 
              ` ${categorizeStats.uncategorized_count} remain uncategorized.`}
          </Alert>
        )}

        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            onClick={handleAutoCategorize}
            disabled={autoCategorizeLoading}
            startIcon={autoCategorizeLoading ? <CircularProgress size={20} /> : <AutoFixHigh />}
          >
            Auto-Categorize All
          </Button>
          
          <Button
            variant="outlined"
            onClick={loadData}
            startIcon={<Refresh />}
          >
            Refresh Rules
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setEditDialogOpen(true)}
            startIcon={<Add />}
          >
            New Rule
          </Button>
        </Box>

        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>
            How it works:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
            <li>Rules are applied in priority order (highest first)</li>
            <li>First matching rule determines the category</li>
            <li>Only uncategorized transactions are processed</li>
            <li>You can manually override categories anytime</li>
          </ul>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h5">
                Transaction Categorization Rules
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Create rules to automatically categorize transactions
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetForm();
                  setEditDialogOpen(true);
                }}
              >
                Add Rule
              </Button>
            </Box>
          </Box>

          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Rules List" />
            <Tab label="Test Patterns" />
            <Tab label="Auto-Categorize" />
          </Tabs>

          <Box mt={2}>
            {tabValue === 0 && renderRulesTable()}
            {tabValue === 1 && renderTestArea()}
            {tabValue === 2 && renderAutoCategorizeSection()}
          </Box>
        </CardContent>
      </Card>

      {/* Edit/Create Rule Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRule ? 'Edit Rule' : 'Create New Rule'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="rule_name"
                  label="Rule Name"
                  value={formData.rule_name}
                  onChange={handleInputChange}
                  required
                  helperText="Descriptive name for this rule"
                  placeholder="e.g., Amazon Shopping Rule"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  name="pattern_type"
                  label="Pattern Type"
                  value={formData.pattern_type}
                  onChange={handleInputChange}
                  required
                >
                  {patternTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography>{type.label}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="pattern"
                  label="Pattern"
                  value={formData.pattern}
                  onChange={handleInputChange}
                  required
                  helperText={
                    formData.pattern_type === 'regex' 
                      ? 'Enter a regular expression (e.g., ^amazon.*$)'
                      : 'Text to match in transaction descriptions'
                  }
                  placeholder={
                    formData.pattern_type === 'contains' ? 'amazon' :
                    formData.pattern_type === 'exact' ? 'NETFLIX' :
                    formData.pattern_type === 'starts_with' ? 'UBER' :
                    formData.pattern_type === 'ends_with' ? 'INC' :
                    '^starbucks.*coffee$'
                  }
                />
              </Grid>
              
              {/* Category Field with Dropdown */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    label="Category"
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    }}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.name} value={category.name}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar 
                            sx={{ 
                              width: 24, 
                              height: 24, 
                              bgcolor: category.color,
                              fontSize: '0.75rem'
                            }}
                          >
                            {category.icon}
                          </Avatar>
                          <Typography>{category.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="textSecondary">
                  Select a category for matching transactions
                </Typography>
              </Grid>
              
              {/* Subcategory Field */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Subcategory (Optional)</InputLabel>
                  <Select
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleSubcategoryChange}
                    label="Subcategory (Optional)"
                    disabled={!formData.category}
                  >
                    <MenuItem value="">
                      <em>No subcategory</em>
                    </MenuItem>
                    {formData.category && categories.find(c => c.name === formData.category)?.subcategories?.map((subcat) => (
                      <MenuItem key={subcat} value={subcat}>
                        {subcat}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="textSecondary">
                    Optional: Further categorize transactions
                  </Typography>
                </FormControl>
              </Grid>
              
              {/* Priority Slider */}
              <Grid item xs={12}>
                <Typography gutterBottom>Priority</Typography>
                <Box px={2}>
                  <Slider
                    name="priority"
                    value={formData.priority}
                    onChange={(e, value) => handleInputChange({
                      target: { name: 'priority', value }
                    })}
                    min={1}
                    max={10}
                    step={1}
                    marks={priorities.map(p => ({ value: p.value, label: p.label }))}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Higher priority rules are applied first
                </Typography>
              </Grid>
              
              {/* Active Switch */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                  }
                  label="Active Rule"
                />
                <Typography variant="caption" color="textSecondary">
                  Active rules are used for auto-categorization
                </Typography>
              </Grid>

              {/* Example Preview */}
              {formData.rule_name && formData.pattern && formData.category && (
                <Grid item xs={12}>
                  <Divider />
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Rule Preview
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack spacing={1}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2"><strong>Rule:</strong> {formData.rule_name}</Typography>
                          <Chip
                            label={formData.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={formData.is_active ? 'success' : 'default'}
                          />
                        </Box>
                        <Typography variant="body2">
                          <strong>Pattern:</strong> "{formData.pattern}" ({formData.pattern_type})
                        </Typography>
                        <Typography variant="body2">
                          <strong>Category:</strong> {formData.category}
                          {formData.subcategory && ` → ${formData.subcategory}`}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Priority:</strong> {formData.priority} ({priorities.find(p => p.value === formData.priority)?.label})
                        </Typography>
                      </Stack>
                    </Paper>
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || !formData.rule_name || !formData.pattern || !formData.category}
            >
              {loading ? <CircularProgress size={24} /> : (selectedRule ? 'Update Rule' : 'Create Rule')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CategorizationForm;
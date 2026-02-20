import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Button
} from '@mui/material';
import {
  CurrencyExchange as CurrencyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  CompareArrows as CompareIcon,
  Flag as FlagIcon
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { rewardService } from '../../services/rewardService';
import { billService } from '../../services/billService';
import { useSnackbar } from '../../context/SnackbarContext';
import { exportToCSV } from '../../utils/exportUtils';
import './CurrencySummary.css';

const CurrencySummary = ({ userId, compact = false }) => {
  const [currencyData, setCurrencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [conversionRate, setConversionRate] = useState(1);
  const [historicalRates, setHistoricalRates] = useState([]);
  const { showSnackbar } = useSnackbar();

  // Available currencies
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' }
  ];


  const fetchCurrencyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await rewardService.getCurrencyAnalytics(userId);
      setCurrencyData(data);
    } catch (err) {
      setError('Failed to load currency data');
      showSnackbar('Failed to load currency analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showSnackbar]);

  const fetchConversionRate = useCallback(async () => {
    try {
      if (baseCurrency === targetCurrency) {
        setConversionRate(1);
        return;
      }
      
      const rate = await billService.getConversionRate(baseCurrency, targetCurrency);
      setConversionRate(rate);
    } catch (err) {
      console.error('Failed to fetch conversion rate:', err);
      // Use fallback rates
      const fallbackRates = {
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 150.25,
        'CAD': 1.35,
        'AUD': 1.52,
        'INR': 83.10,
        'SGD': 1.34
      };
      setConversionRate(fallbackRates[targetCurrency] || 1);
    }
  }, [baseCurrency, targetCurrency]);

  const fetchHistoricalRates = useCallback(async () => {
    try {
      const rates = await billService.getHistoricalRates(baseCurrency, targetCurrency, 7);
      setHistoricalRates(rates);
    } catch (err) {
      console.error('Failed to fetch historical rates:', err);
      // Generate mock data for demo
      const mockRates = Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
        rate: conversionRate * (0.95 + Math.random() * 0.1)
      }));
      setHistoricalRates(mockRates);
    }
  }, [baseCurrency, targetCurrency, conversionRate]);

    useEffect(() => {
    fetchCurrencyData();
    fetchConversionRate();
    fetchHistoricalRates();
  }, [
    fetchCurrencyData,
    fetchConversionRate,
    fetchHistoricalRates
  ]);

  const handleRefresh = () => {
    fetchCurrencyData();
    fetchConversionRate();
    fetchHistoricalRates();
    showSnackbar('Refreshing currency data...', 'info');
  };

  const handleExport = () => {
    if (!currencyData) return;
    
    const exportData = [
      {
        'Base Currency': baseCurrency,
        'Target Currency': targetCurrency,
        'Conversion Rate': conversionRate.toFixed(4),
        'Total Amount (Base)': currencyData.total_usd?.toFixed(2) || '0.00',
        'Converted Amount': (currencyData.total_usd * conversionRate).toFixed(2),
        'Export Date': format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      }
    ];
    
    exportToCSV(exportData, `currency_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    showSnackbar('Currency summary exported successfully', 'success');
  };

  const handleCurrencySwap = () => {
    setBaseCurrency(targetCurrency);
    setTargetCurrency(baseCurrency);
  };

  // Format currency
  const formatCurrency = (amount, currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    });
    
    return {
      formatted: formatter.format(amount),
      symbol: currency?.symbol || currencyCode,
      name: currency?.name || currencyCode
    };
  };

  // Calculate percentage change
  const calculateChange = () => {
    if (historicalRates.length < 2) return 0;
    
    const current = historicalRates[0]?.rate || conversionRate;
    const previous = historicalRates[1]?.rate || conversionRate;
    
    return ((current - previous) / previous) * 100;
  };

  const changePercentage = calculateChange();
  const isIncreasing = changePercentage > 0;

  if (loading && !currencyData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !currencyData) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Button onClick={fetchCurrencyData} sx={{ ml: 2 }}>Retry</Button>
      </Alert>
    );
  }

  if (compact) {
    const baseInfo = formatCurrency(currencyData?.total_usd || 0, baseCurrency);
    const targetInfo = formatCurrency(
      (currencyData?.total_usd || 0) * conversionRate,
      targetCurrency
    );

    return (
      <Card className="currency-summary compact">
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Currency Summary
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {baseInfo.formatted}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#2196f3', width: 40, height: 40 }}>
              <CurrencyIcon />
            </Avatar>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Typography variant="body2" color="text.secondary">
              {baseCurrency} → {targetCurrency}:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {conversionRate.toFixed(4)}
            </Typography>
            {isIncreasing ? (
              <TrendingUpIcon fontSize="small" color="success" />
            ) : (
              <TrendingDownIcon fontSize="small" color="error" />
            )}
          </Box>
          
          <Typography variant="body2">
            ≈ {targetInfo.formatted}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const baseInfo = formatCurrency(currencyData?.total_usd || 0, baseCurrency);
  const targetInfo = formatCurrency(
    (currencyData?.total_usd || 0) * conversionRate,
    targetCurrency
  );

  return (
    <Box className="currency-summary-container">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Currency Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track and convert your bill amounts across currencies
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton onClick={handleExport} disabled={!currencyData}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Currency Converter */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Currency Converter
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <FormControl fullWidth>
                <InputLabel>From Currency</InputLabel>
                <Select
                  value={baseCurrency}
                  label="From Currency"
                  onChange={(e) => setBaseCurrency(e.target.value)}
                >
                  {currencies.map(currency => (
                    <MenuItem key={currency.code} value={currency.code}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h6">{currency.flag}</Typography>
                        <Box>
                          <Typography>{currency.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {currency.code} • {currency.symbol}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
              <Tooltip title="Swap currencies">
                <IconButton 
                  onClick={handleCurrencySwap}
                  sx={{ 
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  <CompareIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <FormControl fullWidth>
                <InputLabel>To Currency</InputLabel>
                <Select
                  value={targetCurrency}
                  label="To Currency"
                  onChange={(e) => setTargetCurrency(e.target.value)}
                >
                  {currencies.map(currency => (
                    <MenuItem key={currency.code} value={currency.code}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h6">{currency.flag}</Typography>
                        <Box>
                          <Typography>{currency.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {currency.code} • {currency.symbol}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {/* Conversion Display */}
          <Box mt={4} p={3} sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Amount ({baseCurrency})
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="primary">
                    {baseInfo.formatted}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {baseInfo.name}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Converted Amount ({targetCurrency})
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="success.main">
                    {targetInfo.formatted}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {targetInfo.name}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box mt={3} textAlign="center">
              <Chip
                icon={<CurrencyIcon />}
                label={`1 ${baseCurrency} = ${conversionRate.toFixed(4)} ${targetCurrency}`}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '1rem', px: 2, py: 1 }}
              />
              <Box mt={1} display="flex" alignItems="center" justifyContent="center" gap={1}>
                {isIncreasing ? (
                  <TrendingUpIcon color="success" />
                ) : (
                  <TrendingDownIcon color="error" />
                )}
                <Typography variant="body2" color={isIncreasing ? 'success.main' : 'error.main'}>
                  {changePercentage.toFixed(2)}% {isIncreasing ? 'increase' : 'decrease'} from yesterday
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Currency Distribution */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bill Amounts by Currency
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Currency</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                      <TableCell align="right">Bill Count</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                      <TableCell align="right">Converted to {baseCurrency}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currencyData?.by_currency && Object.entries(currencyData.by_currency).map(([currency, amount]) => {
                      const currencyInfo = currencies.find(c => c.code === currency);
                      const percentage = currencyData.percentages?.[currency] || 0;
                      const convertedAmount = currencyData.in_usd?.[currency] || amount;
                      
                      return (
                        <TableRow key={currency} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: '#2196f3' }}>
                                <Typography variant="body2">{currencyInfo?.flag || currency}</Typography>
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {currencyInfo?.name || currency}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {currency}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(amount, currency).formatted}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {currencyData.counts?.[currency] || 0}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                              <LinearProgress
                                variant="determinate"
                                value={percentage}
                                sx={{
                                  width: 60,
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: '#2196f3',
                                    borderRadius: 4,
                                  }
                                }}
                              />
                              <Typography variant="body2">
                                {percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main">
                              {formatCurrency(convertedAmount, baseCurrency).formatted}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {(!currencyData?.by_currency || Object.keys(currencyData.by_currency).length === 0) && (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">
                    No currency data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {/* Exchange Rate History */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Exchange Rate History
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {historicalRates.length > 0 ? (
                <Box>
                  {historicalRates.slice(0, 5).map((rate, index) => (
                    <Box key={rate.date} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">
                          {format(new Date(rate.date), 'MMM dd')}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          1 {baseCurrency} = {rate.rate.toFixed(4)} {targetCurrency}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (rate.rate / conversionRate) * 100)}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: index === 0 ? '#4caf50' : '#2196f3',
                            borderRadius: 2,
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary" align="center" py={2}>
                  No historical data available
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {/* Primary Currency Info */}
          {currencyData?.primary_currency && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Primary Currency
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box textAlign="center">
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: '#2196f3',
                      fontSize: '2rem',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    <FlagIcon fontSize="large" />
                  </Avatar>
                  
                  <Typography variant="h5" gutterBottom>
                    {currencyData.primary_currency}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Most used currency in your bills
                  </Typography>
                  
                  <Box mt={2}>
                    <Chip
                      label={`${currencyData.percentages?.[currencyData.primary_currency]?.toFixed(1) || 0}% of total amount`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Tips */}
      <Alert 
        severity="info" 
        icon={<InfoIcon />}
        sx={{ mt: 4 }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Currency Conversion Tips
        </Typography>
        <Typography variant="body2">
          • All reward calculations are based on USD equivalent amounts
          <br />
          • Exchange rates are updated daily from reliable sources
          <br />
          • Consider currency fluctuations when planning international payments
          <br />
          • Higher tier rewards include better currency conversion rates
        </Typography>
      </Alert>
    </Box>
  );
};

CurrencySummary.propTypes = {
  userId: PropTypes.number,
  compact: PropTypes.bool,
};

export default CurrencySummary;
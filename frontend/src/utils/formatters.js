import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

export const formatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDateTime = (dateString, formatStr = 'MMM dd, yyyy HH:mm') => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatAccountNumber = (accountNumber) => {
  if (!accountNumber) return '';
  
  // Show last 4 digits only for security
  return `•••• ${accountNumber.slice(-4)}`;
};

export const formatPercentage = (value, decimals = 2) => {
  return `${value.toFixed(decimals)}%`;
};

export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};
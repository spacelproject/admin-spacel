// Currency formatting utility for Australian Dollars
// Rounds to 2 decimal places first to avoid floating point precision issues
export const formatCurrency = (amount) => {
  // Round to 2 decimal places to fix floating point precision issues
  const rounded = Math.round((amount || 0) * 100) / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rounded);
};

// Format currency with custom decimal places
// Rounds to specified decimal places first to avoid floating point precision issues
export const formatCurrencyWithDecimals = (amount, decimals = 2) => {
  // Round to specified decimal places to fix floating point precision issues
  const multiplier = Math.pow(10, decimals);
  const rounded = Math.round((amount || 0) * multiplier) / multiplier;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(rounded);
};

// Format currency for display (shows A$ prefix)
// Rounds to 2 decimal places first to avoid floating point precision issues
export const formatCurrencyDisplay = (amount) => {
  // Round to 2 decimal places to fix floating point precision issues
  const rounded = Math.round((amount || 0) * 100) / 100;
  return `A$${rounded.toLocaleString('en-AU', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Parse currency string to number
export const parseCurrency = (currencyString) => {
  return parseFloat(currencyString.replace(/[A$,]/g, ''));
};

// Validate currency amount
export const isValidCurrency = (amount) => {
  return !isNaN(amount) && amount >= 0;
};

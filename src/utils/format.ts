/**
 * Format a number as Philippine Peso currency
 * @param value - The number to format (defaults to 0 if undefined)
 * @returns Formatted currency string (e.g., "₱1,234.56")
 */
export const formatCurrency = (value?: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value ?? 0)
}

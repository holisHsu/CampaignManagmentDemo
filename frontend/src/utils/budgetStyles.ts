/**
 * Utility functions for Budget Fulfillment Rate styling
 */

export interface BudgetRateStyle {
  color: string
  fontWeight: string
}

/**
 * Get styling for budget fulfillment rate based on percentage
 * @param rate - Budget fulfillment rate as a number (e.g., 85, 110, 125)
 * @returns Style object with color and fontWeight
 */
export const getBudgetRateStyle = (rate: number): BudgetRateStyle => {
  if (rate <= 90) {
    return {
      color: '#2196F3', // Blue
      fontWeight: 'bold'
    }
  } else if (rate >= 105 && rate < 120) {
    return {
      color: '#FF9800', // Yellow/Orange
      fontWeight: 'bold'
    }
  } else if (rate >= 120) {
    return {
      color: '#F44336', // Red
      fontWeight: 'bold'
    }
  } else {
    // Default styling for rates between 90-105 (normal range)
    return {
      color: '#fff', // Default white text
      fontWeight: 'normal'
    }
  }
}

/**
 * Format budget rate with percentage sign and appropriate styling
 * @param rate - Budget fulfillment rate as a number
 * @returns Formatted string with percentage
 */
export const formatBudgetRate = (rate: number): string => {
  return `${rate}%`
}
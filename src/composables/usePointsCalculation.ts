/**
 * Pure calculation helpers for loyalty points
 */
export function usePointsCalculation() {
  /**
   * Calculate points earned from a purchase amount
   */
  function calculatePointsEarned(amount: number, earnRate: number, multiplier: number = 1): number {
    return Math.floor(amount * earnRate * multiplier)
  }

  /**
   * Calculate PHP value of points for redemption
   */
  function calculateRedemptionValue(points: number, redeemRate: number): number {
    return Math.round(points * redeemRate * 100) / 100
  }

  /**
   * Format points as a display string
   */
  function formatPoints(points: number): string {
    return points.toLocaleString('en-PH')
  }

  /**
   * Format points value in PHP
   */
  function formatPointsValue(points: number, redeemRate: number): string {
    const value = calculateRedemptionValue(points, redeemRate)
    return `₱${value.toFixed(2)}`
  }

  /**
   * Format earn rate as description
   */
  function formatEarnRate(earnRate: number): string {
    const perSpend = Math.round(1 / earnRate)
    return `1 point per ₱${perSpend.toLocaleString('en-PH')}`
  }

  /**
   * Format redeem rate as description
   */
  function formatRedeemRate(redeemRate: number): string {
    const pointsPerPeso = Math.round(1 / redeemRate)
    return `${pointsPerPeso} points = ₱1`
  }

  return {
    calculatePointsEarned,
    calculateRedemptionValue,
    formatPoints,
    formatPointsValue,
    formatEarnRate,
    formatRedeemRate
  }
}

export default usePointsCalculation

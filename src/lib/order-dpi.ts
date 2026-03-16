/**
 * Pure helpers for order total rounding and DPI computation.
 * Used by api, checkout, and editors; testable in isolation.
 */

export const roundCurrency = (value: number): number =>
  Math.round(value * 100) / 100

export function computeDpiFromDimensions(
  widthPx: number,
  heightPx: number,
  widthInches: number,
  heightInches: number
): number {
  if (widthInches <= 0 || heightInches <= 0) return 0
  return Math.round(
    Math.min(widthPx / widthInches, heightPx / heightInches)
  )
}

export function meetsMinDpi(
  widthPx: number,
  heightPx: number,
  widthInches: number,
  heightInches: number,
  minDpi: number
): boolean {
  return computeDpiFromDimensions(widthPx, heightPx, widthInches, heightInches) >= minDpi
}

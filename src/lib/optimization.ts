import type { AdjustmentResult, LightMeterRow } from './types'

/**
 * Calculate the maximum EV error across all measurement points when an
 * adjustment resistor (in parallel) is added to the circuit.
 *
 * @param resistances - Measured circuit resistances
 * @param evLevels    - Corresponding EV levels
 * @param adjustmentR - Candidate adjustment resistor value (Ω). 0 = no adjustment.
 */
export function maxEVErrorWithAdjustment(
  resistances: number[],
  evLevels: number[],
  adjustmentR: number,
): number {
  const n = resistances.length
  if (n < 2) return Infinity

  // Apply parallel resistor: R_adj = (R * adjustmentR) / (R + adjustmentR)
  const adjusted =
    adjustmentR === 0
      ? resistances
      : resistances.map(r => (r * adjustmentR) / (r + adjustmentR))

  // Fit linear regression to adjusted resistances
  const sumX = evLevels.reduce((a, b) => a + b, 0)
  const sumY = adjusted.reduce((a, b) => a + b, 0)
  const sumXY = evLevels.reduce((acc, ev, i) => acc + ev * adjusted[i], 0)
  const sumX2 = evLevels.reduce((acc, ev) => acc + ev * ev, 0)
  const meanX = sumX / n
  const meanY = sumY / n
  const ssXX = sumX2 - n * meanX * meanX
  const slope = ssXX === 0 ? 0 : (sumXY - n * meanX * meanY) / ssXX
  const intercept = meanY - slope * meanX

  const expected = evLevels.map(ev => slope * ev + intercept)
  if (expected.some(e => e <= 0) || adjusted.some(a => a <= 0)) return 999

  const evErrors = adjusted.map((adj, i) => Math.abs(Math.log2(adj / expected[i])))
  return Math.max(...evErrors)
}

/**
 * Find the optimal adjustment resistor value (1–10 000 Ω) that minimises the
 * maximum EV error across the measured range.
 *
 * Uses brute-force sampling at 1 Ω resolution, which is fast enough (<1 ms)
 * for the small datasets used here.
 */
export function findOptimalAdjustmentResistor(
  rows: LightMeterRow[],
  rMin = 1,
  rMax = 10000,
): AdjustmentResult | null {
  const valid = rows.filter(r => r.evLevel !== null && r.resistance !== null) as {
    evLevel: number
    resistance: number
  }[]

  if (valid.length < 2) return null

  const resistances = valid.map(r => r.resistance)
  const evLevels = valid.map(r => r.evLevel)

  let bestR = rMin
  let bestError = Infinity

  for (let r = rMin; r <= rMax; r++) {
    const err = maxEVErrorWithAdjustment(resistances, evLevels, r)
    if (err < bestError) {
      bestError = err
      bestR = r
    }
  }

  return { optimalR: bestR, maxEvError: bestError }
}

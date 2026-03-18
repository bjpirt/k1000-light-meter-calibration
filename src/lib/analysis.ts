import type {
  LinearityResult,
  ApertureResult,
  ShutterResult,
  LightMeterResult,
  EVErrorResult,
  ApertureRow,
  ShutterRow,
  LightMeterRow,
} from './types'

/**
 * Perform least-squares linear regression on x/y data.
 * Returns slope, intercept, R², std error, residuals, and fit values.
 */
export function linearRegression(
  x: number[],
  y: number[],
): LinearityResult {
  const n = x.length
  if (n < 2) throw new Error('At least 2 data points required')
  if (x.length !== y.length) throw new Error('x and y must have the same length')

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const meanX = sumX / n
  const meanY = sumY / n

  const ssXX = sumX2 - n * meanX * meanX
  const ssXY = sumXY - n * meanX * meanY

  const slope = ssXX === 0 ? 0 : ssXY / ssXX
  const intercept = meanY - slope * meanX

  const fit = x.map(xi => slope * xi + intercept)
  const residuals = y.map((yi, i) => yi - fit[i])

  const ssTot = y.reduce((acc, yi) => acc + (yi - meanY) ** 2, 0)
  const ssRes = residuals.reduce((acc, r) => acc + r * r, 0)
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  const rmsError = Math.sqrt(ssRes / n)
  const maxDeviation = Math.max(...residuals.map(Math.abs))
  const meanAbsY = y.reduce((acc, yi) => acc + Math.abs(yi), 0) / n
  const linearityPercent = meanAbsY === 0 ? 100 : (1 - rmsError / meanAbsY) * 100

  // Standard error of the slope
  const stdErr =
    n > 2 && ssXX > 0
      ? Math.sqrt(ssRes / (n - 2) / ssXX)
      : 0

  return {
    slope,
    intercept,
    rSquared,
    rmsError,
    maxDeviation,
    linearityPercent,
    stdErr,
    residuals,
    fit,
  }
}

function filterValid(
  xs: (number | null)[],
  ys: (number | null)[],
): { x: number[]; y: number[] } {
  const x: number[] = []
  const y: number[] = []
  for (let i = 0; i < xs.length; i++) {
    const xi = xs[i]
    const yi = ys[i]
    if (xi !== null && yi !== null && isFinite(xi) && isFinite(yi)) {
      x.push(xi)
      y.push(yi)
    }
  }
  return { x, y }
}

/**
 * Analyze aperture variable resistor linearity using log(f-stop) as the x-axis.
 * The f-stop scale is logarithmic, so this transformation produces the most
 * physically meaningful linear fit.
 */
export function analyzeApertureResistor(rows: ApertureRow[]): ApertureResult | null {
  const rawFStops = rows.map(r => r.fStop)
  const rawResistances = rows.map(r => r.resistance)
  const { x: fStops, y: resistances } = filterValid(rawFStops, rawResistances)

  if (fStops.length < 2) return null

  const xValues = fStops.map(f => Math.log(f))
  const result = linearRegression(xValues, resistances)

  return { ...result, xValues, rawFStops: fStops, resistances }
}

/**
 * Analyze shutter speed variable resistor linearity.
 * Uses log₂(speed) as the x-axis since shutter speeds are logarithmic.
 */
export function analyzeShutterResistor(rows: ShutterRow[]): ShutterResult | null {
  const rawSpeeds = rows.map(r => r.shutterSpeed)
  const rawResistances = rows.map(r => r.resistance)
  const { x: speeds, y: resistances } = filterValid(rawSpeeds, rawResistances)

  if (speeds.length < 2) return null

  const xValues = speeds.map(s => Math.log2(s))
  const result = linearRegression(xValues, resistances)

  return {
    ...result,
    xValues,
    shutterSpeeds: speeds,
    resistances,
  }
}

/**
 * Analyze light meter circuit resistance linearity vs EV level.
 */
export function analyzeLightMeterCircuit(rows: LightMeterRow[]): LightMeterResult | null {
  const rawEVs = rows.map(r => r.evLevel)
  const rawResistances = rows.map(r => r.resistance)
  const { x: evLevels, y: resistances } = filterValid(rawEVs, rawResistances)

  if (evLevels.length < 2) return null

  const result = linearRegression(evLevels, resistances)

  return {
    ...result,
    evLevels,
    resistances,
  }
}

/**
 * Calculate EV error at each measurement point.
 * EV error = log₂(measured / expected) — positive = underexposure.
 */
export function calculateEVErrors(lmResult: LightMeterResult): EVErrorResult {
  const { evLevels, resistances, slope, intercept } = lmResult
  const expectedResistances = evLevels.map(ev => slope * ev + intercept)

  const evErrors = resistances.map((meas, i) => {
    const exp = expectedResistances[i]
    return exp > 0 && meas > 0 ? Math.log2(meas / exp) : 0
  })

  const absErrors = evErrors.map(Math.abs)
  const maxError = Math.max(...absErrors)
  const rmsError = Math.sqrt(evErrors.reduce((acc, e) => acc + e * e, 0) / evErrors.length)
  const meanSignedError = evErrors.reduce((a, b) => a + b, 0) / evErrors.length

  return {
    evLevels,
    measuredResistances: resistances,
    expectedResistances,
    evErrors,
    maxError,
    rmsError,
    meanSignedError,
    withinHalf: absErrors.filter(e => e <= 0.05).length,
    withinOne: absErrors.filter(e => e <= 0.1).length,
    beyondOne: absErrors.filter(e => e > 0.1).length,
  }
}

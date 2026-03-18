import type { ApertureResult, ShutterResult, LightMeterResult } from './types'

export interface SimulationPoint {
  fStop: number
  shutterSpeed: number
  targetEV: number
  apertureR: number
  shutterR: number
  parallelR: number
  indicatedEV: number
  evError: number // targetEV - indicatedEV (positive = underexposed)
}

/**
 * Look up the resistance for a given input value, using the measured value if
 * it exists, or the linear regression prediction otherwise.
 */
function interpolateR(
  value: number,
  measuredValues: number[],
  measuredR: number[],
  slope: number,
  intercept: number,
  transform: (v: number) => number,
): number {
  const idx = measuredValues.findIndex(v => Math.abs(v - value) < 1e-6)
  if (idx >= 0) return measuredR[idx]
  return slope * transform(value) + intercept
}

/**
 * Simulate the K1000 galvanometer circuit for all combinations of measured
 * f-stops and shutter speeds.
 *
 * Coil 1 (light sensor circuit) resistance = lmResult linear fit at each EV.
 * Coil 2 (exposure circuit) resistance = R_aperture || R_shutter.
 * Balance point (needle centred) is where R_coil1 = R_coil2.
 */
export function simulateCircuit(
  apertureResult: ApertureResult,
  shutterResult: ShutterResult,
  lmResult: LightMeterResult,
): SimulationPoint[][] {
  const { rawFStops, resistances: apResistances, slope: apSlope, intercept: apIntercept } = apertureResult
  const { shutterSpeeds, resistances: shResistances, slope: shSlope, intercept: shIntercept } = shutterResult
  const { slope: lmSlope, intercept: lmIntercept } = lmResult

  return rawFStops.map(f =>
    shutterSpeeds.map(s => {
      const apertureR = interpolateR(f, rawFStops, apResistances, apSlope, apIntercept, Math.log)
      const shutterR = interpolateR(s, shutterSpeeds, shResistances, shSlope, shIntercept, Math.log2)
      const parallelR = (apertureR * shutterR) / (apertureR + shutterR)
      const targetEV = Math.log2(f * f * s)
      const indicatedEV = lmSlope !== 0 ? (parallelR - lmIntercept) / lmSlope : 0
      return {
        fStop: f,
        shutterSpeed: s,
        targetEV,
        apertureR,
        shutterR,
        parallelR,
        indicatedEV,
        evError: targetEV - indicatedEV,
      }
    }),
  )
}

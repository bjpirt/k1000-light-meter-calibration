import type { ApertureResult, ShutterResult, LightMeterResult } from './types'

export interface EVSeriesPoint {
  ev: number
  shutterSpeedDenom: number  // e.g. 1024 for 1/1024 s, 0.5 for 2 s
  rLightMeter: number        // Ω — coil 1 circuit
  rAperture: number          // Ω
  rShutter: number           // Ω
  rParallel: number          // Ω — coil 2 circuit
  iCoil1mA: number           // mA
  iCoil2mA: number           // mA
  deltaImA: number           // iCoil1 − iCoil2 (positive = coil 1 has more current)
}

/**
 * Simulate coil currents for EV 16 down to EV 1, at a fixed f-stop (default f/8).
 * For each EV the "correct" shutter speed is derived from EV = log2(f² × s).
 * Both coil currents are calculated using the supplied voltage (default 1.5 V).
 */
export function simulateEVSeries(
  apertureResult: ApertureResult,
  shutterResult: ShutterResult,
  lmResult: LightMeterResult,
  fStop = 8,
  voltage = 1.5,
  maxEV = 16,
  minEV = 6,
): EVSeriesPoint[] {
  const rAperture =
    apertureResult.slope * Math.log(fStop) + apertureResult.intercept

  const points: EVSeriesPoint[] = []
  for (let ev = maxEV; ev >= minEV; ev--) {
    const exactDenom = Math.pow(2, ev) / (fStop * fStop)

    // Snap to nearest standard shutter speed from the measured table (log₂ space)
    const shutterSpeedDenom = shutterResult.shutterSpeeds.reduce((best, s) =>
      Math.abs(Math.log2(s) - Math.log2(exactDenom)) <
      Math.abs(Math.log2(best) - Math.log2(exactDenom))
        ? s : best,
    )

    const rLightMeter = lmResult.slope * ev + lmResult.intercept
    const rShutter =
      shutterResult.slope * Math.log2(shutterSpeedDenom) + shutterResult.intercept
    const rParallel = (rAperture * rShutter) / (rAperture + rShutter)

    const iCoil1mA = (voltage / rLightMeter) * 1000
    const iCoil2mA = (voltage / rParallel) * 1000

    points.push({
      ev,
      shutterSpeedDenom,
      rLightMeter,
      rAperture,
      rShutter,
      rParallel,
      iCoil1mA,
      iCoil2mA,
      deltaImA: iCoil1mA - iCoil2mA,
    })
  }
  return points
}

export interface AdjResistorResult {
  resistorValue: number  // Ω
  connectToCoil: 1 | 2
}

/**
 * Find a resistor value that, when wired in parallel with one coil's external
 * circuit, shifts the mean current difference to zero.
 *
 * R_adj = V / |ΔI_avg|  (adds a constant extra current V/R_adj to that coil)
 *
 * If avg ΔI > 0 (coil 1 draws more), connect to coil 2 to boost I_coil2.
 * If avg ΔI < 0 (coil 2 draws more), connect to coil 1 to boost I_coil1.
 */
export function findAdjustmentResistor(
  series: EVSeriesPoint[],
  voltage = 1.5,
): AdjResistorResult {
  const avgDeltaImA = series.reduce((s, p) => s + p.deltaImA, 0) / series.length
  const connectToCoil = avgDeltaImA >= 0 ? 2 : 1
  const resistorValue = (voltage * 1000) / Math.abs(avgDeltaImA)
  return { resistorValue, connectToCoil }
}

/**
 * Re-run the series with the adjustment resistor applied in parallel with
 * the relevant coil's external circuit.
 */
export function applyAdjustmentResistor(
  series: EVSeriesPoint[],
  adj: AdjResistorResult,
  voltage = 1.5,
): EVSeriesPoint[] {
  const extraCurrentMA = (voltage / adj.resistorValue) * 1000
  return series.map(pt => {
    const iCoil1mA = adj.connectToCoil === 1 ? pt.iCoil1mA + extraCurrentMA : pt.iCoil1mA
    const iCoil2mA = adj.connectToCoil === 2 ? pt.iCoil2mA + extraCurrentMA : pt.iCoil2mA
    return { ...pt, iCoil1mA, iCoil2mA, deltaImA: iCoil1mA - iCoil2mA }
  })
}

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

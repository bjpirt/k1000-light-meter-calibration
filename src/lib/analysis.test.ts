import { describe, it, expect } from 'vitest'
import {
  linearRegression,
  analyzeApertureResistor,
  analyzeShutterResistor,
  analyzeLightMeterCircuit,
  calculateEVErrors,
} from './analysis'

// ─── linearRegression ────────────────────────────────────────────────────────

describe('linearRegression', () => {
  it('fits a perfect line', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [2, 4, 6, 8, 10]
    const r = linearRegression(x, y)
    expect(r.slope).toBeCloseTo(2)
    expect(r.intercept).toBeCloseTo(0)
    expect(r.rSquared).toBeCloseTo(1)
    expect(r.rmsError).toBeCloseTo(0)
    expect(r.maxDeviation).toBeCloseTo(0)
  })

  it('computes residuals correctly', () => {
    const x = [1, 2, 3]
    const y = [1, 3, 2] // not a perfect line
    const r = linearRegression(x, y)
    expect(r.residuals).toHaveLength(3)
    // Residuals should sum to ~0 for OLS
    const sum = r.residuals.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })

  it('returns correct R² for noisy data', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [2.1, 3.9, 6.2, 7.8, 10.1]
    const r = linearRegression(x, y)
    expect(r.rSquared).toBeGreaterThan(0.99)
  })

  it('returns R² of 1 for constant y (perfect horizontal fit)', () => {
    const x = [1, 2, 3]
    const y = [5, 5, 5]
    const r = linearRegression(x, y)
    expect(r.slope).toBeCloseTo(0)
    expect(r.rSquared).toBe(1) // ssTot === 0 → treated as perfect
  })

  it('throws on fewer than 2 points', () => {
    expect(() => linearRegression([1], [1])).toThrow()
  })

  it('throws when x and y lengths differ', () => {
    expect(() => linearRegression([1, 2], [1])).toThrow()
  })

  it('returns correct fit array', () => {
    const x = [0, 1, 2]
    const y = [1, 3, 5]
    const r = linearRegression(x, y)
    expect(r.fit[0]).toBeCloseTo(1)
    expect(r.fit[1]).toBeCloseTo(3)
    expect(r.fit[2]).toBeCloseTo(5)
  })

  it('computes linearity percent near 100 for a perfect line', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [10, 20, 30, 40, 50]
    const r = linearRegression(x, y)
    expect(r.linearityPercent).toBeCloseTo(100)
  })
})

// ─── analyzeApertureResistor ─────────────────────────────────────────────────

describe('analyzeApertureResistor', () => {
  const apertureRows = [
    { fStop: 1.4, resistance: 100 },
    { fStop: 2.0, resistance: 200 },
    { fStop: 2.8, resistance: 400 },
    { fStop: 4.0, resistance: 800 },
    { fStop: 5.6, resistance: 1600 },
  ]

  it('returns a result for valid data', () => {
    const r = analyzeApertureResistor(apertureRows)
    expect(r).not.toBeNull()
    expect(r!.rSquared).toBeGreaterThan(0)
  })

  it('returns null for fewer than 2 valid rows', () => {
    expect(analyzeApertureResistor([{ fStop: 1.4, resistance: null }])).toBeNull()
    expect(analyzeApertureResistor([{ fStop: null, resistance: 100 }])).toBeNull()
    expect(analyzeApertureResistor([])).toBeNull()
  })

  it('skips rows with null values', () => {
    const rows = [
      { fStop: 1.4, resistance: null },
      { fStop: 2.0, resistance: 200 },
      { fStop: 2.8, resistance: 400 },
    ]
    const r = analyzeApertureResistor(rows)
    expect(r).not.toBeNull()
    expect(r!.resistances).toHaveLength(2)
  })

  it('achieves R² ≈ 1 for data that follows a power law (R ∝ 1/f)', () => {
    const rows = [1.4, 2.0, 2.8, 4.0, 5.6].map(f => ({
      fStop: f,
      resistance: 1000 / f,  // R = 1000/f → log(R) = log(1000) − log(f)
    }))
    const r = analyzeApertureResistor(rows)
    expect(r!.rSquared).toBeCloseTo(1)
  })

  it('exposes xValues as log(f-stop)', () => {
    const rows = [{ fStop: 1.0, resistance: 100 }, { fStop: Math.E, resistance: 200 }]
    const r = analyzeApertureResistor(rows)!
    expect(r.xValues[0]).toBeCloseTo(0)    // log(1) = 0
    expect(r.xValues[1]).toBeCloseTo(1)    // log(e) = 1
  })
})

// ─── analyzeShutterResistor ───────────────────────────────────────────────────

describe('analyzeShutterResistor', () => {
  // Resistance follows R ∝ 1/s (power-law), with mild noise
  const shutterRows = [1, 2, 4, 8, 16, 30, 60, 125, 250, 500, 1000].map(s => ({
    shutterSpeed: s,
    resistance: Math.round(10000 / s),
  }))

  it('returns a result for valid data', () => {
    const r = analyzeShutterResistor(shutterRows)
    expect(r).not.toBeNull()
    expect(r!.rSquared).toBeGreaterThan(0.9)
  })

  it('returns null for insufficient data', () => {
    expect(analyzeShutterResistor([])).toBeNull()
    expect(analyzeShutterResistor([{ shutterSpeed: 1, resistance: null }])).toBeNull()
  })

  it('uses log₂ of shutter speed as x-axis and achieves R² ≈ 1 for a power law', () => {
    // R = 1000/s → log(R) = log(1000) − log₂(s)*log(2), linear in log₂(s)
    const rows = [1, 2, 4, 8].map(s => ({ shutterSpeed: s, resistance: 1000 / s }))
    const r = analyzeShutterResistor(rows)!
    expect(r.xValues).toEqual([0, 1, 2, 3])
    expect(r.rSquared).toBeCloseTo(1)
  })

  it('preserves original shutter speeds', () => {
    const r = analyzeShutterResistor(shutterRows)!
    expect(r.shutterSpeeds).toEqual(shutterRows.map(row => row.shutterSpeed))
  })
})

// ─── analyzeLightMeterCircuit ─────────────────────────────────────────────────

describe('analyzeLightMeterCircuit', () => {
  const lmRows = [6, 8, 10, 12, 14, 16, 18, 20].map((ev, i) => ({
    evLevel: ev,
    resistance: 500 * i + 1000,
  }))

  it('returns a result for valid data', () => {
    // resistance = 500 * ev - 2000 gives slope=500, intercept=-2000
    const rows = [6, 8, 10, 12, 14, 16, 18, 20].map(ev => ({
      evLevel: ev,
      resistance: 500 * ev - 2000,
    }))
    const r = analyzeLightMeterCircuit(rows)
    expect(r).not.toBeNull()
    expect(r!.slope).toBeCloseTo(500)
    expect(r!.rSquared).toBeCloseTo(1)
  })

  it('returns null for insufficient data', () => {
    expect(analyzeLightMeterCircuit([])).toBeNull()
    expect(analyzeLightMeterCircuit([{ evLevel: 10, resistance: null }])).toBeNull()
  })

  it('preserves ev levels and resistances', () => {
    const r = analyzeLightMeterCircuit(lmRows)!
    expect(r.evLevels).toHaveLength(lmRows.length)
    expect(r.resistances).toHaveLength(lmRows.length)
  })
})

// ─── calculateEVErrors ────────────────────────────────────────────────────────

describe('calculateEVErrors', () => {
  it('returns zero errors for a perfect fit', () => {
    const lmRows = [6, 8, 10, 12].map((ev, i) => ({
      evLevel: ev,
      resistance: 500 * i + 1000,
    }))
    const lmResult = analyzeLightMeterCircuit(lmRows)!
    const ev = calculateEVErrors(lmResult)
    ev.evErrors.forEach(e => expect(e).toBeCloseTo(0, 5))
    expect(ev.maxError).toBeCloseTo(0, 5)
    expect(ev.rmsError).toBeCloseTo(0, 5)
  })

  it('correctly calculates EV errors for known offsets', () => {
    // Perfect line: resistance = 500 * ev. Introduce 2× offset at ev=10.
    const slope = 500
    const intercept = 0
    const evLevels = [8, 10, 12]
    const resistances = [4000, 10000, 6000] // ev=10: expected 5000, got 10000 → error = log2(2) = 1
    const lmResult = {
      slope, intercept, rSquared: 1, rmsError: 0, maxDeviation: 0,
      linearityPercent: 100, stdErr: 0, residuals: [], fit: [],
      evLevels, resistances,
    }
    const ev = calculateEVErrors(lmResult)
    expect(ev.evErrors[1]).toBeCloseTo(1) // log2(10000/5000) = 1
    expect(ev.maxError).toBeCloseTo(1)
  })

  it('counts threshold buckets correctly', () => {
    const slope = 1000
    const intercept = 0
    const evLevels = [1, 2, 3, 4]
    // Errors: 0, 0.04, 0.07, 0.15 stops
    const resistances = [
      1000,               // exact
      2000 * 2 ** 0.04,  // +0.04 EV
      3000 * 2 ** 0.07,  // +0.07 EV
      4000 * 2 ** 0.15,  // +0.15 EV
    ]
    const lmResult = {
      slope, intercept, rSquared: 1, rmsError: 0, maxDeviation: 0,
      linearityPercent: 100, stdErr: 0, residuals: [], fit: [],
      evLevels, resistances,
    }
    const ev = calculateEVErrors(lmResult)
    expect(ev.withinHalf).toBe(2)  // errors 0 and 0.04
    expect(ev.withinOne).toBe(3)   // errors 0, 0.04, 0.07
    expect(ev.beyondOne).toBe(1)   // error 0.15
  })
})

import { describe, it, expect } from 'vitest'
import { maxEVErrorWithAdjustment, findOptimalAdjustmentResistor } from './optimization'

describe('maxEVErrorWithAdjustment', () => {
  it('returns Infinity for fewer than 2 points', () => {
    expect(maxEVErrorWithAdjustment([], [], 0)).toBe(Infinity)
    expect(maxEVErrorWithAdjustment([1000], [10], 0)).toBe(Infinity)
  })

  it('returns near-zero error for a perfectly linear set (no adjustment)', () => {
    const evLevels = [6, 8, 10, 12, 14, 16]
    const resistances = evLevels.map(ev => ev * 500) // perfect line through origin
    const error = maxEVErrorWithAdjustment(resistances, evLevels, 0)
    expect(error).toBeCloseTo(0, 4)
  })

  it('returns a finite positive number for near-zero adjustment resistor', () => {
    // Very small adjustmentR compresses all values but the parallel transform is
    // nonlinear, so some residual EV error exists — just verify no crash/Infinity.
    const evLevels = [6, 8, 10, 12]
    const resistances = evLevels.map(ev => ev * 300)
    const error = maxEVErrorWithAdjustment(resistances, evLevels, 0.1)
    expect(isFinite(error)).toBe(true)
    expect(error).toBeGreaterThanOrEqual(0)
  })

  it('returns near-zero error for a perfect linear dataset with no adjustment', () => {
    // Perfectly linear data: no adjustment needed, EV error should be ~0
    const evLevels = [6, 8, 10, 12]
    const resistances = evLevels.map(ev => ev * 300)
    const errorBefore = maxEVErrorWithAdjustment(resistances, evLevels, 0)
    expect(errorBefore).toBeCloseTo(0, 3)
  })
})

describe('findOptimalAdjustmentResistor', () => {
  it('returns null for insufficient data', () => {
    expect(findOptimalAdjustmentResistor([])).toBeNull()
    expect(findOptimalAdjustmentResistor([{ evLevel: 10, resistance: null }])).toBeNull()
    expect(findOptimalAdjustmentResistor([{ evLevel: 10, resistance: 1000 }])).toBeNull()
  })

  it('returns a result within the search range', () => {
    const rows = [6, 8, 10, 12, 14, 16].map(ev => ({
      evLevel: ev,
      resistance: ev * 400 + 200,
    }))
    const result = findOptimalAdjustmentResistor(rows, 1, 10000)
    expect(result).not.toBeNull()
    expect(result!.optimalR).toBeGreaterThanOrEqual(1)
    expect(result!.optimalR).toBeLessThanOrEqual(10000)
    expect(result!.maxEvError).toBeGreaterThanOrEqual(0)
  })

  it('finds a near-zero error for a perfect linear dataset', () => {
    // Perfectly linear data needs no adjustment, so any resistor
    // preserves the linearity. Max error should stay near 0.
    const rows = [6, 8, 10, 12].map(ev => ({ evLevel: ev, resistance: ev * 500 }))
    const result = findOptimalAdjustmentResistor(rows, 1, 10000)
    expect(result!.maxEvError).toBeCloseTo(0, 3)
  })

  it('respects custom rMin/rMax bounds', () => {
    const rows = [6, 8, 10, 12, 14].map(ev => ({ evLevel: ev, resistance: ev * 300 + 100 }))
    const result = findOptimalAdjustmentResistor(rows, 100, 500)
    expect(result!.optimalR).toBeGreaterThanOrEqual(100)
    expect(result!.optimalR).toBeLessThanOrEqual(500)
  })
})

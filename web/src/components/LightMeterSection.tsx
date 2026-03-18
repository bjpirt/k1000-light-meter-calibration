import { useState } from 'react'
import { DataTable } from './DataTable'
import { LinearityChart } from './LinearityChart'
import { EVErrorChart } from './EVErrorChart'
import { MetricsBadge } from './MetricsBadge'
import { analyzeLightMeterCircuit, calculateEVErrors } from '../lib/analysis'
import { findOptimalAdjustmentResistor } from '../lib/optimization'
import type { LightMeterRow, LightMeterResult, EVErrorResult, AdjustmentResult } from '../lib/types'

const DEFAULT_ROWS: LightMeterRow[] = [
  { evLevel: 6, resistance: null },
  { evLevel: 8, resistance: null },
  { evLevel: 10, resistance: null },
  { evLevel: 12, resistance: null },
  { evLevel: 14, resistance: null },
  { evLevel: 16, resistance: null },
  { evLevel: 18, resistance: null },
  { evLevel: 20, resistance: null },
]

const COLUMNS = [
  { key: 'evLevel', label: 'EV Level' },
  { key: 'resistance', label: 'Circuit Resistance', unit: 'Ω' },
]

interface Props {
  onResult: (result: LightMeterResult | null) => void
  onEVErrors: (errors: EVErrorResult | null) => void
  onAdjustment: (result: AdjustmentResult | null) => void
}

export function LightMeterSection({ onResult, onEVErrors, onAdjustment }: Props) {
  const [rows, setRows] = useState<LightMeterRow[]>(DEFAULT_ROWS)
  const [lmResult, setLmResult] = useState<LightMeterResult | null>(null)
  const [evErrors, setEvErrors] = useState<EVErrorResult | null>(null)
  const [adjustment, setAdjustment] = useState<AdjustmentResult | null>(null)

  function handleAnalyze() {
    const lm = analyzeLightMeterCircuit(rows)
    setLmResult(lm)
    onResult(lm)

    if (lm) {
      const ev = calculateEVErrors(lm)
      setEvErrors(ev)
      onEVErrors(ev)

      const adj = findOptimalAdjustmentResistor(rows)
      setAdjustment(adj)
      onAdjustment(adj)
    } else {
      setEvErrors(null)
      setAdjustment(null)
      onEVErrors(null)
      onAdjustment(null)
    }
  }

  return (
    <section className="analysis-section">
      <h2>3. Light Meter Circuit</h2>
      <p className="section-description">
        Enter the measured circuit resistance at each EV level across the metering range. The
        analysis checks linearity and calculates exposure errors in stops.
      </p>

      <DataTable columns={COLUMNS} rows={rows} onChange={setRows} />

      <button className="analyze-btn" onClick={handleAnalyze}>
        Analyze Light Meter Circuit
      </button>

      {lmResult && (
        <div className="result">
          <MetricsBadge result={lmResult} />

          <LinearityChart
            xValues={lmResult.evLevels}
            yValues={lmResult.resistances}
            result={lmResult}
            xLabel="EV Level"
            title="Light Meter Circuit"
          />
        </div>
      )}

      {evErrors && (
        <div className="result">
          <h3>EV Error Analysis</h3>
          <div className="ev-stats">
            <div className="metric">
              <span className="metric-label">Max EV error</span>
              <span className="metric-value">{evErrors.maxError.toFixed(3)} stops</span>
            </div>
            <div className="metric">
              <span className="metric-label">RMS EV error</span>
              <span className="metric-value">{evErrors.rmsError.toFixed(3)} stops</span>
            </div>
            <div className="metric">
              <span className="metric-label">Mean signed error</span>
              <span className="metric-value">{evErrors.meanSignedError.toFixed(3)} stops</span>
            </div>
          </div>
          <div className="ev-distribution">
            <span className="dist-good">≤ 0.05 EV: {evErrors.withinHalf} pts</span>
            <span className="dist-ok">≤ 0.1 EV: {evErrors.withinOne} pts</span>
            <span className="dist-bad">&gt; 0.1 EV: {evErrors.beyondOne} pts</span>
          </div>
          <EVErrorChart result={evErrors} />
        </div>
      )}

      {adjustment && (
        <div className="result adjustment-result">
          <h3>Adjustment Resistor Recommendation</h3>
          <p>
            Install a <strong>{adjustment.optimalR.toFixed(0)} Ω</strong> trimmer potentiometer
            in parallel with the main circuit.
          </p>
          <p className="adjustment-detail">
            Expected maximum EV error after adjustment:{' '}
            <strong>{adjustment.maxEvError.toFixed(3)} stops</strong> (±
            {(adjustment.maxEvError * 100).toFixed(1)}% exposure error)
          </p>
        </div>
      )}
    </section>
  )
}

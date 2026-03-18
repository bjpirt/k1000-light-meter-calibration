import { useState } from 'react'
import { DataTable } from './DataTable'
import { LinearityChart } from './LinearityChart'
import { MetricsBadge } from './MetricsBadge'
import { analyzeShutterResistor } from '../lib/analysis'
import type { ShutterRow, ShutterResult } from '../lib/types'

const DEFAULT_ROWS: ShutterRow[] = [
  { shutterSpeed: 1, resistance: null },
  { shutterSpeed: 2, resistance: null },
  { shutterSpeed: 4, resistance: null },
  { shutterSpeed: 8, resistance: null },
  { shutterSpeed: 15, resistance: null },
  { shutterSpeed: 30, resistance: null },
  { shutterSpeed: 60, resistance: null },
  { shutterSpeed: 125, resistance: null },
  { shutterSpeed: 250, resistance: null },
  { shutterSpeed: 500, resistance: null },
  { shutterSpeed: 1000, resistance: null },
]

const COLUMNS = [
  { key: 'shutterSpeed', label: 'Shutter Speed', unit: '1/s' },
  { key: 'resistance', label: 'Resistance', unit: 'Ω' },
]

interface Props {
  onResult: (result: ShutterResult | null) => void
}

export function ShutterSection({ onResult }: Props) {
  const [rows, setRows] = useState<ShutterRow[]>(DEFAULT_ROWS)
  const [result, setResult] = useState<ShutterResult | null>(null)

  function handleAnalyze() {
    const r = analyzeShutterResistor(rows)
    setResult(r)
    onResult(r)
  }

  return (
    <section className="analysis-section">
      <h2>2. Shutter Speed Variable Resistor</h2>
      <p className="section-description">
        Enter the measured resistance at each shutter speed (denominator only — enter 60 for 1/60s).
        The analysis uses a log₂ scale since shutter speeds form a geometric series.
      </p>

      <DataTable columns={COLUMNS} rows={rows} onChange={setRows} />

      <button className="analyze-btn" onClick={handleAnalyze}>
        Analyze Shutter Resistor
      </button>

      {result && (
        <div className="result">
          <MetricsBadge result={result} />
          <LinearityChart
            xValues={result.xValues}
            yValues={result.resistances}
            result={result}
            xLabel="log₂(shutter speed)"
            title="Shutter Resistor"
          />
        </div>
      )}
    </section>
  )
}

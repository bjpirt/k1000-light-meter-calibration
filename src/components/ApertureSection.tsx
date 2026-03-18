import { useState } from 'react'
import { analyzeApertureResistor } from '../lib/analysis'
import type { ApertureResult, ApertureRow } from '../lib/types'
import { useLocalStorage } from '../lib/useLocalStorage'
import { DataTable } from './DataTable'
import { LinearityChart } from './LinearityChart'
import { MetricsBadge } from './MetricsBadge'

const DEFAULT_ROWS: ApertureRow[] = [
  { fStop: 1.4, resistance: null },
  { fStop: 2.0, resistance: null },
  { fStop: 2.8, resistance: null },
  { fStop: 4.0, resistance: null },
  { fStop: 5.6, resistance: null },
  { fStop: 8.0, resistance: null },
  { fStop: 11, resistance: null },
  { fStop: 16, resistance: null },
  { fStop: 22, resistance: null },
]

const COLUMNS = [
  { key: 'fStop', label: 'F-Stop' },
  { key: 'resistance', label: 'Resistance', unit: 'Ω' },
]

export function ApertureSection() {
  const [rows, setRows] = useLocalStorage<ApertureRow[]>('k1000:aperture', DEFAULT_ROWS)
  const [result, setResult] = useState<ApertureResult | null>(null)

  return (
    <section className="analysis-section">
      <h2>1. Aperture Variable Resistor</h2>
      <p className="section-description">
        Enter the measured resistance at each f-stop position. Resistance is analyzed against
        log(f-stop) since the f-stop scale is logarithmic.
      </p>

      <DataTable columns={COLUMNS} rows={rows} onChange={setRows} />

      <button className="analyze-btn" onClick={() => setResult(analyzeApertureResistor(rows))}>
        Analyze Aperture Resistor
      </button>

      {result && (
        <div className="result">
          <MetricsBadge result={result} />
          <LinearityChart
            xValues={result.xValues}
            yValues={result.resistances}
            result={result}
            xLabel="log(f-stop)"
            title="Aperture Resistor"
          />
        </div>
      )}
    </section>
  )
}

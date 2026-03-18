import { useState } from 'react'
import { analyzeLightMeterCircuit } from '../lib/analysis'
import type { LightMeterRow, LightMeterResult } from '../lib/types'
import { useLocalStorage } from '../lib/useLocalStorage'
import { DataTable } from './DataTable'
import { LinearityChart } from './LinearityChart'
import { MetricsBadge } from './MetricsBadge'

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

export function LightMeterSection() {
  const [rows, setRows] = useLocalStorage<LightMeterRow[]>('k1000:lightmeter', DEFAULT_ROWS)
  const [result, setResult] = useState<LightMeterResult | null>(null)

  return (
    <section className="analysis-section">
      <h2>3. Light Meter Circuit</h2>
      <p className="section-description">
        Enter the measured circuit resistance at each EV level across the metering range. The
        analysis checks linearity of the resistance response.
      </p>

      <DataTable columns={COLUMNS} rows={rows} onChange={setRows} />

      <button className="analyze-btn" onClick={() => setResult(analyzeLightMeterCircuit(rows))}>
        Analyze Light Meter Circuit
      </button>

      {result && (
        <div className="result">
          <MetricsBadge result={result} />
          <LinearityChart
            xValues={result.evLevels}
            yValues={result.resistances}
            result={result}
            xLabel="EV Level"
            title="Light Meter Circuit"
          />
        </div>
      )}
    </section>
  )
}

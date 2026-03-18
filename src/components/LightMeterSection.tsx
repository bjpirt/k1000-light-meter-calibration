import { useState } from 'react'
import { analyzeLightMeterCircuit } from '../lib/analysis'
import type { LightMeterRow, LightMeterResult } from '../lib/types'
import { useLocalStorage } from '../lib/useLocalStorage'
import { DataTable } from './DataTable'
import { LinearityChart } from './LinearityChart'
import { MetricsBadge } from './MetricsBadge'

const FIXED_EV_LEVELS = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7]
const DEFAULT_ROWS: LightMeterRow[] = FIXED_EV_LEVELS.map(ev => ({ evLevel: ev, resistance: null }))

const COLUMNS = [
  { key: 'evLevel', label: 'EV Level', readOnly: true },
  { key: 'resistance', label: 'Circuit Resistance', unit: 'Ω' },
]

export function LightMeterSection() {
  const [storedRows, setStoredRows] = useLocalStorage<LightMeterRow[]>('k1000:lightmeter', DEFAULT_ROWS)
  const [result, setResult] = useState<LightMeterResult | null>(null)

  // Always enforce fixed EV levels, regardless of what's in storage
  const rows: LightMeterRow[] = FIXED_EV_LEVELS.map((ev, i) => ({
    evLevel: ev,
    resistance: storedRows[i]?.resistance ?? null,
  }))

  return (
    <section className="analysis-section">
      <h2>3. Light Meter Circuit</h2>
      <p className="section-description">
        Enter the measured circuit resistance at each EV level across the metering range using an
        f/1.4 lens. The analysis checks linearity of the resistance response.
      </p>

      <DataTable columns={COLUMNS} rows={rows} onChange={setStoredRows} />

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

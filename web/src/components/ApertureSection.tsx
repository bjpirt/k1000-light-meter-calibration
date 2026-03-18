import { useState } from 'react'
import { DataTable } from './DataTable'
import { LinearityChart } from './LinearityChart'
import { MetricsBadge } from './MetricsBadge'
import { analyzeApertureResistor } from '../lib/analysis'
import type { ApertureRow, ApertureResult } from '../lib/types'

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

const TRANSFORMATION_LABELS: Record<string, string> = {
  'f-stop': 'f-stop (linear)',
  'f²': 'f² (aperture area)',
  'log(f-stop)': 'log(f-stop)',
  '1/f²': '1/f² (inverse area)',
}

interface Props {
  onResult: (result: ApertureResult | null) => void
}

export function ApertureSection({ onResult }: Props) {
  const [rows, setRows] = useState<ApertureRow[]>(DEFAULT_ROWS)
  const [result, setResult] = useState<ApertureResult | null>(null)

  function handleAnalyze() {
    const r = analyzeApertureResistor(rows)
    setResult(r)
    onResult(r)
  }

  return (
    <section className="analysis-section">
      <h2>1. Aperture Variable Resistor</h2>
      <p className="section-description">
        Enter the measured resistance at each f-stop position. The analysis tests four mathematical
        transformations (f-stop, f², log, 1/f²) and picks the one with the best linear fit,
        revealing the cam's mechanical design.
      </p>

      <DataTable columns={COLUMNS} rows={rows} onChange={setRows} />

      <button className="analyze-btn" onClick={handleAnalyze}>
        Analyze Aperture Resistor
      </button>

      {result && (
        <div className="result">
          <MetricsBadge result={result} />

          <div className="transformation-info">
            <strong>Best fit:</strong>{' '}
            {TRANSFORMATION_LABELS[result.transformation] ?? result.transformation}
          </div>

          <details className="transformation-table">
            <summary>All transformations (R² comparison)</summary>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Transformation</th>
                  <th>R²</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.allTransformations)
                  .sort(([, a], [, b]) => b.rSquared - a.rSquared)
                  .map(([name, r]) => (
                    <tr key={name} className={name === result.transformation ? 'best-row' : ''}>
                      <td>{TRANSFORMATION_LABELS[name] ?? name}</td>
                      <td>{r.rSquared.toFixed(4)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>

          <LinearityChart
            xValues={result.xValues}
            yValues={result.resistances}
            result={result}
            xLabel={result.transformation}
            title="Aperture Resistor"
          />
        </div>
      )}
    </section>
  )
}

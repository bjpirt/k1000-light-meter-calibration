import type { LinearityResult } from '../lib/types'

interface Props {
  result: LinearityResult
}

function qualityLabel(rSquared: number): { text: string; className: string } {
  if (rSquared >= 0.99) return { text: 'Excellent', className: 'quality-excellent' }
  if (rSquared >= 0.95) return { text: 'Good', className: 'quality-good' }
  if (rSquared >= 0.9) return { text: 'Acceptable', className: 'quality-acceptable' }
  return { text: 'Poor', className: 'quality-poor' }
}

export function MetricsBadge({ result }: Props) {
  const q = qualityLabel(result.rSquared)
  return (
    <div className="metrics-badge">
      <div className="metric">
        <span className="metric-label">R²</span>
        <span className={`metric-value ${q.className}`}>{result.rSquared.toFixed(4)}</span>
        <span className={`quality-tag ${q.className}`}>{q.text}</span>
      </div>
      <div className="metric">
        <span className="metric-label">RMS error</span>
        <span className="metric-value">{result.rmsError.toFixed(1)} Ω</span>
      </div>
      <div className="metric">
        <span className="metric-label">Max deviation</span>
        <span className="metric-value">{result.maxDeviation.toFixed(1)} Ω</span>
      </div>
      <div className="metric">
        <span className="metric-label">Linearity</span>
        <span className="metric-value">{result.linearityPercent.toFixed(1)}%</span>
      </div>
    </div>
  )
}

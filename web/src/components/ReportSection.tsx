import type { ApertureResult, ShutterResult, LightMeterResult, EVErrorResult, AdjustmentResult } from '../lib/types'

interface Props {
  aperture: ApertureResult | null
  shutter: ShutterResult | null
  lightMeter: LightMeterResult | null
  evErrors: EVErrorResult | null
  adjustment: AdjustmentResult | null
}

function status(rSquared: number): { symbol: string; label: string; className: string } {
  if (rSquared >= 0.95) return { symbol: '✓', label: 'Acceptable', className: 'status-ok' }
  if (rSquared >= 0.9) return { symbol: '⚠', label: 'Minor adjustment needed', className: 'status-warn' }
  return { symbol: '✗', label: 'Needs attention', className: 'status-bad' }
}

export function ReportSection({ aperture, shutter, lightMeter, evErrors, adjustment }: Props) {
  const allReady = aperture && shutter && lightMeter
  if (!allReady) {
    return (
      <section className="analysis-section report-section">
        <h2>4. Calibration Report</h2>
        <p className="section-description muted">
          Complete all three analyses above to generate a calibration report.
        </p>
      </section>
    )
  }

  const aStatus = status(aperture.rSquared)
  const sStatus = status(shutter.rSquared)
  const lStatus = status(lightMeter.rSquared)

  const lines: string[] = [
    '╔════════════════════════════════════════════════════════════╗',
    '║      PENTAX K1000 LIGHT METER CALIBRATION REPORT          ║',
    '╚════════════════════════════════════════════════════════════╝',
    '',
    '1. APERTURE RESISTOR LINEARITY',
    '   ─────────────────────────────',
    `   Best transformation:    ${aperture.transformation}`,
    `   R² (Linearity):         ${aperture.rSquared.toFixed(4)}`,
    `   RMS Error:              ${aperture.rmsError.toFixed(2)} Ω`,
    `   Max Deviation:          ${aperture.maxDeviation.toFixed(2)} Ω`,
    `   Linearity Quality:      ${aperture.linearityPercent.toFixed(1)}%`,
    '',
    '2. SHUTTER SPEED RESISTOR LINEARITY',
    '   ────────────────────────────────',
    `   R² (Linearity):         ${shutter.rSquared.toFixed(4)}`,
    `   RMS Error:              ${shutter.rmsError.toFixed(2)} Ω`,
    `   Max Deviation:          ${shutter.maxDeviation.toFixed(2)} Ω`,
    `   Linearity Quality:      ${shutter.linearityPercent.toFixed(1)}%`,
    '',
    '3. LIGHT METER CIRCUIT ANALYSIS',
    '   ────────────────────────────',
    `   R² (Linearity):         ${lightMeter.rSquared.toFixed(4)}`,
    `   RMS Error:              ${lightMeter.rmsError.toFixed(2)} Ω`,
    `   Max Deviation:          ${lightMeter.maxDeviation.toFixed(2)} Ω`,
    `   Linearity Quality:      ${lightMeter.linearityPercent.toFixed(1)}%`,
  ]

  if (evErrors) {
    lines.push(
      '',
      '4. EV ERROR ANALYSIS',
      '   ──────────────────',
      `   Maximum EV Error:       ${evErrors.maxError.toFixed(3)} stops`,
      `   RMS EV Error:           ${evErrors.rmsError.toFixed(3)} stops`,
      `   Points within ±0.1 EV: ${evErrors.withinOne}/${evErrors.evErrors.length}`,
    )
  }

  lines.push(
    '',
    '5. RECOMMENDATIONS',
    '   ────────────────',
    `   Aperture resistor:   ${aStatus.label}`,
    `   Shutter resistor:    ${sStatus.label}`,
    `   Light meter circuit: ${lStatus.label}`,
  )

  if (adjustment) {
    lines.push(
      '',
      `   Install ${adjustment.optimalR.toFixed(0)} Ω trimmer potentiometer in parallel`,
      `   Expected max EV error: ${adjustment.maxEvError.toFixed(3)} stops`,
    )
  }

  lines.push(
    '',
    '════════════════════════════════════════════════════════════',
  )

  const reportText = lines.join('\n')

  function handleCopy() {
    navigator.clipboard.writeText(reportText)
  }

  return (
    <section className="analysis-section report-section">
      <h2>4. Calibration Report</h2>

      <div className="report-summary">
        <div className={`report-status ${aStatus.className}`}>
          <span className="status-symbol">{aStatus.symbol}</span>
          <span>Aperture — {aStatus.label}</span>
        </div>
        <div className={`report-status ${sStatus.className}`}>
          <span className="status-symbol">{sStatus.symbol}</span>
          <span>Shutter — {sStatus.label}</span>
        </div>
        <div className={`report-status ${lStatus.className}`}>
          <span className="status-symbol">{lStatus.symbol}</span>
          <span>Light meter — {lStatus.label}</span>
        </div>
      </div>

      <div className="report-text-wrapper">
        <button className="copy-btn" onClick={handleCopy}>
          Copy to clipboard
        </button>
        <pre className="report-text">{reportText}</pre>
      </div>
    </section>
  )
}

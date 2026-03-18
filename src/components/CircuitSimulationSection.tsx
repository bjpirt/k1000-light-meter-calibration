import { analyzeApertureResistor, analyzeShutterResistor, analyzeLightMeterCircuit } from '../lib/analysis'
import { simulateCircuit } from '../lib/simulation'
import type { ApertureRow, ShutterRow, LightMeterRow } from '../lib/types'
import { useLocalStorage } from '../lib/useLocalStorage'
import { CircuitDiagram } from './CircuitDiagram'

const DEFAULT_APERTURE_ROWS: ApertureRow[] = [
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

const DEFAULT_SHUTTER_ROWS: ShutterRow[] = [
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

const DEFAULT_LM_ROWS: LightMeterRow[] = [
  { evLevel: 6, resistance: null },
  { evLevel: 8, resistance: null },
  { evLevel: 10, resistance: null },
  { evLevel: 12, resistance: null },
  { evLevel: 14, resistance: null },
  { evLevel: 16, resistance: null },
  { evLevel: 18, resistance: null },
  { evLevel: 20, resistance: null },
]

function evErrorColor(err: number): string {
  const abs = Math.abs(err)
  if (abs <= 0.33) return '#dcfce7'
  if (abs <= 0.67) return '#fef9c3'
  if (abs <= 1.0) return '#fed7aa'
  return '#fee2e2'
}

function evErrorTextColor(err: number): string {
  const abs = Math.abs(err)
  if (abs <= 0.33) return '#166534'
  if (abs <= 0.67) return '#854d0e'
  if (abs <= 1.0) return '#9a3412'
  return '#991b1b'
}

function formatShutter(s: number): string {
  return s === 1 ? '1s' : `1/${s}`
}

export function CircuitSimulationSection() {
  const [apertureRows] = useLocalStorage<ApertureRow[]>('k1000:aperture', DEFAULT_APERTURE_ROWS)
  const [shutterRows] = useLocalStorage<ShutterRow[]>('k1000:shutter', DEFAULT_SHUTTER_ROWS)
  const [lmRows] = useLocalStorage<LightMeterRow[]>('k1000:lightmeter', DEFAULT_LM_ROWS)

  const apertureResult = analyzeApertureResistor(apertureRows)
  const shutterResult = analyzeShutterResistor(shutterRows)
  const lmResult = analyzeLightMeterCircuit(lmRows)

  const canSimulate = apertureResult !== null && shutterResult !== null && lmResult !== null

  const grid = canSimulate ? simulateCircuit(apertureResult, shutterResult, lmResult) : null

  return (
    <section className="analysis-section">
      <h2>4. Circuit Simulation</h2>
      <p className="section-description">
        Simulates the galvanometer balance across all measured aperture and shutter speed
        combinations. The needle centres when the light sensor circuit resistance equals the
        aperture resistor in parallel with the shutter/ASA resistor. EV error shows how many stops
        off the indicated exposure is from the correct value.
      </p>

      <div className="circuit-diagram-wrap">
        <CircuitDiagram />
      </div>

      {!canSimulate && (
        <p className="sim-notice">
          Enter resistance measurements in all three sections above to enable simulation.
        </p>
      )}

      {grid && apertureResult && shutterResult && (
        <div className="sim-result">
          <h3 className="sim-table-title">EV Error Matrix (stops)</h3>
          <p className="section-description">
            Each cell shows the EV error for that aperture + shutter combination. Positive = underexposed,
            negative = overexposed.
          </p>

          <div className="sim-table-wrap">
            <table className="sim-table">
              <thead>
                <tr>
                  <th className="sim-th-corner">f-stop ↓ / speed →</th>
                  {shutterResult.shutterSpeeds.map(s => (
                    <th key={s}>{formatShutter(s)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apertureResult.rawFStops.map((f, fi) => (
                  <tr key={f}>
                    <th>f/{f}</th>
                    {shutterResult.shutterSpeeds.map((s, si) => {
                      const pt = grid[fi][si]
                      const err = pt.evError
                      return (
                        <td
                          key={s}
                          style={{
                            background: evErrorColor(err),
                            color: evErrorTextColor(err),
                          }}
                          title={`Target EV: ${pt.targetEV.toFixed(2)}, Indicated EV: ${pt.indicatedEV.toFixed(2)}`}
                        >
                          {err >= 0 ? '+' : ''}
                          {err.toFixed(2)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sim-legend">
            <span style={{ background: '#dcfce7', color: '#166534' }}>≤ ⅓ stop</span>
            <span style={{ background: '#fef9c3', color: '#854d0e' }}>≤ ⅔ stop</span>
            <span style={{ background: '#fed7aa', color: '#9a3412' }}>≤ 1 stop</span>
            <span style={{ background: '#fee2e2', color: '#991b1b' }}>&gt; 1 stop</span>
          </div>
        </div>
      )}
    </section>
  )
}

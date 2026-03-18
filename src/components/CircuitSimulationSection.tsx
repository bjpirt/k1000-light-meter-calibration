import { analyzeApertureResistor, analyzeShutterResistor, analyzeLightMeterCircuit } from '../lib/analysis'
import { simulateEVSeries } from '../lib/simulation'
import type { ApertureRow, ShutterRow, LightMeterRow } from '../lib/types'
import { useLocalStorage } from '../lib/useLocalStorage'
import { CircuitDiagram } from './CircuitDiagram'

const DEFAULT_APERTURE_ROWS: ApertureRow[] = [
  { fStop: 1.4, resistance: null }, { fStop: 2.0, resistance: null },
  { fStop: 2.8, resistance: null }, { fStop: 4.0, resistance: null },
  { fStop: 5.6, resistance: null }, { fStop: 8.0, resistance: null },
  { fStop: 11, resistance: null },  { fStop: 16, resistance: null },
  { fStop: 22, resistance: null },
]

const DEFAULT_SHUTTER_ROWS: ShutterRow[] = [
  { shutterSpeed: 1, resistance: null },   { shutterSpeed: 2, resistance: null },
  { shutterSpeed: 4, resistance: null },   { shutterSpeed: 8, resistance: null },
  { shutterSpeed: 15, resistance: null },  { shutterSpeed: 30, resistance: null },
  { shutterSpeed: 60, resistance: null },  { shutterSpeed: 125, resistance: null },
  { shutterSpeed: 250, resistance: null }, { shutterSpeed: 500, resistance: null },
  { shutterSpeed: 1000, resistance: null },
]

const DEFAULT_LM_ROWS: LightMeterRow[] = [
  { evLevel: 6, resistance: null },  { evLevel: 8, resistance: null },
  { evLevel: 10, resistance: null }, { evLevel: 12, resistance: null },
  { evLevel: 14, resistance: null }, { evLevel: 16, resistance: null },
  { evLevel: 18, resistance: null }, { evLevel: 20, resistance: null },
]

function formatShutterDenom(denom: number): string {
  if (denom === 1) return '1s'
  if (denom > 1) return `1/${Math.round(denom)}s`
  return `${Math.round(1 / denom)}s`
}

function fmt(mA: number): string {
  return mA.toFixed(3)
}

function deltaColor(delta: number, avg: number): { bg: string; text: string } {
  const pct = avg > 0 ? Math.abs(delta) / avg : 0
  if (pct <= 0.05) return { bg: '#dcfce7', text: '#166534' }
  if (pct <= 0.15) return { bg: '#fef9c3', text: '#854d0e' }
  return { bg: '#fee2e2', text: '#991b1b' }
}

export function CircuitSimulationSection() {
  const [apertureRows] = useLocalStorage<ApertureRow[]>('k1000:aperture', DEFAULT_APERTURE_ROWS)
  const [shutterRows] = useLocalStorage<ShutterRow[]>('k1000:shutter', DEFAULT_SHUTTER_ROWS)
  const [lmRows] = useLocalStorage<LightMeterRow[]>('k1000:lightmeter', DEFAULT_LM_ROWS)

  const apertureResult = analyzeApertureResistor(apertureRows)
  const shutterResult = analyzeShutterResistor(shutterRows)
  const lmResult = analyzeLightMeterCircuit(lmRows)

  const canSimulate = apertureResult !== null && shutterResult !== null && lmResult !== null
  const series = canSimulate
    ? simulateEVSeries(apertureResult, shutterResult, lmResult)
    : null

  return (
    <section className="analysis-section">
      <h2>4. Circuit Simulation</h2>
      <p className="section-description">
        Simulates the galvanometer coil currents at f/8 across EV 16–1 using a nominal 1.5 V
        supply. The needle centres when coil currents are equal; a positive ΔI means coil 1
        (light sensor) draws more current, negative means coil 2 (exposure) draws more.
      </p>

      <div className="circuit-diagram-wrap">
        <CircuitDiagram />
      </div>

      {!canSimulate && (
        <p className="sim-notice">
          Enter resistance measurements in all three sections above to enable simulation.
        </p>
      )}

      {series && (
        <div className="sim-result">
          <h3 className="sim-table-title">Coil Current Simulation — f/8, 1.5 V</h3>

          <div className="sim-table-wrap">
            <table className="sim-table">
              <thead>
                <tr>
                  <th>EV</th>
                  <th>Shutter (f/8)</th>
                  <th>I Coil 1 (mA)</th>
                  <th>I Coil 2 (mA)</th>
                  <th>ΔI (mA)</th>
                </tr>
              </thead>
              <tbody>
                {series.map(pt => {
                  const avg = (pt.iCoil1mA + pt.iCoil2mA) / 2
                  const { bg, text } = deltaColor(pt.deltaImA, avg)
                  const sign = pt.deltaImA >= 0 ? '+' : ''
                  return (
                    <tr key={pt.ev}>
                      <td>{pt.ev}</td>
                      <td>{formatShutterDenom(pt.shutterSpeedDenom)}</td>
                      <td>{fmt(pt.iCoil1mA)}</td>
                      <td>{fmt(pt.iCoil2mA)}</td>
                      <td style={{ background: bg, color: text, fontWeight: 600 }}>
                        {sign}{fmt(pt.deltaImA)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="sim-legend">
            <span style={{ background: '#dcfce7', color: '#166534' }}>≤ 5% imbalance</span>
            <span style={{ background: '#fef9c3', color: '#854d0e' }}>≤ 15% imbalance</span>
            <span style={{ background: '#fee2e2', color: '#991b1b' }}>&gt; 15% imbalance</span>
          </div>
        </div>
      )}
    </section>
  )
}

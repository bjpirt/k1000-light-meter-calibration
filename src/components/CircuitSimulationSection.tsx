import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { analyzeApertureResistor, analyzeShutterResistor, analyzeLightMeterCircuit } from '../lib/analysis'
import {
  simulateEVSeries,
  findAdjustmentResistor,
  applyAdjustmentResistor,
} from '../lib/simulation'
import type { ApertureRow, ShutterRow, LightMeterRow } from '../lib/types'
import { useLocalStorage } from '../lib/useLocalStorage'
import { CircuitDiagram } from './CircuitDiagram'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend)

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
  { evLevel: 16, resistance: null }, { evLevel: 15, resistance: null },
  { evLevel: 14, resistance: null }, { evLevel: 13, resistance: null },
  { evLevel: 12, resistance: null }, { evLevel: 11, resistance: null },
  { evLevel: 10, resistance: null }, { evLevel: 9, resistance: null },
  { evLevel: 8, resistance: null },  { evLevel: 7, resistance: null },
  { evLevel: 6, resistance: null },
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

function formatResistance(r: number): string {
  if (r >= 1e6) return `${(r / 1e6).toFixed(2)} MΩ`
  if (r >= 1000) return `${(r / 1000).toFixed(1)} kΩ`
  return `${Math.round(r)} Ω`
}

/** Exposure error in stops: log₂(I₁/I₂). Zero = perfectly balanced. */
function evError(iCoil1: number, iCoil2: number): number {
  return iCoil1 > 0 && iCoil2 > 0 ? Math.log2(iCoil1 / iCoil2) : 0
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

  const adj = series ? findAdjustmentResistor(series) : null
  const adjustedSeries = series && adj ? applyAdjustmentResistor(series, adj) : null

  return (
    <section className="analysis-section">
      <h2>4. Circuit Simulation</h2>
      <p className="section-description">
        Simulates the galvanometer coil currents at f/8 across EV 16–6 using a nominal 1.5 V
        supply. The needle centres when coil currents are equal; a positive ΔI means coil 1
        (light sensor) draws more current, negative means coil 2 (exposure) draws more.
      </p>

      <div className="circuit-diagram-wrap">
        <CircuitDiagram adjCoil={adj?.connectToCoil} />
      </div>

      {!canSimulate && (
        <p className="sim-notice">
          Enter resistance measurements in all three sections above to enable simulation.
        </p>
      )}

      {series && adj && adjustedSeries && (
        <div className="sim-result">

          {/* ── Recommendation ── */}
          <h3 className="sim-table-title">Recommended Adjustment Resistor</h3>
          <div className="adj-recommendation">
            <div className="adj-value">{formatResistance(adj.resistorValue)}</div>
            <div className="adj-detail">
              Connect in parallel with Coil {adj.connectToCoil}&apos;s external circuit —
              from the positive rail to the Coil {adj.connectToCoil} galvanometer terminal.
            </div>
          </div>

          {/* ── Combined current table ── */}
          <h3 className="sim-table-title">Coil Currents — f/8, 1.5 V</h3>
          <div className="sim-table-wrap">
            <table className="sim-table">
              <thead>
                <tr>
                  <th rowSpan={2}>EV</th>
                  <th rowSpan={2}>Shutter</th>
                  <th rowSpan={2}>I Coil 1 (mA)</th>
                  <th rowSpan={2}>I Coil 2 (mA)</th>
                  <th colSpan={2} style={{ textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>ΔI (mA)</th>
                </tr>
                <tr>
                  <th>Before</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>
                {series.map((pt, i) => {
                  const adjPt = adjustedSeries[i]
                  const avgBefore = (pt.iCoil1mA + pt.iCoil2mA) / 2
                  const avgAfter = (adjPt.iCoil1mA + adjPt.iCoil2mA) / 2
                  const { bg: bgB, text: txB } = deltaColor(pt.deltaImA, avgBefore)
                  const { bg: bgA, text: txA } = deltaColor(adjPt.deltaImA, avgAfter)
                  const signB = pt.deltaImA >= 0 ? '+' : ''
                  const signA = adjPt.deltaImA >= 0 ? '+' : ''
                  return (
                    <tr key={pt.ev}>
                      <td>{pt.ev}</td>
                      <td>{formatShutterDenom(pt.shutterSpeedDenom)}</td>
                      <td>{fmt(pt.iCoil1mA)}</td>
                      <td>{fmt(pt.iCoil2mA)}</td>
                      <td style={{ background: bgB, color: txB, fontWeight: 600 }}>
                        {signB}{fmt(pt.deltaImA)}
                      </td>
                      <td style={{ background: bgA, color: txA, fontWeight: 600 }}>
                        {signA}{fmt(adjPt.deltaImA)}
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

          {/* ── Exposure error chart ── */}
          <div className="chart-card" style={{ marginTop: '1rem' }}>
            <h4>Exposure Error Before &amp; After Adjustment (stops)</h4>
            <Chart
              type="line"
              data={{
                datasets: [
                  {
                    label: 'Before',
                    data: series.map(pt => ({ x: pt.ev, y: evError(pt.iCoil1mA, pt.iCoil2mA) })),
                    borderColor: 'rgba(239, 68, 68, 0.85)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    tension: 0.3,
                  },
                  {
                    label: 'After',
                    data: adjustedSeries.map(pt => ({ x: pt.ev, y: evError(pt.iCoil1mA, pt.iCoil2mA) })),
                    borderColor: 'rgba(34, 197, 94, 0.85)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    tension: 0.3,
                  },
                  {
                    label: 'Zero',
                    data: [{ x: 6, y: 0 }, { x: 16, y: 0 }],
                    borderColor: 'rgba(148, 163, 184, 0.6)',
                    borderWidth: 1,
                    borderDash: [5, 4],
                    pointRadius: 0,
                  },
                ],
              }}
              options={{
                animation: false,
                plugins: {
                  legend: { position: 'top' },
                  tooltip: {
                    callbacks: {
                      label: ctx => `${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(3)} stops`,
                    },
                  },
                },
                scales: {
                  x: {
                    type: 'linear',
                    title: { display: true, text: 'EV' },
                    ticks: { stepSize: 1 },
                    min: 5.5,
                    max: 16.5,
                  },
                  y: {
                    title: { display: true, text: 'Exposure error (stops)' },
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart, Bar } from 'react-chartjs-2'
import type { LinearityResult } from '../lib/types'

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  Tooltip,
  Legend,
)

interface Props {
  xValues: number[]
  yValues: number[]
  result: LinearityResult
  xLabel: string
  title: string
}

export function LinearityChart({ xValues, yValues, result, xLabel, title }: Props) {
  const residualColors = result.residuals.map(r =>
    r > 0 ? 'rgba(59, 130, 246, 0.7)' : 'rgba(239, 68, 68, 0.7)',
  )

  return (
    <div className="chart-pair">
      <div className="chart-card">
        <h4>
          {title} — R² = {result.rSquared.toFixed(4)}
        </h4>
        <Chart
          type="scatter"
          data={{
            datasets: [
              {
                type: 'scatter' as const,
                label: 'Measured',
                data: xValues.map((x, i) => ({ x, y: yValues[i] })),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                pointRadius: 5,
              },
              {
                type: 'line' as const,
                label: 'Linear fit',
                data: xValues.map((x, i) => ({ x, y: result.fit[i] })),
                borderColor: 'rgba(239, 68, 68, 0.8)',
                borderWidth: 2,
                borderDash: [6, 3],
                pointRadius: 0,
                fill: false,
              },
            ],
          }}
          options={{
            animation: false,
            plugins: { legend: { position: 'top' } },
            scales: {
              x: { type: 'linear', title: { display: true, text: xLabel } },
              y: { title: { display: true, text: 'Resistance (Ω)' } },
            },
          }}
        />
      </div>
      <div className="chart-card">
        <h4>Residuals — RMS = {result.rmsError.toFixed(1)} Ω</h4>
        <Bar
          data={{
            labels: xValues.map(x => x.toFixed(2)),
            datasets: [
              {
                label: 'Residual (Ω)',
                data: result.residuals,
                backgroundColor: residualColors,
              },
            ],
          }}
          options={{
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { title: { display: true, text: xLabel } },
              y: { title: { display: true, text: 'Residual (Ω)' } },
            },
          }}
        />
      </div>
    </div>
  )
}

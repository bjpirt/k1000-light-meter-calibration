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
import type { EVErrorResult } from '../lib/types'

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  CategoryScale,
  Tooltip,
  Legend,
)

function errorColor(absError: number): string {
  if (absError > 0.1) return 'rgba(239, 68, 68, 0.8)'   // red
  if (absError > 0.05) return 'rgba(245, 158, 11, 0.8)' // orange
  return 'rgba(34, 197, 94, 0.8)'                        // green
}

interface Props {
  result: EVErrorResult
}

export function EVErrorChart({ result }: Props) {
  const { evLevels, measuredResistances, expectedResistances, evErrors } = result

  return (
    <div className="chart-pair">
      <div className="chart-card">
        <h4>Measured vs Expected Resistance</h4>
        <Chart
          type="scatter"
          data={{
            datasets: [
              {
                type: 'scatter' as const,
                label: 'Measured',
                data: evLevels.map((ev, i) => ({ x: ev, y: measuredResistances[i] })),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                pointRadius: 6,
              },
              {
                type: 'line' as const,
                label: 'Linear fit',
                data: evLevels.map((ev, i) => ({ x: ev, y: expectedResistances[i] })),
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
              x: { type: 'linear', title: { display: true, text: 'EV Level' } },
              y: { title: { display: true, text: 'Resistance (Ω)' } },
            },
          }}
        />
      </div>
      <div className="chart-card">
        <h4>
          Exposure Error — max {result.maxError.toFixed(3)} stops
        </h4>
        <Bar
          data={{
            labels: evLevels.map(ev => String(ev)),
            datasets: [
              {
                label: 'EV Error (stops)',
                data: evErrors,
                backgroundColor: evErrors.map(e => errorColor(Math.abs(e))),
                borderColor: evErrors.map(e => errorColor(Math.abs(e)).replace('0.8', '1')),
                borderWidth: 1,
              },
            ],
          }}
          options={{
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => `${(ctx.raw as number).toFixed(3)} stops`,
                },
              },
            },
            scales: {
              x: { title: { display: true, text: 'EV Level' } },
              y: { title: { display: true, text: 'EV Error (stops)' } },
            },
          }}
        />
      </div>
    </div>
  )
}

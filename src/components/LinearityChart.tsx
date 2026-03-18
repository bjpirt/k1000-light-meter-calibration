import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import type { LinearityResult } from '../lib/types'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend)

interface Props {
  xValues: number[]
  yValues: number[]
  result: LinearityResult
  xLabel: string
  title: string
}

export function LinearityChart({ xValues, yValues, result, xLabel, title }: Props) {
  return (
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
  )
}

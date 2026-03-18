import { useState } from 'react'
import { ApertureSection } from './components/ApertureSection'
import { ShutterSection } from './components/ShutterSection'
import { LightMeterSection } from './components/LightMeterSection'
import { ReportSection } from './components/ReportSection'
import type { ApertureResult, ShutterResult, LightMeterResult, EVErrorResult, AdjustmentResult } from './lib/types'
import './App.css'

export function App() {
  const [aperture, setAperture] = useState<ApertureResult | null>(null)
  const [shutter, setShutter] = useState<ShutterResult | null>(null)
  const [lightMeter, setLightMeter] = useState<LightMeterResult | null>(null)
  const [evErrors, setEvErrors] = useState<EVErrorResult | null>(null)
  const [adjustment, setAdjustment] = useState<AdjustmentResult | null>(null)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pentax K1000 Light Meter Calibration</h1>
        <p className="app-subtitle">
          Analyze variable resistor linearity and calculate exposure errors
        </p>
      </header>

      <main className="app-main">
        <ApertureSection onResult={setAperture} />
        <ShutterSection onResult={setShutter} />
        <LightMeterSection
          onResult={setLightMeter}
          onEVErrors={setEvErrors}
          onAdjustment={setAdjustment}
        />
        <ReportSection
          aperture={aperture}
          shutter={shutter}
          lightMeter={lightMeter}
          evErrors={evErrors}
          adjustment={adjustment}
        />
      </main>

      <footer className="app-footer">
        <p>All calculations run locally in your browser — no data is sent anywhere.</p>
      </footer>
    </div>
  )
}

export default App

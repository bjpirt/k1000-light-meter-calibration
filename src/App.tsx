import { useState } from 'react'
import { ApertureSection } from './components/ApertureSection'
import { ShutterSection } from './components/ShutterSection'
import { LightMeterSection } from './components/LightMeterSection'
import './App.css'

const STORAGE_KEYS = ['k1000:aperture', 'k1000:shutter', 'k1000:lightmeter']

export function App() {
  const [sessionKey, setSessionKey] = useState(0)

  function handleClearAll() {
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k))
    setSessionKey(k => k + 1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1>Pentax K1000 Light Meter Calibration</h1>
            <p className="app-subtitle">
              Analyze variable resistor linearity
            </p>
          </div>
          <button className="clear-btn" onClick={handleClearAll}>
            Clear all data
          </button>
        </div>
      </header>

      <main className="app-main">
        <ApertureSection key={`aperture-${sessionKey}`} />
        <ShutterSection key={`shutter-${sessionKey}`} />
        <LightMeterSection key={`lightmeter-${sessionKey}`} />
      </main>

      <footer className="app-footer">
        <p>All calculations run locally in your browser — no data is sent anywhere.</p>
      </footer>
    </div>
  )
}

export default App

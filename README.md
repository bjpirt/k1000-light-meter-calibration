# Pentax K1000 Light Meter Calibration

A browser-based tool for analyzing and calibrating the variable resistors in a Pentax K1000 camera's light meter circuit. Runs entirely client-side — no installation, no server.

## What it does

1. **Aperture resistor linearity** — tests 4 f-stop transformations (f, f², log(f), 1/f²) and picks the best fit, revealing the cam's mechanical design
2. **Shutter speed resistor linearity** — analyzes on a log₂ scale since shutter speeds form a geometric series
3. **Light meter circuit** — checks EV vs resistance linearity and calculates per-point exposure errors in stops
4. **Adjustment resistor recommendation** — finds the optimal trimmer potentiometer value (1–10 kΩ) to minimize maximum EV error

## Usage

```bash
npm install
npm run dev
```

Open the browser, enter measured resistances in the editable grids (paste from Excel/spreadsheets works), then click Analyze on each section. A summary report can be copied to clipboard at the end.

## Key concepts

### EV error

Exposure error is measured in stops: `error = log₂(measured / expected)`. Each stop is a doubling/halving of light. The tool colour-codes errors green (≤ 0.05), orange (≤ 0.1), red (> 0.1).

### R² quality thresholds

| R² | Rating |
| --- | --- |
| ≥ 0.99 | Excellent |
| ≥ 0.95 | Good |
| ≥ 0.90 | Acceptable |
| < 0.90 | Poor — resistor likely needs attention |

### Adjustment resistor
A trimmer potentiometer wired in parallel with the main circuit shifts the overall response. The optimizer searches the full 1–10 kΩ range to find the value that minimises maximum EV error across all measurement points.

## Development

```bash
npm run dev          # dev server with HMR
npm test             # run tests (vitest)
npm run test:watch   # watch mode
npm run build        # production build
```

## Project structure

```
src/
  lib/
    analysis.ts        # linearRegression, analyzeAperture/Shutter/LightMeter, calculateEVErrors
    optimization.ts    # findOptimalAdjustmentResistor
    types.ts           # shared TypeScript interfaces
    *.test.ts          # unit tests for all pure functions
  components/
    DataTable.tsx      # editable grid with Excel paste support
    LinearityChart.tsx # scatter + fit line + residuals
    EVErrorChart.tsx   # colour-coded EV error bars
    MetricsBadge.tsx   # R², RMS, linearity% display
    ApertureSection.tsx
    ShutterSection.tsx
    LightMeterSection.tsx
    ReportSection.tsx
  App.tsx
```

## Technical notes

- All calculations run in the browser — no data leaves your machine
- Linear regression implemented natively (~30 lines); no heavy math library
- Optimization uses brute-force sampling over 10 000 resistor values (<1 ms)
- EV calculations use log₂ throughout

## References

- Pentax K1000 Service Manual
- Photography exposure theory
- Circuit analysis fundamentals

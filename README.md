# Pentax K1000 Light Meter Calibration

A Jupyter notebook-based tool for analyzing and calibrating the variable resistors in a Pentax K1000 camera's light meter circuit.

## Overview

The Pentax K1000 is a mechanical SLR camera with a built-in light meter that relies on several variable resistors to control exposure. This calibration tool helps you:

1. **Check variable resistor linearity** - Verify that aperture, shutter speed, and light meter circuit resistors respond linearly
2. **Analyze non-linear response** - Automatically test multiple mathematical transformations (f², log, 1/f²) to find the best fit
3. **Calculate exposure errors** - Model the complete circuit and determine EV (Exposure Value) errors across the metering range
4. **Recommend adjustments** - Suggest optimal adjustment resistor values to minimize calibration error

## Installation

### Prerequisites
- Python 3.7+
- Jupyter or JupyterLab
- `uv` package manager (or pip)

### Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   uv add numpy pandas scipy matplotlib ipydatagrid
   ```

3. Open the notebook:
   ```bash
   jupyter lab calibration.ipynb
   ```

## Usage

### Workflow

1. **Run cell 2** - Import all libraries and functions
2. **Enter aperture data** (cell 4) - Fill in measured resistances for each f-stop in the interactive grid
3. **Analyze aperture** (cell 5) - Run analysis; automatically finds best transformation (f², log, etc.)
4. **Enter shutter data** (cell 7) - Measure resistance at each shutter speed (at 100 ASA)
5. **Analyze shutter** (cell 8) - Tests log scale since shutter speeds are logarithmic
6. **Enter light meter data** (cell 10) - Measure circuit resistance across EV levels
7. **Analyze light meter** (cell 11) - Tests linearity across the light sensitivity range
8. **Calculate EV error** (cell 13) - Visualizes exposure error at each metering point
9. **Get resistor recommendation** (cell 14) - Suggests optimal adjustment resistor value
10. **View summary** (cell 16) - Complete calibration report

### Data Entry

Each measurement section uses an interactive spreadsheet grid. Simply:
- Click on cells to edit
- Paste values from Excel/spreadsheets
- Run the next cell to analyze

## Key Concepts

### F-Stop Transformations
The aperture resistor analysis automatically tests:
- **f-stop** - Direct f-number (1.4, 2.0, 2.8, etc.)
- **f²** - Aperture area (proportional to light transmission)
- **log(f-stop)** - Logarithmic progression
- **1/f²** - Inverse area (alternative light model)

The transformation with highest R² is used, revealing the K1000's mechanical design.

### EV (Exposure Value)
An EV is one "stop" of exposure. EV = log₂(N²/t) where N is aperture and t is shutter speed.
- Each stop doubles or halves light
- Exposure error in stops = log₂(measured/expected)

### Adjustment Resistor
A trimmer potentiometer (variable resistor) connected in parallel with the main circuit allows fine-tuning to compensate for component drift and manufacturing variations.

## Project Structure

```
k1000-light-meter-calibration/
├── calibration.ipynb              # Main Jupyter notebook
├── k1000_calibration.py           # Core analysis library
├── pyproject.toml                 # Project configuration
├── README.md                       # This file
├── claude.md                       # AI assistant guide
└── __pycache__/                   # Python cache (ignore)
```

## Library Reference

### Main Functions

**analyze_aperture_resistor(aperture_grid)**
- Tests multiple f-stop transformations
- Returns analysis with best-fit parameters

**analyze_shutter_resistor(shutter_grid)**
- Analyzes shutter speed resistor (log scale)
- Returns linearity metrics

**analyze_light_meter_circuit(lightem_grid)**
- Analyzes circuit resistance vs EV linearity
- Returns analysis results

**calculate_ev_errors(lightem_df, lm_analysis)**
- Calculates exposure error at each EV level
- Generates visualization

**recommend_adjustment_resistor(lightem_df)**
- Finds optimal adjustment resistor value
- Returns value in Ω

**generate_calibration_report(...)**
- Creates formatted summary report
- Includes all recommendations

## Interpretation Guide

### R² Value (Linearity)
- **1.0** = Perfect linearity
- **>0.95** = Excellent (acceptable)
- **0.90-0.95** = Good (minor adjustment needed)
- **<0.90** = Poor (resistor may need replacement)

### EV Error
- **±0.05 stops** = Excellent accuracy
- **±0.1 stops** = Acceptable (±10% exposure)
- **>±0.1 stops** = Significant error (adjust resistor)

### Linearity Quality %
- **>99%** = Excellent
- **>95%** = Good
- **>90%** = Acceptable

## Troubleshooting

**"No data plotted" message**
- Make sure you've entered all resistance values in the grid
- Don't leave any blank cells

**ImportError when running cell 2**
- Restart the kernel (Cmd+Shift+P → "Jupyter: Restart Kernel")
- The module cache may be stale

**Grid not appearing**
- Ensure `ipydatagrid` is installed
- Try restarting the kernel

## Future Improvements

Possible enhancements:
- CSV import/export for measurement data
- Tolerance bands for different K1000 variations
- Thermal compensation analysis
- Capacitor aging effects
- Integration with meter testing instruments

## Technical Notes

- All calculations use logarithm base 2 (log₂) for EV calculations
- Least-squares linear regression for all fits
- Scipy's minimize_scalar for optimization
- Matplotlib for visualization

## License

This project is provided as-is for personal use and education.

## References

- Pentax K1000 Service Manual
- Photography exposure theory
- Circuit analysis fundamentals

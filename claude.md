# Claude.md - AI Assistant Guide

This document provides critical context for Claude or other AI assistants working on the K1000 light meter calibration project.

## Project Overview

**Purpose**: Interactive Jupyter notebook for analyzing and calibrating variable resistors in a Pentax K1000 camera light meter.

**Architecture**: Clean separation between:
- UI/data entry: `calibration.ipynb` (16 cells, minimal code)
- Analysis logic: `k1000_calibration.py` (library module)

**Key Principle**: Keep notebook cells minimal - each should call library functions, not contain analysis logic.

## Codebase Structure

### calibration.ipynb (Jupyter Notebook)

**Cell Pattern** (3 sections - aperture, shutter, light meter):
1. Markdown explaining section
2. DataGrid for data entry (editable spreadsheet)
3. Single function call to library

**Key Cells**:
- Cell 2: Imports + library function imports
- Cells 4-5: Aperture section (f-stop data → analyze_aperture_resistor)
- Cells 7-8: Shutter section (speed data → analyze_shutter_resistor)
- Cells 10-11: Light meter section (EV data → analyze_light_meter_circuit)
- Cell 13: EV error visualization (requires light meter data)
- Cell 15: Adjustment resistor recommendation
- Cell 16: Summary report generation

**Important**: When editing notebook cells, always use DataGrid for input and single function calls for analysis. Never add complex logic inline.

### k1000_calibration.py (Library)

**Core Functions**:

```python
analyze_linearity(x_data, y_data, label="Data")
→ dict with 'slope', 'intercept', 'r_squared', 'rms_error', 'max_deviation', 'residuals'
Used by all resistor analysis functions

plot_linearity(x, y, fit, label, x_label, y_label)
→ Creates 2-subplot figure (fit + residuals)

analyze_aperture_resistor(aperture_grid)
→ Tests 4 f-stop transformations (f, f², log(f), 1/f²)
→ Returns analysis with best-fit + comparison table

analyze_shutter_resistor(shutter_grid)
→ Uses log₂ transformation (shutter speeds are logarithmic)
→ Returns linearity analysis

analyze_light_meter_circuit(lightem_grid)
→ Linear analysis of EV vs circuit resistance
→ Returns linearity metrics

calculate_ev_errors(lightem_df, lm_analysis)
→ Computes EV error (log₂ ratio) at each point
→ Generates dual-plot visualization

recommend_adjustment_resistor(lightem_df)
→ Finds optimal resistor value (1-10kΩ range)
→ Returns value in Ω

generate_calibration_report(aperture_analysis, shutter_analysis, lm_analysis, lightem_df, ev_errors, optimal_r)
→ Returns formatted summary report string
```

## Data Structures

### DataGrid Input Format
User enters data via ipydatagrid widget. Extract with:
```python
df = grid.data  # or grid.value for read-only
```

### Analysis Results Dictionary
```python
analysis = {
    'slope': float,
    'intercept': float,
    'r_squared': float,        # 0-1, higher is better
    'rms_error': float,        # Root mean square residual
    'max_deviation': float,    # Max absolute residual
    'linearity_percent': float, # 100*sqrt(1-rms²)
    'residuals': np.array,
    'fit_line': np.array
}
```

### EV Error Format
```python
ev_errors = np.array([...])  # Signed EV error in stops (log₂ ratio)
# Error visualization uses color coding:
# green: |error| <= 0.05
# orange: 0.05 < |error| <= 0.1
# red: |error| > 0.1
```

## Common Modifications

### Adding a New Analysis Function

1. Follow pattern:
   ```python
   def analyze_new_resistor(data_grid):
       df = data_grid.data
       x = np.array(df['X_Column'])
       y = np.array(df['Y_Column'])
       
       # Call core analysis
       analysis = analyze_linearity(x, y, label="New Resistor")
       
       # Custom transformations if needed
       # plot results
       
       return analysis
   ```

2. Add single-cell call in notebook:
   ```python
   new_analysis = analyze_new_resistor(new_grid)
   ```

### Modifying Aperture Analysis

**Current approach** (Message 16): Tests 4 f-stop transformations
- Direct f-stop: `x = f_values`
- Aperture area: `x = f_values**2`
- Log scale: `x = np.log(f_values)`
- Inverse area: `x = 1/(f_values**2)`

To add a transformation:
1. Add to `transformations` dict in `analyze_aperture_resistor()`
2. Test against all f-stop values
3. Compare R² values and print ranking

**Why multiple transformations**: Different mechanical designs of resistor cams produce different curves. Testing reveals which model matches the K1000.

### Handling Missing Data

```python
# Check for empty values
if any(np.isnan(np.array(df['Resistance (Ω)']))):
    print("Error: incomplete data")
    return None

# Extract valid data
valid_mask = ~np.isnan(data)
clean_data = data[valid_mask]
```

## Key Implementation Details

### EV Error Calculation
```python
ev_error = np.log2(measured_resistance / expected_resistance)
```
- Each 1 EV = one "stop" (doubling/halving light)
- Positive error = underexposure
- Negative error = overexposure

### Adjustment Resistor Optimization
Uses `scipy.optimize.minimize_scalar` to find resistor value that minimizes maximum EV error across entire range. Tests 1-10kΩ range with 0.1Ω precision.

### Linearity Quality Metric
```python
linearity_percent = 100 * sqrt(1 - (rms_error/y_range)²)
```
Indicates what % of variation is explained by linear fit (related to R²).

## Dependencies

```
numpy          # Array operations
pandas         # DataFrames
scipy          # stats.linregress, optimize.minimize_scalar
matplotlib     # Plotting
ipydatagrid    # Interactive spreadsheet widget
```

See `pyproject.toml` for version specs.

## Testing Approach

**Manual Testing**:
1. Run notebook top-to-bottom
2. Enter test data in grids
3. Verify plots appear and metrics are reasonable
4. Check that all cells execute without errors

**Test Data Validation**:
- Aperture: 9 f-stop values with varying linearity
- Shutter: 11 speed values with log relationship
- Light meter: 8 EV values with circuit response

**Error Checking**:
- Missing/NaN values → clear error message
- Invalid transformations → fallback to default
- Optimization failures → warning + best attempt result

## Common Issues & Solutions

### Cell Ordering Matters
- Must run cell 2 (imports) first
- Data grids (cells 4, 7, 10) must be filled before analysis cells
- EV error (cell 13) requires light meter data from cell 11

### Kernel Restart Required
After editing `k1000_calibration.py`, restart kernel before re-running analysis cells. Python caches module imports.

### DataGrid Copy/Paste
Users can paste from Excel directly into grids. Data type conversion happens automatically.

### Plot Display Issues
- Matplotlib backend must be set (handled by Jupyter)
- Use `plt.show()` explicitly if needed
- Subplots created with `plt.subplots()` for consistent styling

## Extension Points

### Future Enhancements

1. **CSV I/O**:
   - Add `save_measurements()` / `load_measurements()` functions
   - Store results for comparison over time

2. **Temperature Compensation**:
   - Add thermal analysis functions
   - Test resistor behavior across temperature range

3. **Validation Dashboard**:
   - Interactive slider for adjustment resistor value
   - Real-time EV error recalculation

4. **Hardware Integration**:
   - Interface with resistance measurement device
   - Automated data collection from meter
   - USB connection to Arduino-based tester

### Code Patterns to Follow

- All analysis functions return dicts with standardized keys
- Plotting functions are separate from analysis (`.py` best practice)
- Error messages are user-friendly ("No data entered" not traceback)
- R² threshold for "acceptable" is 0.95 (configurable)

## Performance Considerations

- Current data sets: ~10 points max
- Optimization: 10,000 iterations over 1-10kΩ range
- Entire analysis: <100ms per section
- No performance bottlenecks for typical usage

## Version History

**Current Version**: Multi-transformation aperture analysis + DataGrid UI

**Key Versions**:
- v1: Basic linearity analysis, DataFrame input
- v2: DataGrid for interactive entry + library separation
- v3: Aperture multi-transformation testing (4 models)
- v4: Light meter DataGrid conversion + UI consistency

## When Editing This Project

### Best Practices

1. **Use DataGrid for all data input** - More user-friendly than DataFrame.to_string()
2. **Keep notebook cells <5 lines** - Call library functions instead
3. **Return dicts from analysis functions** - Standardized output format
4. **Include docstrings** - All functions must document parameters and return values
5. **Test with edge cases** - Empty data, single point, perfect fit, bad fit

### Before Committing Changes

- Restart kernel and run notebook top-to-bottom
- Verify all plots render correctly
- Check that DataGrids are editable
- Ensure error messages are helpful
- Update this claude.md if architecture changes

### File Editing Rules

- **Never** add analysis logic to notebook cells
- **Always** move logic to library module
- **Always** import new functions into cell 2
- **Always** call functions from notebook, not inline code
- **Always** use DataGrid for input, not manual DataFrame creation

## Quick Reference

**To add new analysis**:
1. Write function in `k1000_calibration.py`
2. Add import in notebook cell 2
3. Add 2 cells: markdown + function call
4. Test with sample data

**To modify existing analysis**:
1. Edit function in library
2. Restart kernel
3. Re-run notebook cells

**To debug issues**:
1. Check for missing data (NaN values)
2. Verify kernel was restarted after library edits
3. Inspect analysis dict keys and values
4. Check matplotlib backend if plots don't appear

**Data entry workflow**:
1. Fill DataGrid by clicking cells or pasting from Excel
2. Run analysis cell below
3. Review plots and metrics
4. Adjust data if needed, re-run analysis

---

**Last Updated**: March 2026
**Next Review**: After next major feature addition

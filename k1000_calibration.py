"""K1000 Light Meter Calibration Library

Functions and classes for analyzing variable resistor linearity and
calibrating the Pentax K1000 light meter circuit.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats
from scipy.optimize import minimize_scalar


def analyze_linearity(x_values, y_values, label="Data"):
    """
    Analyze linearity of resistance vs control parameter

    Parameters:
    -----------
    x_values : array-like
        Control parameter (f-stop, shutter speed, or EV)
    y_values : array-like
        Measured resistances
    label : str
        Label for the analysis

    Returns:
    --------
    dict
        Dictionary with linearity metrics including:
        - slope, intercept: linear regression parameters
        - r_squared: R² value (1.0 = perfect)
        - rms_error: root mean square error
        - max_deviation: maximum residual
        - linearity_percent: linearity quality percentage
        - std_err: standard error of slope
        - residuals: residual values
        - fit: fitted y values
    """
    # Remove NaN values
    valid_idx = ~(np.isnan(x_values) | np.isnan(y_values))
    x = x_values[valid_idx]
    y = y_values[valid_idx]

    if len(x) < 2:
        return {'error': 'Insufficient data points'}

    # Linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    y_fit = slope * x + intercept

    # Calculate residuals and metrics
    residuals = y - y_fit
    rms_error = np.sqrt(np.mean(residuals**2))
    max_deviation = np.max(np.abs(residuals))
    linearity_percent = (1 - rms_error / np.mean(np.abs(y))) * 100

    return {
        'slope': slope,
        'intercept': intercept,
        'r_squared': r_value**2,
        'rms_error': rms_error,
        'max_deviation': max_deviation,
        'linearity_percent': linearity_percent,
        'std_err': std_err,
        'residuals': residuals,
        'fit': y_fit
    }


def plot_linearity(x_values, y_values, analysis, title=""):
    """
    Plot resistance vs parameter with linear fit

    Parameters:
    -----------
    x_values : array-like
        Control parameter values
    y_values : array-like
        Measured resistances
    analysis : dict
        Result from analyze_linearity()
    title : str
        Title for the plots
    """
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

    # Plot data and fit
    ax1.scatter(x_values, y_values, label='Measured', s=50, alpha=0.7)
    ax1.plot(x_values[~(np.isnan(x_values) | np.isnan(y_values))],
             analysis['fit'], 'r--', label='Linear Fit', linewidth=2)
    ax1.set_xlabel('Control Parameter')
    ax1.set_ylabel('Resistance (Ω)')
    ax1.set_title(f'{title}\nR² = {analysis["r_squared"]:.4f}')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Plot residuals
    ax2.scatter(x_values[~(np.isnan(x_values) | np.isnan(y_values))],
                analysis['residuals'], s=50, alpha=0.7)
    ax2.axhline(y=0, color='r', linestyle='--')
    ax2.set_xlabel('Control Parameter')
    ax2.set_ylabel('Residual (Ω)')
    ax2.set_title(f'Residuals\nRMS Error = {analysis["rms_error"]:.1f} Ω')
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.show()


class K1000CircuitModel:
    """Model of K1000 light meter circuit response"""

    def __init__(self, aperture_params=None, shutter_params=None,
                 lm_circuit_params=None, adjustment_r=0):
        """
        Initialize circuit model with linearity parameters

        Parameters:
        -----------
        aperture_params : dict, optional
            Dict with 'slope', 'intercept' from aperture analysis
        shutter_params : dict, optional
            Dict with 'slope', 'intercept' from shutter analysis
        lm_circuit_params : dict, optional
            Dict with 'slope', 'intercept' from circuit analysis
        adjustment_r : float, optional
            Adjustment resistor value (Ω)
        """
        self.aperture_params = aperture_params or {'slope': 1.0, 'intercept': 0}
        self.shutter_params = shutter_params or {'slope': 1.0, 'intercept': 0}
        self.lm_circuit_params = lm_circuit_params or {'slope': 1.0, 'intercept': 0}
        self.adjustment_r = adjustment_r

    def calculate_meter_voltage(self, ev_level):
        """
        Calculate expected meter voltage for given EV

        Parameters:
        -----------
        ev_level : float
            EV (Exposure Value) level

        Returns:
        --------
        float
            Expected voltage (proportional to light intensity)
        """
        # Voltage is proportional to light intensity (which follows 2^EV relationship)
        return 2 ** ev_level

    def calculate_ev_error(self, measured_resistance, expected_resistance):
        """
        Calculate exposure error in EV stops based on meter resistance

        Parameters:
        -----------
        measured_resistance : float
            Actual measured meter resistance
        expected_resistance : float
            Expected resistance for ideal response

        Returns:
        --------
        float
            EV error in stops (log₂ scale)
        """
        if expected_resistance == 0:
            return 0
        ratio = measured_resistance / expected_resistance
        # Each doubling/halving of current = ±1 EV error
        ev_error = np.log2(ratio)
        return ev_error

    def evaluate_at_ev_levels(self, ev_levels):
        """
        Evaluate circuit performance across EV range

        Parameters:
        -----------
        ev_levels : array-like
            Array of EV values to evaluate

        Returns:
        --------
        pd.DataFrame
            Results with expected resistance and EV error at each level
        """
        results = []
        for ev in ev_levels:
            expected_r = self.lm_circuit_params['slope'] * ev + self.lm_circuit_params['intercept']
            ev_error = 0  # Will be updated with actual data
            results.append({
                'EV': ev,
                'Expected_R': expected_r,
                'EV_Error': ev_error
            })
        return pd.DataFrame(results)


def find_optimal_adjustment_resistor(measured_resistances, ev_levels,
                                     base_resistance=None, r_min=1, r_max=10000):
    """
    Find optimal adjustment resistor value that minimizes EV error

    Parameters:
    -----------
    measured_resistances : array-like
        Measured circuit resistances
    ev_levels : array-like
        Corresponding EV levels
    base_resistance : float, optional
        Baseline resistance (if None, uses median)
    r_min, r_max : float
        Search range for adjustment resistor

    Returns:
    --------
    tuple
        (optimal_r, final_error, status)
        - optimal_r: optimal adjustment resistor value in Ω
        - final_error: resulting maximum EV error in stops
        - status: "success" or error message
    """
    # Filter out NaN values
    valid_idx = ~(np.isnan(measured_resistances) | np.isnan(ev_levels))
    meas_r = measured_resistances[valid_idx].astype(float)
    ev_vals = ev_levels[valid_idx].astype(float)

    if len(meas_r) < 2:
        return None, None, "Insufficient data"

    if base_resistance is None:
        base_resistance = np.median(meas_r)

    def calculate_max_error(adjustment_r):
        """Calculate maximum EV error with given adjustment resistor"""
        # Adjusted resistances = measured + parallel combination with adjustment_r
        if adjustment_r == 0:
            adj_r = meas_r
        else:
            adj_r = (meas_r * adjustment_r) / (meas_r + adjustment_r)

        # Fit linear regression to adjusted values
        slope, intercept, r_val, _, _ = stats.linregress(ev_vals, adj_r)
        expected = slope * ev_vals + intercept

        # Calculate EV errors
        errors = np.abs(np.log2(adj_r / expected)) if all(expected > 0) and all(adj_r > 0) else np.full_like(adj_r, 999)
        return np.max(errors)

    # Find optimal adjustment resistor
    result = minimize_scalar(calculate_max_error, bounds=(r_min, r_max), method='bounded')

    optimal_r = result.x
    final_error = result.fun

    return optimal_r, final_error, "success"


def analyze_aperture_resistor(aperture_grid):
    """
    Analyze aperture variable resistor linearity using optimal transformation

    Tests multiple f-stop transformations to find the most linear relationship:
    - f-stop (linear): direct f-number
    - f²: aperture area (light transmission ~ 1/f²)
    - log(f-stop): logarithmic scale
    - 1/f²: inverse aperture area

    Parameters:
    -----------
    aperture_grid : DataGrid
        Interactive datagrid with F-Stop and Resistance columns

    Returns:
    --------
    dict
        Analysis results from analyze_linearity() with best transformation
    """
    aperture_df = aperture_grid.data
    f_stops = np.array(aperture_df['F-Stop'])
    resistances = np.array(aperture_df['Resistance (Ω)'])

    # Skip analysis if no data
    if any(np.isnan(resistances)):
        print("=== APERTURE RESISTOR LINEARITY ANALYSIS ===")
        print("No data plotted - please enter resistance measurements first.")
        # Return a minimal analysis for upstream use
        return {
            'slope': 0, 'intercept': 0, 'r_squared': 0,
            'rms_error': 0, 'max_deviation': 0, 'linearity_percent': 0,
            'std_err': 0, 'residuals': np.array([]), 'fit': np.array([]),
            'transformation': 'f-stop'
        }

    # Test different transformations
    transformations = {
        'f-stop': f_stops,
        'f²': f_stops ** 2,
        'log(f-stop)': np.log(f_stops),
        '1/f²': 1 / (f_stops ** 2)
    }

    results = {}
    for name, x_values in transformations.items():
        analysis = analyze_linearity(x_values, resistances, label=f"Aperture ({name})")
        results[name] = analysis

    # Find best transformation (highest R²)
    best_name = max(results.keys(), key=lambda k: results[k]['r_squared'])
    aperture_analysis = results[best_name]
    aperture_analysis['transformation'] = best_name

    print("=== APERTURE RESISTOR LINEARITY ANALYSIS ===")
    print(f"Transformation tested: f-stop, f², log(f-stop), 1/f²")
    print(f"Best fit: {best_name}\n")
    print(f"R² Value: {aperture_analysis['r_squared']:.4f} (1.0 = perfect linearity)")
    print(f"RMS Error: {aperture_analysis['rms_error']:.2f} Ω")
    print(f"Maximum Deviation: {aperture_analysis['max_deviation']:.2f} Ω")
    print(f"Linearity: {aperture_analysis['linearity_percent']:.2f}%")
    print(f"Slope: {aperture_analysis['slope']:.4f} Ω/{best_name}")

    # Print comparison of all transformations
    print("\nComparison of all transformations:")
    for name in sorted(results.keys(), key=lambda k: results[k]['r_squared'], reverse=True):
        print(f"  {name:15s}: R² = {results[name]['r_squared']:.4f}")

    # Plot best transformation
    x_values = transformations[best_name]
    plot_linearity(
        x_values,
        resistances,
        aperture_analysis,
        f"Aperture Variable Resistor ({best_name})"
    )

    return aperture_analysis


def analyze_shutter_resistor(shutter_grid):
    """
    Analyze shutter speed variable resistor linearity

    Parameters:
    -----------
    shutter_grid : DataGrid
        Interactive datagrid with Shutter Speed and Resistance columns

    Returns:
    --------
    dict
        Analysis results from analyze_linearity()
    """
    shutter_df = shutter_grid.data
    shutter_log = np.log2(np.array(shutter_df['Shutter Speed (1/s)']))

    shutter_analysis = analyze_linearity(
        shutter_log,
        np.array(shutter_df['Resistance (Ω)'])
    )

    print("=== SHUTTER SPEED RESISTOR LINEARITY ANALYSIS ===")
    print(f"R² Value: {shutter_analysis['r_squared']:.4f} (1.0 = perfect linearity)")
    print(f"RMS Error: {shutter_analysis['rms_error']:.2f} Ω")
    print(f"Maximum Deviation: {shutter_analysis['max_deviation']:.2f} Ω")
    print(f"Linearity: {shutter_analysis['linearity_percent']:.2f}%")
    print(f"Slope: {shutter_analysis['slope']:.4f} Ω/LOG₂(speed)")

    # Plot if data available
    if not any(np.isnan(np.array(shutter_df['Resistance (Ω)']))):
        plot_linearity(
            shutter_log,
            np.array(shutter_df['Resistance (Ω)']),
            shutter_analysis,
            "Shutter Speed Variable Resistor (log scale)"
        )
    else:
        print("\nNo data plotted - please enter resistance measurements first.")

    return shutter_analysis


def analyze_light_meter_circuit(lightem_grid):
    """
    Analyze light meter circuit resistance linearity

    Parameters:
    -----------
    lightem_grid : DataGrid
        Interactive datagrid with EV Level and Circuit Resistance columns

    Returns:
    --------
    dict
        Analysis results from analyze_linearity()
    """
    lightem_df = lightem_grid.data
    lm_analysis = analyze_linearity(
        np.array(lightem_df['EV Level']),
        np.array(lightem_df['Circuit Resistance (Ω)'])
    )

    print("=== LIGHT METER CIRCUIT LINEARITY ANALYSIS ===")
    print(f"R² Value: {lm_analysis['r_squared']:.4f} (1.0 = perfect linearity)")
    print(f"RMS Error: {lm_analysis['rms_error']:.2f} Ω")
    print(f"Maximum Deviation: {lm_analysis['max_deviation']:.2f} Ω")
    print(f"Linearity: {lm_analysis['linearity_percent']:.2f}%")
    print(f"Slope: {lm_analysis['slope']:.4f} Ω/EV")

    # Plot if data available
    if not any(np.isnan(np.array(lightem_df['Circuit Resistance (Ω)']))):
        plot_linearity(
            np.array(lightem_df['EV Level']),
            np.array(lightem_df['Circuit Resistance (Ω)']),
            lm_analysis,
            "Light Meter Circuit Resistance"
        )
    else:
        print("\nNo data plotted - please enter resistance measurements first.")

    return lm_analysis


def calculate_ev_errors(lightem_df, lm_analysis):
    """
    Calculate and visualize EV errors across the measurement range

    Parameters:
    -----------
    lightem_df : pd.DataFrame
        Light meter data with EV levels and circuit resistances
    lm_analysis : dict
        Analysis results from analyze_light_meter_circuit()

    Returns:
    --------
    np.ndarray or None
        EV error values at each measurement point, or None if no data
    """
    if any(np.isnan(np.array(lightem_df['Circuit Resistance (Ω)']))):
        print("No light meter data entered yet. Please fill in measurements to see EV error analysis.")
        return None

    # Calculate EV errors from measured vs ideal linear relationship
    measured_r = np.array(lightem_df['Circuit Resistance (Ω)'])
    ev_levels = np.array(lightem_df['EV Level'])

    # Expected resistance following perfect linear relationship
    expected_r = lm_analysis['slope'] * ev_levels + lm_analysis['intercept']

    # Calculate EV error for each measurement
    ev_errors = []
    for meas, exp in zip(measured_r, expected_r):
        if exp > 0 and meas > 0:
            ev_error = np.log2(meas / exp)
        else:
            ev_error = 0
        ev_errors.append(ev_error)

    ev_errors = np.array(ev_errors)

    # Create visualization
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4))

    # Plot 1: Measured vs Expected Resistance
    ax1.scatter(ev_levels, measured_r, label='Measured', s=80, alpha=0.7, color='blue')
    ax1.plot(ev_levels, expected_r, 'r--', label='Linear Fit', linewidth=2)
    ax1.set_xlabel('EV Level')
    ax1.set_ylabel('Resistance (Ω)')
    ax1.set_title('Light Meter Circuit: Measured vs Expected Resistance')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Plot 2: EV Error
    colors = ['red' if e > 0.1 else 'orange' if e > 0.05 else 'green' for e in np.abs(ev_errors)]
    ax2.bar(ev_levels, ev_errors, color=colors, alpha=0.7, edgecolor='black')
    ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
    ax2.axhline(y=0.1, color='red', linestyle='--', linewidth=1, alpha=0.5, label='±0.1 EV threshold')
    ax2.set_xlabel('EV Level')
    ax2.set_ylabel('EV Error (stops)')
    ax2.set_title('Exposure Error Across EV Range')
    ax2.legend()
    ax2.grid(True, alpha=0.3, axis='y')

    plt.tight_layout()
    plt.show()

    # Print error statistics
    print("\n=== EV ERROR ANALYSIS ===")
    print(f"Maximum EV Error: {np.max(np.abs(ev_errors)):.3f} stops")
    print(f"RMS EV Error: {np.sqrt(np.mean(ev_errors**2)):.3f} stops")
    print(f"Mean Signed Error: {np.mean(ev_errors):.3f} stops")
    print(f"\nError Distribution:")
    print(f"  Within ±0.05 EV: {np.sum(np.abs(ev_errors) <= 0.05)} points")
    print(f"  Within ±0.1 EV:  {np.sum(np.abs(ev_errors) <= 0.1)} points")
    print(f"  > ±0.1 EV:       {np.sum(np.abs(ev_errors) > 0.1)} points")

    return ev_errors


def recommend_adjustment_resistor(lightem_df):
    """
    Calculate optimal adjustment resistor value

    Parameters:
    -----------
    lightem_df : pd.DataFrame
        Light meter data with EV levels and circuit resistances

    Returns:
    --------
    float or None
        Optimal resistance value in Ω, or None if insufficient data
    """
    if any(np.isnan(np.array(lightem_df['Circuit Resistance (Ω)']))):
        print("Please enter light meter circuit resistance measurements first.")
        return None

    measured_r = np.array(lightem_df['Circuit Resistance (Ω)'], dtype=float)
    ev_vals = np.array(lightem_df['EV Level'], dtype=float)

    optimal_r, max_error, status = find_optimal_adjustment_resistor(measured_r, ev_vals)

    print("=== ADJUSTMENT RESISTOR RECOMMENDATION ===")
    if status == "success":
        print(f"Optimal adjustment resistor: {optimal_r:.1f} Ω")
        print(f"Maximum EV error with adjustment: {max_error:.3f} stops")
        print(f"\nConfiguration suggestions:")
        print(f"  - Use {optimal_r:.0f} Ω trimmer potentiometer (closest standard value)")
        print(f"  - Connect in parallel with main circuit for fine adjustment")
        print(f"  - Expected accuracy: ±{max_error*2:.2f} EV (±{max_error*2*100:.1f}% exposure error)")
        return optimal_r
    else:
        print("Cannot calculate recommendation - insufficient data")
        return None


def generate_calibration_report(aperture_analysis, shutter_analysis, lm_analysis,
                                lightem_df, ev_errors=None, optimal_r=None):
    """
    Generate a formatted summary report of calibration analysis

    Parameters:
    -----------
    aperture_analysis : dict
        Result from analyze_linearity() for aperture
    shutter_analysis : dict
        Result from analyze_linearity() for shutter
    lm_analysis : dict
        Result from analyze_linearity() for light meter
    lightem_df : pd.DataFrame
        Light meter data with circuit resistances and EV levels
    ev_errors : array-like, optional
        EV errors across measured points
    optimal_r : float, optional
        Recommended adjustment resistor value

    Returns:
    --------
    str
        Formatted calibration report
    """
    report = """
╔════════════════════════════════════════════════════════════════╗
║         PENTAX K1000 LIGHT METER CALIBRATION REPORT           ║
╚════════════════════════════════════════════════════════════════╝

1. APERTURE RESISTOR LINEARITY
   ─────────────────────────────
"""
    report += f"   R² (Linearity):        {aperture_analysis['r_squared']:.4f}\n"
    report += f"   RMS Error:             {aperture_analysis['rms_error']:.2f} Ω\n"
    report += f"   Maximum Deviation:     {aperture_analysis['max_deviation']:.2f} Ω\n"
    report += f"   Linearity Quality:     {aperture_analysis['linearity_percent']:.1f}%\n"

    report += """
2. SHUTTER SPEED RESISTOR LINEARITY
   ──────────────────────────────────
"""
    report += f"   R² (Linearity):        {shutter_analysis['r_squared']:.4f}\n"
    report += f"   RMS Error:             {shutter_analysis['rms_error']:.2f} Ω\n"
    report += f"   Maximum Deviation:     {shutter_analysis['max_deviation']:.2f} Ω\n"
    report += f"   Linearity Quality:     {shutter_analysis['linearity_percent']:.1f}%\n"

    report += """
3. LIGHT METER CIRCUIT ANALYSIS
   ────────────────────────────
"""
    report += f"   R² (Linearity):        {lm_analysis['r_squared']:.4f}\n"
    report += f"   RMS Error:             {lm_analysis['rms_error']:.2f} Ω\n"
    report += f"   Maximum Deviation:     {lm_analysis['max_deviation']:.2f} Ω\n"
    report += f"   Linearity Quality:     {lm_analysis['linearity_percent']:.1f}%\n"

    if ev_errors is not None and len(ev_errors) > 0:
        report += """
4. EV ERROR ANALYSIS
   ──────────────────
"""
        report += f"   Maximum EV Error:      {np.max(np.abs(ev_errors)):.3f} stops\n"
        report += f"   RMS EV Error:          {np.sqrt(np.mean(ev_errors**2)):.3f} stops\n"
        report += f"   Points within ±0.1 EV: {np.sum(np.abs(ev_errors) <= 0.1)}/{len(ev_errors)}\n"

    report += """
5. RECOMMENDATIONS
   ────────────────
"""

    # Generate recommendations based on linearity values
    recommendations = []

    if aperture_analysis['r_squared'] < 0.95:
        recommendations.append("   • Aperture resistor may need adjustment or replacement")
    else:
        recommendations.append("   • Aperture resistor linearity is acceptable")

    if shutter_analysis['r_squared'] < 0.95:
        recommendations.append("   • Shutter speed resistor may need adjustment")
    else:
        recommendations.append("   • Shutter speed resistor linearity is acceptable")

    if lm_analysis['r_squared'] < 0.95:
        recommendations.append("   • Light meter circuit linearity needs improvement")
    else:
        recommendations.append("   • Light meter circuit linearity is good")

    for rec in recommendations:
        report += rec + "\n"

    if optimal_r is not None:
        report += f"\n   • Install {optimal_r:.0f} Ω adjustment resistor for optimal calibration\n"

    report += """
═══════════════════════════════════════════════════════════════
"""

    return report

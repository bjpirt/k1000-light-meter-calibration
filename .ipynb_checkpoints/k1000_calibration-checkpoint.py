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

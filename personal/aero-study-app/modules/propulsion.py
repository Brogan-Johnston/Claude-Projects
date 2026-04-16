import numpy as np
import plotly.graph_objects as go
import streamlit as st
from utils.physics import G0, GAMMA, R_AIR


# ---------------------------------------------------------------------------
# Tsiolkovsky rocket equation
# ---------------------------------------------------------------------------

def delta_v(Isp, m0, mf):
    """Δv = Isp * g0 * ln(m0/mf)  (m/s)"""
    return Isp * G0 * np.log(m0 / mf)


def mass_ratio(delta_v_ms, Isp):
    """m0/mf = exp(Δv / (Isp * g0))"""
    return np.exp(delta_v_ms / (Isp * G0))


def propellant_fraction(mr):
    """mp/m0 = 1 - 1/MR"""
    return 1 - 1 / mr


# ---------------------------------------------------------------------------
# Nozzle (isentropic, 1-D)
# ---------------------------------------------------------------------------

def exit_velocity(T0, Isp_actual=None, gamma=GAMMA, R=R_AIR, Pe=101325, P0=1e6):
    """
    Ideal nozzle exit velocity from stagnation temperature.
    Ve = sqrt( 2*gamma/(gamma-1) * R * T0 * [1 - (Pe/P0)^((gamma-1)/gamma)] )
    """
    pressure_term = 1 - (Pe / P0) ** ((gamma - 1) / gamma)
    Ve = np.sqrt(2 * gamma / (gamma - 1) * R * T0 * pressure_term)
    return Ve


def specific_impulse(Ve, g=G0):
    return Ve / g


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------

def plot_tsiolkovsky(Isp_vals=(250, 350, 450), dv_range=(0, 12000)):
    dvs = np.linspace(*dv_range, 300)
    fig = go.Figure()
    colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]
    for Isp, color in zip(Isp_vals, colors):
        mr = mass_ratio(dvs, Isp)
        pf = propellant_fraction(mr) * 100
        fig.add_trace(go.Scatter(
            x=dvs / 1000, y=pf,
            name=f"Isp = {Isp} s",
            line=dict(color=color, width=2)
        ))

    # Reference delta-v lines
    for dv_ref, label in [(1700, "LEO"), (3200, "GTO"), (8900, "Mars")]:
        fig.add_vline(x=dv_ref/1000, line_dash="dot", line_color="gray",
                      annotation_text=label, annotation_position="top right")

    fig.update_layout(
        title="Tsiolkovsky Rocket Equation — Propellant Fraction vs Δv",
        xaxis_title="Δv (km/s)",
        yaxis_title="Propellant Fraction mp/m₀ (%)",
        height=400,
        margin=dict(l=40, r=20, t=50, b=40),
        legend=dict(orientation="h", y=-0.2),
    )
    return fig


def plot_isp_comparison():
    propellants = {
        "Cold gas (N₂)": 70,
        "Monoprop (hydrazine)": 220,
        "Solid motor": 280,
        "LOX/RP-1 (Falcon 9)": 311,
        "LOX/LH₂ (SSME)": 453,
        "Ion thruster (Xenon)": 3000,
    }
    names = list(propellants.keys())
    isps = list(propellants.values())
    colors = ["#aec7e8"] * 4 + ["#1f77b4", "#ff7f0e"]

    fig = go.Figure(go.Bar(
        x=isps, y=names, orientation="h",
        marker_color=["#aec7e8", "#aec7e8", "#aec7e8", "#6baed6", "#2171b5", "#ff7f0e"],
    ))
    fig.update_layout(
        title="Specific Impulse by Propellant Type",
        xaxis_title="Isp (seconds)",
        height=350,
        margin=dict(l=200, r=20, t=50, b=40),
    )
    return fig


# ---------------------------------------------------------------------------
# Streamlit page
# ---------------------------------------------------------------------------

def render():
    st.header("Propulsion")

    tab1, tab2, tab3 = st.tabs(["Rocket Equation", "Propellant Types", "Nozzle Calculator"])

    with tab1:
        st.subheader("Tsiolkovsky Rocket Equation")
        st.markdown(
            r"$$\Delta v = I_{sp} \, g_0 \, \ln\!\left(\frac{m_0}{m_f}\right)$$"
            "\n\nThe rocket equation relates the achievable velocity change to specific impulse "
            "(**Isp** — efficiency of the engine) and the **mass ratio** (initial/final mass). "
            "Higher Isp means less propellant needed for the same Δv."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            Isp1 = st.slider("Isp₁ (s)", 100, 500, 250, key="isp1")
        with col2:
            Isp2 = st.slider("Isp₂ (s)", 100, 500, 350, key="isp2")
        with col3:
            Isp3 = st.slider("Isp₃ (s)", 100, 500, 450, key="isp3")

        dv_max = st.slider("Max Δv (km/s)", 2, 20, 12, key="dv_max")
        st.plotly_chart(plot_tsiolkovsky([Isp1, Isp2, Isp3], (0, dv_max * 1000)),
                        use_container_width=True)

        st.subheader("Single-Stage Calculator")
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            Isp_calc = st.number_input("Isp (s)", 50, 5000, 311, step=10)
        with col_b:
            m0 = st.number_input("Initial mass m₀ (kg)", 100, 1_000_000, 100_000, step=1000)
        with col_c:
            mf = st.number_input("Final (dry) mass mf (kg)", 10, 500_000, 20_000, step=1000)

        if mf >= m0:
            st.error("Final mass must be less than initial mass.")
        else:
            dv_calc = delta_v(Isp_calc, m0, mf)
            mr = m0 / mf
            pf = propellant_fraction(mr)
            r1, r2, r3 = st.columns(3)
            r1.metric("Δv", f"{dv_calc/1000:.2f} km/s")
            r2.metric("Mass ratio m₀/mf", f"{mr:.2f}")
            r3.metric("Propellant fraction", f"{pf*100:.1f}%")

    with tab2:
        st.subheader("Propellant Comparison")
        st.markdown(
            "Isp is often called the *fuel efficiency* of a rocket engine. "
            "Higher Isp means more thrust per unit of propellant burned. "
            "Ion thrusters have very high Isp but extremely low thrust — great for deep space, "
            "not for launch."
        )
        st.plotly_chart(plot_isp_comparison(), use_container_width=True)

    with tab3:
        st.subheader("Ideal Nozzle Exit Velocity")
        st.markdown(
            "For an isentropic (ideal) nozzle, the exit velocity is set by the "
            "stagnation temperature T₀ and the pressure ratio across the nozzle."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            T0 = st.number_input("Stagnation temp T₀ (K)", 500, 5000, 3500, step=100)
        with col2:
            P0_bar = st.number_input("Chamber pressure P₀ (bar)", 1, 300, 100, step=5)
        with col3:
            Pe_bar = st.number_input("Exit pressure Pe (bar)", 0.001, 10.0, 1.0, step=0.1,
                                     format="%.3f")

        P0_pa = P0_bar * 1e5
        Pe_pa = Pe_bar * 1e5
        if Pe_pa >= P0_pa:
            st.error("Exit pressure must be less than chamber pressure.")
        else:
            Ve = exit_velocity(T0, P0=P0_pa, Pe=Pe_pa)
            Isp_nozzle = specific_impulse(Ve)
            col_x, col_y = st.columns(2)
            col_x.metric("Exit velocity Vₑ", f"{Ve:.0f} m/s")
            col_y.metric("Ideal Isp", f"{Isp_nozzle:.0f} s")
            st.caption(
                "Real engines have combustion inefficiencies, nozzle losses, and boundary layers "
                "that reduce Isp below this ideal value (typically by 5–15%)."
            )

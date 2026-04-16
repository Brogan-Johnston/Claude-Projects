import numpy as np
import plotly.graph_objects as go
import streamlit as st
from utils.physics import RHO_SL, dynamic_pressure, reynolds_number, MU_SL


# ---------------------------------------------------------------------------
# NACA 4-digit airfoil geometry
# ---------------------------------------------------------------------------

def naca4_coords(m_pct, p_pct, t_pct, n=200):
    """
    Generate (x, y_upper, y_lower) for a NACA 4-digit airfoil.

    Parameters
    ----------
    m_pct : int   max camber (% chord), e.g. 2 for NACA 24xx
    p_pct : int   position of max camber (tenths of chord), e.g. 4 for NACA x4xx
    t_pct : int   max thickness (% chord), e.g. 12 for NACA xx12
    n     : int   number of points along chord
    """
    m = m_pct / 100.0
    p = p_pct / 10.0
    t = t_pct / 100.0

    # Cosine spacing for better leading-edge resolution
    beta = np.linspace(0, np.pi, n)
    x = 0.5 * (1 - np.cos(beta))

    # Thickness distribution (NACA symmetric formula)
    yt = (t / 0.2) * (
        0.2969 * np.sqrt(x)
        - 0.1260 * x
        - 0.3516 * x**2
        + 0.2843 * x**3
        - 0.1015 * x**4
    )

    # Camber line and gradient
    yc = np.where(
        x < p,
        m / p**2 * (2 * p * x - x**2) if p > 0 else np.zeros_like(x),
        m / (1 - p)**2 * ((1 - 2 * p) + 2 * p * x - x**2) if p > 0 else np.zeros_like(x),
    )
    if p == 0:
        yc = np.zeros_like(x)
        dyc_dx = np.zeros_like(x)
    else:
        dyc_dx = np.where(
            x < p,
            2 * m / p**2 * (p - x),
            2 * m / (1 - p)**2 * (p - x),
        )

    theta = np.arctan(dyc_dx) if p > 0 else np.zeros_like(x)

    xu = x - yt * np.sin(theta)
    yu = yc + yt * np.cos(theta)
    xl = x + yt * np.sin(theta)
    yl = yc - yt * np.cos(theta)

    return xu, yu, xl, yl, x, yc


def plot_airfoil(m_pct, p_pct, t_pct):
    xu, yu, xl, yl, xc, yc = naca4_coords(m_pct, p_pct, t_pct)
    name = f"NACA {m_pct}{p_pct}{t_pct:02d}"

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=xu, y=yu, mode="lines", name="Upper surface",
                             line=dict(color="#1f77b4", width=2)))
    fig.add_trace(go.Scatter(x=xl, y=yl, mode="lines", name="Lower surface",
                             line=dict(color="#ff7f0e", width=2)))
    fig.add_trace(go.Scatter(x=xc, y=yc, mode="lines", name="Camber line",
                             line=dict(color="gray", width=1, dash="dash")))

    fig.update_layout(
        title=f"{name} Airfoil Profile",
        xaxis_title="x/c",
        yaxis_title="y/c",
        yaxis=dict(scaleanchor="x", scaleratio=1),
        height=350,
        margin=dict(l=40, r=20, t=50, b=40),
        legend=dict(orientation="h", y=-0.2),
    )
    return fig


# ---------------------------------------------------------------------------
# Thin-airfoil theory: lift and pitching moment
# ---------------------------------------------------------------------------

def thin_airfoil_cl(alpha_deg, m_pct, p_pct):
    """
    CL from thin-airfoil theory: CL = 2π(α + α_L0)
    Zero-lift angle approximated for cambered NACA 4-digit profiles.
    """
    alpha = np.deg2rad(alpha_deg)
    m = m_pct / 100.0
    p = p_pct / 10.0

    # Zero-lift AoA for NACA 4-digit (thin airfoil theory closed form)
    if p > 0:
        alpha_L0 = -m / p**2 * (p - 0.5 + (1 - p) * np.log(1 - p) - (p / 2) * np.log(p))
    else:
        alpha_L0 = 0.0

    CL = 2 * np.pi * (alpha - alpha_L0)
    return CL, np.rad2deg(alpha_L0)


def drag_polar(CL_arr, CD0=0.02, e=0.8, AR=8):
    """
    CD = CD0 + CL^2 / (pi * e * AR)   (parabolic drag polar)
    """
    return CD0 + CL_arr**2 / (np.pi * e * AR)


def plot_lift_curve(m_pct, p_pct, alpha_range=(-10, 20)):
    alphas = np.linspace(*alpha_range, 200)
    CLs = np.array([thin_airfoil_cl(a, m_pct, p_pct)[0] for a in alphas])
    _, alpha_L0 = thin_airfoil_cl(0, m_pct, p_pct)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=alphas, y=CLs, mode="lines",
                             line=dict(color="#1f77b4", width=2)))
    fig.add_vline(x=0, line_dash="dot", line_color="gray", annotation_text="α=0")
    fig.add_hline(y=0, line_dash="dot", line_color="gray")
    fig.update_layout(
        title="Lift Curve (Thin Airfoil Theory)",
        xaxis_title="Angle of Attack α (°)",
        yaxis_title="Lift Coefficient C_L",
        height=350,
        margin=dict(l=40, r=20, t=50, b=40),
    )
    return fig, round(alpha_L0, 2)


def plot_drag_polar(CD0=0.02, e=0.8, AR=8):
    CLs = np.linspace(-1.5, 2.0, 300)
    CDs = drag_polar(CLs, CD0, e, AR)
    LD = CLs / CDs

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=CDs, y=CLs, mode="lines",
                             line=dict(color="#2ca02c", width=2)))
    fig.update_layout(
        title="Drag Polar",
        xaxis_title="Drag Coefficient C_D",
        yaxis_title="Lift Coefficient C_L",
        height=350,
        margin=dict(l=40, r=20, t=50, b=40),
    )

    LD_max = float(np.max(LD))
    CL_best = float(CLs[np.argmax(LD)])
    return fig, round(LD_max, 2), round(CL_best, 3)


# ---------------------------------------------------------------------------
# Streamlit page
# ---------------------------------------------------------------------------

def render():
    st.header("Aerodynamics")

    tab1, tab2, tab3 = st.tabs(["Airfoil Shape", "Lift Curve", "Drag Polar"])

    with tab1:
        st.subheader("NACA 4-Digit Airfoil Generator")
        st.markdown(
            "A NACA 4-digit airfoil is described by **MPTT** where M = max camber (% chord), "
            "P = position of max camber (×10% chord), TT = max thickness (% chord). "
            "E.g. NACA 2412 → 2% camber at 40% chord, 12% thick."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            m = st.slider("Max camber M (%)", 0, 9, 2,
                          help="0 = symmetric airfoil (e.g. NACA 0012)")
        with col2:
            p = st.slider("Camber position P (×10%)", 0, 9, 4,
                          help="Position of maximum camber along chord")
        with col3:
            t = st.slider("Thickness TT (%)", 1, 40, 12,
                          help="Maximum thickness as % of chord length")

        st.plotly_chart(plot_airfoil(m, p, t), use_container_width=True)

        st.markdown(f"**Airfoil:** NACA {m}{p}{t:02d}")
        if m == 0:
            st.info("M=0: symmetric airfoil — no camber, zero-lift at α=0°.")

    with tab2:
        st.subheader("Lift Curve")
        st.markdown(
            "Thin airfoil theory predicts **C_L = 2π(α − α_L0)** with a lift slope of 2π/rad. "
            "Real airfoils stall before this linear relationship breaks down — stall is not modeled here."
        )

        col1, col2 = st.columns(2)
        with col1:
            m2 = st.slider("Max camber M (%)", 0, 9, 2, key="lc_m")
            p2 = st.slider("Camber position P", 0, 9, 4, key="lc_p")
        with col2:
            alpha_min = st.slider("α min (°)", -20, 0, -10, key="lc_amin")
            alpha_max = st.slider("α max (°)", 5, 30, 20, key="lc_amax")

        fig_lc, al0 = plot_lift_curve(m2, p2, (alpha_min, alpha_max))
        st.plotly_chart(fig_lc, use_container_width=True)
        st.metric("Zero-lift angle α_L0", f"{al0}°")
        st.markdown(
            "**Lift slope:** 2π ≈ 6.28 per radian (≈ 0.110 per degree) — "
            "this is the theoretical maximum; real airfoils are slightly lower due to viscosity."
        )

    with tab3:
        st.subheader("Drag Polar (Parabolic Model)")
        st.markdown(
            r"The parabolic drag polar is $C_D = C_{D0} + \frac{C_L^2}{\pi e AR}$, "
            "where **CD0** is zero-lift drag, **e** is Oswald efficiency, and **AR** is aspect ratio. "
            "Maximum L/D occurs at the tangent from the origin."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            CD0 = st.slider("CD0 (parasitic drag)", 0.005, 0.08, 0.02, step=0.001,
                            format="%.3f")
        with col2:
            e = st.slider("Oswald efficiency e", 0.5, 1.0, 0.8, step=0.01)
        with col3:
            AR = st.slider("Aspect ratio AR", 4, 20, 8)

        fig_dp, LD_max, CL_best = plot_drag_polar(CD0, e, AR)
        st.plotly_chart(fig_dp, use_container_width=True)

        col_a, col_b = st.columns(2)
        col_a.metric("Max L/D", f"{LD_max:.1f}")
        col_b.metric("C_L at max L/D", f"{CL_best:.3f}")

        st.markdown(
            f"**Interpretation:** At CL = {CL_best:.3f} this aircraft produces {LD_max:.1f} N of lift "
            "for every 1 N of drag — the most aerodynamically efficient operating point."
        )

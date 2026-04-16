import numpy as np
import plotly.graph_objects as go
import streamlit as st
from utils.physics import MU_EARTH, R_EARTH, G0


# ---------------------------------------------------------------------------
# Orbital mechanics helpers
# ---------------------------------------------------------------------------

def orbital_velocity(r):
    """Circular orbital speed at radius r (m) from Earth's center."""
    return np.sqrt(MU_EARTH / r)


def orbital_period(r):
    """Period of circular orbit at radius r (s)."""
    return 2 * np.pi * np.sqrt(r**3 / MU_EARTH)


def escape_velocity(r):
    """Escape velocity from radius r."""
    return np.sqrt(2 * MU_EARTH / r)


def hohmann_transfer(r1, r2):
    """
    Hohmann transfer between two circular orbits.
    Returns (dv1, dv2, transfer_time) in m/s and seconds.
    """
    a_transfer = (r1 + r2) / 2
    v1 = orbital_velocity(r1)
    v2 = orbital_velocity(r2)
    v_transfer_peri = np.sqrt(MU_EARTH * (2/r1 - 1/a_transfer))
    v_transfer_apo  = np.sqrt(MU_EARTH * (2/r2 - 1/a_transfer))
    dv1 = v_transfer_peri - v1
    dv2 = v2 - v_transfer_apo
    t_transfer = np.pi * np.sqrt(a_transfer**3 / MU_EARTH)
    return dv1, dv2, t_transfer


def ellipse_xy(a, e, n=300):
    """x, y coordinates of an ellipse with semi-major axis a, eccentricity e."""
    theta = np.linspace(0, 2 * np.pi, n)
    b = a * np.sqrt(1 - e**2)
    x = a * np.cos(theta)
    y = b * np.sin(theta)
    # Shift so focus is at origin
    x -= a * e
    return x, y


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------

def plot_hohmann(r1_km, r2_km):
    r1 = (R_EARTH + r1_km * 1e3)
    r2 = (R_EARTH + r2_km * 1e3)
    a_t = (r1 + r2) / 2
    e_t = (r2 - r1) / (r1 + r2)

    # Scale to Earth radii for display
    RE = R_EARTH
    x_earth = np.linspace(0, 2 * np.pi, 200)

    fig = go.Figure()

    # Earth
    fig.add_trace(go.Scatter(
        x=np.cos(x_earth), y=np.sin(x_earth),
        fill="toself", fillcolor="#4a90d9",
        line=dict(color="#2171b5", width=1), name="Earth",
    ))

    # Initial orbit
    x1, y1 = ellipse_xy(r1/RE, 0)
    fig.add_trace(go.Scatter(x=x1, y=y1, mode="lines",
                             line=dict(color="#2ca02c", width=2, dash="dash"),
                             name=f"Orbit 1 (h={r1_km:.0f} km)"))

    # Final orbit
    x2, y2 = ellipse_xy(r2/RE, 0)
    fig.add_trace(go.Scatter(x=x2, y=y2, mode="lines",
                             line=dict(color="#1f77b4", width=2, dash="dash"),
                             name=f"Orbit 2 (h={r2_km:.0f} km)"))

    # Transfer ellipse
    xt, yt = ellipse_xy(a_t/RE, e_t)
    fig.add_trace(go.Scatter(x=xt, y=yt, mode="lines",
                             line=dict(color="#ff7f0e", width=2),
                             name="Transfer orbit"))

    lim = r2 / RE * 1.15
    fig.update_layout(
        title="Hohmann Transfer Orbit",
        xaxis=dict(range=[-lim, lim], scaleanchor="y", scaleratio=1, showgrid=False),
        yaxis=dict(range=[-lim, lim], showgrid=False),
        height=450,
        margin=dict(l=20, r=20, t=50, b=20),
        legend=dict(orientation="h", y=-0.1),
    )
    return fig


def plot_orbit_params():
    """V, T, escape velocity vs altitude."""
    h_km = np.linspace(200, 40000, 400)
    r = R_EARTH + h_km * 1e3
    V = orbital_velocity(r) / 1000   # km/s
    T = orbital_period(r) / 3600     # hours
    Ve = escape_velocity(r) / 1000   # km/s

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=h_km, y=V,  name="Orbital velocity (km/s)",
                             line=dict(color="#1f77b4", width=2)))
    fig.add_trace(go.Scatter(x=h_km, y=Ve, name="Escape velocity (km/s)",
                             line=dict(color="#d62728", width=2, dash="dot")))

    # Annotate key orbits
    for h_ref, label in [(400, "ISS"), (20200, "GPS"), (35786, "GEO")]:
        r_ref = R_EARTH + h_ref * 1e3
        fig.add_vline(x=h_ref, line_dash="dot", line_color="gray",
                      annotation_text=label)

    fig.update_layout(
        title="Orbital Velocity and Escape Velocity vs Altitude",
        xaxis_title="Altitude (km)",
        yaxis_title="Velocity (km/s)",
        height=380,
        margin=dict(l=40, r=20, t=50, b=40),
    )
    return fig


# ---------------------------------------------------------------------------
# Streamlit page
# ---------------------------------------------------------------------------

def render():
    st.header("Orbital Mechanics")

    tab1, tab2, tab3 = st.tabs(["Orbital Parameters", "Hohmann Transfer", "Calculator"])

    with tab1:
        st.subheader("Orbital Velocity and Period vs Altitude")
        st.markdown(
            "For a circular orbit at altitude *h*, the spacecraft must travel at exactly the speed "
            r"where gravity provides the required centripetal force: $v = \sqrt{\mu/r}$."
        )
        st.plotly_chart(plot_orbit_params(), use_container_width=True)

        col1, col2, col3 = st.columns(3)
        for h_km, label in [(400, "ISS (~400 km)"), (20200, "GPS (~20,200 km)"),
                            (35786, "GEO (~35,786 km)")]:
            r = R_EARTH + h_km * 1e3
            V = orbital_velocity(r) / 1000
            T = orbital_period(r) / 3600
            c = [col1, col2, col3][[(400, "ISS (~400 km)"), (20200, "GPS (~20,200 km)"),
                                    (35786, "GEO (~35,786 km)")].index((h_km, label))]
            c.markdown(f"**{label}**")
            c.metric("Velocity", f"{V:.2f} km/s")
            c.metric("Period", f"{T:.2f} hr")

    with tab2:
        st.subheader("Hohmann Transfer")
        st.markdown(
            "A Hohmann transfer is the most fuel-efficient two-burn maneuver between two coplanar "
            "circular orbits. The spacecraft fires prograde at periapsis (Δv₁) to enter an "
            "elliptical transfer orbit, then fires again at apoapsis (Δv₂) to circularize."
        )

        col1, col2 = st.columns(2)
        with col1:
            h1 = st.number_input("Initial altitude h₁ (km)", 200, 100_000, 400, step=100)
        with col2:
            h2 = st.number_input("Final altitude h₂ (km)", 200, 100_000, 35786, step=100)

        r1 = R_EARTH + h1 * 1e3
        r2 = R_EARTH + h2 * 1e3

        if r1 == r2:
            st.info("Initial and final orbits are the same — no transfer needed.")
        else:
            if r1 > r2:
                r1, r2 = r2, r1
                st.warning("Swapped h₁ and h₂ so that h₁ < h₂.")
                h1, h2 = (r1 - R_EARTH) / 1e3, (r2 - R_EARTH) / 1e3

            dv1, dv2, t_transfer = hohmann_transfer(r1, r2)
            dv_total = abs(dv1) + abs(dv2)

            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Δv₁", f"{dv1:.0f} m/s")
            c2.metric("Δv₂", f"{dv2:.0f} m/s")
            c3.metric("Total Δv", f"{dv_total:.0f} m/s")
            c4.metric("Transfer time", f"{t_transfer/3600:.2f} hr")

            st.plotly_chart(plot_hohmann(h1, h2), use_container_width=True)

    with tab3:
        st.subheader("Orbit Calculator")
        h_in = st.number_input("Altitude (km)", 100, 400_000, 400, step=100)
        r = R_EARTH + h_in * 1e3
        V  = orbital_velocity(r)
        T  = orbital_period(r)
        Ve = escape_velocity(r)

        c1, c2, c3 = st.columns(3)
        c1.metric("Orbital velocity", f"{V/1000:.3f} km/s")
        c2.metric("Period", f"{T/3600:.3f} hr")
        c3.metric("Escape velocity", f"{Ve/1000:.3f} km/s")
        st.caption(f"Radius from Earth center: {r/1e6:.4f} × 10⁶ m | {r/R_EARTH:.3f} R⊕")

import numpy as np
import plotly.graph_objects as go
import streamlit as st
from utils.physics import RHO_SL, G0, dynamic_pressure


# ---------------------------------------------------------------------------
# Basic performance equations
# ---------------------------------------------------------------------------

def stall_speed(W, S, CLmax, rho=RHO_SL):
    """V_stall = sqrt(2W / (rho * S * CLmax))  (m/s)"""
    return np.sqrt(2 * W / (rho * S * CLmax))


def cruise_speed(W, S, CD0, e, AR, rho=RHO_SL):
    """
    Speed for minimum drag (max L/D) — best cruise condition.
    V_md = sqrt( 2W/(rho*S) * sqrt(CD0 / (pi*e*AR)) )^0.5
    """
    k = 1 / (np.pi * e * AR)
    return np.sqrt(2 * W / (rho * S) * np.sqrt(CD0 / k))


def level_flight_envelope(W, S, P_max, CD0, e, AR, rho=RHO_SL, n_pts=300):
    """
    Thrust-required and thrust-available curves vs airspeed.
    P_max: max engine power (W)
    Returns V, T_required, P_required arrays.
    """
    k = 1 / (np.pi * e * AR)
    V = np.linspace(10, 200, n_pts)
    q = dynamic_pressure(rho, V)
    CL = W / (q * S)
    CD = CD0 + k * CL**2
    D = q * S * CD
    P_req = D * V
    return V, D, P_req


# ---------------------------------------------------------------------------
# V-n diagram
# ---------------------------------------------------------------------------

def vn_diagram(W, S, CLmax, n_max, n_min, rho=RHO_SL, V_max=150):
    """
    Compute V-n diagram boundaries.
    Returns dict of arrays for each boundary.
    """
    V = np.linspace(0, V_max, 400)
    q = dynamic_pressure(rho, V)

    # Structural limit lines
    n_pos_struct = np.full_like(V, n_max)
    n_neg_struct = np.full_like(V, n_min)

    # Aerodynamic (stall) boundaries
    n_stall_pos =  q * S * CLmax / W   # positive stall
    n_stall_neg = -q * S * CLmax / W   # negative stall (inverted)

    # Maneuvering speed: where stall and structural limit intersect
    VA = stall_speed(W * n_max, S, CLmax, rho)

    # Positive flight envelope boundary
    n_pos = np.minimum(n_stall_pos, n_max)
    n_neg = np.maximum(n_stall_neg, n_min)

    return V, n_pos, n_neg, VA


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------

def plot_vn(W, S, CLmax, n_max, n_min, V_max):
    V, n_pos, n_neg, VA = vn_diagram(W, S, CLmax, n_max, n_min, V_max=V_max)

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=np.append(V, V[::-1]),
        y=np.append(n_pos, n_neg[::-1]),
        fill="toself", fillcolor="rgba(31,119,180,0.15)",
        line=dict(color="#1f77b4", width=2),
        name="Flight envelope",
    ))
    fig.add_vline(x=VA, line_dash="dash", line_color="#ff7f0e",
                  annotation_text=f"VA = {VA:.1f} m/s",
                  annotation_position="top right")
    fig.add_hline(y=1.0, line_dash="dot", line_color="gray", annotation_text="1g")
    fig.add_hline(y=0.0, line_dash="dot", line_color="gray")

    fig.update_layout(
        title="V-n Diagram (Flight Envelope)",
        xaxis_title="Equivalent Airspeed (m/s)",
        yaxis_title="Load Factor n (g)",
        height=420,
        margin=dict(l=40, r=20, t=50, b=40),
        yaxis=dict(zeroline=True),
    )
    return fig, VA


def plot_thrust_required(W, S, P_max, CD0, e, AR):
    V, D, P_req = level_flight_envelope(W, S, P_max, CD0, e, AR)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=V, y=D/1000, name="Thrust required (kN)",
                             line=dict(color="#1f77b4", width=2)))
    fig.add_hline(y=P_max / (V.mean() * 1000), line_dash="dot", line_color="gray",
                  annotation_text="Approx. thrust available")

    # Mark minimum drag point
    i_min = np.argmin(D)
    fig.add_trace(go.Scatter(
        x=[V[i_min]], y=[D[i_min]/1000],
        mode="markers+text",
        marker=dict(color="#ff7f0e", size=10),
        text=[f"Min drag\n{V[i_min]:.0f} m/s"],
        textposition="top center",
        name="Min drag",
    ))

    fig.update_layout(
        title="Thrust Required for Level Flight",
        xaxis_title="Airspeed (m/s)",
        yaxis_title="Thrust / Drag (kN)",
        height=380,
        margin=dict(l=40, r=20, t=50, b=40),
    )
    return fig, V[i_min]


# ---------------------------------------------------------------------------
# Streamlit page
# ---------------------------------------------------------------------------

def render():
    st.header("Flight Mechanics")

    tab1, tab2 = st.tabs(["V-n Diagram", "Level Flight Performance"])

    with tab1:
        st.subheader("V-n Diagram")
        st.markdown(
            "The V-n diagram defines the **flight envelope**: the combinations of airspeed and "
            "load factor that are structurally and aerodynamically safe. "
            "The maneuvering speed V_A is the maximum speed at which full control deflection is allowed."
        )

        col1, col2 = st.columns(2)
        with col1:
            W = st.number_input("Aircraft weight W (N)", 5000, 2_000_000, 50_000, step=5000)
            S = st.number_input("Wing area S (m²)", 5.0, 500.0, 30.0, step=1.0)
            CLmax = st.slider("Max lift coeff CLmax", 1.0, 3.5, 1.8, step=0.1)
        with col2:
            n_max = st.slider("Positive limit load factor n+", 2.0, 9.0, 3.8, step=0.1)
            n_min = st.slider("Negative limit load factor n−", -5.0, -1.0, -1.5, step=0.1)
            V_max = st.slider("Max airspeed (m/s)", 50, 400, 150, step=10)

        fig_vn, VA = plot_vn(W, S, CLmax, n_max, n_min, V_max)
        st.plotly_chart(fig_vn, use_container_width=True)

        col_a, col_b, col_c = st.columns(3)
        col_a.metric("Stall speed (1g)", f"{stall_speed(W, S, CLmax):.1f} m/s")
        col_b.metric("Maneuvering speed VA", f"{VA:.1f} m/s")
        col_c.metric("Limit load factor", f"+{n_max}g / {n_min}g")

    with tab2:
        st.subheader("Level Flight Performance")
        st.markdown(
            "In steady level flight, thrust = drag and lift = weight. "
            "The minimum drag point (best L/D) is the most efficient cruise speed."
        )

        col1, col2 = st.columns(2)
        with col1:
            W2  = st.number_input("Weight W (N)", 5000, 2_000_000, 50_000, step=5000, key="w2")
            S2  = st.number_input("Wing area S (m²)", 5.0, 500.0, 30.0, step=1.0, key="s2")
            P2  = st.number_input("Max engine power (kW)", 10, 50_000, 500, step=50) * 1e3
        with col2:
            CD0_2 = st.slider("Parasitic drag CD0", 0.005, 0.08, 0.025, step=0.001,
                              format="%.3f", key="cd02")
            e2    = st.slider("Oswald efficiency e", 0.5, 1.0, 0.85, step=0.01, key="e2")
            AR2   = st.slider("Aspect ratio AR", 4, 20, 9, key="ar2")

        fig_tr, V_md = plot_thrust_required(W2, S2, P2, CD0_2, e2, AR2)
        st.plotly_chart(fig_tr, use_container_width=True)
        st.metric("Best cruise speed (min drag)", f"{V_md:.1f} m/s ({V_md*1.944:.0f} kt)")

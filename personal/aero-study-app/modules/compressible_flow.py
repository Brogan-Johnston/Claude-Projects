import numpy as np
import plotly.graph_objects as go
import streamlit as st
from utils.physics import GAMMA


# ---------------------------------------------------------------------------
# Isentropic flow relations  (γ = 1.4)
# ---------------------------------------------------------------------------

def isentropic(M, g=GAMMA):
    """Return T0/T, P0/P, rho0/rho for given Mach number(s)."""
    factor = 1 + (g - 1) / 2 * M**2
    T_ratio  = factor                        # T0/T
    P_ratio  = factor ** (g / (g - 1))      # P0/P
    rho_ratio = factor ** (1 / (g - 1))     # rho0/rho
    A_ratio = (1/M) * ((2/(g+1)) * factor) ** ((g+1) / (2*(g-1)))  # A/A*
    return T_ratio, P_ratio, rho_ratio, A_ratio


def normal_shock(M1, g=GAMMA):
    """
    Return (M2, P2/P1, T2/T1, rho2/rho1, P02/P01) across a normal shock.
    Only valid for M1 >= 1.
    """
    M1 = np.atleast_1d(np.asarray(M1, dtype=float))
    M2_sq = (M1**2 + 2/(g-1)) / (2*g/(g-1) * M1**2 - 1)
    M2 = np.sqrt(M2_sq)
    P_ratio  = (2*g*M1**2 - (g-1)) / (g+1)
    rho_ratio = (g+1)*M1**2 / (2 + (g-1)*M1**2)
    T_ratio  = P_ratio / rho_ratio
    # Stagnation pressure ratio via entropy
    P02_P01 = (rho_ratio ** (g/(g-1))) * (1/P_ratio) ** (1/(g-1))
    return M2, P_ratio, T_ratio, rho_ratio, P02_P01


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------

def plot_isentropic_table(M_max=5.0):
    M = np.linspace(0.01, M_max, 500)
    T_r, P_r, rho_r, A_r = isentropic(M)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=M, y=P_r,   name="P₀/P",   line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M, y=T_r,   name="T₀/T",   line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M, y=rho_r, name="ρ₀/ρ",   line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M, y=A_r,   name="A/A*",   line=dict(width=2, dash="dash")))
    fig.add_vline(x=1.0, line_dash="dot", line_color="gray", annotation_text="M=1 (sonic)")
    fig.update_layout(
        title="Isentropic Flow Relations",
        xaxis_title="Mach Number M",
        yaxis_title="Ratio (stagnation / static)",
        height=400,
        margin=dict(l=40, r=20, t=50, b=40),
        legend=dict(orientation="h", y=-0.2),
    )
    return fig


def plot_normal_shock_table(M_max=5.0):
    M1 = np.linspace(1.0, M_max, 400)
    M2, P_r, T_r, rho_r, P0_r = normal_shock(M1)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=M1, y=M2,    name="M₂",        line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M1, y=P_r,   name="P₂/P₁",     line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M1, y=T_r,   name="T₂/T₁",     line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M1, y=rho_r, name="ρ₂/ρ₁",     line=dict(width=2)))
    fig.add_trace(go.Scatter(x=M1, y=P0_r,  name="P₀₂/P₀₁",   line=dict(width=2, dash="dot")))
    fig.update_layout(
        title="Normal Shock Relations",
        xaxis_title="Upstream Mach Number M₁",
        yaxis_title="Ratio",
        height=400,
        margin=dict(l=40, r=20, t=50, b=40),
        legend=dict(orientation="h", y=-0.2),
    )
    return fig


# ---------------------------------------------------------------------------
# Streamlit page
# ---------------------------------------------------------------------------

def render():
    st.header("Compressible Flow")

    tab1, tab2, tab3 = st.tabs(["Isentropic Relations", "Normal Shock", "Point Calculator"])

    with tab1:
        st.subheader("Isentropic Flow")
        st.markdown(
            "For isentropic (adiabatic, reversible) flow, stagnation quantities are conserved. "
            "These relations connect static and total (stagnation) properties to the local Mach number."
        )
        M_max = st.slider("Max Mach number", 1.5, 10.0, 5.0, step=0.5, key="iso_mmax")
        st.plotly_chart(plot_isentropic_table(M_max), use_container_width=True)

    with tab2:
        st.subheader("Normal Shock")
        st.markdown(
            "A normal shock is a thin discontinuity perpendicular to the flow. "
            "The flow jumps from supersonic (M₁ > 1) to subsonic (M₂ < 1), "
            "with an irreversible loss of stagnation pressure."
        )
        M_max2 = st.slider("Max M₁", 1.5, 10.0, 5.0, step=0.5, key="ns_mmax")
        st.plotly_chart(plot_normal_shock_table(M_max2), use_container_width=True)

    with tab3:
        st.subheader("Point Calculator")
        st.markdown("Enter a Mach number to get all isentropic and shock properties at that point.")

        M_in = st.number_input("Mach number M", min_value=0.01, max_value=20.0,
                               value=2.0, step=0.1)

        T_r, P_r, rho_r, A_r = isentropic(M_in)
        st.markdown("**Isentropic (stagnation) relations:**")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("T₀/T", f"{T_r:.4f}")
        c2.metric("P₀/P", f"{P_r:.4f}")
        c3.metric("ρ₀/ρ", f"{rho_r:.4f}")
        c4.metric("A/A*", f"{A_r:.4f}")

        if M_in >= 1.0:
            st.markdown("**Normal shock (M₁ → M₂):**")
            M2, P2, T2, rho2, P0_r = normal_shock(M_in)
            d1, d2, d3, d4, d5 = st.columns(5)
            d1.metric("M₂",        f"{float(M2):.4f}")
            d2.metric("P₂/P₁",    f"{float(P2):.4f}")
            d3.metric("T₂/T₁",    f"{float(T2):.4f}")
            d4.metric("ρ₂/ρ₁",    f"{float(rho2):.4f}")
            d5.metric("P₀₂/P₀₁",  f"{float(P0_r):.4f}")
            st.caption(
                "P₀₂/P₀₁ < 1 reflects the irreversibility of the shock. "
                "As M₁ → 1, the shock becomes infinitely weak and P₀₂/P₀₁ → 1."
            )
        else:
            st.info("Normal shock relations only apply for M ≥ 1.")

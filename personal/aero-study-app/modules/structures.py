import numpy as np
import plotly.graph_objects as go
import streamlit as st


# ---------------------------------------------------------------------------
# Beam bending
# ---------------------------------------------------------------------------

def cantilever_beam(L, P, E, I, n=200):
    """
    Cantilever beam with point load P at tip.
    Returns x, deflection y, bending moment M, shear V.
    """
    x = np.linspace(0, L, n)
    # Deflection: y(x) = P/(6EI) * (3Lx^2 - x^3)
    y = P / (6 * E * I) * (3 * L * x**2 - x**3)
    M = P * (L - x)      # bending moment
    V = np.full_like(x, P)  # shear (constant for tip load)
    return x, y, M, V


def bending_stress(M, c, I):
    """σ = M * c / I"""
    return M * c / I


def moment_of_inertia_rect(b, h):
    """I = b*h^3/12 for rectangular cross section."""
    return b * h**3 / 12


# ---------------------------------------------------------------------------
# Thin-walled pressure vessel
# ---------------------------------------------------------------------------

def hoop_stress(p, r, t):
    """σ_hoop = p * r / t  (circumferential, largest stress)"""
    return p * r / t


def axial_stress(p, r, t):
    """σ_axial = p * r / (2t)"""
    return p * r / (2 * t)


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------

def plot_beam(L, P, E, I, c):
    x, y, M, V = cantilever_beam(L, P, E, I)
    sigma = bending_stress(M, c, I)

    fig = go.Figure()

    # Deflection
    fig.add_trace(go.Scatter(x=x, y=y * 1000, name="Deflection (mm)",
                             line=dict(color="#1f77b4", width=2)))
    fig.add_hline(y=0, line_color="gray", line_width=1)

    fig.update_layout(
        title="Cantilever Beam Deflection",
        xaxis_title="Position along beam x (m)",
        yaxis_title="Deflection (mm)",
        height=320,
        margin=dict(l=40, r=20, t=50, b=40),
    )

    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(x=x, y=M, name="Bending Moment (N·m)",
                              line=dict(color="#ff7f0e", width=2)))
    fig2.update_layout(
        title="Bending Moment Diagram",
        xaxis_title="Position x (m)",
        yaxis_title="Moment M (N·m)",
        height=280,
        margin=dict(l=40, r=20, t=40, b=40),
    )

    return fig, fig2, float(sigma[0])  # max stress at root


# ---------------------------------------------------------------------------
# Streamlit page
# ---------------------------------------------------------------------------

def render():
    st.header("Structures")

    tab1, tab2 = st.tabs(["Beam Bending", "Pressure Vessel"])

    with tab1:
        st.subheader("Cantilever Beam")
        st.markdown(
            "A cantilever beam is fixed at one end and loaded at the other — "
            "a simplified model of a wing (root = fuselage attachment, tip = lift load). "
            r"Maximum bending stress occurs at the root: $\sigma_{max} = M_{root} \cdot c / I$."
        )

        col1, col2 = st.columns(2)
        with col1:
            L   = st.number_input("Beam length L (m)", 0.5, 20.0, 5.0, step=0.5)
            P   = st.number_input("Tip load P (N)", 10, 100_000, 5_000, step=100)
            E   = st.number_input("Young's modulus E (GPa)", 10, 400, 70, step=5) * 1e9
        with col2:
            b   = st.number_input("Section width b (m)", 0.01, 0.5, 0.05, step=0.01)
            h   = st.number_input("Section height h (m)", 0.01, 1.0, 0.1, step=0.01)
            c   = h / 2   # distance from neutral axis to outer fiber

        I = moment_of_inertia_rect(b, h)
        fig_d, fig_m, sigma_max = plot_beam(L, P, E, I, c)

        c1, c2, c3 = st.columns(3)
        c1.metric("Second moment of area I", f"{I:.4e} m⁴")
        c2.metric("Max bending stress σ (root)", f"{sigma_max/1e6:.2f} MPa")
        c3.metric("Tip deflection", f"{P*L**3/(3*E*I)*1000:.2f} mm")

        st.plotly_chart(fig_d, use_container_width=True)
        st.plotly_chart(fig_m, use_container_width=True)

        st.markdown(
            "**Structural insight:** Doubling the beam height *h* increases I by 8× "
            "(I ∝ h³), reducing stress by 8× and deflection by 8×. "
            "This is why aircraft wing spars are deep I-beams."
        )

    with tab2:
        st.subheader("Thin-Walled Pressure Vessel")
        st.markdown(
            "Cylindrical pressure vessels (fuselages, fuel tanks) experience biaxial stress. "
            "The **hoop stress** (circumferential) is twice the **axial stress** — "
            "which is why pressure vessel failures typically split lengthwise."
        )

        col1, col2, col3 = st.columns(3)
        with col1:
            p_psi = st.number_input("Internal pressure p (psi)", 1, 1000, 8, step=1)
            p = p_psi * 6894.76  # Pa
        with col2:
            r_mm = st.number_input("Radius r (mm)", 10, 5000, 1000, step=10)
            r = r_mm / 1000
        with col3:
            t_mm = st.number_input("Wall thickness t (mm)", 0.5, 50.0, 2.0, step=0.5)
            t = t_mm / 1000

        sig_h = hoop_stress(p, r, t) / 1e6     # MPa
        sig_a = axial_stress(p, r, t) / 1e6    # MPa
        r_t = r / t

        c1, c2, c3 = st.columns(3)
        c1.metric("Hoop stress σ_θ", f"{sig_h:.2f} MPa")
        c2.metric("Axial stress σ_x", f"{sig_a:.2f} MPa")
        c3.metric("r/t ratio", f"{r_t:.1f}")

        if r_t > 10:
            st.success(f"r/t = {r_t:.1f} > 10 — thin-wall assumption valid.")
        else:
            st.warning(f"r/t = {r_t:.1f} ≤ 10 — thick-wall equations should be used instead.")

        # Bar chart comparing the two stresses
        fig = go.Figure(go.Bar(
            x=["Hoop stress σ_θ", "Axial stress σ_x"],
            y=[sig_h, sig_a],
            marker_color=["#1f77b4", "#ff7f0e"],
            text=[f"{sig_h:.2f} MPa", f"{sig_a:.2f} MPa"],
            textposition="outside",
        ))
        fig.update_layout(
            title="Stress Components",
            yaxis_title="Stress (MPa)",
            height=300,
            margin=dict(l=40, r=20, t=50, b=40),
        )
        st.plotly_chart(fig, use_container_width=True)

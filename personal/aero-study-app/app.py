import streamlit as st

st.set_page_config(
    page_title="AeroStudy",
    page_icon="✈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Module imports — deferred so Streamlit doesn't fail on import errors before sidebar loads
def load_modules():
    from modules import aerodynamics, compressible_flow, propulsion, orbital_mechanics, \
                        flight_mechanics, structures
    return {
        "Aerodynamics":       aerodynamics,
        "Compressible Flow":  compressible_flow,
        "Propulsion":         propulsion,
        "Orbital Mechanics":  orbital_mechanics,
        "Flight Mechanics":   flight_mechanics,
        "Structures":         structures,
    }

ICONS = {
    "Aerodynamics":       "🛩",
    "Compressible Flow":  "💨",
    "Propulsion":         "🚀",
    "Orbital Mechanics":  "🌍",
    "Flight Mechanics":   "📐",
    "Structures":         "🔩",
}

# Sidebar navigation
st.sidebar.title("AeroStudy")
st.sidebar.caption("Interactive aerospace engineering simulations")
st.sidebar.markdown("---")

modules = load_modules()
module_names = list(modules.keys())
selection = st.sidebar.radio(
    "Module",
    module_names,
    format_func=lambda x: f"{ICONS[x]}  {x}",
)

st.sidebar.markdown("---")
st.sidebar.markdown(
    "**About**\n\n"
    "Simulations based on:\n"
    "- Thin airfoil theory (Anderson)\n"
    "- Isentropic / normal shock relations\n"
    "- Tsiolkovsky rocket equation\n"
    "- Two-body orbital mechanics\n"
    "- Euler-Bernoulli beam theory\n"
    "- Thin-wall pressure vessel theory"
)

# Render selected module
modules[selection].render()

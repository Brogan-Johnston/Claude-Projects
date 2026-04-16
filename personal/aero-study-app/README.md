# AeroStudy

Interactive aerospace engineering simulations built with Python and Streamlit.

## Modules

| Module | Simulations |
|---|---|
| **Aerodynamics** | NACA 4-digit airfoil shape, lift curve (thin airfoil theory), drag polar with L/D |
| **Compressible Flow** | Isentropic relations, normal shock table, point calculator |
| **Propulsion** | Tsiolkovsky rocket equation curves, propellant comparison, ideal nozzle Isp |
| **Orbital Mechanics** | Orbit velocity/period vs altitude, Hohmann transfer visualizer, orbit calculator |
| **Flight Mechanics** | V-n diagram with stall/structural boundaries, thrust-required curve |
| **Structures** | Cantilever beam bending + stress, thin-wall pressure vessel hoop/axial stress |

## Setup

### 1. Install Python

Python 3.11 or newer is required. If not installed, run in PowerShell:

```powershell
winget install Python.Python.3.12
```

Or download from [python.org](https://python.org).

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the app

```bash
streamlit run app.py
```

The app opens in your browser at `http://localhost:8501`. Every slider and input updates the simulation in real time.

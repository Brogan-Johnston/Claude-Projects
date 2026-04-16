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

Python 3.11 or newer is required. Check your version first:

```bash
python --version
```

If Python is not installed or out of date, install it via PowerShell:

```powershell
winget install Python.Python.3.12
```

Or download the installer from [python.org](https://python.org). During installation, check **"Add Python to PATH"**.

---

### 2. Clone the repository

```bash
git clone https://github.com/Brogan-Johnston/Claude-Projects.git
cd Claude-Projects/personal/aero-study-app
```

Or if you already have the repo, navigate to the project folder:

```bash
cd path/to/aero-study-app
```

---

### 3. Create a virtual environment (recommended)

A virtual environment keeps dependencies isolated from your system Python.

```bash
python -m venv .venv
```

Activate it:

- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

You should see `(.venv)` prepended to your terminal prompt when active.

---

### 4. Install dependencies

This step downloads and installs all Python packages the app needs. Follow each sub-step carefully.

---

#### 4.1 — Confirm your virtual environment is active

Before installing anything, make sure the virtual environment from Step 3 is active. Your terminal prompt should look like this:

```
(.venv) C:\Users\YourName\aero-study-app>
```

If you do not see `(.venv)` at the start of the prompt, go back and complete Step 3 before continuing. Installing packages without an active virtual environment will install them system-wide, which can cause version conflicts with other Python projects.

To double-check which Python and pip are being used, run:

```bash
where python     # Windows
which python     # macOS / Linux
```

The path should point inside your `.venv` folder, for example:

```
C:\Users\YourName\aero-study-app\.venv\Scripts\python.exe
```

If it points to a system-level Python (e.g. `C:\Python312\python.exe`) instead, the venv is not active.

---

#### 4.2 — Confirm you are in the right directory

You must run the install command from the folder that contains `requirements.txt`. Verify this with:

```bash
ls        # macOS / Linux
dir       # Windows Command Prompt
ls        # Windows PowerShell
```

You should see `requirements.txt` in the output alongside `app.py`, `modules/`, etc. If you do not, navigate to the correct folder:

```bash
cd path\to\aero-study-app
```

---

#### 4.3 — Upgrade pip (optional but recommended)

`pip` is the Python package installer. Older versions occasionally fail to resolve dependencies correctly. Update it before installing:

```bash
python -m pip install --upgrade pip
```

Expected output ends with something like:

```
Successfully installed pip-24.x.x
```

---

#### 4.4 — Run the install command

```bash
pip install -r requirements.txt
```

**What this command does:** `pip` reads each line in `requirements.txt`, resolves compatible versions, downloads the packages from the Python Package Index (PyPI), and installs them into your active virtual environment. No internet connection beyond PyPI is required.

**What to expect while it runs:**

1. pip prints `Collecting <package>` for each dependency it needs to download.
2. For each package it shows a progress bar as the wheel (`.whl`) file downloads.
3. After all downloads complete, it prints `Installing collected packages: ...`
4. It ends with:
   ```
   Successfully installed matplotlib-3.x.x numpy-1.x.x plotly-5.x.x scipy-1.x.x streamlit-1.x.x ...
   ```

The full install typically takes **1–3 minutes** depending on your internet speed. Scipy and numpy are large packages and may take the longest.

---

#### 4.5 — Understand what was installed

| Package | Version required | What it does in this app |
|---|---|---|
| `streamlit` | ≥ 1.32.0 | Renders the entire web UI — sidebar, sliders, number inputs, and layout |
| `numpy` | ≥ 1.26.0 | Fast numerical arrays; used for all simulation math (angle arrays, matrix ops) |
| `scipy` | ≥ 1.12.0 | Scientific functions — used for things like Bessel functions and special integrals |
| `plotly` | ≥ 5.20.0 | Interactive in-browser charts with hover, zoom, and pan |
| `matplotlib` | ≥ 3.8.0 | Static diagram generation (used in some modules as a fallback) |

The `>=` version pins mean pip will install at least that version but will accept newer compatible releases.

---

#### 4.6 — Verify the install succeeded

Run the following to confirm each package is importable:

```bash
python -c "import streamlit, numpy, scipy, plotly, matplotlib; print('All packages OK')"
```

If all five imported without error, you will see:

```
All packages OK
```

If you see an `ImportError` or `ModuleNotFoundError` for any package, re-run Step 4.4 and check that your virtual environment is active.

You can also list every installed package and its version with:

```bash
pip list
```

Look for `streamlit`, `numpy`, `scipy`, `plotly`, and `matplotlib` in that list.

---

### 5. Run the app

```bash
streamlit run app.py
```

Streamlit will print a local URL — open it in your browser:

```
Local URL:  http://localhost:8501
Network URL: http://192.168.x.x:8501
```

The browser tab should open automatically. If it does not, copy the **Local URL** and paste it manually.

---

## Using the App

- Use the **sidebar** on the left to switch between modules.
- Every slider and numeric input updates the simulation plot in real time — no submit button needed.
- Plots are interactive (Plotly): hover for values, zoom, pan, or download as PNG using the toolbar that appears on hover.

---

## Stopping the App

Press `Ctrl+C` in the terminal where `streamlit run` is running.

To deactivate the virtual environment afterward:

```bash
deactivate
```

---

## Troubleshooting

**`streamlit: command not found`**
- Make sure your virtual environment is activated (see Step 3).
- Or run it as a module: `python -m streamlit run app.py`

**`ModuleNotFoundError` for numpy, scipy, etc.**
- Dependencies were not installed in the active environment. Re-run `pip install -r requirements.txt` with the venv active.

**Port 8501 already in use**
- Another Streamlit instance is running. Stop it, or run on a different port:
  ```bash
  streamlit run app.py --server.port 8502
  ```

**PowerShell blocks `.venv\Scripts\Activate.ps1`**
- Run this once to allow local scripts:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
